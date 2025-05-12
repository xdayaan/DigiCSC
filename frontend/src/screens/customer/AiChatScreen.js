import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';

import MessageBubble from '../../components/chat/MessageBubble';
import ChatInput from '../../components/chat/ChatInput';
import api from '../../services/api';
import chatService from '../../services/chatService';

const AiChatScreen = () => {
  const { userData, updateUserData } = useAuth();
  const navigation = useNavigation();
  const flatListRef = useRef(null);
  
  // State variables
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [clearingMessages, setClearingMessages] = useState(false);
  const [clearChatModalVisible, setClearChatModalVisible] = useState(false);
  
  // Language options based on the backend model
  const languages = [
    { value: 'english', label: 'English' },
    { value: 'hindi', label: 'Hindi' },
    { value: 'kumaoni', label: 'Kumaoni' },
    { value: 'gharwali', label: 'Gharwali' },
  ];

  // Set up navigation header options
  useEffect(() => {
    navigation.setOptions({
      title: 'AI Assistant',
      headerRight: () => (
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={handleClearChat}
            disabled={clearingMessages || !messages.length}
          >
            <Ionicons 
              name="trash-outline" 
              size={22} 
              color={clearingMessages || !messages.length ? "#AAAAAA" : "#FF6B6B"} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setLanguageModalVisible(true)}
          >
            <Ionicons name="language-outline" size={24} color="#0066CC" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, clearingMessages, messages.length]);

  // Create AI conversation if none exists
  useEffect(() => {
    createAiConversation();
  }, []);

  // Load chat messages once a conversation is selected
  useEffect(() => {
    if (currentConversation) {
      fetchMessages();
      
      // Set up interval to refresh messages every 10 seconds
      const interval = setInterval(fetchMessages, 10000);
      
      return () => clearInterval(interval);
    }
  }, [currentConversation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [messages]);

  // Handle clearing chat messages
  const handleClearChat = () => {
    if (!currentConversation || clearingMessages) return;
    
    setClearChatModalVisible(true);
  };

  // Confirm clearing chat messages
  const confirmClearChat = async () => {
    if (!currentConversation || clearingMessages) return;
    
    try {
      setClearingMessages(true);
      
      // Call API to clear messages
      await chatService.clearConversationMessages(currentConversation.id);
      
      // Update UI
      setMessages([]);
      
      // Show success message
      Alert.alert('Success', 'All messages have been cleared');
    } catch (err) {
      console.error('Error clearing messages:', err);
      Alert.alert('Error', 'Failed to clear messages. Please try again.');
    } finally {
      setClearingMessages(false);
      setClearChatModalVisible(false);
    }
  };

  // Create a conversation exclusively for AI
  const createAiConversation = async () => {
    try {
      setLoading(true);
      // Check if an AI conversation already exists
      const allConversations = await chatService.getConversations();
      
      // Filter conversations without a freelancer_id (AI conversations)
      const aiConversations = allConversations.filter(
        conv => conv.freelancer_id === null && conv.title === 'AI Assistant'
      );
      
      if (aiConversations.length > 0) {
        // Use existing AI conversation
        setCurrentConversation(aiConversations[0]);
      } else {
        // Create new AI conversation (with no freelancer)
        // Ensure we have a valid last_message_time
        const now = new Date().toISOString();
        const newConversation = await chatService.createConversation(
          'AI Assistant',
          userData.id,
          null, // No freelancer for AI conversation
          now // Explicit last_message_time
        );
        
        setCurrentConversation(newConversation);
      }
    } catch (err) {
      console.error('Error setting up AI conversation:', err);
      setError('Could not connect to AI Assistant. Please try again.');
    } finally {
      setLoading(false);
    }
  };  // Fetch messages from API for this conversation
  const fetchMessages = async () => {
    if (refreshing || !currentConversation) return;
    
    try {
      setRefreshing(true);      
      const data = await chatService.getConversationMessages(currentConversation.id, 50, 0);
      
      if (data && Array.isArray(data)) {
        // Trust the backend sorting - the backend now properly pairs user messages with AI responses
        // We just need to apply the messages to state as-is
        setMessages(data);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      if (!messages.length) {
        setError('Could not load messages. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  // Handle sending text message directly to Gemini AI
  const handleSendText = async (text) => {
    if (!currentConversation) {
      Alert.alert('Error', 'AI Assistant is not available. Please try again.');
      return;
    }
    
    try {
      setSendingMessage(true);
      
      const messageData = {
        type: 'text',
        text,
        sent_by: 'user',
        freelancer_id: null,
        conversation_id: currentConversation.id,
        sent_on: new Date().toISOString()
      };
      
      // Optimistically add to UI
      const tempId = 'temp-' + Date.now();
      setMessages(prev => [...prev, { ...messageData, id: tempId }]);
          // Send to AI endpoint using the dedicated method
      const response = await chatService.sendMessageToAI(text, currentConversation.id);
      
      if (response) {
        // Replace the temporary message with the actual user message from the server
        const userMessageId = response.id;
          // Wait a moment for the AI to respond (the backend automatically generates the AI response)
        setTimeout(async () => {
          // Use our new API endpoint to get the specific message pair
          const messagePair = await chatService.getMessagePair(currentConversation.id, userMessageId);
          
          if (messagePair && messagePair.length > 0) {
            // Update messages with the new message pair
            setMessages(prev => {
              // Remove temp message
              const filteredMessages = prev.filter(msg => msg.id !== tempId);
              
              // Create a set of existing message IDs for quick lookup
              const existingIds = new Set(filteredMessages.map(msg => msg.id));
              
              // Filter out any messages that would be duplicates
              const newMessages = messagePair.filter(msg => !existingIds.has(msg.id));
              
              // Return the combined messages in order
              return [...filteredMessages, ...newMessages];
            });
          } else {
            // Fallback to regular fetch if we can't find the message pair
            await fetchMessages();
            // Remove the temporary message
            setMessages(prev => prev.filter(msg => msg.id !== tempId));
          }
          setSendingMessage(false);
        }, 1500); // Wait 1.5 seconds for AI response
      }
    } catch (err) {
      console.error('Error sending message to AI:', err);
      Alert.alert('Error', 'Failed to send message to AI. Please try again.');
      
      // Remove temporary message on error
      setMessages(prev => prev.filter(msg => 
        !msg.id.toString().startsWith('temp-')
      ));
      setSendingMessage(false);
    }
  };

  // Handle sending document
  const handleSendDocument = async (file) => {
    if (!currentConversation) {
      Alert.alert('Error', 'AI Assistant is not available. Please try again.');
      return;
    }
    
    try {
      setSendingMessage(true);
      
      // Create temporary message for UI feedback
      const tempMessage = {
        id: 'temp-doc-' + Date.now(),
        type: 'document',
        text: 'Uploading document...',
        document_url: null,
        sent_by: 'user',
        conversation_id: currentConversation.id,
        freelancer_id: null,
        sent_on: new Date().toISOString()
      };
      
      // Optimistically add to UI
      setMessages(prev => [...prev, tempMessage]);
      
      // Create form data with conversation ID
      const formData = new FormData();
      
      // Create file object with the correct structure for React Native FormData
      const fileToUpload = {
        uri: file.uri,
        type: file.type || 'application/pdf',
        name: file.name || 'document.pdf'
      };
      
      // Append file as the first field - this is important for multipart/form-data parsing
      formData.append('file', fileToUpload);
      
      // Add additional fields after the file
      formData.append('conversation_id', currentConversation.id);
      
      // Upload document
      const response = await api.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json',
        },
        transformRequest: () => formData, // Prevent axios from trying to transform the FormData
      });
      
      // Update with actual message from server
      if (response.data) {
        setMessages(prev => prev.map(msg => 
          msg.id === tempMessage.id ? response.data : msg
        ));
      }
      
    } catch (err) {
      console.error('Error uploading document:', err);
      Alert.alert('Error', 'Failed to upload document. Please try again.');
      
      // Remove temporary message on error
      setMessages(prev => prev.filter(msg => 
        !msg.id.toString().startsWith('temp-')
      ));
    } finally {
      setSendingMessage(false);
    }
  };
    // Update language preference
  const handleLanguageChange = async (language) => {
    try {
      // Update user data in backend
      const response = await api.put(`/users/${userData.id}`, {
        preferred_language: language
      });
      
      if (response && response.data) {
        // Update local user data
        await updateUserData({
          ...userData,
          preferred_language: language
        });
        
        // Test the language change with a sample message
        setSendingMessage(true);
        const testResult = await chatService.testAILanguage(
          'Hello, can you respond in this language?', 
          language
        );
        
        if (testResult && testResult.success) {
          Alert.alert(
            'Language Changed', 
            `Language has been changed to ${language}.\n\nExample response: "${testResult.ai_response}"`,
            [{ text: 'OK', onPress: () => setLanguageModalVisible(false) }]
          );
        } else {
          Alert.alert(
            'Language Changed', 
            `Language has been changed to ${language}. The AI will respond in ${language} for future messages.`,
            [{ text: 'OK', onPress: () => setLanguageModalVisible(false) }]
          );
        }
      }
    } catch (err) {
      console.error('Error updating language:', err);
      Alert.alert('Error', 'Failed to update language preference. Please try again.');
      setLanguageModalVisible(false);
    } finally {
      setSendingMessage(false);
    }
  };

  // Render each message
  const renderMessage = ({ item }) => (
    <MessageBubble 
      message={item} 
      isCurrentUser={item.sent_by === 'user'} 
    />
  );

  // Determine message key
  const keyExtractor = (item) => item.id ? item.id.toString() : Math.random().toString();

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubble-ellipses-outline" size={60} color="#CCCCCC" />
      <Text style={styles.emptyTitle}>No messages yet</Text>
      <Text style={styles.emptySubtitle}>Start the conversation with AI by sending a message</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {loading && !currentConversation ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loaderText}>Connecting to AI Assistant...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.messageList}
          ListEmptyComponent={renderEmptyState}
          onRefresh={fetchMessages}
          refreshing={refreshing}
          showsVerticalScrollIndicator={true}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          onEndReachedThreshold={0.1}
          inverted={false} // Set to true if you need older messages at the bottom
        />
      )}

      <ChatInput 
        onSendText={handleSendText} 
        onSendDocument={handleSendDocument}
        isLoading={sendingMessage}
        disabled={!currentConversation}
      />
      
      {/* Language Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={languageModalVisible}
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Language</Text>
              <TouchableOpacity onPress={() => setLanguageModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.languageList}>
              {languages.map((language) => (
                <TouchableOpacity
                  key={language.value}
                  style={[
                    styles.languageItem,
                    userData.preferred_language && 
                    userData.preferred_language.toLowerCase() === language.value && 
                    styles.selectedLanguage
                  ]}
                  onPress={() => handleLanguageChange(language.value)}
                >
                  <Text style={[
                    styles.languageName,
                    userData.preferred_language && 
                    userData.preferred_language.toLowerCase() === language.value && 
                    styles.selectedLanguageText
                  ]}>
                    {language.label}
                  </Text>
                  {userData.preferred_language && 
                   userData.preferred_language.toLowerCase() === language.value && (
                    <Ionicons name="checkmark-circle" size={24} color="#0066CC" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Clear Chat Confirmation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={clearChatModalVisible}
        onRequestClose={() => setClearChatModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Clear Chat</Text>
              <TouchableOpacity onPress={() => setClearChatModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.modalMessage}>
                Are you sure you want to clear all messages in this conversation?
              </Text>
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setClearChatModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmClearChat}
              >
                <Text style={[styles.modalButtonText, { color: 'white' }]}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  headerRight: {
    flexDirection: 'row',
    marginRight: 10,
  },
  headerButton: {
    marginHorizontal: 5,
    padding: 5,
  },
  messageList: {
    flexGrow: 1,
    padding: 10,
    paddingBottom: 20,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#777',
    marginTop: 10,
    textAlign: 'center',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 16,
  },
  modalMessage: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
  },
  confirmButton: {
    backgroundColor: '#FF6B6B',
  },  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  languageList: {
    padding: 10,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  selectedLanguage: {
    backgroundColor: '#F0F8FF',
  },
  languageName: {
    fontSize: 16,
  },
  selectedLanguageText: {
    color: '#0066CC',
    fontWeight: 'bold',
  },
});

export default AiChatScreen;

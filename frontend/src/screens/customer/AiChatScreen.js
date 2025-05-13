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
import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import MessageBubble from '../../components/chat/MessageBubble';
import ChatInput from '../../components/chat/ChatInput';
import api from '../../services/api';
import chatService from '../../services/chatService';

const AiChatScreen = ({ route }) => {
  const { userData, updateUserData } = useAuth();
  const navigation = useNavigation();
  const flatListRef = useRef(null);
  
  // Get auto message from route params if available
  const autoMessage = route.params?.autoMessage || null;
  const autoSend = route.params?.autoSend || false;
  
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

            disabled={clearingMessages || !messages.length}
          >
            <Ionicons 
              name="apps-outline" 
              size={22} 
              onPress={() => navigation.navigate('AppsScreen')}
              color={clearingMessages || !messages.length ? "#AAAAAA" : "#FF6B6B"} 
            />
          </TouchableOpacity>
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
    // Handle auto-sending message when conversation is ready and we have a message to send
  useEffect(() => {
    const autoSendMessage = async () => {
      // Make sure conversation is ready, we have a message to send, and we're not loading/sending
      if (currentConversation && autoMessage && autoSend && !loading && !sendingMessage) {
        console.log("Auto-sending message:", autoMessage);
        
        // Small delay to ensure everything is ready
        setTimeout(async () => {
          // Send the auto message
          await handleSendText(autoMessage);
          
          // Clear the route params to prevent re-sending on navigation changes
          navigation.setParams({ autoMessage: null, autoSend: false });
        }, 500);
      }
    };
    
    autoSendMessage();
  }, [currentConversation, loading, sendingMessage, autoMessage, autoSend]);

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
  try {
    console.log("handle Send Document Triggered")
    setSendingMessage(true);
      // Create temporary message for UI feedback
    const tempMessage = {
      id: 'temp-doc-' + Date.now(),
      type: 'document',
      text: `Uploading document: ${file.name || 'file'}...`,
      document_url: null,
      sent_by: 'user',
      conversation_id: currentConversation.id,
      freelancer_id: null,
      sent_on: new Date().toISOString()
    };
    
    // Optimistically add to UI
    setMessages(prev => [...prev, tempMessage]);

    console.log("Uploading document:", file);
    
    // Get authentication token
    const token = await AsyncStorage.getItem('userToken');
      // Create FormData object for file upload
    const formData = new FormData();
    
    // For React Native environments, we need to be careful with file objects
    let fileToUpload;
    
    if (Platform.OS === 'web') {
      // For web: If it's already a File/Blob object, use it directly
      if (file instanceof Blob || file instanceof File) {
        fileToUpload = file;
      } else if (file.uri && file.uri.startsWith('data:')) {
        // Convert base64 data URI to blob for web
        try {
          const response = await fetch(file.uri);
          const blob = await response.blob();
          fileToUpload = new File([blob], file.name || 'image.png', { 
            type: file.mimeType || file.type || 'image/png' 
          });
        } catch (e) {
          console.error("Error converting data URI to blob:", e);
          throw new Error("Could not process the image file");
        }
      }
    } else {
      // For React Native: Format the file object properly
      fileToUpload = {
        uri: file.uri,
        type: file.mimeType || file.type || 'application/octet-stream',
        name: file.name || 'document.pdf'
      };
    }
    
    console.log("File to upload:", fileToUpload);
    
    // Append the file to FormData with the correct field name
    formData.append('file', fileToUpload);
    
    // Add required fields
    formData.append('description', 'string');
    formData.append('freelancer_id', '0');
    
    // Define the base URL based on platform
    const BASE_URL = Platform.select({
      ios: 'http://localhost:8000',
      android: 'http://10.0.2.2:8000',
      default: 'http://localhost:8000',
    });
    
    // For debugging - log the form data entries
    if (Platform.OS === 'web') {
      for (let pair of formData.entries()) {
        console.log(pair[0], pair[1]);
      }
    }
    
    // Make direct Axios call to upload endpoint
    const response = await axios.post(
      `${BASE_URL}/api/documents/upload`,
      formData,
      {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          // Let the browser set the Content-Type with boundary
          // Don't set Content-Type header manually for multipart/form-data
        },
        // Important: Don't transform the formData
        transformRequest: (data) => data,
      }
    );
      console.log('Document upload response:', response.data);    // Extract document information from the response
    const documentData = await response.data;
    
    if (documentData && documentData.document_url) {
      // Create a permanent document message in the specified format
      const permaMessage = {
        id: documentData.message_id || 'doc-' + Date.now(),
        type: 'document',
        text: file.name || 'Document',
        document_url: documentData.document_url,
        sent_by: 'user',
        conversation_id: currentConversation.id,
        freelancer_id: null,
        sent_on: new Date().toISOString()
      };
      
      // Update messages list - replace the temporary message with the permanent document message
      setMessages(prev => {
        // Filter out the temporary message
        const filteredMessages = prev.filter(msg => 
          !msg.id.toString().startsWith('temp-doc-')
        );
        
        // Add the new permanent document message
        return [...filteredMessages, permaMessage];
      });
      
      // Send the document to the AI for processing
      try {
        // Create a message indicating the document was shared
        const documentNotificationText = `I've shared a ${documentData.document_type || 'document'} with you.`;
          // Send this notification to the AI with type 'document'
        await chatService.sendMessageToAI(
          documentNotificationText, 
          currentConversation.id,
          documentData.document_url,  // Pass the document URL for AI processing
          'document'  // Explicitly set the message type as "document"
        );
        
        // The AI response will be fetched in the regular message polling cycle
      } catch (aiErr) {
        console.error('Error notifying AI about document:', aiErr);
        // Continue processing - this is not a critical error
      }
    } else {
      Alert.alert('Warning', 'Document was uploaded but some information is missing. It may not display correctly.');
    }
    
    setSendingMessage(false);
      } catch (err) {
    console.error('Error uploading document:', err);
    
    // Extract error message from response if available
    let errorMessage = 'Failed to upload document. Please try again.';
    
    if (err.response) {
      console.error('Error response data:', JSON.stringify(err.response.data));
      
      if (err.response.data.detail) {
        // Handle array of validation errors
        if (Array.isArray(err.response.data.detail)) {
          errorMessage = err.response.data.detail
            .map(item => `${item.msg} (${item.loc.join('.')})`)
            .join('\n');
        } else {
          errorMessage = err.response.data.detail;
        }
      }
    } else if (err.message) {
      errorMessage = err.message;
    }
    
    Alert.alert('Error', errorMessage);
    
    // Remove temporary message on error
    setMessages(prev => prev.filter(msg => 
      !msg.id.toString().startsWith('temp-')
    ));
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
      )}      <ChatInput 
        onSendText={handleSendText} 
        onSendDocument={handleSendDocument}
        isLoading={sendingMessage}
        disabled={!currentConversation}
        inputText={autoMessage && !autoSend ? autoMessage : ''} // Show message in input if autoSend is false
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

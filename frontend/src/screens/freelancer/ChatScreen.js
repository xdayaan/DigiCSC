import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import ConversationSelector from '../../components/chat/ConversationSelector';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import MessageBubble from '../../components/chat/MessageBubble';
import ChatInput from '../../components/chat/ChatInput';
import { chatService } from '../../services/chatService';
import api from '../../services/api';
import VoiceCall from '../../components/call/CallComponent';

const ChatScreen = () => {
  const { userData, logout } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const flatListRef = useRef(null);
    // Get customer data from route params
  const { customer, requestId } = route.params || {};
  console.log('Customer data:', customer);
  
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Call related state
  const [showCall, setShowCall] = useState(false);
  
  // Conversation related states
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [showConversationSelector, setShowConversationSelector] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  // Set up title based on customer data and conversation
  useEffect(() => {
    if (customer && customer.name) {
      navigation.setOptions({
        title: `${customer.name} `,
        headerRight: () => (
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => setShowCall(true)}
            >
              <Ionicons name="call-outline" size={22} color="#0066CC" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => setShowConversationSelector(true)}
            >
              <Ionicons name="chatbubbles-outline" size={22} color="#0066CC" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => {
                // Navigate to customer details screen if available
                // or show customer info in an alert
                Alert.alert(
                  'Customer Details',
                  `Name: ${customer.name}\nEmail: ${customer.email}${customer.phone ? `\nPhone: ${customer.phone}` : ''}`
                );
              }}
            >
              <Ionicons name="information-circle-outline" size={24} color="#0066CC" />
            </TouchableOpacity>
          </View>
        ),
      });
    }
  }, [navigation, customer, currentConversation]);
  // Load conversations first, then messages
  useEffect(() => {
    if (customer) {
      fetchConversations();
    }
  }, [customer]);

  // Load chat messages when a conversation is selected
  useEffect(() => {
    if (customer && currentConversation) {
      fetchMessages();
      
      // Set up interval to refresh messages every 10 seconds
      const interval = setInterval(fetchMessages, 10000);
      
      return () => clearInterval(interval);
    }
  }, [customer, currentConversation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [messages]);
  
  // Fetch all conversations for this customer
  const fetchConversations = async () => {
    if (!customer) return;
    
    try {
      setLoadingConversations(true);
      const allConversations = await chatService.getConversations();
      
      // Filter conversations for this customer
      const customerConversations = allConversations.filter(
        conv => conv.user_id === customer.id
      );
      
      setConversations(customerConversations);
      
      // If there are conversations, select the most recent one
      if (customerConversations.length > 0) {
        setCurrentConversation(customerConversations[0]);
      } else {
        // If no conversations, create a default one
        createDefaultConversation();
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
      // If we can't get conversations, create a default one
      createDefaultConversation();
    } finally {
      setLoadingConversations(false);
    }
  };
  
  // Create a default conversation if none exists
  const createDefaultConversation = async () => {
    try {
      const newConversation = await chatService.createConversation(
        'General Support',
        customer.id,
        userData.id
      );
      
      setConversations([newConversation]);
      setCurrentConversation(newConversation);
    } catch (err) {
      console.error('Error creating default conversation:', err);
      setError('Could not create a conversation. Please try again.');
    }
  };  // Fetch messages from API for this specific customer and conversation
  const fetchMessages = async () => {
    if (!customer || !currentConversation || refreshing) return; // Don't fetch if no customer, conversation or already refreshing
    
    try {
      setRefreshing(true);
      // Use conversation ID to get messages for this conversation
      const response = await chatService.getConversationMessages(
        currentConversation.id
      );
      
      if (response && Array.isArray(response)) {
        // Sort messages by date (newest last)
        const sortedMessages = response.sort((a, b) => 
          new Date(a.sent_on) - new Date(b.sent_on)
        );
        
        setMessages(sortedMessages);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching customer messages:', err);
      if (!messages.length) {
        setError('Could not load messages. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  // Handle sending text message
  const handleSendText = async (text) => {
    if (!customer || !currentConversation) {
      Alert.alert('Error', 'No active conversation. Please select or create one.');
      return;
    }
    
    try {
      setSendingMessage(true);
      
      const messageData = {
        type: 'text',
        text,
        sent_by: 'freelancer',
        freelancer_id: userData.id,
        conversation_id: currentConversation.id,
        sent_on: new Date().toISOString()
      };
      
      // Optimistically add to UI
      setMessages(prev => [...prev, { ...messageData, id: 'temp-' + Date.now() }]);
      
      // Send message to the API with the conversation ID
      const response = await chatService.sendTextMessageToConversation(
        text,
        'freelancer',
        currentConversation.id,
        userData.id
      );
      
      // Update with actual message from server
      if (response) {
        setMessages(prev => prev.map(msg => 
          msg.id === 'temp-' + Date.now() ? response : msg
        ));
      }
      
    } catch (err) {
      console.error('Error sending message:', err);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      
      // Remove temporary message on error
      setMessages(prev => prev.filter(msg => 
        !msg.id.toString().startsWith('temp-')
      ));
    } finally {
      setSendingMessage(false);
    }
  };
  // Handle sending document
  const handleSendDocument = async (file) => {
    if (!customer || !currentConversation) {
      Alert.alert('Error', 'No active conversation. Please select or create one.');
      return;
    }
    
    try {
      setSendingMessage(true);
      
      // Create temporary message for UI feedback
      const tempMessage = {
        id: 'temp-doc-' + Date.now(),
        type: 'document',
        text: `Uploading document: ${file.name || 'file'}...`,
        document_url: null,
        sent_by: 'freelancer',
        freelancer_id: userData.id,
        conversation_id: currentConversation.id,
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
        // Native: Format the file object properly
        fileToUpload = {
          uri: file.uri,
          type: file.mimeType || file.type || 'application/octet-stream',
          name: file.name || 'document.pdf'
        };
      }
      
      // Add file to FormData with the correct field name
      formData.append('file', fileToUpload);
      
      // Add fields
      formData.append('description', 'string');
      formData.append('freelancer_id', userData.id);
      
      // Base URL based on platform
      const BASE_URL = Platform.select({
        ios: 'http://localhost:8000',
        android: 'http://10.0.2.2:8000',
        default: 'http://localhost:8000',
      });
      
      // Make direct Axios call to upload endpoint
      const response = await axios.post(
        `${BASE_URL}/api/documents/upload`,
        formData,
        {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          // Important: Don't transform the formData
          transformRequest: (data) => data,
        }
      );
      
      // Extract document information from the response
      const documentData = response.data;
      
      if (documentData && documentData.document_url) {
        // Remove the temporary message
        setMessages(prev => prev.filter(msg => !msg.id.toString().startsWith('temp-doc-')));
        
        // Send document message to the conversation
        await chatService.sendTextMessageToConversation(
          file.name || 'Document',
          'freelancer',
          currentConversation.id,
          userData.id,
          documentData.document_url,
          'document'
        );
        
        // Refresh messages to get the server version
        await fetchMessages();
      } else {
        Alert.alert('Warning', 'Document was uploaded but some information is missing. It may not display correctly.');
      }
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
    } finally {
      setSendingMessage(false);
    }
  };
  
  // Render each message
  const renderMessage = ({ item }) => (
    <MessageBubble 
      message={item} 
      isCurrentUser={item.sent_by === 'freelancer' && item.freelancer_id === userData.id} 
    />
  );

  // Determine message key
  const keyExtractor = (item) => item.id ? item.id.toString() : Math.random().toString();

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubble-ellipses-outline" size={60} color="#CCCCCC" />
      <Text style={styles.emptyTitle}>No messages yet</Text>
      <Text style={styles.emptySubtitle}>Start the conversation by sending a message</Text>
    </View>
  );
  // Handle conversation selection
  const handleSelectConversation = (conversation) => {
    setCurrentConversation(conversation);
    setShowConversationSelector(false);
    setLoading(true);
    setMessages([]);
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>      {showCall ? (
        <View style={styles.callContainer}>
          <VoiceCall 
            channelName={customer ? `call-${customer.id}-${userData.id}` : 'default-channel'}
            role="host"
          />
          <TouchableOpacity 
            style={styles.endCallButton}
            onPress={() => setShowCall(false)}
          >
            <Ionicons name="call-outline" size={22} color="#FFFFFF" />
            <Text style={styles.endCallText}>End Call</Text>
          </TouchableOpacity>
        </View>
      ) : loadingConversations ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loaderText}>Setting up conversation...</Text>
        </View>
      ) : !currentConversation ? (
        <View style={styles.errorContainer}>
          <Ionicons name="chatbubbles-outline" size={60} color="#FF6B6B" />
          <Text style={styles.errorText}>No active conversation</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchConversations}>
            <Text style={styles.retryButtonText}>Set Up Conversation</Text>
          </TouchableOpacity>
        </View>
      ) : loading && !refreshing ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loaderText}>Loading messages...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchMessages}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
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
      
      {/* Conversation Selector Modal */}
      <ConversationSelector
        isVisible={showConversationSelector}
        onClose={() => setShowConversationSelector(false)}
        onSelect={handleSelectConversation}
        userId={customer?.id}
        freelancerId={userData?.id}
        currentConversationId={currentConversation?.id}
      />
      
      {/* Voice Call Component - Hidden by default */}
      {showCall && (
        <VoiceCall 
          isVisible={showCall}
          onClose={() => setShowCall(false)}
          customer={customer}
          freelancer={userData}
          conversationId={currentConversation?.id}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerRight: {
    flexDirection: 'row',
    marginRight: 8,
  },
  headerButton: {
    padding: 8,
    marginHorizontal: 4,
  },
  messageList: {
    padding: 16,
    flexGrow: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 16,
    fontSize: 16,
    color: '#0066CC',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#999999',
    textAlign: 'center',
    marginTop: 8,
  },
  callContainer: {
    flex: 1,
    backgroundColor: '#F5F8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  endCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginTop: 20,
  },
  endCallText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontWeight: 'bold',
  },
});

export default ChatScreen;

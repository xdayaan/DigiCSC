import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import ConversationSelector from '../../components/chat/ConversationSelector';
import { useAuth } from '../../hooks/useAuth';

import MessageBubble from '../../components/chat/MessageBubble';
import ChatInput from '../../components/chat/ChatInput';
import { chatService } from '../../services/chatService';
import api from '../../services/api';

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
  
  // Conversation related states
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [showConversationSelector, setShowConversationSelector] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  // Set up title based on customer data and conversation
  useEffect(() => {
    if (customer && customer.name) {
      navigation.setOptions({
        title: currentConversation ? 
          `${currentConversation.title} - ${customer.name}` : 
          `Chat with ${customer.name}`,
        headerRight: () => (
          <View style={styles.headerRight}>
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
  };
  // Fetch messages from API for this specific customer and conversation
  const fetchMessages = async () => {
    if (!customer || !currentConversation || refreshing) return; // Don't fetch if no customer, conversation or already refreshing
    
    try {
      setRefreshing(true);
      // Use customer identifier (email, phone, or ID) to get messages for this conversation
      const identifier = customer.email || customer.phone || customer.id;
      const response = await chatService.getCustomerConversationMessages(
        identifier,
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
        text: 'Uploading document...',
        document_url: null,
        sent_by: 'freelancer',
        freelancer_id: userData.id,
        conversation_id: currentConversation.id,
        sent_on: new Date().toISOString()
      };
        // Optimistically add to UI
      setMessages(prev => [...prev, tempMessage]);
        // For freelancers, use the upload-with-chat endpoint
      const formData = new FormData();
      
      // Create file object with the correct structure for React Native FormData
      const fileToUpload = {
        uri: file.uri,
        type: file.type || 'application/pdf',
        name: file.name || 'document.pdf'
      };
      
      // Append file as the first field - this is important for multipart/form-data parsing
      formData.append('file', fileToUpload);
      
      // Add metadata in the correct order (after the file)
      const identifier = customer.email || customer.phone || customer.id;
      formData.append('user_identifier', identifier);
      formData.append('sent_by', 'freelancer');
      formData.append('text', ''); // Optional description
      formData.append('conversation_id', currentConversation.id); // Add conversation ID
        // Upload document to customer's chat
      const response = await api.post('/documents/upload-with-chat', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json',
        },
        transformRequest: () => formData, // Prevent axios from trying to transform the FormData
      });
      
      // Update with actual message from server
      if (response.data) {
        // Fetch the latest messages to get the new document message
        fetchMessages();
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
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {loadingConversations ? (
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
});

export default ChatScreen;

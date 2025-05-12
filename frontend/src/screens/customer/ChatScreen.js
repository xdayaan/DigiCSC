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
import { useAuth } from '../../hooks/useAuth';

import MessageBubble from '../../components/chat/MessageBubble';
import ChatInput from '../../components/chat/ChatInput';
import { chatService } from '../../services/chatService';
import api from '../../services/api';
import VoiceCall from '../../components/call/CallComponent';

import ConversationSelector from '../../components/chat/ConversationSelector';

const ChatScreen = () => {
  const { userData, logout } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const flatListRef = useRef(null);
  const requestCheckInterval = useRef(null);
  
  // Get freelancer data from route params
  const { freelancer, requestId } = route.params || {};
    const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [requestAccepted, setRequestAccepted] = useState(false);
  const [checkingRequest, setCheckingRequest] = useState(false);
  
  // Call related state
  const [showCall, setShowCall] = useState(false);
  
  // Conversation related states
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [showConversationSelector, setShowConversationSelector] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  // Set up title based on freelancer data and conversation
  useEffect(() => {
    if (freelancer && freelancer.name) {
      navigation.setOptions({
        title:`${freelancer.name}`,
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
              onPress={() => navigation.navigate('FreelancerDetail', { freelancerId: freelancer.id })}
            >
              <Ionicons name="information-circle-outline" size={24} color="#0066CC" />
            </TouchableOpacity>
          </View>
        ),
      });
    }
  }, [navigation, freelancer, currentConversation]);
  // Check if we have a request ID and if it's been accepted
  useEffect(() => {
    if (requestId) {
      // Check request status
      checkRequestStatus();
      
      // Set up interval to check status every 5 seconds if not accepted
      requestCheckInterval.current = setInterval(() => {
        if (!requestAccepted) {
          checkRequestStatus();
        } else {
          // Clear interval once accepted
          if (requestCheckInterval.current) {
            clearInterval(requestCheckInterval.current);
          }
        }
      }, 5000);
      
      // Clean up interval
      return () => {
        if (requestCheckInterval.current) {
          clearInterval(requestCheckInterval.current);
        }
      };
    } else {
      // If no requestId, assume we're in a direct chat (not from request)
      setRequestAccepted(true);
    }
  }, [requestId, requestAccepted]);
    // Load conversations first once request is accepted
  useEffect(() => {
    if (requestAccepted || !requestId) {
      fetchConversations();
    }
  }, [requestAccepted]);
  
  // Load chat messages once a conversation is selected
  useEffect(() => {
    if ((requestAccepted || !requestId) && currentConversation) {
      fetchMessages();
      
      // Set up interval to refresh messages every 10 seconds
      const interval = setInterval(fetchMessages, 10000);
      
      return () => clearInterval(interval);
    }
  }, [requestAccepted, currentConversation]);
  
  // Fetch all conversations for this freelancer
  const fetchConversations = async () => {
    if (!freelancer) return;
    
    try {
      setLoadingConversations(true);
      const allConversations = await chatService.getConversations();
      
      // Filter conversations for this freelancer
      const freelancerConversations = allConversations.filter(
        conv => conv.freelancer_id === freelancer.id
      );
      
      setConversations(freelancerConversations);
      
      // If there are conversations, select the most recent one
      if (freelancerConversations.length > 0) {
        setCurrentConversation(freelancerConversations[0]);
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
        userData.id,
        freelancer.id
      );
      
      setConversations([newConversation]);
      setCurrentConversation(newConversation);
    } catch (err) {
      console.error('Error creating default conversation:', err);
      setError('Could not create a conversation. Please try again.');
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [messages]);
  // Check if the request has been accepted
  const checkRequestStatus = async () => {
    if (!requestId || checkingRequest || requestAccepted) return;
    
    try {
      setCheckingRequest(true);
      const response = await chatService.getFreelancerRequest(requestId);
      
      if (response && response.accepted) {
        // Request was accepted!
        setRequestAccepted(true);
        
        // Clear check interval
        if (requestCheckInterval.current) {
          clearInterval(requestCheckInterval.current);
          requestCheckInterval.current = null;
        }
      }
    } catch (err) {
      console.error('Error checking request status:', err);
    } finally {
      setCheckingRequest(false);
    }
  };
    // Fetch messages from API for a specific conversation
  const fetchMessages = async () => {
    if (refreshing || (!requestAccepted && requestId) || !currentConversation) return; // Don't fetch if already refreshing, if request not accepted, or no conversation
    
    try {
      setRefreshing(true);
      const data = await chatService.getConversationMessages(currentConversation.id, 50, 0);
      
      if (data && Array.isArray(data)) {
        // Sort messages by date (newest last)
        const sortedMessages = data.sort((a, b) => 
          new Date(a.sent_on) - new Date(b.sent_on)
        );
        
        setMessages(sortedMessages);
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
  // Handle sending text message
  const handleSendText = async (text) => {
    // If there's a requestId and it's not accepted, don't allow sending
    if (requestId && !requestAccepted) {
      Alert.alert('Waiting for Freelancer', 'Please wait for the freelancer to accept your request before sending messages.');
      return;
    }
    
    if (!currentConversation) {
      Alert.alert('Error', 'No active conversation. Please select or create one.');
      return;
    }
    
    try {
      setSendingMessage(true);
      
      const messageData = {
        type: 'text',
        text,
        sent_by: 'user',
        freelancer_id: freelancer ? freelancer.id : null,
        conversation_id: currentConversation.id,
        sent_on: new Date().toISOString()
      };
      
      // Optimistically add to UI
      setMessages(prev => [...prev, { ...messageData, id: 'temp-' + Date.now() }]);
      
      // Send to API with conversation ID
      const response = await chatService.sendTextMessageToConversation(
        text, 
        'user', 
        currentConversation.id,
        freelancer ? freelancer.id : null
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
    // If there's a requestId and it's not accepted, don't allow sending
    if (requestId && !requestAccepted) {
      Alert.alert('Waiting for Freelancer', 'Please wait for the freelancer to accept your request before sending documents.');
      return;
    }
    
    if (!currentConversation) {
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
        sent_by: 'user',
        conversation_id: currentConversation.id,
        freelancer_id: freelancer ? freelancer.id : null,
        sent_on: new Date().toISOString()
      };        // Optimistically add to UI
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
      formData.append('freelancer_id', freelancer ? freelancer.id : '');
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

  // Handle conversation selection
  const handleSelectConversation = (conversation) => {
    setCurrentConversation(conversation);
    setShowConversationSelector(false);
    setLoading(true);
    setMessages([]);
    fetchMessages();
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
      <Text style={styles.emptySubtitle}>Start the conversation by sending a message</Text>
    </View>
  );
  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>      {showCall ? (
        <View style={styles.callContainer}>
          <VoiceCall 
            channelName={freelancer ? `call-${userData.id}-${freelancer.id}` : 'default-channel'}
            role="guest"
          />
          <TouchableOpacity 
            style={styles.endCallButton}
            onPress={() => setShowCall(false)}
          >
            <Ionicons name="call-outline" size={22} color="#FFFFFF" />
            <Text style={styles.endCallText}>End Call</Text>
          </TouchableOpacity>
        </View>
      ) : requestId && !requestAccepted ? (
        <View style={styles.waitingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.waitingTitle}>Waiting for Freelancer</Text>
          <Text style={styles.waitingText}>
            Please wait for {freelancer?.name || 'the freelancer'} to accept your request.
          </Text>
          <View style={styles.statusContainer}>
            {checkingRequest ? (
              <Text style={styles.checkingText}>Checking request status...</Text>
            ) : (
              <TouchableOpacity style={styles.refreshButton} onPress={checkRequestStatus}>
                <Ionicons name="refresh" size={24} color="#0066CC" />
                <Text style={styles.refreshText}>Check Status</Text>
              </TouchableOpacity>
            )}
          </View>
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
        disabled={!currentConversation || (requestId && !requestAccepted)}
      />
      
      {/* Conversation Selector Modal */}
      <ConversationSelector
        isVisible={showConversationSelector}
        onClose={() => setShowConversationSelector(false)}
        onSelect={handleSelectConversation}
        userId={userData?.id}
        freelancerId={freelancer?.id}
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
  },  emptySubtitle: {
    fontSize: 16,
    color: '#999999',
    textAlign: 'center',
    marginTop: 8,
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F5F8FF',
  },
  waitingTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0066CC',
    marginTop: 16,
  },
  waitingText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 12,
    marginHorizontal: 20,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  checkingText: {
    fontSize: 14,
    color: '#0066CC',
    fontStyle: 'italic',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  refreshText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
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

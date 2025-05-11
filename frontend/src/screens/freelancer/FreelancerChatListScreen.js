// Create a simple placeholder component for FreelancerChatListScreen
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../hooks/useAuth';
import { chatService } from '../../services/chatService';
import api from '../../services/api';

const FreelancerChatListScreen = () => {
  const navigation = useNavigation();
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState([]);
  const [error, setError] = useState(null);
  
  // Load active chats on component mount
  useEffect(() => {
    fetchActiveChats();
  }, []);
  
  // Fetch active chats (accepted requests)
  const fetchActiveChats = async () => {
    if (!userData || !userData.id) return;
    
    try {
      setLoading(true);
      // First get accepted requests
      const requestsResponse = await api.get(`/freelancer-requests/freelancer/${userData.id}`);
      
      if (requestsResponse.data && Array.isArray(requestsResponse.data)) {
        const acceptedRequests = requestsResponse.data.filter(req => req.accepted);
        
        // Get customer details for each request
        const chatsData = await Promise.all(acceptedRequests.map(async (request) => {
          try {
            const customerResponse = await api.get(`/users/${request.user_id}`);
            const customer = customerResponse.data;
            
            // Get last message if available
            let lastMessage = "No messages yet";
            let time = new Date(request.accepted_on || request.created_on).toLocaleTimeString();
            let unread = 0;
            
            // If you implement unread messages count in the future, you can set it here
            
            return {
              id: request.id,
              customer,
              name: customer.name || `Customer #${customer.id}`,
              lastMessage,
              time,
              unread,
              requestId: request.id
            };
          } catch (error) {
            console.error('Error fetching customer details:', error);
            return null;
          }
        }));
        
        // Filter out any nulls from errors
        setChats(chatsData.filter(Boolean));
      }
    } catch (error) {
      console.error('Error fetching active chats:', error);
      setError('Failed to load chats');
    } finally {
      setLoading(false);
    }
  };
  
  // For now, use sample data as fallback if API call fails or there are no chats
  const chatData = chats.length > 0 ? chats : [
    { id: '1', name: 'John Doe', lastMessage: 'Hello, I need help with my internet connection', time: '10:30 AM', unread: 2 },
    { id: '2', name: 'Sarah Smith', lastMessage: 'When can you help me set up my new router?', time: '9:15 AM', unread: 0 },
    { id: '3', name: 'Robert Johnson', lastMessage: 'Thanks for your assistance', time: 'Yesterday', unread: 0 },
  ];
  const renderChatItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.chatItem}
      onPress={() => {
        // Navigate to chat with this customer
        navigation.navigate('Chat', { 
          customer: item.customer || { id: item.id, name: item.name },
          requestId: item.requestId 
        });
      }}
    >
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
      </View>
      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName}>{item.name}</Text> 
          <Text style={styles.chatTime}>{item.time}</Text>
        </View>
        <View style={styles.chatFooter}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage}
          </Text>
          {item.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Recent Chats</Text>
        {!loading && (
          <TouchableOpacity onPress={fetchActiveChats}>
            <Ionicons name="refresh-outline" size={24} color="#0066CC" />
          </TouchableOpacity>
        )}
      </View>
      
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#FF6B6B" />
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchActiveChats}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : chatData.length > 0 ? (
        <FlatList
          data={chatData}
          keyExtractor={(item) => item.id}
          renderItem={renderChatItem}
          contentContainerStyle={styles.chatList}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={60} color="#CCCCCC" />
          <Text style={styles.emptyText}>No chats yet</Text>
          <Text style={styles.emptySubtext}>Your conversations will appear here</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  header: {
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066CC',
  },
  chatList: {
    paddingVertical: 10,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  chatTime: {
    fontSize: 12,
    color: '#999999',
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
    marginRight: 10,
  },
  unreadBadge: {
    backgroundColor: '#0066CC',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666666',
    marginTop: 20,
  },  emptySubtext: {
    fontSize: 14,
    color: '#999999',
    marginTop: 10,
    textAlign: 'center',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#0066CC',
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
});

export default FreelancerChatListScreen;

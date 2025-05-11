import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import chatService from '../../services/chatService';
import { useAuth } from '../../hooks/useAuth';

const ConversationSelector = ({ 
  isVisible, 
  onClose, 
  onSelect, 
  userId, 
  freelancerId,
  currentConversationId
}) => {
  const { userData } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newConversationTitle, setNewConversationTitle] = useState('');

  // Fetch conversations on mount
  useEffect(() => {
    if (isVisible) {
      fetchConversations();
    }
  }, [isVisible]);

  // Fetch conversations from API
  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await chatService.getConversations();
      setConversations(data || []);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  // Create a new conversation
  const createNewConversation = async () => {
    if (!newConversationTitle.trim()) {
      Alert.alert('Error', 'Please enter a conversation title');
      return;
    }

    try {
      setIsCreating(true);
      const newConversation = await chatService.createConversation(
        newConversationTitle,
        userId || userData.id,
        freelancerId
      );
      
      // Add to conversations list
      setConversations(prev => [newConversation, ...prev]);
      
      // Reset form
      setNewConversationTitle('');
      setIsCreating(false);
      
      // Select the new conversation
      onSelect(newConversation);
    } catch (err) {
      console.error('Error creating conversation:', err);
      Alert.alert('Error', 'Failed to create conversation');
      setIsCreating(false);
    }
  };

  // Render each conversation
  const renderConversation = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.conversationItem,
        currentConversationId === item.id && styles.selectedConversation
      ]}
      onPress={() => onSelect(item)}
    >
      <View style={styles.conversationDetails}>
        <Text style={styles.conversationTitle}>{item.title}</Text>
        <Text style={styles.conversationTime}>
          {new Date(item.last_message_time).toLocaleString()}
        </Text>
      </View>
      {currentConversationId === item.id && (
        <Ionicons name="checkmark-circle" size={24} color="#0066CC" />
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Conversation</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.newConversationContainer}>
            <TextInput
              style={styles.input}
              placeholder="New conversation title"
              value={newConversationTitle}
              onChangeText={setNewConversationTitle}
              editable={!isCreating}
            />
            <TouchableOpacity 
              style={[styles.createButton, isCreating && styles.disabledButton]} 
              onPress={createNewConversation}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.createButtonText}>Create</Text>
              )}
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#0066CC" style={styles.loader} />
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchConversations}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : conversations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color="#CCC" />
              <Text style={styles.emptyText}>No conversations yet</Text>
              <Text style={styles.emptySubtext}>
                Create a new conversation to get started
              </Text>
            </View>
          ) : (
            <FlatList
              data={conversations}
              renderItem={renderConversation}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
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
  newConversationContainer: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginRight: 8,
  },
  createButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
  },
  createButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#AAA',
  },
  listContent: {
    padding: 16,
  },
  conversationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  conversationDetails: {
    flex: 1,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  conversationTime: {
    fontSize: 12,
    color: '#666',
  },
  selectedConversation: {
    backgroundColor: '#E6F0FF',
  },
  loader: {
    marginTop: 40,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 5,
  },
  retryText: {
    color: 'white',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default ConversationSelector;

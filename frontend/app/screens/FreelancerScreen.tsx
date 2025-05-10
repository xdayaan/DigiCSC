import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '../services/AuthContext';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { chatApi } from '../services/api';

// Define freelancer interface based on API response
interface Freelancer {
  id: number;
  name: string;
  phone: string;
  preferred_language: string;
  email?: string;
  csc_id?: string;
  user_type: string;
  created_at: string;
  updated_at: string;
}

const FreelancerScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch freelancers from API
  useEffect(() => {
    const fetchFreelancers = async () => {
      try {
        setIsLoading(true);
        const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await axios.get<Freelancer[]>(`${baseUrl}/api/v1/users/freelancers?skip=0&limit=100`);
        
        // Sort freelancers - user's preferred language first
        const sortedFreelancers = sortFreelancersByLanguage(response.data);
        setFreelancers(sortedFreelancers);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching freelancers:', err);
        setError('Failed to load freelancers. Please try again.');
        setIsLoading(false);
      }
    };
    
    fetchFreelancers();
  }, [user]);
  
  // Sort function to prioritize freelancers with user's preferred language
  const sortFreelancersByLanguage = (freelancerList: Freelancer[]): Freelancer[] => {
    if (!user?.preferred_language) return freelancerList;
    
    return [...freelancerList].sort((a, b) => {
      // Put user's preferred language first
      if (a.preferred_language === user.preferred_language && b.preferred_language !== user.preferred_language) {
        return -1;
      }
      if (a.preferred_language !== user.preferred_language && b.preferred_language === user.preferred_language) {
        return 1;
      }
      // Then sort alphabetically by name
      return a.name.localeCompare(b.name);
    });
  };

  const handleChatPress = async (freelancer: Freelancer) => {
    try {
      if (!user) {
        Alert.alert('Error', 'You must be logged in to chat with a freelancer');
        return;
      }
      
      // Create a chat for this interaction
      let chatId: string;
      try {
        const response = await chatApi.createChat(user.id);
        chatId = response.chat_id;
      } catch (error) {
        console.error('Error creating chat:', error);
        Alert.alert('Error', 'Failed to start chat. Please try again.');
        return;
      }
      
      // Navigate to the chat screen with appropriate parameters
      router.push({
        pathname: '/screens/ChatScreen',
        params: { 
          chatId: chatId,
          isFreelancerMode: 'false',
          freelancerId: freelancer.id.toString()
        }
      });
      
    } catch (error) {
      console.error('Error starting chat with freelancer:', error);
      Alert.alert('Error', 'Failed to start chat. Please try again.');
    }
  };

  
  const renderFreelancerItem = ({ item }: { item: Freelancer }) => {
    // Check if freelancer language matches user's preferred language
    const isPreferredLanguage = user?.preferred_language === item.preferred_language;
    
    return (
      <View style={[
        styles.freelancerItem,
        isPreferredLanguage && styles.preferredLanguageItem
      ]}>
        <View style={styles.freelancerInfo}>
          <ThemedText style={styles.freelancerName}>{item.name}</ThemedText>
          <View style={styles.languageTag}>
            <Ionicons name="globe-outline" size={14} color="#007AFF" />
            <ThemedText style={styles.languageText}>
              {item.preferred_language.charAt(0).toUpperCase() + item.preferred_language.slice(1)}
            </ThemedText>
          </View>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.chatButton}
            onPress={() => handleChatPress(item)}
          >
            <Ionicons name="chatbubble" size={20} color="#FFFFFF" />
            <ThemedText style={styles.buttonText}>Chat</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle} type="subtitle">Available Freelancers</ThemedText>
        <View style={styles.headerRight} />
      </View>
      
      {/* Freelancer List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <ThemedText style={styles.loadingText}>Loading freelancers...</ThemedText>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={48} color="#FF3B30" />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setIsLoading(true);
              setError(null);
              // Re-fetch freelancers
              const fetchFreelancers = async () => {
                try {
                  const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
                  const response = await axios.get<Freelancer[]>(`${baseUrl}/api/v1/users/freelancers?skip=0&limit=100`);
                  const sortedFreelancers = sortFreelancersByLanguage(response.data);
                  setFreelancers(sortedFreelancers);
                  setIsLoading(false);
                } catch (err) {
                  console.error('Error fetching freelancers:', err);
                  setError('Failed to load freelancers. Please try again.');
                  setIsLoading(false);
                }
              };
              fetchFreelancers();
            }}
          >
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      ) : freelancers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people" size={48} color="#8E8E93" />
          <ThemedText style={styles.emptyText}>No freelancers available at the moment</ThemedText>
        </View>
      ) : (
        <FlatList
          data={freelancers}
          renderItem={renderFreelancerItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.freelancerList}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
      
      {/* Language preference hint */}
      {freelancers.length > 0 && (
        <View style={styles.hint}>
          <Ionicons name="information-circle" size={16} color="#007AFF" />
          <ThemedText style={styles.hintText}>
            Freelancers who speak {user?.preferred_language || 'your preferred language'} are highlighted
          </ThemedText>
        </View>
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  headerRight: {
    width: 40, // To balance the header
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#007AFF',
    borderRadius: 8,
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
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  freelancerList: {
    padding: 16,
  },
  freelancerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  preferredLanguageItem: {
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  freelancerInfo: {
    flex: 1,
  },
  freelancerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#000000',
  },
  languageTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  languageText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#007AFF',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF', // Blue color for chat
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 4,
  },
  separator: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 8,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  hintText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#8E8E93',
  },
});

export default FreelancerScreen;
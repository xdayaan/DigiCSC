// FreelancerListScreen - displays a list of available freelancers
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../../services/api';
import { chatService } from '../../services/chatService';
import { useAuth } from '../../hooks/useAuth';

const FreelancerListScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [connectingId, setConnectingId] = useState(null); // Track which freelancer is being connected
  const [freelancers, setFreelancers] = useState([]);
  const [error, setError] = useState(null);
  const { userData, logout } = useAuth();
 
  console.log("user:", userData)

  useEffect(() => {
    fetchFreelancers();
  }, []);

  const fetchFreelancers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/freelancers');
      setFreelancers(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching freelancers:', err);
      setError('Failed to load freelancers. Please try again later.');
      Alert.alert('Error', err.formattedMessage || 'Failed to load freelancers');
    } finally {
      setLoading(false);
    }
  };

  const renderFreelancerItem = ({ item }) => {
    // Get the specialty or a placeholder (in real API, might need to map to a different field)
    const specialty = item.specialty || 'Freelancer';
    // Use sample rating and jobs data for real API integration
    const rating = item.rating || 4.5;
    const completedJobs = item.completedJobs || 0;
    
    return (
      <View style={styles.freelancerItem}>
        <TouchableOpacity 
          style={styles.freelancerContent}
          onPress={() => navigation.navigate('FreelancerDetail', { freelancerId: item.id })}
        >
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{item.name?.charAt(0) || '?'}</Text>
          </View>
          <View style={styles.contentContainer}>
            <Text style={styles.nameText}>{item.name}</Text>
            <Text style={styles.specialtyText}>{specialty}</Text>
            <View style={styles.statsContainer}>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.ratingText}>{rating}</Text>
              </View>
              <Text style={styles.jobsText}>{completedJobs} jobs completed</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#CCCCCC" />
        </TouchableOpacity>        
        <TouchableOpacity 
          style={[styles.connectButton, connectingId === item.id && styles.connectingButton]}
          onPress={() => handleConnect(item)}
          disabled={connectingId !== null} // Disable all connect buttons while connecting to any freelancer
        >
          {connectingId === item.id ? (
            <View style={styles.connectingContainer}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.connectButtonText}>Connecting...</Text>
            </View>
          ) : (
            <Text style={styles.connectButtonText}>Connect</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };  
  
  // Handle connect button press
  const handleConnect = async (freelancer) => {
    console.log('Connecting with freelancer:', freelancer);
    try {
      console.log("Setting connectingId to:", freelancer.id);
      setConnectingId(freelancer.id);

      // First create a conversation
      const conversationTitle = `Chat with ${freelancer.name}`;
      console.log('Creating conversation with title:', conversationTitle);
      
      // Create a conversation
      const conversationResponse = await chatService.createConversation(
        conversationTitle,
        userData.id,
        freelancer.id
      );
      
      console.log('Conversation created:', conversationResponse);
      
      // Now create a freelancer request with the conversation ID
      console.log('Creating freelancer request for conversation:', conversationResponse.id);
      
      const requestResponse = await chatService.createFreelancerRequest(
        userData.id,
        freelancer.id,
        conversationResponse.id
      );
        
      console.log('Request response received:', requestResponse);
      if (requestResponse && requestResponse.id) {
        // Success! Now show the user that we're waiting for the freelancer to accept
        setConnectingId(null);

        navigation.navigate('Chat', { 
          freelancer, 
          requestId: requestResponse.id 
        });
      } else {
        throw new Error('Failed to create freelancer request');
      }
    } catch (error) {
      console.error('Error connecting with freelancer:', error);
      Alert.alert('Error', 'Could not connect with freelancer. Please try again.');
    } finally {
      // Make sure connecting state is reset even if there's an error
      setConnectingId(null);
    }
  };
  
  // Check if a request has been accepted
  const checkRequestAcceptance = (requestId, freelancer) => {
    let attempts = 0;
    const maxAttempts = 60; // Check for up to 5 minutes (60 * 5 seconds)
    
    const checkInterval = setInterval(async () => {
      try {
        const response = await api.get(`/freelancer-requests/${requestId}`);
        if (response.data && response.data.accepted) {
          // Request was accepted!
          clearInterval(checkInterval);
          
          Alert.alert(
            'Request Accepted',
            `${freelancer.name} has accepted your request! Connecting you now...`,
            [
              {
                text: 'OK',
                onPress: () => navigation.navigate('Chat', { freelancer, requestId })
              }
            ],
            { cancelable: false }
          );
        } else {
          attempts++;
          if (attempts >= maxAttempts) {
            // Timeout after max attempts
            clearInterval(checkInterval);
            Alert.alert(
              'Request Timed Out',
              'The freelancer did not respond to your request. Please try again later.',
              [{ text: 'OK' }],
              { cancelable: false }
            );
          }
        }
      } catch (error) {
        console.error('Error checking request acceptance:', error);
        clearInterval(checkInterval);
      }
    }, 5000); // Check every 5 seconds
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Available Freelancers</Text>
      </View>
      
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Loading freelancers...</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchFreelancers}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : freelancers.length > 0 ? (
        <FlatList
          data={freelancers}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={renderFreelancerItem}
          contentContainerStyle={styles.freelancerList}
          refreshing={loading}
          onRefresh={fetchFreelancers}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={60} color="#CCCCCC" />
          <Text style={styles.emptyText}>No freelancers available</Text>
          <Text style={styles.emptySubtext}>Please check back later</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0066CC',
  },
  freelancerList: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  freelancerItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  freelancerContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
  },
  nameText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 6,
  },
  specialtyText: {
    fontSize: 15,
    color: '#555555',
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 14,
    backgroundColor: '#FFEFCC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E6A100',
    marginLeft: 4,
  },
  jobsText: {
    fontSize: 13,
    color: '#777777',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  connectButton: {
    backgroundColor: '#0066CC',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
  },  
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  connectingButton: {
    backgroundColor: '#004999', // Darker shade to indicate processing
  },
  connectingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666666',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#999999',
    marginTop: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
    marginTop: 16,
    textAlign: 'center',
    marginHorizontal: 24,
  },
  retryButton: {
    backgroundColor: '#FF6B6B',
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

export default FreelancerListScreen;

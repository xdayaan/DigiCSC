import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { formatDistanceToNow } from 'date-fns';

import { chatService } from '../../services/chatService';
import api from '../../services/api';

const { width } = Dimensions.get('window');

const RequestsScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const intervalRef = useRef(null);
  
  const [activeRequests, setActiveRequests] = useState([]);
  const [pastRequests, setPastRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recentRequestLoading, setRecentRequestLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Set up data fetch on component mount
  useEffect(() => {
    // Initial fetch
    fetchRequests();
    
    // Set interval to check for recent requests every 5 seconds
    intervalRef.current = setInterval(checkForRecentRequests, 5000);
    
    // Clear interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
  
  // Fetch all freelancer requests
  const fetchRequests = async () => {
    if (!user || !user.id) return;
    
    try {
      setLoading(true);
      const response = await chatService.getFreelancerRequests(user.id);
      
      if (response && Array.isArray(response)) {
        // Filter active (not accepted yet) and past requests
        const active = response.filter(req => !req.accepted);
        const past = response.filter(req => req.accepted);
        
        setActiveRequests(active);
        setPastRequests(past);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching freelancer requests:', err);
      setError('Failed to load requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Check for recent requests (within 60 seconds)
  const checkForRecentRequests = async () => {
    if (!user || !user.id || recentRequestLoading) return;
    
    try {
      setRecentRequestLoading(true);
      const recentRequest = await chatService.getRecentFreelancerRequest(user.id);
      
      if (recentRequest && recentRequest.id) {
        // Check if this request is already in our list
        const isExisting = activeRequests.some(req => req.id === recentRequest.id);
        
        if (!isExisting) {
          // Add to active requests and show notification
          setActiveRequests(prev => [recentRequest, ...prev]);
          
          // Get customer details
          try {
            const customerResponse = await api.get(`/users/${recentRequest.user_id}`);
            if (customerResponse.data) {
              // Show notification of new request
              Alert.alert(
                'New Support Request',
                `${customerResponse.data.name} is requesting your assistance.`,
                [
                  { text: 'View', onPress: () => handleViewRequest(recentRequest, customerResponse.data) },
                  { text: 'Later', style: 'cancel' }
                ]
              );
            }
          } catch (error) {
            console.error('Error fetching customer details:', error);
          }
        }
      }
    } catch (err) {
      console.error('Error checking for recent requests:', err);
    } finally {
      setRecentRequestLoading(false);
    }
  };
  
  // Handle viewing a request
  const handleViewRequest = async (request, customer) => {
    navigation.navigate('RequestDetail', { request, customer });
  };
  
  // Handle accepting a request
  const handleAcceptRequest = async (request, customer) => {
    try {
      // Update the request status
      await chatService.updateFreelancerRequest(request.id, true);
      
      // Refresh the requests list
      fetchRequests();
      
      // Navigate to chat with this customer
      navigation.navigate('Chat', { customer, requestId: request.id });
    } catch (err) {
      console.error('Error accepting request:', err);
      Alert.alert('Error', 'Failed to accept request. Please try again.');
    }
  };
  
  // Handle rejecting a request
  const handleRejectRequest = async (request) => {
    try {
      // Delete the request (there's no explicit reject action, just don't accept it)
      await api.delete(`/freelancer-requests/${request.id}`);
      
      // Remove from active requests list
      setActiveRequests(prev => prev.filter(req => req.id !== request.id));
    } catch (err) {
      console.error('Error rejecting request:', err);
      Alert.alert('Error', 'Failed to reject request. Please try again.');
    }
  };
  
  // Render an active request item
  const renderActiveRequestItem = ({ item }) => {
    // Calculate how long ago the request was created
    const timeAgo = formatDistanceToNow(new Date(item.created_on), { addSuffix: true });
    // Check if request is still valid (within 60 seconds)
    const isStillValid = (new Date() - new Date(item.created_on)) < 60000;
    
    return (
      <View style={[
        styles.requestItem, 
        isStillValid ? styles.recentRequest : styles.expiredRequest
      ]}>
        <View style={styles.requestHeader}>
          <Text style={styles.requestTime}>{timeAgo}</Text>
          {isStillValid && (
            <View style={styles.activeIndicator}>
              <Text style={styles.activeText}>ACTIVE</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.customerText}>
          Customer #{item.user_id}
        </Text>
        
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.viewButton]}
            onPress={() => handleViewRequest(item)}
          >
            <Ionicons name="eye-outline" size={18} color="#0066CC" />
            <Text style={styles.viewButtonText}>View</Text>
          </TouchableOpacity>
          
          {isStillValid ? (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => handleAcceptRequest(item)}
              >
                <Ionicons name="checkmark-outline" size={18} color="#4CAF50" />
                <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleRejectRequest(item)}
              >
                <Ionicons name="close-outline" size={18} color="#FF6B6B" />
                <Text style={styles.rejectButtonText}>Reject</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.expiredText}>Request expired</Text>
          )}
        </View>
      </View>
    );
  };
  
  // Render a past request item
  const renderPastRequestItem = ({ item }) => {
    // Calculate how long ago the request was created
    const timeAgo = formatDistanceToNow(new Date(item.created_on), { addSuffix: true });
    
    return (
      <TouchableOpacity 
        style={[styles.requestItem, styles.pastRequest]}
        onPress={() => handleViewRequest(item)}
      >
        <View style={styles.requestHeader}>
          <Text style={styles.requestTime}>{timeAgo}</Text>
          <View style={styles.completedIndicator}>
            <Text style={styles.completedText}>COMPLETED</Text>
          </View>
        </View>
        
        <Text style={styles.customerText}>
          Customer #{item.user_id}
        </Text>
        
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.viewButton]}
          >
            <Ionicons name="chatbubble-outline" size={18} color="#0066CC" />
            <Text style={styles.viewButtonText}>View Chat</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };
  
  // Render active requests section
  const renderActiveRequests = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Active Requests</Text>
      {activeRequests.length > 0 ? (
        <FlatList
          data={activeRequests}
          renderItem={renderActiveRequestItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContentContainer}
          scrollEnabled={false} // Parent ScrollView handles scrolling
        />
      ) : (
        <View style={styles.emptySection}>
          <Ionicons name="alert-outline" size={30} color="#CCCCCC" />
          <Text style={styles.emptyText}>No active requests</Text>
        </View>
      )}
    </View>
  );
  
  // Render past requests section
  const renderPastRequests = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Past Requests</Text>
      {pastRequests.length > 0 ? (
        <FlatList
          data={pastRequests}
          renderItem={renderPastRequestItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContentContainer}
          scrollEnabled={false} // Parent ScrollView handles scrolling
        />
      ) : (
        <View style={styles.emptySection}>
          <Ionicons name="time-outline" size={30} color="#CCCCCC" />
          <Text style={styles.emptyText}>No past requests</Text>
        </View>
      )}
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Support Requests</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchRequests}>
          <Ionicons name="refresh" size={24} color="#0066CC" />
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loaderText}>Loading requests...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchRequests}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={[1]} // Just one item to render both sections
          renderItem={() => (
            <>
              {renderActiveRequests()}
              {renderPastRequests()}
            </>
          )}
          contentContainerStyle={styles.scrollContent}
          keyExtractor={() => 'sections'}
          refreshing={loading}
          onRefresh={fetchRequests}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0066CC',
  },
  refreshButton: {
    padding: 8,
  },
  scrollContent: {
    paddingBottom: 20,
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
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 12,
  },
  listContentContainer: {
    paddingBottom: 12,
  },
  requestItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  recentRequest: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  expiredRequest: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  pastRequest: {
    borderLeftWidth: 4,
    borderLeftColor: '#9E9E9E',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  requestTime: {
    fontSize: 14,
    color: '#757575',
  },
  activeIndicator: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0066CC',
  },
  completedIndicator: {
    backgroundColor: '#ECEFF1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#607D8B',
  },
  customerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  viewButton: {
    borderColor: '#0066CC',
    backgroundColor: '#F0F8FF',
  },
  viewButtonText: {
    color: '#0066CC',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  acceptButton: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  acceptButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  rejectButton: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF0F0',
  },
  rejectButtonText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  expiredText: {
    fontSize: 14,
    color: '#FF9800',
    fontStyle: 'italic',
    flex: 2,
    textAlign: 'center',
  },
  emptySection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  emptyText: {
    fontSize: 16,
    color: '#999999',
    marginTop: 8,
  },
});

export default RequestsScreen;

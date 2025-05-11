import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';

import { chatService } from '../../services/chatService';
import api from '../../services/api';

const RequestDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { request, customer } = route.params || {};
  
  const [isValid, setIsValid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customerDetails, setCustomerDetails] = useState(customer || null);
  const [requestMessage, setRequestMessage] = useState(null);
  
  // Set up navigation options
  useEffect(() => {
    if (request) {
      navigation.setOptions({
        title: `Request #${request.id}`,
      });
    }
  }, [navigation, request]);
  
  // Load customer and request details
  useEffect(() => {
    if (request) {
      fetchRequestDetails();
      checkValidity();
      
      // Check validity every 5 seconds
      const interval = setInterval(checkValidity, 5000);
      
      return () => clearInterval(interval);
    }
  }, [request]);
  
  // Fetch the request details
  const fetchRequestDetails = async () => {
    try {
      setLoading(true);
      
      // If we don't have customer details, fetch them
      if (!customerDetails && request.user_id) {
        try {
          const customerResponse = await api.get(`/users/${request.user_id}`);
          if (customerResponse.data) {
            setCustomerDetails(customerResponse.data);
          }
        } catch (error) {
          console.error('Error fetching customer details:', error);
        }
      }
      
      // Try to get the chat message associated with this request
      if (request.chat_id) {
        try {
          // This is a simplified approach, in a real app you'd need to
          // implement a way to get a specific message by ID
          const messagesResponse = await api.get(`/chat/customer/${request.user_id}`);
          if (messagesResponse.data && Array.isArray(messagesResponse.data)) {
            const message = messagesResponse.data.find(msg => msg.id === request.chat_id);
            if (message) {
              setRequestMessage(message);
            }
          }
        } catch (error) {
          console.error('Error fetching request message:', error);
        }
      }
    } catch (err) {
      console.error('Error fetching request details:', err);
      Alert.alert('Error', 'Could not load request details.');
    } finally {
      setLoading(false);
    }
  };
  
  // Check if the request is still valid (within 60 seconds)
  const checkValidity = () => {
    if (request && request.created_on) {
      const isStillValid = (new Date() - new Date(request.created_on)) < 60000;
      setIsValid(isStillValid);
    } else {
      setIsValid(false);
    }
  };
  
  // Handle accepting request
  const handleAcceptRequest = async () => {
    try {
      setLoading(true);
      await chatService.updateFreelancerRequest(request.id, true);
      
      Alert.alert(
        'Request Accepted',
        'You have successfully accepted this request. Redirecting to chat...',
        [
          {
            text: 'OK',
            onPress: () => navigation.replace('Chat', { customer: customerDetails, requestId: request.id })
          }
        ]
      );
    } catch (err) {
      console.error('Error accepting request:', err);
      Alert.alert('Error', 'Failed to accept request. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle rejecting request
  const handleRejectRequest = async () => {
    try {
      setLoading(true);
      
      // There's no explicit "reject" functionality, so we'll delete the request
      await api.delete(`/freelancer-requests/${request.id}`);
      
      Alert.alert(
        'Request Rejected',
        'You have rejected this request.',
        [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]
      );
    } catch (err) {
      console.error('Error rejecting request:', err);
      Alert.alert('Error', 'Failed to reject request. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  if (!request) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#FF6B6B" />
          <Text style={styles.errorText}>Request not found</Text>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loaderText}>Loading request details...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Status indicator */}
          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>Status:</Text>
            <View style={[
              styles.statusIndicator,
              isValid ? styles.validStatus : styles.expiredStatus
            ]}>
              <Text style={[
                styles.statusText,
                isValid ? styles.validStatusText : styles.expiredStatusText
              ]}>
                {isValid ? 'ACTIVE' : 'EXPIRED'}
              </Text>
            </View>
          </View>
          
          {/* Request details */}
          <View style={styles.detailCard}>
            <Text style={styles.cardTitle}>Request Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Request ID:</Text>
              <Text style={styles.detailValue}>#{request.id}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Created:</Text>
              <Text style={styles.detailValue}>
                {formatDistanceToNow(new Date(request.created_on), { addSuffix: true })}
              </Text>
            </View>
            {request.chat_id && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Chat ID:</Text>
                <Text style={styles.detailValue}>{request.chat_id}</Text>
              </View>
            )}
          </View>
          
          {/* Customer information */}
          {customerDetails && (
            <View style={styles.detailCard}>
              <Text style={styles.cardTitle}>Customer Information</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Name:</Text>
                <Text style={styles.detailValue}>{customerDetails.name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Email:</Text>
                <Text style={styles.detailValue}>{customerDetails.email}</Text>
              </View>
              {customerDetails.phone && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone:</Text>
                  <Text style={styles.detailValue}>{customerDetails.phone}</Text>
                </View>
              )}
              {customerDetails.preferred_language && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Language:</Text>
                  <Text style={styles.detailValue}>
                    {customerDetails.preferred_language.charAt(0).toUpperCase() + 
                      customerDetails.preferred_language.slice(1)}
                  </Text>
                </View>
              )}
            </View>
          )}
          
          {/* Message details */}
          {requestMessage && (
            <View style={styles.detailCard}>
              <Text style={styles.cardTitle}>Message</Text>
              <View style={styles.messageContainer}>
                {requestMessage.type === 'text' ? (
                  <Text style={styles.messageText}>{requestMessage.text}</Text>
                ) : (
                  <View style={styles.documentInfo}>
                    <Ionicons 
                      name={requestMessage.document_type === 'image' ? 'image' : 'document-text'} 
                      size={24} 
                      color="#0066CC" 
                    />
                    <Text style={styles.documentText}>
                      {requestMessage.document_type || 'Document'} 
                      {requestMessage.text ? `: ${requestMessage.text}` : ''}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
          
          {/* Action buttons */}
          <View style={styles.actionsContainer}>
            {isValid ? (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={handleAcceptRequest}
                  disabled={loading}
                >
                  <Ionicons name="checkmark-circle-outline" size={24} color="#FFFFFF" />
                  <Text style={styles.acceptButtonText}>Accept Request</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={handleRejectRequest}
                  disabled={loading}
                >
                  <Ionicons name="close-circle-outline" size={24} color="#FFFFFF" />
                  <Text style={styles.rejectButtonText}>Reject Request</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.expiredNotice}>
                <Ionicons name="time-outline" size={32} color="#FF9800" />
                <Text style={styles.expiredNoticeText}>
                  This request has expired and can no longer be accepted.
                </Text>
              </View>
            )}
            
            <TouchableOpacity
              style={[styles.actionButton, styles.backButton]}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back-outline" size={24} color="#FFFFFF" />
              <Text style={styles.backButtonText}>Back to Requests</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    padding: 16,
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
    fontSize: 18,
    color: '#FF6B6B',
    marginTop: 16,
    marginBottom: 24,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  statusIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 100,
    alignItems: 'center',
  },
  validStatus: {
    backgroundColor: '#E8F5E9',
  },
  validStatusText: {
    color: '#4CAF50',
  },
  expiredStatus: {
    backgroundColor: '#FFF3E0',
  },
  expiredStatusText: { 
    color: '#FF9800',
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066CC',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    fontSize: 16,
    color: '#757575',
    flex: 1,
  },
  detailValue: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  messageContainer: {
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  messageText: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 24,
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  documentText: {
    fontSize: 16,
    color: '#333333',
    marginLeft: 8,
  },
  actionsContainer: {
    marginTop: 8,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  rejectButton: {
    backgroundColor: '#FF6B6B',
  },
  rejectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  backButton: {
    backgroundColor: '#0066CC',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  expiredNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  expiredNoticeText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#FF9800',
  },
});

export default RequestDetailScreen;

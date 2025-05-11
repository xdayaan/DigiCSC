import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { chatService } from '../../services/chatService';
import api from '../../services/api';

const FreelancerDashboardScreen = () => {
  const { userData, logout } = useAuth();
  const navigation = useNavigation();
  const intervalRef = useRef(null);
  const [checking, setChecking] = useState(false);
  const [lastRequestId, setLastRequestId] = useState(null);
  const [requestsCount, setRequestsCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState({});

  // Set up interval to check for recent requests
  useEffect(() => {
    // Initial check 
    checkForRecentRequests();
    
    console.log('Setting up request check interval');
    
    // Set up interval (every 5 seconds)
    intervalRef.current = setInterval(checkForRecentRequests, 5000);
    
    // Get stats
    fetchStats();
    
    // Clean up interval on unmount
    return () => {
      console.log('Cleaning up request check interval');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
  // Check for recent freelancer requests
  const checkForRecentRequests = async () => {
    if (!userData || !userData.id || checking) return;
    
    try {
      setChecking(true);
      console.log('Checking for recent requests for freelancer ID:', userData.id);
      const recentRequest = await chatService.getRecentFreelancerRequest(userData.id);
      
      console.log('Recent request check result:', recentRequest);
      
      // Also refresh stats when checking for requests
      await fetchStats();
      
      if (recentRequest && recentRequest.id && recentRequest.id !== lastRequestId) {
        // Store this request ID to avoid duplicate alerts
        setLastRequestId(recentRequest.id);

        // Get customer details
        try {
          const customerResponse = await api.get(`/users/${recentRequest.user_id}`);
          const customer = customerResponse.data;
          
          if (customer) {
            setModalData({
              title: 'New Support Request',
              message: `${customer.name || 'A customer'} is requesting your assistance.`,
              request: recentRequest,
              customer,
            });
            if(!recentRequest.accepted) {
              setModalVisible(true);
            }
          }
        } catch (error) {
          console.error('Error fetching customer details:', error);
        }
      }
    } catch (error) {
      console.error('Error checking for recent requests:', error);
    } finally {
      setChecking(false);
    }
  };
  
  // Fetch freelancer stats
  const fetchStats = async () => {
    if (!userData || !userData.id) return;
    
    try {
      // Get accepted requests count (active chats)
      const activeRequestsResponse = await api.get(`/freelancer-requests/freelancer/${userData.id}`);
      if (activeRequestsResponse.data) {
        const activeRequests = activeRequestsResponse.data.filter(req => req.accepted);
        setRequestsCount(activeRequests.length);
        setCompletedCount(activeRequests.length); // For now use same value, could track separately later
      }
    } catch (error) {
      console.error('Error fetching freelancer stats:', error);
    }
  };
  
  // Handle viewing a request
  const handleViewRequest = (request, customer) => {
    navigation.navigate('RequestDetail', { request, customer });
  };
  
  // Handle accepting a request
  const handleAcceptRequest = async (request, customer) => {
    try {
      await chatService.updateFreelancerRequest(request.id, true);
      // Navigate to chat screen with the customer and requestId
      navigation.navigate('Chat', { customer, requestId: request.id });
    } catch (error) {
      console.error('Error accepting request:', error);
      setModalData({
        title: 'Error',
        message: 'Failed to accept request. Please try again.',
        isError: true
      });
      setModalVisible(true);
    }
  };
  
  // Handle rejecting a request
  const handleRejectRequest = async (requestId) => {
    try {
      await api.delete(`/freelancer-requests/${requestId}`);
      setModalData({
        title: 'Request Rejected',
        message: 'The support request has been rejected.',
        isInfo: true
      });
      setModalVisible(true);
    } catch (error) {
      console.error('Error rejecting request:', error);
      setModalData({
        title: 'Error',
        message: 'Failed to reject request. Please try again.',
        isError: true
      });
      setModalVisible(true);
    }
  };

  const handleModalAction = async (action) => {
    const { request, customer } = modalData;

    if (action === 'view') {
      setModalVisible(false);
      handleViewRequest(request, customer);
    } else if (action === 'accept') {
      setModalVisible(false);
      await handleAcceptRequest(request, customer);
    } else if (action === 'reject') {
      setModalVisible(false);
      await handleRejectRequest(request.id);
    } else if (action === 'close') {
      setModalVisible(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Freelancer Dashboard</Text>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeText}>Welcome, {userData?.name || 'Freelancer'}!</Text>
          <Text style={styles.welcomeSubtext}>You're logged in as a freelancer</Text>
          <Text style={styles.cscId}>CSC ID: {userData?.csc_id || 'Not available'}</Text>
        </View>
          <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{requestsCount}</Text>
            <Text style={styles.statLabel}>Active Chats</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{completedCount}</Text>
            <Text style={styles.statLabel}>Completed Services</Text>
          </View>
        </View>
          {/* Status indicator for real-time checking */}
        <View style={styles.statusContainer}>
          <Ionicons 
            name={checking ? "pulse" : "shield-checkmark-outline"} 
            size={16} 
            color={checking ? "#FF9500" : "#4CAF50"} 
          />
          <Text style={[
            styles.statusText, 
            {color: checking ? "#FF9500" : "#4CAF50"}
          ]}>
            {checking ? 'Checking for new requests...' : 'Monitoring active (last check just now)'}
          </Text>
          {checking && <ActivityIndicator size="small" color="#FF9500" style={styles.statusIndicator} />}
        </View>
        
        <View style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Support Requests')}
          >
            <Ionicons name="notifications-outline" size={24} color="#0066CC" />
            <Text style={styles.actionText}>Support Requests</Text>
            {lastRequestId && <View style={styles.notificationBadge} />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Messages')}
          >
            <Ionicons name="chatbubbles-outline" size={24} color="#0066CC" />
            <Text style={styles.actionText}>View Messages</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Ionicons name="person-outline" size={24} color="#0066CC" />
            <Text style={styles.actionText}>Update Profile</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, 
              modalData.isError && styles.modalErrorTitle,
              modalData.isInfo && styles.modalInfoTitle
            ]}>
              {modalData.title}
            </Text>
            <Text style={styles.modalMessage}>{modalData.message}</Text>
            
            {modalData.request && modalData.customer ? (
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => handleModalAction('view')}
                >
                  <Text style={styles.modalButtonText}>View Details</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => handleModalAction('accept')}
                >
                  <Text style={styles.modalButtonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={() => handleModalAction('reject')}
                >
                  <Text style={styles.modalButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.modalButton, modalData.isError && styles.modalErrorButton]}
                onPress={() => handleModalAction('close')}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066CC',
  },
  logoutButton: {
    padding: 5,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginHorizontal: 20,
    marginTop: -10,
    marginBottom: 10,
  },
  statusText: {
    fontSize: 13,
    color: '#666666',
    fontStyle: 'italic',
  },
  statusIndicator: {
    marginLeft: 8,
  },
  notificationBadge: {
    position: 'absolute',
    right: 10,
    top: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  welcomeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 5,
  },
  welcomeSubtext: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 8,
  },
  cscId: {
    fontSize: 14,
    color: '#888888',
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0066CC',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666666',
  },
  actionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  actionText: {
    fontSize: 16,
    color: '#333333',
    marginLeft: 15,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalErrorTitle: {
    color: '#FF3B30',
  },
  modalInfoTitle: {
    color: '#0066CC',
  },
  modalMessage: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    padding: 10,
    marginHorizontal: 5,
    backgroundColor: '#0066CC',
    borderRadius: 5,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#FF3B30',
  },
  modalErrorButton: {
    backgroundColor: '#FF3B30',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default FreelancerDashboardScreen;

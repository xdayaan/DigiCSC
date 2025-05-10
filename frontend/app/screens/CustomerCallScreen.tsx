import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Alert, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { userApi } from '../services/api';

interface CustomerInfo {
  id: number;
  name: string;
  phone: string;
  issue?: string;
}

const CustomerCallScreen = () => {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const customerId = params.customerId as string;
  const chatId = params.chatId as string;
  
  // Constants for our color scheme
  const BACKGROUND_COLOR = '#FFFFFF';
  const TEXT_COLOR = '#000000';
  const TEXT_DIM_COLOR = '#666666';
  const BUTTON_COLOR = '#2196F3'; // Blue color
  const ERROR_COLOR = '#F44336';
  
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch customer information when the component mounts
  useEffect(() => {
    const fetchCustomerInfo = async () => {
      try {
        if (customerId) {          const response = await userApi.getUser(parseInt(customerId));
          setCustomer({
            id: response.id,
            name: response.name,
            phone: response.phone,
            issue: 'General Assistance'
          });
        } else {
          // If no customerId, show error
          Alert.alert(
            'Error',
            'No customer information provided.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
        }
      } catch (error) {
        console.error('Error fetching customer info:', error);
        Alert.alert(
          'Error',
          'Failed to load customer information.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomerInfo();
  }, [customerId, router]);

  // Handle accepting the call
  const handleAccept = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Navigate to chat screen
    router.replace({
      pathname: '/screens/ChatScreen',
      params: { 
        chatId: chatId,
        customerId: customerId
      }
    });
  };

  // Handle rejecting the call
  const handleReject = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    
    // Show confirmation and go back
    Alert.alert(
      'Call Rejected',
      'You have declined this call.',
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BUTTON_COLOR} />
        <ThemedText style={styles.loadingText}>Loading call information...</ThemedText>
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.callContainer}>
        {/* Caller Info */}
        <View style={styles.callerInfo}>
          <View style={styles.avatar}>
            <ThemedText style={styles.avatarText}>{customer?.name.charAt(0) || '?'}</ThemedText>
          </View>
          <ThemedText style={styles.callerName}>{customer?.name || 'Unknown Caller'}</ThemedText>
          <ThemedText style={styles.callerPhone}>{customer?.phone || ''}</ThemedText>
          
          {customer?.issue && (
            <View style={styles.issueContainer}>
              <ThemedText style={styles.issueLabel}>Reason for call:</ThemedText>
              <ThemedText style={styles.issueText}>{customer.issue}</ThemedText>
            </View>
          )}
          
          <ThemedText style={styles.callStatus}>Incoming call</ThemedText>
        </View>
        
        {/* Call Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.rejectButton]}
            onPress={handleReject}
          >
            <Ionicons name="call-outline" size={30} color="#FFFFFF" />
            <ThemedText style={styles.actionText}>Decline</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.acceptButton]}
            onPress={handleAccept}
          >
            <Ionicons name="call" size={30} color="#FFFFFF" />
            <ThemedText style={styles.actionText}>Accept</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  callContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  callerInfo: {
    alignItems: 'center',
    paddingTop: 60,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarText: {
    fontSize: 60,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  callerName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  callerPhone: {
    fontSize: 18,
    color: '#666666',
    marginBottom: 20,
  },
  issueContainer: {
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  issueLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  issueText: {
    fontSize: 18,
    textAlign: 'center',
    color: '#2196F3',
    fontWeight: '500',
  },
  callStatus: {
    fontSize: 18,
    color: '#2196F3',
    marginTop: 30,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 30,
    marginBottom: 40,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  actionText: {
    marginTop: 8,
    color: '#FFFFFF',
    fontWeight: '600',
  }
});

export default CustomerCallScreen;
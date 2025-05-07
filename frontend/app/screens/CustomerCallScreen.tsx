import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuth } from '../services/AuthContext';
import { chatApi, userApi } from '../services/api';
import webSocketService, { CallNotification } from '../services/WebSocketService';

interface CustomerInfo {
  id: number;
  name: string;
  phone: string;
  issue?: string;
}

const CustomerCallScreen = () => {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const customerId = params.customerId as string;
  const chatId = params.chatId as string;
  const callId = params.callId as string;
  
  // Constants for our new color scheme
  const BACKGROUND_COLOR = '#FFFFFF';
  const TEXT_COLOR = '#000000';
  const TEXT_DIM_COLOR = '#666666';
  const BUTTON_COLOR = '#2196F3'; // Blue color
  const ERROR_COLOR = '#F44336';
  
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [noCallAvailable, setNoCallAvailable] = useState(false);
  
  // Animation values
  const scaleAnim = useSharedValue(1);
  const ringAnim = useSharedValue(0);

  // Connect to WebSocket and check for active calls
  useEffect(() => {
    const connectWebSocket = async () => {
      await webSocketService.connect();
    };
    
    connectWebSocket();
    
    // If there is no customerId or chatId in the params, we need to show "no customer available"
    if (!customerId && !chatId && !params.fromNotification) {
      setNoCallAvailable(true);
      setIsLoading(false);
      return;
    }
    
    // Start animations and haptic feedback only if there's a call
    if (!noCallAvailable) {
      // Start pulse animation
      scaleAnim.value = withRepeat(
        withTiming(1.2, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      
      // Start ring animation
      ringAnim.value = withRepeat(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        -1,
        false
      );
      
      // Simulate vibration for call
      const interval = setInterval(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }, 2000);
      
      // Clean up interval on unmount
      return () => {
        clearInterval(interval);
      };
    }
  }, [customerId, chatId, noCallAvailable]);
  
  // Fetch customer information
  useEffect(() => {
    if (noCallAvailable || !customerId) {
      return;
    }
    
    const fetchCustomerInfo = async () => {
      try {
        // Fetch user info as the customer
        const customerResponse = await userApi.getUser(parseInt(customerId));
        
        if (customerResponse) {
          setCustomer({
            id: customerResponse.id,
            name: customerResponse.name,
            phone: customerResponse.phone,
            // In a real implementation, you might fetch the issue from the chat
            issue: chatId ? "Needs assistance with documents" : "General inquiry"
          });
        }
      } catch (error) {
        console.error("Error fetching customer info:", error);
        // Fallback to demo data if API fails
        setCustomer({
          id: parseInt(customerId || '1'),
          name: "John Doe",
          phone: "+91 98765-43210",
          issue: "Document verification assistance needed"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCustomerInfo();
  }, [customerId, chatId, noCallAvailable]);

  // Avatar scale animation
  const avatarStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scaleAnim.value }]
    };
  });
  
  // Call ring animation
  const ringStyle = useAnimatedStyle(() => {
    return {
      opacity: 1 - ringAnim.value,
      transform: [{ scale: ringAnim.value * 3 }]
    };
  });

  const handleAcceptCall = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    if (!user || !chatId) {
      console.error("Missing user or chat ID");
      return;
    }
    
    try {
      // Respond to call via WebSocket if there's a call ID
      if (callId) {
        webSocketService.respondToCall(callId, true);
      }
      
      // Fetch the chat to ensure it exists
      const chat = await chatApi.getChat(chatId);
      
      if (chat) {
        // Navigate to the chat screen with this customer's chat
        router.replace({
          pathname: '/screens/ChatScreen',
          params: { chatId }
        });
      } else {
        // If chat doesn't exist, create a new one
        const newChat = await chatApi.createChat(user.id);
        router.replace({
          pathname: '/screens/ChatScreen',
          params: { chatId: newChat.chat_id }
        });
      }
    } catch (error) {
      console.error("Error accepting call:", error);
      // Fallback navigation
      router.replace({
        pathname: '/screens/ChatScreen',
        params: { chatId }
      });
    }
  };

  const handleDeclineCall = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    
    // Respond to call via WebSocket if there's a call ID
    if (callId) {
      webSocketService.respondToCall(callId, false);
    }
    
    router.back();
  };

  // Render the "No Customer Available" screen
  if (noCallAvailable) {
    return (
      <View style={[styles.container, { backgroundColor: BACKGROUND_COLOR }]}>
        <StatusBar style="dark" />
        <IconSymbol name="phone.down.circle.fill" size={80} color={TEXT_DIM_COLOR} />
        <Text style={[styles.noCallText, { color: TEXT_COLOR }]}>
          No Active Calls
        </Text>
        <Text style={[styles.noCallSubText, { color: TEXT_DIM_COLOR }]}>
          There are no customers calling at the moment.
          You will be notified when someone needs assistance.
        </Text>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: BUTTON_COLOR }]} 
          onPress={() => router.back()}
        >
          <Text style={{ color: '#FFFFFF' }}>Return to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: BACKGROUND_COLOR }]}>
      <StatusBar style="dark" />
      
      <Text style={[styles.callText, { color: TEXT_COLOR }]}>
        Incoming Customer Call
      </Text>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BUTTON_COLOR} />
          <Text style={{ color: TEXT_COLOR, marginTop: 20 }}>Loading customer information...</Text>
        </View>
      ) : (
        <View style={styles.callContent}>
          <View style={styles.avatarContainer}>
            <Animated.View style={[styles.ringAnimation, { borderColor: BUTTON_COLOR }, ringStyle]} />
            
            <Animated.View 
              style={[
                styles.avatar, 
                { backgroundColor: BUTTON_COLOR },
                avatarStyle
              ]}
            >
              <Text style={styles.avatarText}>
                {customer?.name.substring(0, 1).toUpperCase() || 'C'}
              </Text>
            </Animated.View>
          </View>
          
          <Text style={[styles.customerName, { color: TEXT_COLOR }]}>
            {customer?.name || 'Unknown Customer'}
          </Text>
          
          <Text style={[styles.customerPhone, { color: TEXT_DIM_COLOR }]}>
            {customer?.phone || 'No phone number'}
          </Text>
          
          {customer?.issue && (
            <View style={[styles.issueContainer, { backgroundColor: '#F5F5F5', borderColor: '#E0E0E0', borderWidth: 1 }]}>
              <Text style={[styles.issueLabel, { color: TEXT_DIM_COLOR }]}>ISSUE</Text>
              <Text style={[styles.issueText, { color: TEXT_COLOR }]}>{customer.issue}</Text>
            </View>
          )}
          
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: ERROR_COLOR }]}
              onPress={handleDeclineCall}
            >
              <IconSymbol name="phone.down.fill" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, { backgroundColor: BUTTON_COLOR }]}
              onPress={handleAcceptCall}
            >
              <IconSymbol name="phone.fill" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  callText: {
    marginBottom: 30,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
  },
  callContent: {
    alignItems: 'center',
    width: '100%',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringAnimation: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: Colors.light.tint,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  customerName: {
    marginTop: 10,
    fontSize: 24,
    textAlign: 'center',
  },
  customerPhone: {
    marginTop: 5,
    marginBottom: 20,
    opacity: 0.7,
    fontSize: 16,
  },
  issueContainer: {
    width: '100%',
    padding: 15,
    borderRadius: 12,
    marginBottom: 30,
    alignItems: 'center',
  },
  issueLabel: {
    marginBottom: 5,
    fontWeight: 'bold',
    fontSize: 12,
  },
  issueText: {
    textAlign: 'center',
    fontSize: 16,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '80%',
    marginTop: 20,
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  declineButton: {
    backgroundColor: '#F44336',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noCallText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  noCallSubText: {
    fontSize: 16,
    textAlign: 'center',
    maxWidth: 300,
    marginBottom: 30,
  },
  backButton: {
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  }
});

export default CustomerCallScreen;
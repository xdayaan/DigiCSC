import { router } from 'expo-router';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { CallNotification } from '../services/WebSocketService';

// Configure notifications for the app
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Handles an incoming call notification from WebSocket
 * Will display a system notification and/or navigate to call screen based on app state
 */
export const handleIncomingCall = async (notification: CallNotification): Promise<void> => {
  try {
    // Show a notification if app is in background
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Incoming Call',
        body: `${notification.from.name} is calling you`,
        data: { 
          customerId: notification.from.id,
          chatId: notification.chatId,
          callId: notification.chatId,
          fromNotification: true
        },
      },
      trigger: null, // Show immediately
    });

    // If app is in foreground, navigate directly to call screen
    if (Platform.OS === 'web') {
      // For web, we can use window.open
      window.open(`/screens/CustomerCallScreen?customerId=${notification.from.id}&chatId=${notification.chatId}&callId=${notification.chatId}&fromNotification=true`);
    } else {
      // For native apps, we can use the router
      router.push({
        pathname: '/screens/CustomerCallScreen',
        params: {
          customerId: notification.from.id.toString(),
          chatId: notification.chatId,
          callId: notification.chatId,
          fromNotification: 'true'
        }
      });
    }
  } catch (error) {
    console.error('Error handling incoming call notification:', error);
  }
};

// Set up notification tap listener
export const setupNotificationListeners = (): () => void => {
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    
    // Navigate to call screen when notification is tapped
    router.push({
      pathname: '/screens/CustomerCallScreen',
      params: {
        customerId: data.customerId?.toString(),
        chatId: data.chatId,
        callId: data.callId,
        fromNotification: 'true'
      }
    });
  });

  // Return cleanup function
  return () => {
    subscription.remove();
  };
};
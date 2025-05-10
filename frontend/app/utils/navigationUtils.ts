import { router } from 'expo-router';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Configure notifications for the app
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Set up notification tap listener
export const setupNotificationListeners = (): () => void => {
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    
    // Navigate to call screen when notification is tapped
    router.push({
      pathname: '/screens/ChatScreen',
      params: {
        customerId: data.customerId ? String(data.customerId) : undefined,
        chatId: data.chatId ? String(data.chatId) : undefined
      }
    });
  });

  // Return cleanup function
  return () => {
    subscription.remove();
  };
};
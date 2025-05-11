import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Screens
import FreelancerDashboardScreen from '../screens/freelancer/FreelancerDashboardScreen';
import FreelancerChatListScreen from '../screens/freelancer/FreelancerChatListScreen';
import ChatScreen from '../screens/freelancer/ChatScreen';
// import FreelancerAccountSettingsScreen from '../screens/freelancer/FreelancerAccountSettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const HomeStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="FreelancerDashboard" component={FreelancerDashboardScreen} options={{ title: 'Dashboard' }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={({ route }) => ({ title: route.params?.customer?.name || 'Chat' })} />
    </Stack.Navigator>
  );
};

const ChatStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="FreelancerChatList" component={FreelancerChatListScreen || FreelancerDashboardScreen} options={{ title: 'Recent Chats' }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={({ route }) => ({ title: route.params?.customer?.name || 'Chat' })} />
    </Stack.Navigator>
  );
};

// const AccountStack = () => {
//   return (
//     <Stack.Navigator>
//       <Stack.Screen name="FreelancerAccountSettings" component={FreelancerAccountSettingsScreen || FreelancerDashboardScreen} options={{ title: 'Account Settings' }} />
//     </Stack.Navigator>
//   );
// };

const FreelancerNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Chats') {
            iconName = focused ? 'chatbubble' : 'chatbubble-outline';
          } else if (route.name === 'Account') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
      tabBarOptions={{
        activeTintColor: '#0066CC',
        inactiveTintColor: 'gray',
      }}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Chats" component={ChatStack} />
      {/* <Tab.Screen name="Account" component={AccountStack} /> */}
    </Tab.Navigator>
  );
};

export default FreelancerNavigator;

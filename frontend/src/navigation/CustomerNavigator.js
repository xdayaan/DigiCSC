import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Screens
import CustomerDashboardScreen from '../screens/customer/CustomerDashboardScreen';
import FreelancerListScreen from '../screens/customer/FreelancerListScreen';
import ChatScreen from '../screens/customer/ChatScreen';
import AiChatScreen from '../screens/customer/AiChatScreen';
import AppScreen from '../screens/customer/AppScreen';
// import FreelancerDetailScreen from '../screens/customer/FreelancerDetailScreen';
// import TermsOfUseScreen from '../screens/customer/TermsOfUseScreen';
// import AccountSettingsScreen from '../screens/customer/AccountSettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const HomeStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="CustomerDashboard" component={CustomerDashboardScreen} options={{ title: 'Dashboard' }} />
      <Stack.Screen name="FreelancerList" component={FreelancerListScreen} options={{ title: 'Freelancers' }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} />
      <Stack.Screen name="AiChat" component={AiChatScreen} options={{ title: 'AI Assistant' }} />
      <Stack.Screen name="AppScreen" component={AppScreen} options={{ title: 'Services' }} />
    </Stack.Navigator>
  );
};

// const ChatStack = () => {
//   return (
//     <Stack.Navigator>
//       <Stack.Screen name="ChatList" component={ChatListScreen || CustomerDashboardScreen} options={{ title: 'Chats' }} />
//     </Stack.Navigator>
//   );
// };

// const FreelancerStack = () => {
//   return (
//     <Stack.Navigator>
//       <Stack.Screen name="FreelancerList" component={FreelancerListScreen} options={{ title: 'Freelancers' }} />
//       <Stack.Screen name="FreelancerDetail" component={FreelancerDetailScreen || CustomerDashboardScreen} options={{ title: 'Freelancer Profile' }} />
//     </Stack.Navigator>
//   );
// };

// const TermsStack = () => {
//   return (
//     <Stack.Navigator>
//       <Stack.Screen name="TermsOfUse" component={TermsOfUseScreen || CustomerDashboardScreen} options={{ title: 'Terms of Use' }} />
//     </Stack.Navigator>
//   );
// };

// const AccountStack = () => {
//   return (
//     <Stack.Navigator>
//       <Stack.Screen name="AccountSettings" component={AccountSettingsScreen || CustomerDashboardScreen} options={{ title: 'Account Settings' }} />
//     </Stack.Navigator>
//   );
// };

const CustomerNavigator = () => {  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } 
          // else if (route.name === 'Chats') {
          //   iconName = focused ? 'chatbubble' : 'chatbubble-outline';
          // } else if (route.name === 'Freelancers') {
          //   iconName = focused ? 'people' : 'people-outline';
          // } else if (route.name === 'Terms') {
          //   iconName = focused ? 'document-text' : 'document-text-outline';
          // } else if (route.name === 'Account') {
          //   iconName = focused ? 'person' : 'person-outline';
          // }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
      tabBarOptions={{
        activeTintColor: '#0066CC',
        inactiveTintColor: 'gray',
      }}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      {/* <Tab.Screen name="Chats" component={ChatStack} />
      <Tab.Screen name="Freelancers" component={FreelancerStack} />
      <Tab.Screen name="Terms" component={TermsStack} />
      <Tab.Screen name="Account" component={AccountStack} /> */}
    </Tab.Navigator>
  );
};

export default CustomerNavigator;

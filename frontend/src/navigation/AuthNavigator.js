import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import authentication screens
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import FreelancerLoginScreen from '../screens/auth/FreelancerLoginScreen';
import FreelancerSignupScreen from '../screens/auth/FreelancerSignupScreen';
import CustomerLoginScreen from '../screens/auth/CustomerLoginScreen';
import CustomerSignupScreen from '../screens/auth/CustomerSignupScreen';

const Stack = createStackNavigator();

const AuthNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="Welcome" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="FreelancerLogin" component={FreelancerLoginScreen} />
      <Stack.Screen name="FreelancerSignup" component={FreelancerSignupScreen} />
      <Stack.Screen name="CustomerLogin" component={CustomerLoginScreen} />
      <Stack.Screen name="CustomerSignup" component={CustomerSignupScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;

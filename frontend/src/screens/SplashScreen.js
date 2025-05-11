import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../hooks/useAuth';

const SplashScreen = ({ navigation }) => {
  const { isLoading, userToken, userType } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (userToken) {
        // User is logged in, navigate to appropriate dashboard
        navigation.replace(userType === 'customer' ? 'CustomerMain' : 'FreelancerMain');
      } else {
        // User is not logged in, navigate to auth screen
        navigation.replace('Auth');
      }
    }
  }, [isLoading, userToken, userType, navigation]);
  return (
    <View style={styles.container}>
      <Text style={styles.logoText}>DigiCSC</Text>
      <ActivityIndicator size="large" color="#0066CC" style={styles.loader} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  logoText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#0066CC',
    marginBottom: 20,
  },
  loader: {
    marginTop: 20,
  },
});

export default SplashScreen;

import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const WelcomeScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>

        <Text style={styles.title}>DigiCSC</Text>
        <Text style={styles.subtitle}>Get all your CSC needs online</Text>
      </View>
      
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>I am a Customer</Text>
        <TouchableOpacity 
          style={[styles.button, styles.customerButton]} 
          onPress={() => navigation.navigate('CustomerLogin')}
        >
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.button, styles.customerButton, styles.outlineButton]} 
          onPress={() => navigation.navigate('CustomerSignup')}
        >
          <Text style={[styles.buttonText, styles.outlineButtonText]}>Sign Up</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>I am a Freelancer</Text>
        <TouchableOpacity 
          style={[styles.button, styles.freelancerButton]} 
          onPress={() => navigation.navigate('FreelancerLogin')}
        >
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.button, styles.freelancerButton, styles.outlineButton]} 
          onPress={() => navigation.navigate('FreelancerSignup')}
        >
          <Text style={[styles.buttonText, styles.outlineButtonText]}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 50,
    marginBottom: 30,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0066CC',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionContainer: {
    marginBottom: 30,
    borderRadius: 10,
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8,
  },
  customerButton: {
    backgroundColor: '#0066CC',
  },
  freelancerButton: {
    backgroundColor: '#00A86B',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  outlineButtonText: {
    color: '#333333',
  },
});

export default WelcomeScreen;

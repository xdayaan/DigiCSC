import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const router = useRouter();

  const handleRegisterPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/screens/RegisterScreen');
  };

  const handleExistingUserPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/screens/ChatScreen');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <LinearGradient
        colors={['#f8f9fa', '#ffffff']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="logo-react" size={38} color="#61DAFB" />
            <Text style={styles.logoText}>DigiCSC</Text>
          </View>
          <Text style={styles.subtitle}>Your Digital CSC Services Assistant</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <Animated.View 
          entering={FadeInDown.duration(600).delay(200)}
          style={styles.buttonsContainer}
        >
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleRegisterPress}
            activeOpacity={0.8}
          >
            <Ionicons name="person-add-outline" size={22} color="#ffffff" />
            <Text style={styles.primaryButtonText}>New Registration</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleExistingUserPress}
            activeOpacity={0.8}
          >
            <Ionicons name="person-outline" size={22} color="#4A80F0" />
            <Text style={styles.secondaryButtonText}>Existing User</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.duration(600).delay(400)}
          style={styles.featuresSection}
        >
          <Text style={styles.featuresSectionTitle}>Key Features</Text>
          
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="time-outline" size={20} color="#4A80F0" />
              </View>
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>24/7 Assistance</Text>
                <Text style={styles.featureDescription}>Access help anytime, anywhere</Text>
              </View>
            </View>
            
            <View style={styles.featureItem}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="briefcase-outline" size={20} color="#4A80F0" />
              </View>
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>Freelancer Support</Text>
                <Text style={styles.featureDescription}>Tools for independent professionals</Text>
              </View>
            </View>
            
            <View style={styles.featureItem}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="document-text-outline" size={20} color="#4A80F0" />
              </View>
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>Document Processing</Text>
                <Text style={styles.featureDescription}>Fast and secure document handling</Text>
              </View>
            </View>
            
            <View style={styles.featureItem}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="globe-outline" size={20} color="#4A80F0" />
              </View>
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>Multiple Languages</Text>
                <Text style={styles.featureDescription}>Support in your preferred language</Text>
              </View>
            </View>
          </View>
        </Animated.View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 All Rights Reserved By Mountain Minds</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  headerGradient: {
    paddingVertical: 30,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 50, // Larger size
    fontWeight: '700', // Bold weight
    marginLeft: 10,
    color: '#0B1A54',
    fontFamily: 'Roboto', // Custom font (make sure it's linked in your project)
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  buttonsContainer: {
    marginBottom: 36,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    backgroundColor: '#4A80F0',
    borderRadius: 14,
    marginBottom: 16,
    shadowColor: '#4A80F0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    backgroundColor: '#F5F9FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E1E9FA',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 10,
  },
  secondaryButtonText: {
    color: '#4A80F0',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 10,
  },
  featuresSection: {
    padding: 20,
    backgroundColor: '#F8FAFF',
    borderRadius: 16,
    marginBottom: 20,
  },
  featuresSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
  },
  featuresList: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EDF1FC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});
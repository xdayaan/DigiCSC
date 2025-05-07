import { Image } from 'expo-image';
import { Platform, StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Colors } from '@/constants/Colors';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
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
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      
      <ThemedView style={styles.titleContainer}>
        <View style={styles.titleWithIcon}>
          <IconSymbol name="logo.react" size={32} color="#61DAFB" style={styles.reactIcon} />
          <ThemedText type="title">DigiCSC Assistant</ThemedText>
        </View>
      </ThemedView>

      <ThemedView style={styles.subtitleContainer}>
        <ThemedText>Your digital assistant for all CSC services</ThemedText>
      </ThemedView>
      
      <Animated.View 
        entering={FadeIn.delay(300).duration(500)}
        style={styles.buttonsContainer}
      >
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: colorScheme === 'dark' ? Colors.dark.tint : Colors.light.tint }
          ]}
          onPress={handleRegisterPress}
        >
          <IconSymbol name="person.badge.plus" size={24} color="#ffffff" />
          <Text style={styles.buttonText}>New User Registration</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.secondaryButton,
            { 
              backgroundColor: colorScheme === 'dark' ? '#333333' : '#f0f0f0',
              borderColor: colorScheme === 'dark' ? '#444444' : '#e0e0e0'
            }
          ]}
          onPress={handleExistingUserPress}
        >
          <IconSymbol 
            name="rectangle.stack.person.crop" 
            size={24} 
            color={colorScheme === 'dark' ? Colors.dark.tint : Colors.light.tint} 
          />
          <Text style={[
            styles.buttonText,
            { color: colorScheme === 'dark' ? Colors.dark.tint : Colors.light.tint }
          ]}>
            Existing User
          </Text>
        </TouchableOpacity>
      </Animated.View>

      <ThemedView style={styles.featuresContainer}>
        <ThemedText type="subtitle">Features</ThemedText>
        
        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <IconSymbol 
              name="checkmark.circle.fill" 
              size={20}
              color={colorScheme === 'dark' ? Colors.dark.tint : Colors.light.tint} 
            />
            <ThemedText style={styles.featureText}>24/7 AI Assistance</ThemedText>
          </View>
          
          <View style={styles.featureItem}>
            <IconSymbol 
              name="checkmark.circle.fill" 
              size={20}
              color={colorScheme === 'dark' ? Colors.dark.tint : Colors.light.tint} 
            />
            <ThemedText style={styles.featureText}>Freelancer Support</ThemedText>
          </View>
          
          <View style={styles.featureItem}>
            <IconSymbol 
              name="checkmark.circle.fill" 
              size={20}
              color={colorScheme === 'dark' ? Colors.dark.tint : Colors.light.tint} 
            />
            <ThemedText style={styles.featureText}>Document Processing</ThemedText>
          </View>
          
          <View style={styles.featureItem}>
            <IconSymbol 
              name="checkmark.circle.fill" 
              size={20}
              color={colorScheme === 'dark' ? Colors.dark.tint : Colors.light.tint} 
            />
            <ThemedText style={styles.featureText}>Multiple Language Support</ThemedText>
          </View>
        </View>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactIcon: {
    marginRight: 10,
  },
  subtitleContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  buttonsContainer: {
    width: '100%',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  secondaryButton: {
    borderWidth: 1,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '500',
    marginLeft: 10,
  },
  featuresContainer: {
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  featuresList: {
    marginLeft: 10,
    marginTop: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  featureText: {
    fontSize: 16,
    marginLeft: 10,
  },
});

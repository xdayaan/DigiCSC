import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { RadioButton } from 'react-native-paper';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuth } from '../services/AuthContext';
import { Language } from '../services/types';

const LanguageScreen = () => {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { user, updateUserPreferences } = useAuth();
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(
    user?.preferred_language || Language.ENGLISH
  );
  const [isLoading, setIsLoading] = useState(false);

  // Handle language change
  const handleLanguageChange = async () => {
    if (selectedLanguage === user?.preferred_language || isLoading || !user) {
      // No change needed
      router.back();
      return;
    }
    
    setIsLoading(true);
    try {
      // Update the language preference in backend and local storage
      await updateUserPreferences(selectedLanguage);
      
      // Provide haptic feedback for success
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Navigate back
      router.back();
    } catch (error) {
      console.error('Failed to update language:', error);
      // Provide haptic feedback for failure
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      
      <View style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Select Your Language
        </ThemedText>
        
        <ThemedText style={styles.description}>
          Choose your preferred language for chatting with our AI assistant.
        </ThemedText>
        
        <View style={styles.languageList}>
          {/* English */}
          <TouchableOpacity
            style={styles.languageOption}
            onPress={() => setSelectedLanguage(Language.ENGLISH)}
          >
            <View style={styles.languageDetails}>
              <ThemedText type="subtitle">English</ThemedText>
              <ThemedText style={styles.nativeText}>English</ThemedText>
            </View>
            <RadioButton
              value={Language.ENGLISH}
              status={selectedLanguage === Language.ENGLISH ? 'checked' : 'unchecked'}
              onPress={() => setSelectedLanguage(Language.ENGLISH)}
              color={Colors[colorScheme].tint}
            />
          </TouchableOpacity>
          
          {/* Hindi */}
          <TouchableOpacity
            style={styles.languageOption}
            onPress={() => setSelectedLanguage(Language.HINDI)}
          >
            <View style={styles.languageDetails}>
              <ThemedText type="subtitle">Hindi</ThemedText>
              <ThemedText style={styles.nativeText}>हिन्दी</ThemedText>
            </View>
            <RadioButton
              value={Language.HINDI}
              status={selectedLanguage === Language.HINDI ? 'checked' : 'unchecked'}
              onPress={() => setSelectedLanguage(Language.HINDI)}
              color={Colors[colorScheme].tint}
            />
          </TouchableOpacity>
          
          {/* Kumaoni */}
          <TouchableOpacity
            style={styles.languageOption}
            onPress={() => setSelectedLanguage(Language.KUMAONI)}
          >
            <View style={styles.languageDetails}>
              <ThemedText type="subtitle">Kumaoni</ThemedText>
              <ThemedText style={styles.nativeText}>कुमाऊँनी</ThemedText>
            </View>
            <RadioButton
              value={Language.KUMAONI}
              status={selectedLanguage === Language.KUMAONI ? 'checked' : 'unchecked'}
              onPress={() => setSelectedLanguage(Language.KUMAONI)}
              color={Colors[colorScheme].tint}
            />
          </TouchableOpacity>
          
          {/* Garhwali */}
          <TouchableOpacity
            style={styles.languageOption}
            onPress={() => setSelectedLanguage(Language.GHARWALI)}
          >
            <View style={styles.languageDetails}>
              <ThemedText type="subtitle">Garhwali</ThemedText>
              <ThemedText style={styles.nativeText}>गढ़वाली</ThemedText>
            </View>
            <RadioButton
              value={Language.GHARWALI}
              status={selectedLanguage === Language.GHARWALI ? 'checked' : 'unchecked'}
              onPress={() => setSelectedLanguage(Language.GHARWALI)}
              color={Colors[colorScheme].tint}
            />
          </TouchableOpacity>
        </View>
      </View>
      
      <TouchableOpacity
        style={[
          styles.saveButton,
          { backgroundColor: Colors[colorScheme].tint },
          isLoading && styles.disabledButton
        ]}
        onPress={handleLanguageChange}
        disabled={isLoading || selectedLanguage === user?.preferred_language}
      >
        <ThemedText style={styles.buttonText}>
          {isLoading ? 'Saving...' : 'Save Changes'}
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  content: {
    flex: 1,
  },
  title: {
    marginBottom: 12,
  },
  description: {
    marginBottom: 30,
    opacity: 0.8,
  },
  languageList: {
    marginTop: 20,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  languageDetails: {
    flex: 1,
  },
  nativeText: {
    marginTop: 4,
    opacity: 0.7,
  },
  saveButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  }
});

export default LanguageScreen;
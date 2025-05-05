import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { userApi, User } from '../services/api';

const languages = [
  { id: 'english', name: 'English' },
  { id: 'hindi', name: 'Hindi' },
  { id: 'kumaoni', name: 'Kumaoni' },
  { id: 'gharwali', name: 'Gharwali' }
];

export default function SelectLanguageScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      try {
        const currentUser = await userApi.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Error loading user:', error);
        Alert.alert('Error', 'Failed to load user information');
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  const handleLanguageSelect = async (languageId: string) => {
    if (!user) {
      Alert.alert('Error', 'User information not found');
      return;
    }

    setUpdating(true);

    try {
      await userApi.updateLanguage(user.id, languageId);
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error updating language:', error);
      Alert.alert('Error', 'Failed to update language preference');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Your Preferred Language</Text>
      <Text style={styles.subtitle}>We'll respond to you in this language</Text>

      {updating ? (
        <ActivityIndicator size="large" color="#0000ff" style={styles.updatingIndicator} />
      ) : (
        <View style={styles.languageOptions}>
          {languages.map((language) => (
            <TouchableOpacity
              key={language.id}
              style={styles.languageOption}
              onPress={() => handleLanguageSelect(language.id)}
            >
              <Text style={styles.languageName}>{language.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  languageOptions: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  languageOption: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  languageName: {
    fontSize: 18,
  },
  updatingIndicator: {
    marginTop: 30,
  },
});
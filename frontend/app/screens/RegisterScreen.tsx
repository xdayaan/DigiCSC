import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, TextInput, RadioButton } from 'react-native-paper';
import { useAuth } from '../services/AuthContext';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Language, UserType } from '../services/types';

const RegisterScreen = () => {
  const router = useRouter();
  const { register } = useAuth();
  const colorScheme = useColorScheme();
  
  // Constants for our new color scheme
  const BACKGROUND_COLOR = '#FFFFFF';
  const TEXT_COLOR = '#000000';
  const TEXT_DIM_COLOR = '#666666';
  const BUTTON_COLOR = '#2196F3'; // Blue color
  const ERROR_COLOR = '#F44336';
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [cscId, setCscId] = useState('');
  const [userType, setUserType] = useState<UserType>(UserType.USER);
  const [language, setLanguage] = useState<Language>(Language.ENGLISH);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form validation
  const [errors, setErrors] = useState({
    name: '',
    phone: '',
    email: '',
    cscId: ''
  });
  
  // Validate form fields
  const validateForm = () => {
    let isValid = true;
    const newErrors = { name: '', phone: '', email: '', cscId: '' };
    
    // Name validation
    if (!name.trim()) {
      newErrors.name = 'Name is required';
      isValid = false;
    }
    
    // Phone validation (basic, at least 10 digits)
    if (!phone.trim() || phone.replace(/[^0-9]/g, '').length < 10) {
      newErrors.phone = 'Valid phone number is required (at least 10 digits)';
      isValid = false;
    }
    
    // Email validation for freelancers
    if (userType === UserType.FREELANCER) {
      if (!email) {
        newErrors.email = 'Email is required for freelancers';
        isValid = false;
      } else if (!/\S+@\S+\.\S+/.test(email)) {
        newErrors.email = 'Please enter a valid email address';
        isValid = false;
      }
      
      // CSC ID validation for freelancers
      if (!cscId.trim()) {
        newErrors.cscId = 'CSC ID is required for freelancers';
        isValid = false;
      }
    }
    
    setErrors(newErrors);
    return isValid;
  };
  
  // Handle registration submission
  const handleRegister = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      // Create user object based on form inputs
      const userData = {
        name,
        phone,
        user_type: userType,
        preferred_language: language
      };
      
      // Add conditional fields for freelancers
      if (userType === UserType.FREELANCER) {
        Object.assign(userData, { email, csc_id: cscId });
      }
      
      // Call the register function from auth context
      const user = await register(userData);
      
      // Navigate based on user type
      if (userType === UserType.FREELANCER) {
        // For freelancers, navigate to the CustomerCallScreen
        router.replace('/screens/CustomerCallScreen');
      } else {
        // For regular users, navigate to main app
        router.replace('/');
      }
      
    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert(
        'Registration Failed',
        error?.response?.data?.detail || 'Could not register at this time. Please try again later.'
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <View style={[styles.container, { backgroundColor: BACKGROUND_COLOR }]}>
      <StatusBar style="dark" />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: TEXT_COLOR }]}>
            Create Account
          </Text>
          <Text style={[styles.subtitle, { color: TEXT_DIM_COLOR }]}>
            Please fill in your details to continue
          </Text>
        </View>
        
        {/* User Type Selection */}
        <View style={styles.userTypeContainer}>
          <Text style={[styles.sectionTitle, { color: TEXT_COLOR }]}>
            I am a:
          </Text>
          
          <View style={styles.radioGroup}>
            <View style={styles.radioButton}>
              <RadioButton
                value={UserType.USER}
                status={userType === UserType.USER ? 'checked' : 'unchecked'}
                onPress={() => setUserType(UserType.USER)}
                color={BUTTON_COLOR}
              />
              <Text style={{ color: TEXT_COLOR }}>
                Customer
              </Text>
            </View>
            
            <View style={styles.radioButton}>
              <RadioButton
                value={UserType.FREELANCER}
                status={userType === UserType.FREELANCER ? 'checked' : 'unchecked'}
                onPress={() => setUserType(UserType.FREELANCER)}
                color={BUTTON_COLOR}
              />
              <Text style={{ color: TEXT_COLOR }}>
                Freelancer
              </Text>
            </View>
          </View>
        </View>
        
        {/* Personal Information */}
        <View style={styles.formGroup}>
          <TextInput
            label="Full Name"
            value={name}
            onChangeText={setName}
            error={!!errors.name}
            style={[styles.input, { backgroundColor: 'transparent' }]}
            theme={{ colors: { primary: BUTTON_COLOR, text: TEXT_COLOR } }}
          />
          {errors.name ? <Text style={[styles.errorText, { color: ERROR_COLOR }]}>{errors.name}</Text> : null}
          
          <TextInput
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            error={!!errors.phone}
            style={[styles.input, { backgroundColor: 'transparent' }]}
            theme={{ colors: { primary: BUTTON_COLOR, text: TEXT_COLOR } }}
          />
          {errors.phone ? <Text style={[styles.errorText, { color: ERROR_COLOR }]}>{errors.phone}</Text> : null}
          
          {/* Conditional fields for freelancers */}
          {userType === UserType.FREELANCER && (
            <>
              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                error={!!errors.email}
                style={[styles.input, { backgroundColor: 'transparent' }]}
                theme={{ colors: { primary: BUTTON_COLOR, text: TEXT_COLOR } }}
              />
              {errors.email ? <Text style={[styles.errorText, { color: ERROR_COLOR }]}>{errors.email}</Text> : null}
              
              <TextInput
                label="CSC ID Number"
                value={cscId}
                onChangeText={setCscId}
                error={!!errors.cscId}
                style={[styles.input, { backgroundColor: 'transparent' }]}
                theme={{ colors: { primary: BUTTON_COLOR, text: TEXT_COLOR } }}
              />
              {errors.cscId ? <Text style={[styles.errorText, { color: ERROR_COLOR }]}>{errors.cscId}</Text> : null}
            </>
          )}
        </View>
        
        {/* Preferred Language */}
        <View style={styles.languageContainer}>
          <Text style={[styles.sectionTitle, { color: TEXT_COLOR }]}>
            Preferred Language:
          </Text>
          
          <View style={styles.radioGroup}>
            <View style={styles.radioButton}>
              <RadioButton
                value={Language.ENGLISH}
                status={language === Language.ENGLISH ? 'checked' : 'unchecked'}
                onPress={() => setLanguage(Language.ENGLISH)}
                color={BUTTON_COLOR}
              />
              <Text style={{ color: TEXT_COLOR }}>
                English
              </Text>
            </View>
            
            <View style={styles.radioButton}>
              <RadioButton
                value={Language.HINDI}
                status={language === Language.HINDI ? 'checked' : 'unchecked'}
                onPress={() => setLanguage(Language.HINDI)}
                color={BUTTON_COLOR}
              />
              <Text style={{ color: TEXT_COLOR }}>
                Hindi
              </Text>
            </View>
          </View>
          
          <View style={styles.radioGroup}>
            <View style={styles.radioButton}>
              <RadioButton
                value={Language.KUMAONI}
                status={language === Language.KUMAONI ? 'checked' : 'unchecked'}
                onPress={() => setLanguage(Language.KUMAONI)}
                color={BUTTON_COLOR}
              />
              <Text style={{ color: TEXT_COLOR }}>
                Kumaoni
              </Text>
            </View>
            
            <View style={styles.radioButton}>
              <RadioButton
                value={Language.GHARWALI}
                status={language === Language.GHARWALI ? 'checked' : 'unchecked'}
                onPress={() => setLanguage(Language.GHARWALI)}
                color={BUTTON_COLOR}
              />
              <Text style={{ color: TEXT_COLOR }}>
                Gharwali
              </Text>
            </View>
          </View>
        </View>
        
        {/* Register Button */}
        <TouchableOpacity
          style={[
            styles.registerButton,
            { backgroundColor: BUTTON_COLOR }
          ]}
          onPress={handleRegister}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.buttonText}>Register</Text>
          )}
        </TouchableOpacity>
        
        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={{ color: TEXT_DIM_COLOR }}>
            Already have an account?
          </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: BUTTON_COLOR, marginLeft: 5 }}>
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 30,
  },
  titleContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
  },
  userTypeContainer: {
    marginBottom: 20,
  },
  languageContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  input: {
    marginBottom: 5,
    backgroundColor: 'transparent',
  },
  errorText: {
    color: '#b30000',
    fontSize: 12,
    marginBottom: 10,
    marginLeft: 5,
  },
  registerButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
});

export default RegisterScreen;
import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [userType, setUserType] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const bootstrapAsync = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const type = await AsyncStorage.getItem('userType');
        const user = await AsyncStorage.getItem('userData');
        
        if (token && type) {
          setUserToken(token);
          setUserType(type);
          setUserData(user ? JSON.parse(user) : null);
        }
      } catch (e) {
        console.log('Failed to get auth data', e);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);  const login = async (email, password, type, navigation) => {
    setIsLoading(true);
    try {
      // Call backend API login endpoint
      const response = await api.post('/auth/login/email', { 
        email, 
        password 
      });
      
      const { access_token, user_id } = response.data;
      
      // Get user details after login
      const userResponse = await api.get(`/users/${user_id}`, {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      });
      
      await AsyncStorage.setItem('userToken', access_token);
      await AsyncStorage.setItem('userType', type);
      await AsyncStorage.setItem('userData', JSON.stringify(userResponse.data));
      
      setUserToken(access_token);
      setUserType(type);
      setUserData(userResponse.data);
      
      // Explicitly navigate to the appropriate dashboard
      if (navigation) {
        navigation.reset({
          index: 0,
          routes: [{ name: type === 'customer' ? 'CustomerMain' : 'FreelancerMain' }],
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };  const register = async (userData, type, navigation) => {
    setIsLoading(true);
    try {
      // Format the user data to match the backend schema
      const userPayload = {
        name: userData.name || userData.fullName,
        email: userData.email,
        phone: userData.phone,
        password: userData.password,
        user_type: type,
        csc_id: userData.csc_id || null,
        preferred_language: userData.preferred_language || "english"
      };
      
      // Call backend API signup endpoint
      const registerResponse = await api.post('/auth/signup', userPayload);
      
      // After registration, login the user
      const loginResponse = await api.post('/auth/login/email', { 
        email: userData.email, 
        password: userData.password 
      });
      
      const { access_token, user_id } = loginResponse.data;
      
      await AsyncStorage.setItem('userToken', access_token);
      await AsyncStorage.setItem('userType', type);
      await AsyncStorage.setItem('userData', JSON.stringify(registerResponse.data));
      
      setUserToken(access_token);
      setUserType(type);
      setUserData(registerResponse.data);
      
      // Explicitly navigate to the appropriate dashboard
      if (navigation) {
        navigation.reset({
          index: 0,
          routes: [{ name: type === 'customer' ? 'CustomerMain' : 'FreelancerMain' }],
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userType');
      await AsyncStorage.removeItem('userData');
      
      setUserToken(null);
      setUserType(null);
      setUserData(null);
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserData = async (newData) => {
    try {
      const updatedData = { ...userData, ...newData };
      await AsyncStorage.setItem('userData', JSON.stringify(updatedData));
      setUserData(updatedData);
      return true;
    } catch (error) {
      console.error('Update user data error:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      isLoading, 
      userToken, 
      userType,
      userData,
      login, 
      register, 
      logout,
      updateUserData 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

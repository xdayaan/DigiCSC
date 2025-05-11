import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Use localhost for iOS simulator, 10.0.2.2 for Android emulator
const BASE_URL = Platform.select({
  ios: 'http://localhost:8000/api',
  android: 'http://10.0.2.2:8000/api',
  default: 'http://localhost:8000/api',
});

// Export API URL for use in other services
export const API_BASE_URL = Platform.select({
  ios: 'http://localhost:8000',
  android: 'http://10.0.2.2:8000',
  default: 'http://localhost:8000',
});

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle error responses
    let errorMessage = 'An unexpected error occurred';
    
    if (error.response) {
      // Server responded with a status code outside the 2xx range
      const { status, data } = error.response;
      
      if (status === 401) {
        errorMessage = 'Authentication failed. Please login again.';
        // You could trigger a logout here if needed
      } else if (status === 403) {
        errorMessage = 'You do not have permission to perform this action.';
      } else if (status === 404) {
        errorMessage = 'The requested resource was not found.';
      } else if (status === 422) {
        errorMessage = 'Validation failed. Please check your input.';
      } else if (status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      // Use any error detail from the backend if available
      if (data && data.detail) {
        errorMessage = data.detail;
      }
    } else if (error.request) {
      // Request was made but no response received
      errorMessage = 'No response from server. Please check your internet connection.';
    }
    
    // Attach the formatted message to the error
    error.formattedMessage = errorMessage;
    
    return Promise.reject(error);
  }
);

export default api;

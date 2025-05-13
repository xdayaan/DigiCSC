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

// Helper function for uploading files
export const uploadFile = async (url, formData) => {
  try {
    // For file uploads, don't set Content-Type header
    // the browser/axios set it automatically with boundary
    const config = {
      headers: {
        'Accept': 'application/json',
      },
      // Don't transform the form data
      transformRequest: (data) => data
    };
    
    return await api.post(url, formData, config);
  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
};

// Specialized helper for uploading documents
export const uploadDocument = async (file, conversationId) => {
  try {
    // Create form data
    const formData = new FormData();
    
    // Handle different file formats (web vs native)
    if (file instanceof Blob || file instanceof File) {
      // For web: Use the file directly
      formData.append('file', file, file.name || 'document.pdf');
    } else {
      // For React Native: Create proper file object
      const fileToUpload = {
        uri: file.uri,
        type: file.mimeType || file.type || 'application/octet-stream',
        name: file.name || 'document.pdf'
      };
      formData.append('file', fileToUpload);
    }
    
    // Add conversation_id if available
    if (conversationId) {
      formData.append('conversation_id', conversationId.toString());
    }
    
    // Upload the document
    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Accept': 'application/json',
      },
      transformRequest: (data) => data,
    });
    
    return response.data;
  } catch (error) {
    console.error('Document upload error:', error);
    
    // Re-throw with better error message if possible
    if (error.response && error.response.data && error.response.data.detail) {
      error.message = error.response.data.detail;
    } else if (error.formattedMessage) {
      error.message = error.formattedMessage;
    }
    throw error;
  }
};

export default api;

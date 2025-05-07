import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import secureStorage from '../utils/secureStorage';
import { Language, UserType } from './types';

// API response interfaces
export interface ApiUser {
  id: number;
  name: string;
  phone: string;
  email?: string;
  csc_id?: string;
  user_type: string;
  preferred_language: string;
  created_at: string;
  updated_at: string;
}

export interface ApiMessage {
  message_id: string;
  chat_id: string;
  user_id: number;
  sent_from: string;
  type: string;
  text: string;
  doc_link?: string;
  freelancer_id?: number;
  created_at: string;
}

export interface ApiChat {
  chat_id: string;
  user_id: number;
  messages: ApiMessage[];
  created_at: string;
  updated_at: string;
}

// Get API URL from environment variables with fallback
const API_URL = Constants.expoConfig?.extra?.apiUrl || 
               process.env.EXPO_PUBLIC_API_URL || 
               'http://localhost:8000';

// Base API configuration
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// API Version path from your backend
const API_V1 = '/api/v1';

// Add request interceptor for auth tokens
apiClient.interceptors.request.use(
  async (config) => {
    // Get user data from secure storage for API calls that need user context
    const userJson = await secureStorage.getItem('user');
    if (userJson) {
      const userData = JSON.parse(userJson);
      // You could add authorization here in the future
      // config.headers.Authorization = `Bearer ${userData.token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle specific error cases
    if (error.response) {
      // Server responded with error status
      console.error('API Error:', error.response.status, error.response.data);
      
      // Handle specific status codes
      switch (error.response.status) {
        case 401:
          // Handle unauthorized (e.g., logout user)
          break;
        case 404:
          // Handle not found
          break;
        // Add more cases as needed
      }
    } else if (error.request) {
      // Request was made but no response received (network issues)
      console.error('Network Error: No response received');
    } else {
      // Error in request setup
      console.error('Request Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// User APIs
export const userApi = {
  register: async (userData: {
    name: string;
    phone: string;
    email?: string;
    csc_id?: string;
    user_type: string;
    preferred_language: string;
  }): Promise<ApiUser> => {
    try {
      const response = await apiClient.post<ApiUser>(`${API_V1}/users/`, userData);
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  getUser: async (userId: number): Promise<ApiUser> => {
    try {
      const response = await apiClient.get<ApiUser>(`${API_V1}/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Get user error:', error);
      throw error;
    }
  },

  updateUser: async (userId: number, userData: {
    name?: string;
    phone?: string;
    email?: string;
    csc_id?: string;
    preferred_language?: string;
  }): Promise<ApiUser> => {
    try {
      const response = await apiClient.put<ApiUser>(`${API_V1}/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  },
};

// Chat APIs
export const chatApi = {
  createChat: async (userId: number): Promise<ApiChat> => {
    try {
      const response = await apiClient.post<ApiChat>(`${API_V1}/chats/`, { user_id: userId });
      return response.data;
    } catch (error) {
      console.error('Create chat error:', error);
      throw error;
    }
  },

  getUserChats: async (userId: number): Promise<ApiChat[]> => {
    try {
      const response = await apiClient.get<ApiChat[]>(`${API_V1}/chats/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Get user chats error:', error);
      throw error;
    }
  },

  getChat: async (chatId: string): Promise<ApiChat> => {
    try {
      const response = await apiClient.get<ApiChat>(`${API_V1}/chats/${chatId}`);
      return response.data;
    } catch (error) {
      console.error('Get chat error:', error);
      throw error;
    }
  },

  sendMessage: async (chatId: string, message: {
    sent_from: string;
    type: string;
    text: string;
    freelancer_id?: number;
    doc_link?: string;
  }): Promise<ApiMessage> => {
    try {
      const response = await apiClient.post<ApiMessage>(`${API_V1}/chats/${chatId}/messages`, message);
      return response.data;
    } catch (error) {
      console.error('Send message error:', error);
      throw error;
    }
  },

  deleteChat: async (chatId: string): Promise<void> => {
    try {
      await apiClient.delete(`${API_V1}/chats/${chatId}`);
    } catch (error) {
      console.error('Delete chat error:', error);
      throw error;
    }
  },
};

// Document upload helper
export const uploadDocument = async (fileUri: string, fileName: string, fileType: string): Promise<string> => {
  try {
    console.log(`Starting upload for: ${fileName} (${fileType})`);
    const formData = new FormData();

    if (Platform.OS === 'web') {
      // For web platform: Handle file upload properly
      try {
        // Handle different URI formats on web
        if (fileUri.startsWith('data:')) {
          // For data URLs, convert directly to blob
          const base64Data = fileUri.split(',')[1];
          const byteCharacters = atob(base64Data);
          const byteArrays = [];
          
          for (let i = 0; i < byteCharacters.length; i += 512) {
            const slice = byteCharacters.slice(i, i + 512);
            const byteNumbers = new Array(slice.length);
            for (let j = 0; j < slice.length; j++) {
              byteNumbers[j] = slice.charCodeAt(j);
            }
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
          }
          
          const blob = new Blob(byteArrays, { type: fileType });
          // Explicitly set the filename to help the server identify the file
          formData.append('file', blob, fileName);
          console.log('Processed data URL to blob with correct type:', fileType);
        } else {
          // For blob URLs or file URLs
          const response = await fetch(fileUri);
          if (!response.ok) {
            throw new Error(`Failed to fetch file from URI: ${response.statusText}`);
          }
          
          // Create blob with explicit type
          const blob = await response.blob();
          // Create a new blob with the correct type if needed
          const fileBlob = new Blob([blob], { type: fileType });
          formData.append('file', fileBlob, fileName);
          console.log('Processed file URL to blob with type:', fileType);
        }
      } catch (error) {
        console.error('Error creating blob from URI on web:', error);
        throw new Error(`Failed to process file on web: ${error.message}`);
      }
    } else {
      // For native platforms (iOS/Android)
      try {
        // Check if file exists
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        
        if (!fileInfo.exists) {
          throw new Error('File does not exist');
        }
        
        // For small files, we can use base64 approach
        if (fileInfo.size < 10 * 1024 * 1024) { // Less than 10MB
          // Read the file as base64 and convert to blob
          const fileContent = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64
          });
          
          // Create blob from base64 content
          const blob = await fetch(`data:${fileType};base64,${fileContent}`).then(r => r.blob());
          formData.append('file', blob, fileName);
        } else {
          // For larger files, use direct file object
          formData.append('file', {
            uri: Platform.OS === 'ios' ? fileUri.replace('file://', '') : fileUri,
            name: fileName,
            type: fileType
          } as any);
        }
        
        console.log('File prepared for upload', {
          fileName, 
          fileType,
          fileSize: fileInfo.size
        });
      } catch (error) {
        console.error('Error preparing file on native platform:', error);
        throw new Error(`Failed to process file on native platform: ${error.message}`);
      }
    }

    console.log('Sending upload request...');
    
    // Create headers object for better control
    const headers = new Headers();
    // Do NOT set Content-Type, let browser set it with boundary info for multipart/form-data

    // Upload the file with explicit fetch to have more control
    const response = await fetch(`${apiClient.defaults.baseURL}${API_V1}/uploads/`, {
      method: 'POST',
      body: formData,
      headers: headers
    });

    console.log('Upload response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Upload error details:', errorText);
      throw new Error(`Upload failed with status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Upload successful, received doc_link:', data.doc_link);
    return data.doc_link;
  } catch (error) {
    console.error('Upload document error:', error);
    throw error;
  }
};

// Export a method to check API connectivity
export const checkApiConnection = async (): Promise<boolean> => {
  try {
    const response = await apiClient.get('/');
    return response.status === 200;
  } catch (error) {
    console.error('API connection check failed:', error);
    return false;
  }
};

export default {
  userApi,
  chatApi,
  uploadDocument,
  checkApiConnection,
  baseUrl: API_URL,
};
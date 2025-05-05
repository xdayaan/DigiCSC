import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define the base URL for API requests
const API_URL = 'http://localhost:8000/api';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// User interfaces
export interface User {
  id: number;
  name: string;
  phone: string;
  language: string;
  created_on: string;
  updated_on: string;
}

export interface UserCreate {
  name: string;
  phone: string;
  language: string;
}

// Chat message interfaces
export enum MessageSender {
  USER = "user",
  AI = "ai",
  FREELANCER = "freelancer"
}

export enum MessageType {
  TEXT = "text",
  PDF = "pdf",
  IMAGE = "image",
  AUDIO = "audio",
  VIDEO = "video",
  FILE = "file"
}

export interface ChatMessage {
  user_id: number;
  sent_from: MessageSender;
  type: MessageType;
  text: string;
  freelancer_id?: number;
  doc_link?: string;
  created_at: string;
}

export interface Chat {
  chat_id: string;
  user_id: number;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

// API functions
export const userApi = {
  // Register a new user
  register: async (userData: UserCreate): Promise<User> => {
    const response = await api.post<User>('/users', userData);
    await AsyncStorage.setItem('user', JSON.stringify(response.data));
    return response.data;
  },
  
  // Get current user from storage
  getCurrentUser: async (): Promise<User | null> => {
    const userJson = await AsyncStorage.getItem('user');
    if (userJson) {
      return JSON.parse(userJson);
    }
    return null;
  },
  
  // Update user language preference
  updateLanguage: async (userId: number, language: string): Promise<User> => {
    const response = await api.put<User>(`/users/${userId}`, { language });
    
    // Update the stored user data
    const userJson = await AsyncStorage.getItem('user');
    if (userJson) {
      const user = JSON.parse(userJson);
      user.language = language;
      await AsyncStorage.setItem('user', JSON.stringify(user));
    }
    
    return response.data;
  }
};

export const chatApi = {
  // Create a new chat for a user
  createChat: async (userId: number): Promise<Chat> => {
    const response = await api.post<Chat>('/chats', { user_id: userId });
    return response.data;
  },
  
  // Get all chats for a user
  getUserChats: async (userId: number): Promise<Chat[]> => {
    const response = await api.get<Chat[]>(`/chats/user/${userId}`);
    return response.data;
  },
  
  // Get a specific chat by ID
  getChat: async (chatId: string): Promise<Chat> => {
    const response = await api.get<Chat>(`/chats/${chatId}`);
    return response.data;
  },
  
  // Send a message in a chat
  sendMessage: async (chatId: string, message: {
    user_id: number;
    text: string;
    sent_from: MessageSender;
    type: MessageType;
  }): Promise<ChatMessage[]> => {
    const response = await api.post<ChatMessage[]>(
      `/chats/${chatId}/messages`, 
      message
    );
    return response.data;
  },
  
  // Get text-to-speech audio for a message
  getTextToSpeech: async (text: string, languageCode: string): Promise<string> => {
    const response = await api.post<{ audio_content: string }>('/chats/text-to-speech', {
      text,
      language_code: languageCode
    });
    return response.data.audio_content;
  }
};

export default api;
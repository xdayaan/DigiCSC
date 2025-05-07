import Constants from 'expo-constants';
import secureStorage from '../utils/secureStorage';

// Get WebSocket URL from environment variables with fallback
const WS_URL = Constants.expoConfig?.extra?.wsUrl ||
              process.env.EXPO_PUBLIC_WS_URL || 
              'ws://localhost:8000';

// Call notification interfaces
export interface CallNotification {
  type: 'call';
  from: {
    id: number;
    name: string;
  };
  to: number;
  chatId: string;
}

export interface CallResponse {
  type: 'call_response';
  callId: string;
  response: 'accept' | 'reject';
  freelancerId: number;
}

// WebSocket message types
export type WebSocketMessage = 
  | { type: 'call'; userId: number; to: number; chatId: string }
  | { type: 'call_response'; callId: string; response: 'accept' | 'reject'; freelancerId: number }
  | { type: 'error'; message: string };

class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private callListeners: ((notification: CallNotification) => void)[] = [];
  private responseListeners: ((response: CallResponse) => void)[] = [];
  private userId: number | null = null;
  private authToken: string | null = null;

  constructor() {
    // Load userId from secure storage when initializing the service
    this.loadUserData();
  }

  private async loadUserData() {
    try {
      const userJson = await secureStorage.getItem('user');
      if (userJson) {
        const userData = JSON.parse(userJson);
        this.userId = userData.id;
      }
      
      // Load auth token if available
      const token = await secureStorage.getItem('token');
      if (token) {
        this.authToken = token;
      }
    } catch (error) {
      console.error('Error loading user data for WebSocket:', error);
    }
  }

  async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        console.log('WebSocket already connected');
        resolve(true);
        return;
      }

      try {
        // Add token as a query parameter if available
        const wsUrl = this.authToken 
          ? `${WS_URL}/ws?token=${encodeURIComponent(this.authToken)}`
          : `${WS_URL}/ws`;
          
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
          console.log('WebSocket connection established');
          this.reconnectAttempts = 0;
          
          // Register user ID on connection
          if (this.userId) {
            this.sendMessage({
              type: 'register',
              userId: this.userId
            });
          }
          
          resolve(true);
        };

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message received:', data);
            
            if (data.type === 'call') {
              this.callListeners.forEach(listener => listener(data));
            } else if (data.type === 'call_response') {
              this.responseListeners.forEach(listener => listener(data));
            } else if (data.type === 'error') {
              console.error('WebSocket error message:', data.message);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.socket.onclose = (event) => {
          console.log('WebSocket connection closed', event.code, event.reason);
          this.socket = null;
          
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            console.log(`Attempting to reconnect in ${delay}ms`);
            
            this.reconnectTimeout = setTimeout(() => {
              this.reconnectAttempts++;
              this.connect();
            }, delay);
          }
          
          resolve(false);
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          resolve(false);
        };
      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        resolve(false);
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  sendMessage(message: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.error('Cannot send message: WebSocket not connected');
    }
  }

  initiateCall(toUserId: number, chatId: string) {
    if (!this.userId) {
      console.error('Cannot initiate call: User ID not set');
      return false;
    }
    
    this.sendMessage({
      type: 'call',
      userId: this.userId,
      to: toUserId,
      chatId
    });
    
    return true;
  }

  respondToCall(callId: string, accept: boolean) {
    if (!this.userId) {
      console.error('Cannot respond to call: User ID not set');
      return false;
    }
    
    this.sendMessage({
      type: 'call_response',
      callId,
      response: accept ? 'accept' : 'reject',
      freelancerId: this.userId
    });
    
    return true;
  }

  onCall(listener: (notification: CallNotification) => void) {
    this.callListeners.push(listener);
    return () => {
      this.callListeners = this.callListeners.filter(l => l !== listener);
    };
  }

  onCallResponse(listener: (response: CallResponse) => void) {
    this.responseListeners.push(listener);
    return () => {
      this.responseListeners = this.responseListeners.filter(l => l !== listener);
    };
  }

  updateUserId(userId: number) {
    this.userId = userId;
    
    // If connected, register the new user ID
    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.userId) {
      this.sendMessage({
        type: 'register',
        userId: this.userId
      });
    }
  }
  
  updateAuthToken(token: string | null) {
    this.authToken = token;
    
    // If token changed and we're connected, reconnect with new token
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.disconnect();
      this.connect();
    }
  }
}

// Create a singleton instance
const webSocketService = new WebSocketService();

export default webSocketService;
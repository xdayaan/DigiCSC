import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import secureStorage from '../utils/secureStorage';
import { userApi, ApiUser } from './api';
import { User, UserType, Language } from './types';
import { setupNotificationListeners } from '../utils/navigationUtils';

// Define the context type
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (userData: User) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: Omit<User, 'id'>) => Promise<User>;
  updateUserPreferences: (language: Language) => Promise<void>;
}

// Convert API user to frontend User
const mapApiUserToUser = (apiUser: ApiUser): User => {
  return {
    id: apiUser.id,
    name: apiUser.name,
    phone: apiUser.phone,
    email: apiUser.email,
    csc_id: apiUser.csc_id,
    user_type: apiUser.user_type as UserType,
    preferred_language: apiUser.preferred_language as Language
  };
};

// Create the context
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  register: async () => ({ 
    id: 0, 
    name: '', 
    phone: '', 
    user_type: UserType.USER, 
    preferred_language: Language.ENGLISH 
  }),
  updateUserPreferences: async () => {},
});

// Create the provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for stored user data on app start and set up notification handlers
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userJson = await secureStorage.getItem('user');
        if (userJson) {
          const userData = JSON.parse(userJson);
          setUser(userData);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
    
    // Set up notification listeners for the app
    const unsubscribeNotifications = setupNotificationListeners();
    
    // Cleanup notification listeners when the app is closed/unmounted
    return () => {
      unsubscribeNotifications();
    };
  }, []);

  // Login function
  const login = async (userData: User) => {
    setIsLoading(true);
    try {
      // Store the user data in secure storage
      await secureStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setIsLoading(true);
    try {
      // Remove user data from secure storage
      await secureStorage.deleteItem('user');
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (userData: Omit<User, 'id'>) => {
    setIsLoading(true);
    try {
      // Call the register API
      const apiUser = await userApi.register(userData);
      
      // Convert API user to our app's User type
      const newUser = mapApiUserToUser(apiUser);
      
      // Automatically log in the user
      await login(newUser);
      
      return newUser;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Update user preferences
  const updateUserPreferences = async (language: Language) => {
    if (!user) {
      throw new Error('User not logged in');
    }

    setIsLoading(true);
    try {
      // Update user in the backend
      const apiUser = await userApi.updateUser(user.id, {
        preferred_language: language
      });

      // Update local user
      const updatedUser = {
        ...user,
        preferred_language: language
      };

      // Store updated user
      await secureStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      console.error('Update preferences error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      login, 
      logout, 
      register, 
      updateUserPreferences 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

export default AuthContext;
// Cross-platform secure storage implementation
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * A cross-platform storage solution that uses SecureStore on native platforms
 * and localStorage on web platforms.
 */
class SecureStorage {
  /**
   * Stores the value with the key in the secure storage
   * @param key The key to store the value with
   * @param value The value to store
   */
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.error('Error saving to localStorage:', error);
        throw error;
      }
    } else {
      try {
        await SecureStore.setItemAsync(key, value);
      } catch (error) {
        console.error('Error saving to SecureStore:', error);
        throw error;
      }
    }
  }

  /**
   * Gets the value with the key from the secure storage
   * @param key The key to get the value with
   * @returns The value or null if not found
   */
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.error('Error retrieving from localStorage:', error);
        throw error;
      }
    } else {
      try {
        return await SecureStore.getItemAsync(key);
      } catch (error) {
        console.error('Error retrieving from SecureStore:', error);
        throw error;
      }
    }
  }

  /**
   * Deletes the value with the key from the secure storage
   * @param key The key to delete the value with
   */
  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error('Error removing from localStorage:', error);
        throw error;
      }
    } else {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch (error) {
        console.error('Error removing from SecureStore:', error);
        throw error;
      }
    }
  }
}

// Export a singleton instance
export default new SecureStorage();
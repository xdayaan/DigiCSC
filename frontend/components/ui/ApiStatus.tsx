import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { checkApiConnection } from '../../app/services/api';
import { useThemeColor } from '../../hooks/useThemeColor';

interface ApiStatusProps {
  showEndpoint?: boolean;
}

export const ApiStatus: React.FC<ApiStatusProps> = ({ showEndpoint = false }) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiUrl, setApiUrl] = useState<string>('');
  
  const textColor = useThemeColor({}, 'text');
  const successColor = '#4CAF50';
  const errorColor = '#F44336';

  useEffect(() => {
    const checkConnection = async () => {
      try {
        setIsLoading(true);
        // Import dynamically to get the current baseUrl
        const api = await import('../../app/services/api').then(module => module.default);
        setApiUrl(api.baseUrl);
        
        const connected = await checkApiConnection();
        setIsConnected(connected);
      } catch (error) {
        console.error('Error checking API connection:', error);
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkConnection();
    // Set up an interval to check periodically
    const intervalId = setInterval(checkConnection, 30000); // Check every 30 seconds
    
    return () => clearInterval(intervalId);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={textColor} />
        <Text style={[styles.text, { color: textColor }]}>Checking API connection...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[
        styles.statusIndicator, 
        { backgroundColor: isConnected ? successColor : errorColor }
      ]} />
      <Text style={[styles.text, { color: textColor }]}>
        API: {isConnected ? 'Connected' : 'Disconnected'}
      </Text>
      {showEndpoint && (
        <Text style={[styles.endpointText, { color: textColor }]}>
          {apiUrl}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
  endpointText: {
    fontSize: 10,
    marginLeft: 8,
    opacity: 0.7,
  },
});

export default ApiStatus;
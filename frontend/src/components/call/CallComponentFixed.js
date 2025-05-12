import React, { useEffect, useState } from 'react';
import { Platform, PermissionsAndroid, View, Text, StyleSheet } from 'react-native';

// Detect if we're running on web
const isWeb = Platform.OS === 'web';

// Logging function
const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  const logPrefix = `[VOICE-CALL][${timestamp}]`;
  
  switch(type) {
    case 'error':
      console.error(`${logPrefix} ERROR:`, message);
      break;
    case 'warning':
      console.warn(`${logPrefix} WARNING:`, message);
      break;
    case 'success':
      console.log(`${logPrefix} SUCCESS:`, message);
      break;
    default:
      console.log(`${logPrefix} INFO:`, message);
  }
};

const APP_ID = '81e82eacfa0f4fdd8ef607513d9a7269';
const UID = Math.floor(Math.random() * 100000);

const VoiceCall = ({ channelName = 'default-channel', role = 'guest' }) => {
  const CHANNEL_NAME = channelName;
  const TOKEN_URL = `http://localhost:8000/agora/generate_token?channel_name=${CHANNEL_NAME}&uid=${UID}&role=${role === 'host' ? 'publisher' : 'subscriber'}`;
  
  log(`Initializing VoiceCall component with UID: ${UID}, Channel: ${CHANNEL_NAME}, Role: ${role}`);
  const [joined, setJoined] = useState(false);
  const [token, setToken] = useState('');
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);

  // Add log to state for UI display
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prevLogs => [...prevLogs, { message, type, timestamp }]);
    log(message, type);
  };

  useEffect(() => {
    addLog('Voice call component mounted');
    
    const init = async () => {
      try {
        addLog(`Initializing call on platform: ${Platform.OS}`);
        addLog('Requesting token from server...');
        
        let tokenToUse;
          try {
          addLog(`Requesting token from: ${TOKEN_URL}`);
          addLog(`Call role: ${role}, Channel: ${CHANNEL_NAME}`);
          
          const response = await fetch(TOKEN_URL);
          
          if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
          }
          
          addLog('Server response received');
          const data = await response.json();
          
          if (!data.token) {
            throw new Error('No token received from server');
          }
          
          addLog('Token received successfully', 'success');
          addLog(`Token details - Channel: ${CHANNEL_NAME}, UID: ${UID}`);
          tokenToUse = data.token;
        } catch (fetchError) {
          addLog(`Token fetch error: ${fetchError.message}`, 'warning');
          
          // If in development mode, provide a mock token for testing
          try {
            if (typeof __DEV__ !== 'undefined' && __DEV__) {
              addLog('Using mock token for development', 'warning');
              tokenToUse = "mockTokenForTesting";
            } else {
              throw fetchError;
            }
          } catch (e) {
            // Mock token for web debugging
            addLog('Using mock token for web', 'warning');
            tokenToUse = "mockTokenForWeb";
          }
        }
        
        setToken(tokenToUse);
        
        if (isWeb) {
          addLog('Initializing web platform call');
          await initWeb(tokenToUse);
        } else {
          addLog('Initializing mobile platform call');
          await requestPermissions();
          await initMobile(tokenToUse);
        }
      } catch (err) {
        addLog(`Error initializing call: ${err.message}`, 'error');
        setError(err.message);
      }
    };

    init();

    return () => {
      addLog('Cleaning up voice call component');
      leaveChannel();
    };
  }, []);
  const initMobile = async (token) => {
    try {
      // Skip actual initialization in web environment to avoid bundling issues
      if (isWeb) {
        addLog('Mobile initialization skipped in web environment', 'warning');
        setError("Native mobile SDK not available in web environment");
        return;
      }
      
      addLog('Loading RtcEngine for mobile');
      
      // Safe import for native platforms
      let RtcEngine;
      try {
        // Using a conditional require instead of import
        // This helps avoid web bundling issues
        if (Platform.OS === 'android' || Platform.OS === 'ios') {
          // Use require with variable to prevent bundling tools from including it
          const moduleName = 'react-native-agora';
          RtcEngine = require(moduleName).default;
          addLog('Successfully loaded react-native-agora module', 'success');
        } else {
          throw new Error('Unsupported platform');
        }
      } catch (importError) {
        addLog(`Failed to import Agora SDK: ${importError.message}`, 'error');
        setError("Agora SDK not available on this platform");
        return;
      }
      
      addLog('Creating RtcEngine instance');
      const engine = await RtcEngine.create(APP_ID);
      
      addLog('Enabling audio');
      await engine.enableAudio();
      
      addLog('Setting up event listeners');
      engine.addListener('JoinChannelSuccess', (channel, uid, elapsed) => {
        addLog(`Successfully joined channel: ${channel}, with UID: ${uid}`, 'success');
        setJoined(true);
      });
      
      engine.addListener('Error', (error) => {
        addLog(`Agora error: ${error}`, 'error');
      });
      
      engine.addListener('ConnectionStateChanged', (state, reason) => {
        addLog(`Connection state changed to: ${state}, reason: ${reason}`);
      });
      
      addLog(`Joining channel: ${CHANNEL_NAME} with UID: ${UID}`);
      await engine.joinChannel(token, CHANNEL_NAME, null, UID);
      addLog('Join channel command sent');
    } catch (err) {
      addLog(`Error in initMobile: ${err.message}`, 'error');
      setError(err.message);
    }
  };
  const initWeb = async (token) => {
    try {
      addLog('Initializing web client');
      
      // Safe import for web platform
      try {
        addLog('Importing AgoraRTC for web');
        
        // Check if we're in an environment that supports dynamic imports
        if (typeof window !== 'undefined' && window.navigator) {
          let AgoraRTC;
          
          try {
            // Try standard dynamic import
            AgoraRTC = await import('agora-rtc-sdk-ng');
            addLog('Successfully imported Agora Web SDK', 'success');
          } catch (dynamicImportError) {
            // If dynamic import fails, try to use a global AgoraRTC object if available
            if (window.AgoraRTC) {
              AgoraRTC = window.AgoraRTC;
              addLog('Using global AgoraRTC object', 'warning');
            } else {
              // If neither works, throw an error
              throw new Error('Agora Web SDK is not available: ' + dynamicImportError.message);
            }
          }
          
          addLog('Creating RTC client');
          const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
          
          addLog('Setting up event listeners for web client');
          client.on('connection-state-change', (currentState, prevState) => {
            addLog(`Connection state changed from ${prevState} to ${currentState}`);
          });
          
          addLog(`Joining channel: ${CHANNEL_NAME} with UID: ${UID}`);
          await client.join(APP_ID, CHANNEL_NAME, token, UID);
          addLog('Successfully joined channel on web', 'success');
          
          addLog('Creating microphone audio track');
          const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
          
          addLog('Publishing audio track to channel');
          await client.publish([localAudioTrack]);
          addLog('Audio track published successfully', 'success');
          
          setJoined(true);
        } else {
          throw new Error('Web environment not detected');
        }
      } catch (importError) {
        addLog(`Failed to set up Agora Web SDK: ${importError.message}`, 'error');
        throw new Error('Failed to initialize Agora Web SDK');
      }
    } catch (err) {
      addLog(`Error in initWeb: ${err.message}`, 'error');
      setError(err.message);
    }
  };

  const leaveChannel = async () => {
    try {
      addLog('Attempting to leave channel');
      
      if (isWeb) {
        addLog('Cleaning up web resources');
        // Web cleanup code can be added here if needed
        addLog('Web cleanup completed');
      } else {
        try {
          addLog('Loading RtcEngine for cleanup');
          // Safe import for cleanup
          const AgoraModule = await import('react-native-agora');
          const RtcEngine = AgoraModule.default;
          
          addLog('Creating engine instance for cleanup');
          const engine = await RtcEngine.create(APP_ID);
          
          addLog('Leaving channel');
          await engine.leaveChannel();
          
          addLog('Destroying engine instance');
          engine.destroy();
        } catch (importError) {
          addLog(`Failed to import Agora SDK for cleanup: ${importError.message}`, 'warning');
          // Continue with the cleanup even if the import fails
        }
      }
      
      addLog('Successfully left channel', 'success');
      setJoined(false);
    } catch (err) {
      addLog(`Error leaving channel: ${err.message}`, 'error');
    }
  };

  const requestPermissions = async () => {
    try {
      if (Platform.OS === 'android') {
        addLog('Requesting Android audio permissions');
        
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);
        
        if (granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED) {
          addLog('Audio recording permission granted', 'success');
          return true;
        } else {
          addLog('Audio recording permission denied', 'error');
          throw new Error('Audio recording permission denied');
        }
      } else if (Platform.OS === 'ios') {
        addLog('iOS permissions handled by the system');
        return true;
      }
      return true;
    } catch (err) {
      addLog(`Error requesting permissions: ${err.message}`, 'error');
      throw err;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.statusText}>
        {error ? 'Connection Error' : joined ? 'In Call' : 'Joining channel...'}
      </Text>
      
      {error && (
        <Text style={styles.errorText}>
          Error: {error}
        </Text>
      )}
      
      <View style={styles.logContainer}>
        <Text style={styles.logTitle}>Call Activity Log:</Text>
        {logs.map((log, index) => (
          <Text 
            key={index} 
            style={[
              styles.logEntry, 
              log.type === 'error' && styles.logError,
              log.type === 'success' && styles.logSuccess,
              log.type === 'warning' && styles.logWarning
            ]}
          >
            [{log.timestamp}] {log.message}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    width: '100%',
    maxWidth: 500,
  },
  statusText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    marginBottom: 20,
    textAlign: 'center',
  },
  logContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#343a40',
    borderRadius: 5,
    maxHeight: 300,
    overflow: 'scroll',
  },
  logTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  logEntry: {
    color: '#ced4da',
    fontSize: 12,
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'courier',
    marginBottom: 5,
  },
  logError: {
    color: '#ff6b6b',
  },
  logSuccess: {
    color: '#51cf66',
  },
  logWarning: {
    color: '#fcc419',
  }
});

export default VoiceCall;

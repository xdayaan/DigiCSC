import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native-web';
import AgoraRTC from 'agora-rtc-sdk-ng';

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

const APP_ID = '4bf102787e1e42288c2de641970249a0';
const UID = 888999;

const VoiceCall = ({ channelName = 'default-channel', role = 'guest' }) => {
  const CHANNEL_NAME = channelName;
  const TOKEN_URL = `http://localhost:8000/api/agora/generate_token?channel_name=${CHANNEL_NAME}&uid=${UID}&role=${role === 'host' ? 'publisher' : 'subscriber'}`;
  
  log(`Initializing VoiceCall component with UID: ${UID}, Channel: ${CHANNEL_NAME}, Role: ${role}`);
  const [joined, setJoined] = useState(false);
  const [token, setToken] = useState('');
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);
  const [client, setClient] = useState(null);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);

  // Add log to state for UI display
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prevLogs => [...prevLogs, { message, type, timestamp }]);
    log(message, type);
  };
  // Initialize Agora client
  const initCall = async (token) => {
    try {
      addLog('Initializing web client');
      
      // Create client
      addLog('Creating RTC client');
      const rtcClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      setClient(rtcClient);
      
      // Set up event listeners
      addLog('Setting up event listeners for web client');
      rtcClient.on('connection-state-change', (currentState, prevState) => {
        addLog(`Connection state changed from ${prevState} to ${currentState}`);
      });
        // Join the channel
      addLog(`Joining channel: ${CHANNEL_NAME} with UID: ${UID}`);
      await rtcClient.join(APP_ID, CHANNEL_NAME, token, UID);
      addLog('Successfully joined channel', 'success');
      
      // Create and publish audio track
      addLog('Creating microphone audio track');
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      setLocalAudioTrack(audioTrack);
      
      addLog('Publishing audio track to channel');
      await rtcClient.publish([audioTrack]);
      addLog('Audio track published successfully', 'success');
      
      setJoined(true);
    } catch (err) {
      addLog(`Error initializing call: ${err.message}`, 'error');
      setError(err.message);
    }
  };
  // Leave channel function
  const leaveChannel = async () => {
    try {
      addLog('Attempting to leave channel');
      
      if (client && localAudioTrack) {
        // Clean up resources
        localAudioTrack.close();
        await client.leave();
        addLog('Successfully left channel', 'success');
        setLocalAudioTrack(null);
        setClient(null);
      }
      
      setJoined(false);
    } catch (err) {
      addLog(`Error leaving channel: ${err.message}`, 'error');
    }
  };
  // Main initialization effect
  useEffect(() => {
    addLog('Voice call component mounted');
    
    const init = async () => {
      try {
        addLog('Requesting token from server...');
        
        let tokenToUse;
        try {
          addLog(`Requesting token from: ${TOKEN_URL}`);
          
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
          tokenToUse = data.token;
        } catch (fetchError) {
          addLog(`Token fetch error: ${fetchError.message}`, 'warning');
          
          // Use mock token for development
          addLog('Using mock token for development', 'warning');
          tokenToUse = "mockTokenForTesting";
        }
        
        setToken(tokenToUse);
        await initCall(tokenToUse);
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
        <View style={styles.logScrollView}>
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
  },
  logScrollView: {
    maxHeight: 250,
    overflow: 'auto',
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
    fontFamily: 'monospace',
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
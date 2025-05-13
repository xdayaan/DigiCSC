import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import Voice from '@react-native-voice/voice';

const ChatInput = ({ onSendText, onSendDocument, isLoading = false, disabled = false, inputText = '' }) => {
  const [message, setMessage] = useState(inputText);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Set up Voice listener on component mount
  useEffect(() => {
    // Initialize voice recognition listeners
    const onSpeechResults = (e) => {
      if (e.value && e.value.length > 0) {
        setMessage(prev => e.value[0]);
      } 
    };

    const onSpeechError = (e) => {
      console.error('Speech recognition error:', e);
      setIsRecording(false);
    };

    const onSpeechEnd = () => {
      setIsRecording(false);
    };

    // Add event listeners
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;
    Voice.onSpeechEnd = onSpeechEnd;

    // Clean up listeners on unmount
    return () => {
      Voice.destroy().then(() => {
        Voice.removeAllListeners();
      });
    };
  }, []);

  // Handle text send
  const handleSend = () => {
    if (message.trim() && !isLoading) {
      onSendText(message.trim());
      setMessage('');
    }
  };

  // Toggle speech recognition
  const toggleSpeechRecognition = async () => {
    if (isRecording) {
      // If already recording, stop it
      setIsRecording(false);
      try {
        if (Platform.OS !== 'web') {
          await Voice.stop();
        } else {
          // For web, stop is handled through the web SpeechRecognition API
          window._speechRecognition?.stop();
        }
      } catch (e) {
        console.error("Error stopping voice recording:", e);
      }
      return;
    }
    
    try {
      // Start recording
      setIsRecording(true);
      
      // Check if the platform is web
      if (Platform.OS === 'web') {
        // Web Speech API implementation
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
          Alert.alert("Not Supported", "Speech recognition is not supported in this browser.");
          setIsRecording(false);
          return;
        }

        // Create speech recognition instance
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        // Store reference globally so we can stop it later
        window._speechRecognition = recognition;
        
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        // Set up event handlers
        recognition.onstart = () => {
          setIsRecording(true);
        };
        
        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setMessage(transcript); // Replace with current transcript
        };
        
        recognition.onerror = (event) => {
          console.error("Speech recognition error:", event.error);
          setIsRecording(false);
        };
        
        recognition.onend = () => {
          setIsRecording(false);
        };
        
        // Start recognition
        recognition.start();
      } else {
        // Mobile implementation using Voice library
        await Voice.start('en-US');
      }
    } catch (error) {
      console.error("Voice recording error:", error);
      setIsRecording(false);
      Alert.alert("Error", "Could not start voice recording. Please try again.");
    }
  };

  // Handle document selection
  const handleDocumentPicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', // Allow all types of files
        copyToCacheDirectory: true,
        multiple: false,
      });
      console.log("Result: ", result)
      
      if (result.canceled === false && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        console.log("Selected file: ", file);
        onSendDocument(file);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Could not select the document. Please try again.');
    }
  };


  return (
    <View style={styles.container}>
      {/* Attachment options */}
      <TouchableOpacity
        style={styles.attachButton}
        onPress={handleDocumentPicker}
        disabled={isLoading || disabled}
      >
        <Ionicons name="document-attach" size={24} color={disabled ? "#CCCCCC" : "#0066CC"} />
      </TouchableOpacity>
      
      {/* Voice input button */}
      <TouchableOpacity
        style={[styles.micButton, isRecording && styles.micButtonActive]}
        onPress={toggleSpeechRecognition}
        disabled={isLoading || disabled}
      >
        <Ionicons 
          name={isRecording ? "mic-off" : "mic"} 
          size={24} 
          color={disabled ? "#CCCCCC" : isRecording ? "#FFFFFF" : "#0066CC"} 
        />
      </TouchableOpacity>

      {/* Text input */}
      <View style={[
        styles.inputContainer, 
        isInputFocused && styles.inputContainerFocused,
        disabled && styles.inputDisabled
      ]}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={message}
          onChangeText={setMessage}
          onFocus={() => setIsInputFocused(true)}
          onBlur={() => setIsInputFocused(false)}
          multiline
          maxLength={1000}
          editable={!disabled}
        />
      </View>

      {/* Send button */}
      <TouchableOpacity 
        style={[
          styles.sendButton,
          (!message.trim() || isLoading || disabled) && styles.sendButtonDisabled
        ]}
        onPress={handleSend}
        disabled={!message.trim() || isLoading || disabled}
      >
        <Ionicons 
          name="send" 
          size={22} 
          color={(!message.trim() || isLoading || disabled) ? "#CCCCCC" : "#FFFFFF"} 
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 10,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
  },
  attachButton: {
    padding: 8,
    marginHorizontal: 2,
  },
  micButton: {
    padding: 8,
    marginHorizontal: 2,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    backgroundColor: '#FFFFFF',
  },
  micButtonActive: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
  galleryButton: {
    padding: 8,
    marginRight: 8,
  },
  inputContainer: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    maxHeight: 100,
  },
  inputContainerFocused: {
    borderColor: '#0066CC',
  },
  inputDisabled: {
    opacity: 0.7,
    backgroundColor: '#F0F0F0',
  },
  input: {
    fontSize: 16,
    color: '#333333',
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#0066CC',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#EEEEEE',
  },
});

export default ChatInput;

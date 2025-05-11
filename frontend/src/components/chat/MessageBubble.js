import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { formatDistanceToNow } from 'date-fns';
import { API_BASE_URL } from '../../services/api';
import * as Speech from 'expo-speech';

const MessageBubble = ({ message, isCurrentUser }) => {
  const { type, text, document_url, sent_by, sent_on, document_type } = message;
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Format the timestamp
  const formattedTime = formatDistanceToNow(new Date(sent_on), { addSuffix: true });
  
  // Determine message style based on sender
  const bubbleStyle = isCurrentUser ? styles.userBubble : styles.otherBubble;
  const textStyle = isCurrentUser ? styles.userText : styles.otherText;
  
  // Helper function to detect if text contains Hindi characters
  const containsHindi = (text) => {
    // Devanagari Unicode range: [\u0900-\u097F]
    const hindiRegex = /[\u0900-\u097F]/;
    return hindiRegex.test(text);
  };
  
  // Handle reading text
  const handleSpeech = () => {
    if (isSpeaking) {
      // If already speaking, stop speech
      Speech.stop();
      setIsSpeaking(false);
    } else {
      // Determine language based on text content
      const language = containsHindi(text) ? 'hi-IN' : 'en-US';
      
      // Speak the message text with appropriate language
      Speech.speak(text, {
        language: language,
        onDone: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
      setIsSpeaking(true);
    }
  };
  
  // Handle document press
  const handleDocumentPress = () => {
    if (document_url) {
      // Get the full URL using the API_BASE_URL from our api service
      const fullUrl = document_url.startsWith('http') 
        ? document_url 
        : `${API_BASE_URL}${document_url}`;
      
      console.log('Opening document URL:', fullUrl);
      
      Linking.openURL(fullUrl).catch(err => 
        console.error('Error opening document URL:', err)
      );
    }
  };
  
  return (
    <View style={[styles.container, isCurrentUser ? styles.userContainer : styles.otherContainer]}>
      {/* Sender indicator for non-user messages */}
      {!isCurrentUser && (
        <Text style={styles.senderText}>
          {sent_by === 'freelancer' ? 'Freelancer' : sent_by === 'ai' ? 'AI' : 'User'}
        </Text>
      )}
      
      {/* Message content */}
      <View style={[styles.bubble, bubbleStyle]}>
        {type === 'text' ? (
          <>
            <Text style={[styles.text, textStyle]}>{text}</Text>
            {/* Text-to-speech button for text messages */}
            <TouchableOpacity 
              style={styles.speechButton} 
              onPress={handleSpeech}
              disabled={!text}
            >
              <Ionicons 
                name={isSpeaking ? "volume-mute" : "volume-high"} 
                size={18} 
                color={isCurrentUser ? "#FFFFFF" : "#666666"} 
                style={styles.speechIcon}
              />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.documentContainer} onPress={handleDocumentPress}>
            <View style={styles.documentIconContainer}>
              {document_type === 'image' ? (
                <Ionicons name="image" size={24} color="#FFFFFF" />
              ) : document_type === 'pdf' ? (
                <Ionicons name="document-text" size={24} color="#FFFFFF" />
              ) : (
                <Ionicons name="document" size={24} color="#FFFFFF" />
              )}
            </View>
            <View style={styles.documentInfo}>
              <Text style={[styles.documentText, textStyle]} numberOfLines={1}>
                {document_type || 'Document'}
              </Text>
              {text && <Text style={[styles.documentDescription, textStyle]} numberOfLines={1}>{text}</Text>}
              <Text style={styles.viewText}>Tap to view</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Timestamp */}
      <Text style={styles.timestampText}>{formattedTime}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    maxWidth: '80%',
  },
  userContainer: {
    alignSelf: 'flex-end',
  },
  otherContainer: {
    alignSelf: 'flex-start',
  },
  senderText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    marginBottom: 2,
  },
  bubble: {
    borderRadius: 16,
    padding: 12,
    elevation: 1,
    position: 'relative',
  },
  userBubble: {
    backgroundColor: '#0066CC',
    borderTopRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#F0F0F0',
    borderTopLeftRadius: 4,
  },
  text: {
    fontSize: 16,
    marginRight: 22, // Make space for the speech icon
  },
  userText: {
    color: '#FFFFFF',
  },
  otherText: {
    color: '#333333',
  },
  speechButton: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    padding: 4,
  },
  speechIcon: {
    opacity: 0.8,
  },
  documentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  documentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#4C86B0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  documentInfo: {
    flex: 1,
  },
  documentText: {
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 3,
  },
  documentDescription: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 3,
  },
  viewText: {
    fontSize: 12,
    opacity: 0.7,
    fontStyle: 'italic',
    color: '#FFF',
  },
  timestampText: {
    fontSize: 11,
    color: '#999',
    marginTop: 3,
    marginHorizontal: 8,
    alignSelf: 'flex-end',
  },
});

export default MessageBubble;

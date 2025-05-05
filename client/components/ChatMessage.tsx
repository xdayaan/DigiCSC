import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatMessage as ChatMessageType, MessageSender } from '../services/api';

interface ChatMessageProps {
  message: ChatMessageType;
  onPlayAudio: () => void;
  isPlayingAudio: boolean;
}

export default function ChatMessage({ message, onPlayAudio, isPlayingAudio }: ChatMessageProps) {
  const isUser = message.sent_from === MessageSender.USER;

  return (
    <View style={[
      styles.container,
      isUser ? styles.userContainer : styles.aiContainer
    ]}>
      <View style={[
        styles.bubble,
        isUser ? styles.userBubble : styles.aiBubble
      ]}>
        <Text style={[
          styles.text,
          isUser ? styles.userText : styles.aiText
        ]}>
          {message.text}
        </Text>
        
        {!isUser && (
          <TouchableOpacity 
            style={styles.audioButton}
            onPress={onPlayAudio}
            disabled={isPlayingAudio}
          >
            <Ionicons 
              name={isPlayingAudio ? "volume-high" : "volume-medium"} 
              size={24} 
              color={isPlayingAudio ? "#4caf50" : "#2196f3"} 
            />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.timestamp}>
        {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 5,
    maxWidth: '80%',
  },
  userContainer: {
    alignSelf: 'flex-end',
  },
  aiContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    borderRadius: 18,
    padding: 12,
  },
  userBubble: {
    backgroundColor: '#1a73e8',
  },
  aiBubble: {
    backgroundColor: '#f1f3f4',
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: 'white',
  },
  aiText: {
    color: 'black',
  },
  timestamp: {
    fontSize: 11,
    color: '#70757a',
    marginTop: 4,
    marginHorizontal: 4,
  },
  audioButton: {
    marginTop: 8,
  },
});
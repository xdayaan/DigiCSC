import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  Text,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { userApi, chatApi, User, Chat, ChatMessage as MessageType, MessageSender, MessageType as MsgType } from '../../services/api';
import ChatMessage from '../../components/ChatMessage';

export default function ChatScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const router = useRouter();

  // Check if user is logged in
  useEffect(() => {
    async function checkUser() {
      try {
        const currentUser = await userApi.getCurrentUser();
        if (!currentUser) {
          // No user found, redirect to registration
          router.replace('/register');
          return;
        }
        
        setUser(currentUser);
        
        // Load or create a chat for the user
        const userChats = await chatApi.getUserChats(currentUser.id);
        
        if (userChats && userChats.length > 0) {
          setChat(userChats[0]);
          setMessages(userChats[0].messages || []);
        } else {
          // Create a new chat if none exists
          const newChat = await chatApi.createChat(currentUser.id);
          setChat(newChat);
        }
      } catch (error) {
        console.error('Error loading user or chat:', error);
        Alert.alert('Error', 'Failed to load chat data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    checkUser();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [messages]);

  // Cleanup audio when component unmounts
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const sendMessage = async () => {
    if (!messageText.trim() || !user || !chat) return;
    
    const messageToSend = {
      user_id: user.id,
      sent_from: MessageSender.USER,
      type: MsgType.TEXT,
      text: messageText.trim()
    };

    setSending(true);
    setMessageText('');
    
    try {
      const newMessages = await chatApi.sendMessage(chat.chat_id, messageToSend);
      setMessages(prevMessages => [...prevMessages, ...newMessages]);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const playAudio = async (message: MessageType) => {
    try {
      // Stop any currently playing audio
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      
      const messageId = `${message.user_id}-${message.created_at}`;
      setPlayingAudioId(messageId);
      
      // Get audio content from API
      const audioBase64 = await chatApi.getTextToSpeech(
        message.text,
        user?.language || 'english'
      );
      
      // Create a blob URL from the base64 audio
      const audioUri = `data:audio/mp3;base64,${audioBase64}`;
      
      // Play the audio
      const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
      soundRef.current = sound;
      
      await sound.playAsync();
      
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingAudioId(null);
        }
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Error', 'Failed to play audio. Please try again.');
      setPlayingAudioId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading chat...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>DigiCSC</Text>
        {user && (
          <Text style={styles.headerSubtitle}>
            Language: {user.language.charAt(0).toUpperCase() + user.language.slice(1)}
          </Text>
        )}
      </View>
      
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, index) => `${item.user_id}-${item.created_at}-${index}`}
        renderItem={({ item }) => (
          <ChatMessage 
            message={item} 
            onPlayAudio={() => playAudio(item)}
            isPlayingAudio={playingAudioId === `${item.user_id}-${item.created_at}`} 
          />
        )}
        contentContainerStyle={styles.messagesContainer}
      />
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={messageText}
          onChangeText={setMessageText}
          placeholder="Type your message..."
          multiline
          maxLength={500}
        />
        <TouchableOpacity 
          style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!messageText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons name="send" size={24} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#1a73e8',
    padding: 16,
    paddingTop: 60,
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginTop: 4,
  },
  messagesContainer: {
    padding: 15,
    paddingBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f1f3f4',
    borderRadius: 24,
    paddingHorizontal: 15,
    paddingVertical: 12,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a73e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#cccccc',
  },
});

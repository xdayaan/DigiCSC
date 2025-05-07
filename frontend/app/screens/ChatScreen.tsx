import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Dimensions, ActivityIndicator, FlatList, Platform, Alert, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolate, Extrapolation } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Voice from '@react-native-voice/voice';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '../services/AuthContext';
import { chatApi, ApiChat, ApiMessage, uploadDocument, userApi } from '../services/api';
import { Chat, Message, MessageSender, MessageType, Language, UserType } from '../services/types';
import { Colors } from '@/constants/Colors';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { uuid } from '../utils/helpers';

const ChatScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const chatId = params.chatId as string | undefined;
  const isFreelancerMode = params.isFreelancerMode === 'true';
  const customerId = params.customerId as string | undefined;
  
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fetchingChats, setFetchingChats] = useState(false);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  
  const messageInputRef = useRef<TextInput>(null);

  // Handler for changing language
  const navigateToLanguageSettings = () => {
    router.push('/screens/LanguageScreen');
  };
  
  // Fetch customer info if in freelancer mode
  useEffect(() => {
    if (isFreelancerMode && customerId && user?.user_type === UserType.FREELANCER) {
      const fetchCustomerInfo = async () => {
        try {
          const response = await userApi.getUser(parseInt(customerId));
          setCustomerInfo(response);
        } catch (error) {
          console.error("Error fetching customer info:", error);
        }
      };
      fetchCustomerInfo();
    }
  }, [isFreelancerMode, customerId, user]);
  
  // Set page title based on mode
  const getPageTitle = () => {
    if (isFreelancerMode && customerInfo) {
      return `Chat with ${customerInfo.name}`;
    } else if (currentChat) {
      return currentChat.title;
    }
    return "New Chat";
  };
  
  const sidebarAnimation = useSharedValue(0);
  const { width } = Dimensions.get('window');
  const SIDEBAR_WIDTH = width * 0.8;

  // Animated styles for sidebar
  const sidebarStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: interpolate(
            sidebarAnimation.value, 
            [0, 1], 
            [-SIDEBAR_WIDTH, 0], 
            Extrapolation.CLAMP
          ) 
        },
      ],
    };
  });

  const overlayStyle = useAnimatedStyle(() => {
    return {
      opacity: sidebarAnimation.value * 0.5,
      display: sidebarAnimation.value === 0 ? 'none' : 'flex',
    };
  });

  // Fetch chats from API whenever a user logs in or when chatId changes
  useEffect(() => {
    const fetchUserChats = async () => {
      if (!user) return;
      
      setFetchingChats(true);
      try {
        const userChats = await chatApi.getUserChats(user.id);
        if (userChats && userChats.length > 0) {
          // Map API response to component state format
          const formattedChats: Chat[] = userChats.map((chat: ApiChat) => {
            // Get last message if exists
            const lastApiMessage = chat.messages.length > 0 
              ? chat.messages[chat.messages.length - 1] 
              : null;
            
            // Map API messages to component message format
            const chatMessages: Message[] = chat.messages.map((msg: ApiMessage) => ({
              id: msg.message_id || `${msg.user_id}-${msg.created_at}`,
              text: msg.text || "",
              sender: msg.sent_from as MessageSender,
              timestamp: new Date(msg.created_at),
              status: 'sent',
              docLink: msg.doc_link || undefined,
              docType: msg.type === 'document' ? 'document' : undefined,
              freelancerId: msg.freelancer_id
            }));
            
            // Create formatted chat object
            return {
              id: chat.chat_id,
              title: isFreelancerMode && customerInfo 
                ? `Chat with ${customerInfo.name}` 
                : `Chat ${chat.chat_id.substring(0, 8)}...`,
              lastMessage: lastApiMessage?.text || "No messages yet",
              timestamp: new Date(chat.updated_at),
              unreadCount: 0, // This would need to come from the API if available
              messages: chatMessages,
              userId: chat.user_id
            };
          });
          
          setChats(formattedChats);
          
          // Set current chat based on chatId param or first chat
          if (chatId) {
            const selectedChat = formattedChats.find(c => c.id === chatId);
            if (selectedChat) {
              setCurrentChat(selectedChat);
              setMessages(selectedChat.messages);
              return;
            }
          }
          
          // Set first chat as current if none selected
          if (formattedChats.length > 0) {
            setCurrentChat(formattedChats[0]);
            setMessages(formattedChats[0].messages);
          }
        } else if (userChats.length === 0 && user) {
          // Create a new chat for the user if none exists
          try {
            const newChat = await chatApi.createChat(user.id);
            
            if (newChat) {
              const formattedChat: Chat = {
                id: newChat.chat_id,
                title: isFreelancerMode && customerInfo 
                  ? `Chat with ${customerInfo.name}` 
                  : `Chat ${newChat.chat_id.substring(0, 8)}...`,
                lastMessage: "New conversation started",
                timestamp: new Date(newChat.created_at),
                unreadCount: 0,
                messages: [],
                userId: newChat.user_id
              };
              setChats([formattedChat]);
              setCurrentChat(formattedChat);
              setMessages([]);
            }
          } catch (error) {
            console.error("Error creating new chat:", error);
          }
        }
      } catch (error) {
        console.error("Error fetching chats:", error);
      } finally {
        setFetchingChats(false);
      }
    };
    
    fetchUserChats();
  }, [user, chatId, isFreelancerMode, customerInfo]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
    sidebarAnimation.value = withTiming(sidebarOpen ? 0 : 1, { duration: 300 });
  }, [sidebarOpen, sidebarAnimation]);

  const selectChat = useCallback((chat: Chat) => {
    setCurrentChat(chat);
    setMessages(chat.messages);
    toggleSidebar();
  }, [toggleSidebar]);

  // Send message after timeout
  const handleTextChange = (text: string) => {
    setNewMessage(text);
    
    // Clear previous timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }
    
    // Set new timeout if text is not empty
    if (text.trim() && !isFreelancerMode) {
      const newTimeout = setTimeout(() => {
        handleSendMessage();
      }, 2000);
      
      setTypingTimeout(newTimeout);
    }
  };

  // Speech recognition
  const toggleSpeechRecognition = async () => {
    if (isRecording) {
      // If already recording, stop it
      setIsRecording(false);
      try {
        if (Platform.OS !== 'web') {
          await Voice.stop();
        } else {
          // For web, stop is handled through the web SpeechRecognition API in the useEffect cleanup
          window._speechRecognition?.stop();
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {
        console.error("Error stopping voice recording:", e);
      }
      return;
    }
    
    try {
      // Start recording
      setIsRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
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
          setNewMessage(prev => transcript); // Replace with current transcript
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

  const handleSendMessage = async () => {
    // Clear any pending auto-send timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }
    
    if (!newMessage.trim() || !currentChat || !user) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Check if message is "freelancer" (case insensitive) and user is not a freelancer
    if (newMessage.trim().toLowerCase() === "freelancer" && user.user_type !== UserType.FREELANCER) {
      // Redirect to FreelancerScreen
      setNewMessage('');
      router.push('/screens/FreelancerScreen');
      return;
    }
    
    // Generate temporary ID for optimistic update
    const tempMessageId = uuid();
    
    // Determine message sender based on user type
    const senderType = user.user_type === UserType.FREELANCER ? MessageSender.FREELANCER : MessageSender.USER;
    
    // Optimistically add message to UI
    const newMsg: Message = {
      id: tempMessageId,
      text: newMessage.trim(),
      sender: senderType,
      timestamp: new Date(),
      status: 'sending',
      freelancerId: user.user_type === UserType.FREELANCER ? user.id : undefined
    };
    
    setMessages(prev => [...prev, newMsg]);
    setNewMessage('');

    try {
      // Send the message to the backend API
      const messageData = {
        sent_from: senderType,
        type: MessageType.TEXT,
        text: newMsg.text,
        freelancer_id: user.user_type === UserType.FREELANCER ? user.id : undefined,
      };
      
      const sentMessage = await chatApi.sendMessage(currentChat.id, messageData);

      // Update the message with the server response
      setMessages(prev => 
        prev.map(msg => msg.id === tempMessageId ? { 
          ...msg, 
          id: sentMessage.message_id || `${sentMessage.user_id}-${sentMessage.created_at}`,
          status: 'sent' 
        } : msg)
      );

      // Only wait for AI response if we're not in freelancer mode
      if (!isFreelancerMode && user.user_type !== UserType.FREELANCER) {
        setIsLoading(true);

        // The backend will automatically generate an AI response
        // Wait a moment, then fetch the updated chat to get the AI response
        setTimeout(async () => {
          try {
            const updatedChat = await chatApi.getChat(currentChat.id);
            
            if (updatedChat && updatedChat.messages) {
              // Find messages that we don't already have (the AI response)
              const existingMessageIds = messages.map(m => m.id);
              const newMessages: Message[] = updatedChat.messages
                .filter(m => {
                  const messageId = m.message_id || `${m.user_id}-${m.created_at}`;
                  return !existingMessageIds.includes(messageId) && m.sent_from === MessageSender.AI;
                })
                .map(m => ({
                  id: m.message_id || `${m.user_id}-${m.created_at}`,
                  text: m.text || "",
                  sender: m.sent_from as MessageSender,
                  timestamp: new Date(m.created_at),
                  status: 'sent',
                  docLink: m.doc_link,
                  docType: m.type === 'document' ? 'document' : undefined,
                  freelancerId: m.freelancer_id
                }));
              
              if (newMessages.length > 0) {
                // Check if any AI message has text "freelancer"
                const hasFreelancerMessage = newMessages.some(msg => msg.text.trim().toLowerCase() === "freelancer");
                
                if (hasFreelancerMessage) {
                  // Redirect to FreelancerScreen
                  router.push('/screens/FreelancerScreen');
                  setIsLoading(false);
                  return;
                }
                
                // Add AI messages to the chat
                setMessages(prev => [...prev, ...newMessages]);
                
                // Update current chat with latest message
                const lastMessage = newMessages[newMessages.length - 1];
                const updatedCurrentChat = {
                  ...currentChat,
                  lastMessage: lastMessage.text,
                  timestamp: lastMessage.timestamp,
                  messages: [...currentChat.messages, newMsg, ...newMessages]
                };
                
                setCurrentChat(updatedCurrentChat);
                
                // Update the chats list
                setChats(prev =>
                  prev.map(chat => chat.id === currentChat.id ? updatedCurrentChat : chat)
                );
              }
            }
          } catch (error) {
            console.error("Error fetching updated chat:", error);
          } finally {
            setIsLoading(false);
          }
        }, 2000); // Wait 2 seconds for the backend to process and generate a response
      } else {
        // For freelancer mode, just update the chat without waiting for AI
        const updatedCurrentChat = {
          ...currentChat,
          lastMessage: newMsg.text,
          timestamp: new Date(),
          messages: [...currentChat.messages, newMsg]
        };
        
        setCurrentChat(updatedCurrentChat);
        
        // Update the chats list
        setChats(prev =>
          prev.map(chat => chat.id === currentChat.id ? updatedCurrentChat : chat)
        );
        
        // Poll for new messages for a short while to see if we get a response
        setTimeout(async () => {
          try {
            const updatedChat = await chatApi.getChat(currentChat.id);
            if (updatedChat && updatedChat.messages) {
              // Find messages that we don't already have
              const existingMessageIds = messages.map(m => m.id).concat([tempMessageId]);
              const newMessages: Message[] = updatedChat.messages
                .filter(m => {
                  const messageId = m.message_id || `${m.user_id}-${m.created_at}`;
                  return !existingMessageIds.includes(messageId);
                })
                .map(m => ({
                  id: m.message_id || `${m.user_id}-${m.created_at}`,
                  text: m.text || "",
                  sender: m.sent_from as MessageSender,
                  timestamp: new Date(m.created_at),
                  status: 'sent',
                  docLink: m.doc_link,
                  docType: m.type === 'document' ? 'document' : undefined,
                  freelancerId: m.freelancer_id
                }));
              
              if (newMessages.length > 0) {
                setMessages(prev => [...prev, ...newMessages]);
                
                const lastMessage = newMessages[newMessages.length - 1];
                const updatedChatWithResponses = {
                  ...currentChat,
                  lastMessage: lastMessage.text,
                  timestamp: lastMessage.timestamp,
                  messages: [...currentChat.messages, newMsg, ...newMessages]
                };
                
                setCurrentChat(updatedChatWithResponses);
                setChats(prev =>
                  prev.map(chat => chat.id === currentChat.id ? updatedChatWithResponses : chat)
                );
              }
            }
          } catch (error) {
            console.error("Error polling for new messages:", error);
          }
        }, 1000);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Handle sending failure
      setMessages(prev => 
        prev.map(msg => msg.id === tempMessageId ? { 
          ...msg, 
          status: 'error' 
        } : msg)
      );
    }
  };

  // Poll for new messages specifically for the freelancer view
  useEffect(() => {
    if (!isFreelancerMode || !currentChat || !user || user.user_type !== UserType.FREELANCER) return;
    
    const pollForNewMessages = setInterval(async () => {
      try {
        const updatedChat = await chatApi.getChat(currentChat.id);
        if (updatedChat && updatedChat.messages) {
          const existingMessageIds = messages.map(m => m.id);
          const newMessages: Message[] = updatedChat.messages
            .filter(m => {
              const messageId = m.message_id || `${m.user_id}-${m.created_at}`;
              return !existingMessageIds.includes(messageId);
            })
            .map(m => ({
              id: m.message_id || `${m.user_id}-${m.created_at}`,
              text: m.text || "",
              sender: m.sent_from as MessageSender,
              timestamp: new Date(m.created_at),
              status: 'sent',
              docLink: m.doc_link,
              docType: m.type === 'document' ? 'document' : undefined,
              freelancerId: m.freelancer_id
            }));
          
          if (newMessages.length > 0) {
            setMessages(prev => [...prev, ...newMessages]);
            
            const lastMessage = newMessages[newMessages.length - 1];
            const updatedCurrentChat = {
              ...currentChat,
              lastMessage: lastMessage.text,
              timestamp: lastMessage.timestamp,
              messages: [...messages, ...newMessages]
            };
            
            setCurrentChat(updatedCurrentChat);
            setChats(prev =>
              prev.map(chat => chat.id === currentChat.id ? updatedCurrentChat : chat)
            );
          }
        }
      } catch (error) {
        console.error("Error polling for new messages:", error);
      }
    }, 5000); // Poll every 5 seconds
    
    return () => clearInterval(pollForNewMessages);
  }, [isFreelancerMode, currentChat, messages, user]);

  const startNewChat = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Create a new chat
      const newChat = await chatApi.createChat(user.id);
      
      if (newChat) {
        const formattedChat: Chat = {
          id: newChat.chat_id,
          title: isFreelancerMode && customerInfo 
            ? `Chat with ${customerInfo.name}` 
            : `Chat ${newChat.chat_id.substring(0, 8)}...`,
          lastMessage: "New conversation started",
          timestamp: new Date(newChat.created_at),
          unreadCount: 0,
          messages: [],
          userId: newChat.user_id
        };
        
        setChats(prev => [formattedChat, ...prev]);
        setCurrentChat(formattedChat);
        setMessages([]);
        toggleSidebar();
      }
    } catch (error) {
      console.error("Error creating new chat:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCurrentChat = async () => {
    if (!currentChat) return;
    
    try {
      setIsLoading(true);
      
      // Delete the chat from the backend
      await chatApi.deleteChat(currentChat.id);
      
      // Remove from local state
      setChats(prev => prev.filter(chat => chat.id !== currentChat.id));
      
      // Select a new chat if available
      if (chats.length > 1) {
        const newCurrentChat = chats.find(chat => chat.id !== currentChat.id);
        if (newCurrentChat) {
          setCurrentChat(newCurrentChat);
          setMessages(newCurrentChat.messages);
        } else {
          setCurrentChat(null);
          setMessages([]);
        }
      } else {
        // Start a new chat if this was the last one
        await startNewChat();
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocumentPick = async () => {
    if (!currentChat || !user) return;
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Pick a document using the system's file picker
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', // Allow all types of files
        copyToCacheDirectory: true,
        multiple: false,
      });
      
      if (result.canceled) {
        return; // User canceled the document picking
      }
      
      if (result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const { uri, mimeType, name, size } = file;

        // Check file size (limit to 20MB)
        const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
        if (size && size > MAX_FILE_SIZE) {
          Alert.alert(
            "File too large",
            "Please select a file smaller than 20MB.",
            [{ text: "OK" }]
          );
          return;
        }
        
        // Show uploading state
        setIsLoading(true);
        
        // Generate temporary ID for optimistic update
        const tempDocId = uuid();
        
        // Create a document message
        const docMessage: Message = {
          id: tempDocId,
          text: `Uploading document: ${name}...`,
          sender: MessageSender.USER,
          timestamp: new Date(),
          status: 'sending',
          docType: 'document'
        };
        
        // Add to messages for optimistic UI update
        setMessages(prev => [...prev, docMessage]);
        
        try {
          // Upload the document to your server
          const docLink = await uploadDocument(uri, name, mimeType || 'application/octet-stream');
          
          // Now send a message with the document link
          const sentMessage = await chatApi.sendMessage(
            currentChat.id,
            {
              sent_from: MessageSender.USER,
              type: MessageType.DOCUMENT,
              text: `Document: ${name}`,
              doc_link: docLink
            }
          );
          
          // Update the message with successful upload info
          setMessages(prev => 
            prev.map(msg => msg.id === tempDocId ? { 
              ...msg,
              id: sentMessage.message_id || `${sentMessage.user_id}-${sentMessage.created_at}`,
              text: `Document: ${name}`,
              docLink: docLink,
              status: 'sent'
            } : msg)
          );
          
          // Update current chat
          if (currentChat) {
            // Create a properly typed updated message
            const updatedDocMessage: Message = {
              id: sentMessage.message_id || `${sentMessage.user_id}-${sentMessage.created_at}`,
              text: `Document: ${name}`,
              sender: docMessage.sender,
              timestamp: docMessage.timestamp,
              status: 'sent' as const,
              docLink: docLink,
              docType: 'document'
            };
            
            // Create a properly typed updated chat
            const updatedCurrentChat: Chat = {
              ...currentChat,
              lastMessage: `Document: ${name}`,
              timestamp: new Date(),
              messages: [...currentChat.messages, updatedDocMessage]
            };
            
            setCurrentChat(updatedCurrentChat);
            
            // Update the chats list
            setChats(prev =>
              prev.map(chat => chat.id === currentChat.id ? updatedCurrentChat : chat)
            );
          }
          
          // Wait for AI response after document upload with progressively increasing timeout
          const pollForResponse = async (attempts = 1, maxAttempts = 5): Promise<void> => {
            if (attempts > maxAttempts) {
              setIsLoading(false);
              return;
            }

            try {
              const updatedChat = await chatApi.getChat(currentChat.id);
              
              if (updatedChat && updatedChat.messages) {
                // Find messages that we don't already have (the AI response)
                const existingMessageIds = messages.map(m => m.id);
                const newMessages: Message[] = updatedChat.messages
                  .filter(m => {
                    const messageId = m.message_id || `${m.user_id}-${m.created_at}`;
                    return !existingMessageIds.includes(messageId) && m.sent_from === MessageSender.AI;
                  })
                  .map(m => ({
                    id: m.message_id || `${m.user_id}-${m.created_at}`,
                    text: m.text || "",
                    sender: m.sent_from as MessageSender,
                    timestamp: new Date(m.created_at),
                    status: 'sent',
                    docLink: m.doc_link,
                    docType: m.type === 'document' ? 'document' : undefined,
                  }));
                
                if (newMessages.length > 0) {
                  // Add AI messages to the chat
                  setMessages(prev => [...prev, ...newMessages]);
                  
                  // Update current chat with latest message
                  if (currentChat) {
                    const lastMessage = newMessages[newMessages.length - 1];
                    const updatedCurrentChat = {
                      ...currentChat,
                      lastMessage: lastMessage.text,
                      timestamp: lastMessage.timestamp,
                      messages: [...currentChat.messages, updatedDocMessage, ...newMessages]
                    };
                    
                    setCurrentChat(updatedCurrentChat);
                    
                    // Update the chats list
                    setChats(prev =>
                      prev.map(chat => chat.id === currentChat.id ? updatedCurrentChat : chat)
                    );
                  }
                  
                  setIsLoading(false);
                } else if (attempts < maxAttempts) {
                  // No new messages yet, wait with exponential backoff and try again
                  const timeout = Math.min(2000 * Math.pow(1.5, attempts), 10000); // Exponential backoff with max 10 seconds
                  setTimeout(() => pollForResponse(attempts + 1, maxAttempts), timeout);
                } else {
                  setIsLoading(false);
                }
              } else {
                setIsLoading(false);
              }
            } catch (error) {
              console.error("Error fetching updated chat after document upload:", error);
              setIsLoading(false);
            }
          };
          
          // Start polling for AI response
          setTimeout(() => pollForResponse(), 2000);
          
        } catch (error) {
          console.error("Error uploading document:", error);
          
          // Get more detailed error message if possible
          let errorMessage = "Failed to upload";
          if (error instanceof Error) {
            errorMessage += `: ${error.message}`;
          }
          
          // Update message to show error
          setMessages(prev => 
            prev.map(msg => msg.id === tempDocId ? { 
              ...msg,
              text: `${errorMessage}: ${name}`,
              status: 'error'
            } : msg)
          );
          
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error("Document picker error:", error);
      Alert.alert(
        "Error",
        "There was a problem selecting the document. Please try again.",
        [{ text: "OK" }]
      );
      setIsLoading(false);
    }
  };

  // Handle document view/download
  const handleDocumentView = async (docLink: string) => {
    if (!docLink) return;
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Get the API URL from the app config
      const baseUrl = chatApi?.baseUrl || 'http://localhost:8000';
      const docUrl = `${baseUrl}/api/v1/uploads/${docLink}`;
      
      // Check if the platform is web
      if (Platform.OS === 'web') {
        // For web, open in a new tab
        window.open(docUrl, '_blank');
      } else {
        // For mobile, use Expo WebBrowser
        await WebBrowser.openBrowserAsync(docUrl);
      }
    } catch (error) {
      console.error("Error opening document:", error);
      Alert.alert(
        "Error",
        "Could not open the document. Please try again later.",
        [{ text: "OK" }]
      );
    }
  };

  // Helper function to determine document type from filename or link
  const getDocumentType = (filename: string | undefined, docType?: string): string => {
    if (!filename && !docType) return 'document';
    
    const name = filename?.toLowerCase() || '';
    
    // Check for image files
    if (name.match(/\.(jpeg|jpg|png|gif|bmp|webp)$/i) || docType === 'image') {
      return 'image';
    }
    
    // Check for Word documents
    if (name.match(/\.(doc|docx)$/i)) {
      return 'word';
    }
    
    // Check for Excel/spreadsheet files
    if (name.match(/\.(xls|xlsx|csv)$/i)) {
      return 'sheet';
    }
    
    // Check for presentation files
    if (name.match(/\.(ppt|pptx)$/i)) {
      return 'presentation';
    }
    
    // Check for PDF files
    if (name.match(/\.pdf$/i)) {
      return 'pdf';
    }
    
    return docType || 'document';
  };

  // Render chat message
  const renderMessage = ({ item }: { item: Message }) => {
    // Get document type if exists
    const docType = item.docLink ? getDocumentType(item.text.replace('Document: ', ''), item.docType) : null;
    
    // Determine message style based on sender and document type
    const getMessageStyle = () => {
      if (item.sender === MessageSender.USER) {
        return styles.userMessage;
      } else if (item.sender === MessageSender.FREELANCER) {
        return styles.freelancerMessage;
      }
      
      // Handle specific document types with different colors
      if (docType) {
        switch(docType) {
          case 'document':
            return styles.documentMessage;
          case 'word':
            return styles.wordMessage;
          case 'sheet':
            return styles.sheetMessage;
          case 'presentation':
            return styles.presentationMessage;
          case 'pdf':
            return styles.pdfMessage;
          default:
            return styles.aiMessage;
        }
      }
      
      return styles.aiMessage;
    };
    
    const baseUrl = chatApi?.baseUrl || 'http://localhost:8000';
    
    return (
      <View style={[
        styles.messageContainer,
        getMessageStyle()
      ]}>
        {/* Display image if document is an image */}
        {docType === 'image' && item.docLink && (
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: `${baseUrl}/api/v1/uploads/${item.docLink}` }}
              style={styles.documentImage}
              resizeMode="contain"
            />
          </View>
        )}
        
        {/* Add sender label for freelancer messages */}
        {item.sender === MessageSender.FREELANCER && !isFreelancerMode && (
          <ThemedText style={styles.senderLabel}>Freelancer</ThemedText>
        )}
        
        <ThemedText style={[
          styles.messageText,
          (item.sender !== MessageSender.USER || docType) && { color: '#000000' }
        ]}>
          {item.text}
        </ThemedText>
        
        {/* Show document link if available */}
        {item.docLink && docType !== 'image' && (
          <TouchableOpacity 
            style={styles.docLink}
            onPress={() => handleDocumentView(item.docLink)}
          >
            <IconSymbol name="doc.text" size={18} color="#007AFF" />
            <ThemedText style={styles.docLinkText}>View Document</ThemedText>
          </TouchableOpacity>
        )}
        
        {/* Message status indicator */}
        <View style={styles.messageFooter}>
          <ThemedText style={[
            styles.timestamp,
            (item.sender !== MessageSender.USER || docType) && { color: '#8E8E93' }
          ]}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </ThemedText>
          
          {(item.sender === MessageSender.USER || item.sender === MessageSender.FREELANCER) && (
            <View style={styles.statusContainer}>
              {item.status === 'sending' && <ActivityIndicator size="small" color="#FFFFFF" />}
              {item.status === 'sent' && <Ionicons name="checkmark-done" size={16} color={docType ? '#000000' : '#FFFFFF'} />}
              {item.status === 'error' && <Ionicons name="alert-circle" size={16} color={docType ? '#000000' : '#FFFFFF'} />}
            </View>
          )}
          
          {item.sender === MessageSender.AI && (
            <TouchableOpacity 
              onPress={() => handleSpeech(item)}
              style={styles.speechButton}
            >
              <Ionicons 
                name={currentlySpeakingId === item.id ? "volume-mute" : "volume-high"} 
                size={16} 
                color="#8E8E93" 
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Helper function to detect if text contains Hindi characters
  const containsHindi = (text: string): boolean => {
    // Devanagari Unicode range: [\u0900-\u097F]
    const hindiRegex = /[\u0900-\u097F]/;
    return hindiRegex.test(text);
  };

  const handleSpeech = (message: Message) => {
    if (currentlySpeakingId === message.id) {
      // If already speaking this message, stop speaking
      Speech.stop();
      setCurrentlySpeakingId(null);
    } else {
      // Determine language based on text content
      const language = containsHindi(message.text) ? 'hi-IN' : 'en-US';
      
      // Speak the message text with appropriate language
      Speech.speak(message.text, {
        language: language,
        onDone: () => setCurrentlySpeakingId(null),
        onError: () => setCurrentlySpeakingId(null),
      });
      setCurrentlySpeakingId(message.id);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
          <IconSymbol name="line.3.horizontal" size={24} color="#000000" />
        </TouchableOpacity>
        <ThemedText style={{ color: "#000000" }} type="subtitle">{getPageTitle()}</ThemedText>
        <View style={styles.headerRight}>
          {!isFreelancerMode && (
            <TouchableOpacity onPress={navigateToLanguageSettings} style={styles.languageButton}>
              <IconSymbol name="globe" size={22} color="#007AFF" />
              {user?.preferred_language && (
                <ThemedText style={styles.languageIndicator}>
                  {user.preferred_language.substring(0, 2).toUpperCase()}
                </ThemedText>
              )}
            </TouchableOpacity>
          )}
          {isFreelancerMode && user?.user_type === UserType.FREELANCER && (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <IconSymbol name="arrow.left" size={22} color="#007AFF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={deleteCurrentChat} style={styles.deleteButton}>
            <IconSymbol name="trash" size={22} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Chat Messages */}
      {fetchingChats ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <ThemedText style={{ marginTop: 10, color: "#000000" }}>Loading chats...</ThemedText>
        </View>
      ) : (
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
        />
      )}
      
      {/* AI is typing indicator */}
      {isLoading && (
        <View style={styles.typingIndicator}>
          <ThemedText style={styles.typingText}>AI is typing</ThemedText>
          <View style={styles.dotContainer}>
            <View style={styles.typingDot} />
            <View style={styles.typingDot} />
            <View style={styles.typingDot} />
          </View>
        </View>
      )}
      
      {/* Message Input */}
      <View style={styles.inputContainer}>
        <TouchableOpacity 
          style={styles.attachButton}
          onPress={handleDocumentPick}
          disabled={isLoading}
        >
          <Ionicons name="document-attach" size={22} color="#007AFF" />
        </TouchableOpacity>
        
        <TextInput
          ref={messageInputRef}
          style={styles.input}
          value={newMessage}
          onChangeText={handleTextChange}
          placeholder={isFreelancerMode ? "Reply to customer..." : "Type a message..."}
          placeholderTextColor="#8E8E93"
          multiline
        />
        
        <TouchableOpacity
          style={[styles.micButton, isRecording && styles.recordingActive]}
          onPress={toggleSpeechRecognition}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={isRecording ? "mic-off" : "mic"} 
            size={22} 
            color={isRecording ? "#FFFFFF" : "#007AFF"} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.sendButton}
          onPress={handleSendMessage}
          disabled={!newMessage.trim() || isLoading}
          activeOpacity={0.7}
        >
          <Ionicons name="send" size={24} color={newMessage.trim() ? "#007AFF" : "#C7C7CC"} />
        </TouchableOpacity>
      </View>
      
      {/* Sidebar Overlay */}
      <Animated.View 
        style={[styles.overlay, overlayStyle]}
        onTouchStart={toggleSidebar}
      />
      
      {/* Sidebar */}
      <Animated.View style={[styles.sidebar, sidebarStyle]}>
        <View style={styles.sidebarHeader}>
          <ThemedText style={{ color: "#000000" }} type="subtitle">Your Chats</ThemedText>
          <TouchableOpacity onPress={startNewChat} style={styles.newChatButton}>
            <IconSymbol name="plus" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.chatsList}>
          {chats.map((chat) => (
            <TouchableOpacity
              key={chat.id}
              style={[
                styles.chatItem,
                currentChat?.id === chat.id && styles.activeChatItem
              ]}
              onPress={() => selectChat(chat)}
            >
              <View style={styles.chatItemContent}>
                <ThemedText type="body" numberOfLines={1} style={styles.chatTitle}>
                  {chat.title}
                </ThemedText>
                <ThemedText type="caption" numberOfLines={1} style={styles.chatPreview}>
                  {chat.lastMessage}
                </ThemedText>
              </View>
              <View style={styles.chatItemMeta}>
                <ThemedText type="caption" style={styles.chatTime}>
                  {chat.timestamp.toLocaleDateString()}
                </ThemedText>
                {chat.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <ThemedText style={styles.unreadCount}>{chat.unreadCount}</ThemedText>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    backgroundColor: '#FFFFFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: 8,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  deleteButton: {
    padding: 8,
  },
  languageButton: {
    padding: 8,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    paddingHorizontal: 10,
  },
  languageIndicator: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 80,
    backgroundColor: '#FFFFFF',
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F2F2F7',
    borderBottomLeftRadius: 4,
  },
  freelancerMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#4CD964', // Green color for freelancer messages
    borderBottomLeftRadius: 4,
  },
  senderLabel: {
    fontSize: 10,
    marginBottom: 4,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  documentMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FF5252', // Red for document type
    borderBottomLeftRadius: 4,
  },
  wordMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#1A237E', // Dark blue for word documents
    borderBottomLeftRadius: 4,
  },
  sheetMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#4CAF50', // Green for spreadsheets
    borderBottomLeftRadius: 4,
  },
  presentationMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FF9800', // Orange for presentations
    borderBottomLeftRadius: 4,
  },
  pdfMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8EAF6',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#FFFFFF', // This will be overridden for AI messages
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  speechButton: {
    marginLeft: 8,
    padding: 4,
  },
  timestamp: {
    fontSize: 10,
    marginRight: 4,
    opacity: 0.7,
    color: '#FFFFFF', // This will be overridden for AI messages
  },
  statusContainer: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginLeft: 16,
    marginBottom: 8,
  },
  typingText: {
    fontSize: 12,
    marginRight: 8,
    opacity: 0.7,
    color: '#000000',
  },
  dotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8E8E93',
    marginHorizontal: 2,
    opacity: 0.7,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  input: {
    flex: 1,
    borderRadius: 20,
    padding: 12,
    maxHeight: 120,
    fontSize: 16,
    backgroundColor: '#F2F2F7',
    color: '#000000',
    marginRight: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  micButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 10,
  },
  recordingActive: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
  attachButton: {
    marginRight: 8,
    padding: 4,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 1,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '80%',
    backgroundColor: '#FFFFFF',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  newChatButton: {
    backgroundColor: '#007AFF',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatsList: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  chatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  activeChatItem: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  chatItemContent: {
    flex: 1,
    marginRight: 8,
  },
  chatTitle: {
    fontWeight: '500',
    marginBottom: 4,
    color: '#000000',
  },
  chatPreview: {
    opacity: 0.7,
    color: '#000000',
  },
  chatItemMeta: {
    alignItems: 'flex-end',
  },
  chatTime: {
    opacity: 0.6,
    marginBottom: 4,
    color: '#000000',
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  docLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 8,
  },
  docLinkText: {
    marginLeft: 4,
    fontSize: 12,
    textDecorationLine: 'underline',
    color: '#007AFF',
  },
  imageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  documentImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
  },
});

export default ChatScreen;
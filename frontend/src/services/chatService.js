import api from './api';

// Service for all chat and freelancer request related API calls
export const chatService = {  // Create a new freelancer request
  createFreelancerRequest: async (userId, freelancerId, conversationId) => {
    try {
      const response = await api.post('/freelancer-requests', {
        user_id: userId,
        freelancer_id: freelancerId,
        conversation_id: conversationId,
        accepted: false
      });
      return response.data;
    } catch (error) {
      console.error('Error creating freelancer request:', error);
      throw error;
    }
  },

  // Get recent freelancer requests (within 60 seconds)
  getRecentFreelancerRequest: async (freelancerId) => {
    try {
      const response = await api.get(`/freelancer-requests/recent/${freelancerId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting recent freelancer request:', error);
      return null; // Return null if no recent request
    }
  },

  // Get all freelancer requests for a freelancer
  getFreelancerRequests: async (freelancerId) => {
    try {
      const response = await api.get(`/freelancer-requests/freelancer/${freelancerId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting freelancer requests:', error);
      throw error;
    }
  },
  // Update freelancer request (accept/reject)
  updateFreelancerRequest: async (requestId, accepted) => {
    try {
      const response = await api.put(`/freelancer-requests/${requestId}`, { accepted });
      return response.data;
    } catch (error) {
      console.error('Error updating freelancer request:', error);
      throw error;
    }
  },
  
  // Get a specific freelancer request by ID
  getFreelancerRequest: async (requestId) => {
    try {
      const response = await api.get(`/freelancer-requests/${requestId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting freelancer request:', error);
      throw error;
    }
  },

  // Get chat messages for the current user
  getChatMessages: async (limit = 50, skip = 0, freelancerId = null) => {
    try {
      let url = `/chat?limit=${limit}&skip=${skip}`;
      if (freelancerId) {
        url += `&freelancer_id=${freelancerId}`;
      }
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Error getting chat messages:', error);
      throw error;
    }
  },

  // Send a text message
  sendTextMessage: async (text, sentBy, freelancerId = null) => {
    try {
      const response = await api.post('/chat', {
        type: 'text',
        text,
        sent_by: sentBy,
        freelancer_id: freelancerId
      });
      return response.data;
    } catch (error) {
      console.error('Error sending text message:', error);
      throw error;
    }
  },

  // Upload a document and send as message
  uploadDocumentMessage: async (file, description = null, freelancerId = null) => {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name || 'document.pdf',
        type: file.type || 'application/pdf'
      });
      if (description) {
        formData.append('description', description);
      }
      if (freelancerId) {
        formData.append('freelancer_id', freelancerId);
      }

      const response = await api.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  },

  // Conversation-related methods
  // Get all conversations for the current user
  getConversations: async () => {
    try {
      const response = await api.get('/conversations');
      return response.data.conversations;
    } catch (error) {
      console.error('Error getting conversations:', error);
      throw error;
    }
  },

  // Get a specific conversation by ID
  getConversation: async (conversationId) => {
    try {
      const response = await api.get(`/conversations/${conversationId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting conversation:', error);
      throw error;
    }
  },  // Create a new conversation
  createConversation: async (title, userId, freelancerId, lastMessageTime = null) => {
    try {
      const payload = {
        title,
        user_id: userId,
        freelancer_id: freelancerId,
      };
      
      // Add last_message_time if provided
      if (lastMessageTime) {
        payload.last_message_time = lastMessageTime;
      }
      
      const response = await api.post('/conversations', payload);
      return response.data;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  },
  
  // Create a new conversation with a specific ID
  createConversationWithId: async (conversationId, title, userId, freelancerId) => {
    try {
      const response = await api.post(`/conversations/${conversationId}`, {
        title,
        user_id: userId,
        freelancer_id: freelancerId,
      });
      return response.data;
    } catch (error) {
      console.error('Error creating conversation with ID:', error);
      throw error;
    }
  },

  // Get messages for a specific conversation
  getConversationMessages: async (conversationId, limit = 50, skip = 0) => {
    try {
      const response = await api.get(`/chat?conversation_id=${conversationId}&limit=${limit}&skip=${skip}`);
      return response.data;
    } catch (error) {
      console.error('Error getting conversation messages:', error);
      throw error;
    }
  },
    // Get latest message pair (user message + AI response) for a specific conversation
  getLatestMessagePair: async (conversationId, messageId) => {
    try {
      // Get more messages than needed to ensure we capture the response
      const response = await api.get(`/chat?conversation_id=${conversationId}&limit=20&skip=0`);
      
      if (response.data && Array.isArray(response.data)) {
        // Find the user message by ID
        const userMessage = response.data.find(msg => msg.id === messageId);
        
        if (!userMessage) {
          console.log('Could not find the user message with id:', messageId);
          return null;
        }
        
        const userMessageTime = new Date(userMessage.sent_on);
        
        // Find AI responses that came after this user message within a 15-second window
        const aiResponses = response.data.filter(msg => 
          msg.sent_by === 'ai' && 
          new Date(msg.sent_on) > userMessageTime &&
          new Date(msg.sent_on) - userMessageTime < 15000 // 15 second window
        );
        
        if (aiResponses.length > 0) {
          // Sort AI responses by time (earliest first)
          aiResponses.sort((a, b) => new Date(a.sent_on) - new Date(b.sent_on));
          
          // Return the user message and its earliest AI response
          return [userMessage, aiResponses[0]];
        } else {
          // If no AI response found within the time window, just return the user message
          return [userMessage];
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting latest message pair:', error);
      return null;
    }
  },
  
  // Send a text message to a specific conversation
  sendTextMessageToConversation: async (text, sentBy, conversationId, freelancerId = null) => {
    try {
      const response = await api.post('/chat', {
        type: 'text',
        text,
        sent_by: sentBy,
        conversation_id: conversationId,
        freelancer_id: freelancerId
      });
      return response.data;
    } catch (error) {
      console.error('Error sending text message to conversation:', error);
      throw error;
    }
  },
  
  // Send a message directly to Gemini AI
  sendMessageToAI: async (text, conversationId) => {
    try {
      const response = await api.post('/chat/gemini', {
        type: 'text',
        text,
        sent_by: 'user',
        conversation_id: conversationId
      });
      return response.data;
    } catch (error) {
      console.error('Error sending message to AI:', error);
      throw error;
    }
  },
    // Test Gemini AI in specific language (doesn't save to conversation)
  testAILanguage: async (message, language) => {
    try {
      const response = await api.post('/chat/gemini-test', {
        message,
        language
      });
      return response.data;
    } catch (error) {
      console.error('Error testing AI language:', error);
      throw error;
    }
  },
  
  // Get a message pair using the dedicated API endpoint
  getMessagePair: async (conversationId, messageId) => {
    try {
      const response = await api.get(`/chat/message-pair/${messageId}?conversation_id=${conversationId}`);
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error getting message pair:', error);
      return null;
    }
  },
};

export default chatService;

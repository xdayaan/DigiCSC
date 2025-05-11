// Example code to show how to create a conversation with a specific ID
import chatService from '../services/chatService';

/**
 * Example function to create a conversation with a specific ID
 * @param {string} conversationId - The ID to use for the new conversation
 * @param {string} title - The title of the conversation
 * @param {number} userId - The customer's user ID
 * @param {number} freelancerId - The freelancer's user ID
 * @returns {Promise<Object>} - The created conversation object
 */
export const createConversationWithSpecificId = async (conversationId, title, userId, freelancerId) => {
  try {
    console.log(`Creating conversation with ID: ${conversationId}`);
    
    // Call the API to create conversation with the specific ID
    const conversation = await chatService.createConversationWithId(
      conversationId,
      title,
      userId,
      freelancerId
    );
    
    console.log('Conversation created successfully:', conversation);
    return conversation;
  } catch (error) {
    console.error('Failed to create conversation with specified ID:', error);
    throw error;
  }
};

/**
 * Example usage in a component:
 * 
 * import { createConversationWithSpecificId } from '../utils/conversation-examples';
 * 
 * // Inside your component
 * const createCustomConversation = async () => {
 *   try {
 *     // Generate a custom ID (for example purposes - in production you'd use MongoDB ObjectId format)
 *     const customId = '507f1f77bcf86cd799439011';
 *     
 *     const result = await createConversationWithSpecificId(
 *       customId,
 *       'Technical Support',
 *       userId,
 *       freelancerId
 *     );
 *     
 *     // Use the new conversation
 *     setCurrentConversation(result);
 *   } catch (err) {
 *     Alert.alert('Error', 'Failed to create conversation with custom ID');
 *   }
 * };
 */

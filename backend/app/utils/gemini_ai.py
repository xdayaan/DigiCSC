import google.generativeai as genai
from typing import Dict, Any, Optional
from ..config import settings
from ..schemas.chat import ChatMessageCreate
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize the Gemini API with the API key
def init_gemini():
    """Initialize the Gemini AI client with API key from settings"""
    try:
        api_key = settings.GEMINI_API_KEY
        genai.configure(api_key=api_key)
        logger.info("Gemini API initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Gemini API: {str(e)}")
        raise

async def generate_ai_response(user_message: str, conversation_id: str, preferred_language: str = None) -> Optional[Dict[str, Any]]:
    """
    Generate a response from Gemini AI based on the user message
    
    Args:
        user_message: The message text from the user
        conversation_id: The ID of the conversation
        preferred_language: The user's preferred language to respond in
        
    Returns:
        Dict with AI response details or None if generation failed
    """
    try:
        # Initialize Gemini model
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Add language instruction if preferred_language is provided
        message_with_language = user_message
        if preferred_language:
            language_instruction = f"\nPlease respond in {preferred_language} language only."
            message_with_language = f"{user_message}\n{language_instruction}"
            logger.info(f"Requesting Gemini to respond in {preferred_language}")
        
        # Generate response
        response = model.generate_content(message_with_language)
        
        if response and response.text:
            # Create response message data
            ai_message = {
                "type": "text",
                "text": response.text,
                "sent_by": "ai",
                "freelancer_id": None,
                "conversation_id": conversation_id
            }
            return ai_message
        
        return None
    except Exception as e:
        logger.error(f"Error generating AI response: {str(e)}")
        return None

async def should_ai_respond(conversation_id: str) -> bool:
    """
    Determine if AI should respond to this conversation
    based on whether a freelancer is assigned and active
    
    Args:
        conversation_id: The ID of the conversation
        
    Returns:
        True if AI should respond, False otherwise
    """
    from ..db.mongodb import get_conversation, get_conversation_recent_messages
    from datetime import datetime, timedelta
    
    # Get the conversation
    conversation = await get_conversation(conversation_id)
    
    if not conversation:
        return False
    
    # Check for explicit AI toggle setting
    # If AI is explicitly disabled for this conversation, respect that setting
    ai_explicitly_disabled = conversation.get("ai_enabled") is False
    if ai_explicitly_disabled:
        return False
        
    # If AI is explicitly enabled, always respond
    ai_explicitly_enabled = conversation.get("ai_enabled") is True
    if ai_explicitly_enabled:
        return True
    
    # Default behavior when no explicit setting is present:
    
    # If no freelancer is assigned to this conversation, AI should respond
    if conversation.get("freelancer_id") is None:
        return True
    
    # Get recent messages in the conversation (last 24 hours)
    recent_messages = await get_conversation_recent_messages(
        conversation_id,
        customer_email=None,
        hours=24
    )
    
    # Check if there are any recent messages from the freelancer
    freelancer_id = conversation.get("freelancer_id")
    
    # Filter messages by freelancer
    recent_freelancer_messages = [
        msg for msg in recent_messages 
        if msg.get("sent_by") == "freelancer" and msg.get("freelancer_id") == freelancer_id
    ]
    
    # If there are no recent messages from the freelancer in the last 24 hours,
    # and the freelancer is assigned, let AI respond
    if not recent_freelancer_messages:
        return True
    
    # Otherwise, let the freelancer handle the conversation
    return False

import google.generativeai as genai
from typing import Dict, Any, Optional, List, Union
from ..config import settings
from ..schemas.chat import ChatMessageCreate
import logging
import json
import re
import asyncio
from ..db.redis import redis_client

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define license fields we need to collect
LICENSE_FIELDS = [
    {"name": "name", "prompt": "Please provide your full name:"},
    {"name": "father_name", "prompt": "Please provide your father's name:"},
    {"name": "dob", "prompt": "Please provide your date of birth (in DD/MM/YYYY format):"},
    {"name": "learner_license_no", "prompt": "Please provide your learner license number:"},
    {"name": "email", "prompt": "Please provide your email address:"},
    {"name": "phone", "prompt": "Please provide your phone number:"},
    {"name": "address", "prompt": "Please provide your full address:"},
    {"name": "city", "prompt": "Please provide your city:"},
    {"name": "state", "prompt": "Please provide your state:"},
    {"name": "pin_code", "prompt": "Please provide your PIN code:"}
]

# Define UTU registration fields we need to collect
UTU_FIELDS = [
    {"name": "name", "prompt": "Please provide your full name:"},
    {"name": "father_name", "prompt": "Please provide your father's name:"},
    {"name": "dob", "prompt": "Please provide your date of birth (in DD/MM/YYYY format):"},
    {"name": "mobile_no", "prompt": "Please provide your mobile number:"},
    {"name": "email", "prompt": "Please provide your email address:"},
    {"name": "course", "prompt": "Please provide your preferred course (default is B.TECH.):", "default": "B.TECH."}
]

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
    print(f"preferred_language: {preferred_language}")
    """
    Generate a response from Gemini AI based on the user message
    
    Args:
        user_message: The message text from the user
        conversation_id: The ID of the conversation
        preferred_language: The user's preferred language to respond in.
                          For Kumaoni and Gharwali languages, responses will use Hindi script (Devanagari)
                          while maintaining the vocabulary and grammar of the requested language.
        
    Returns:
        Dict with AI response details or None if generation failed
    """
    try:        # Check if we're in license collection mode
        license_state = await get_license_state(conversation_id)
        if license_state:
            return await handle_license_collection(user_message, conversation_id, license_state)
        
        # Check if we're in UTU registration collection mode
        utu_state = await get_utu_state(conversation_id)
        if utu_state:
            return await handle_utu_collection(user_message, conversation_id, utu_state)
        
        # Check if user is requesting a learner's license
        if await is_license_request(user_message):
            # Start license collection process
            return await start_license_collection(conversation_id)
          # Check if user is requesting UTU registration
        if await is_utu_request(user_message):
            return await start_utu_collection(conversation_id)
        
        # Initialize Gemini model
        model = genai.GenerativeModel('gemini-2.0-flash')
          # Add language instruction if preferred_language is provided
        message_with_language = user_message
        if preferred_language:
            # Special handling for Kumaoni and Gharwali to ensure Hindi script
            if preferred_language.lower() in ["kumaoni", "gharwali"]:
                language_instruction = f"\nPlease respond in {preferred_language} language only, but use Hindi script (Devanagari) for writing. All text must be in Hindi script while maintaining {preferred_language} language vocabulary and grammar."
            else:
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

async def is_license_request(user_message: str) -> bool:
    """
    Check if the user message is requesting a learner's license
    
    Args:
        user_message: The message text from the user
        
    Returns:
        True if the message is about learner's license, False otherwise
    """
    license_keywords = [
        "learner's licence", "learner's license", "learning license", "learning licence",
        "driving license", "driving licence", "make license", "create license",
        "apply for license", "get license", "license application"
    ]
    
    message_lower = user_message.lower()
    return any(keyword in message_lower for keyword in license_keywords)

async def start_license_collection(conversation_id: str) -> Dict[str, Any]:
    """
    Start the license collection process by saving state to Redis
    and sending the first field prompt
    
    Args:
        conversation_id: The ID of the conversation
        
    Returns:
        Dict with AI response for the first field
    """
    # Initialize license data in Redis
    license_data = {
        "current_field_index": 0,
        "fields": {}
    }
    
    # Save to Redis with expiration (24 hours)
    await redis_client.set(
        f"license_collection:{conversation_id}",
        json.dumps(license_data),
        ex=86400  # 24 hours
    )
    
    # Return prompt for first field
    first_field = LICENSE_FIELDS[0]
    welcome_message = (
        "I'll help you apply for a learner's license. I'll need to collect some personal details. "
        "You can type 'cancel' at any time to stop this process.\n\n"
        f"{first_field['prompt']}"
    )
    
    return {
        "type": "text",
        "text": welcome_message,
        "sent_by": "ai",
        "freelancer_id": None,
        "conversation_id": conversation_id
    }

async def get_license_state(conversation_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve the current license collection state from Redis
    
    Args:
        conversation_id: The ID of the conversation
        
    Returns:
        Dict with current state or None if not in license collection mode
    """
    state_json = await redis_client.get(f"license_collection:{conversation_id}")
    if not state_json:
        return None
    
    try:
        return json.loads(state_json)
    except json.JSONDecodeError:
        logger.error(f"Invalid JSON in Redis for conversation {conversation_id}")
        return None

async def handle_license_collection(user_message: str, conversation_id: str, license_state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle the license collection flow
    
    Args:
        user_message: The user's message/input
        conversation_id: The ID of the conversation
        license_state: The current license collection state
        
    Returns:
        Dict with AI response
    """
    # Check if user wants to cancel
    if user_message.strip().lower() == "cancel":
        # Delete the license state from Redis
        await redis_client.delete(f"license_collection:{conversation_id}")
        
        return {
            "type": "text",
            "text": "License application process cancelled. How else can I assist you?",
            "sent_by": "ai",
            "freelancer_id": None,
            "conversation_id": conversation_id
        }
    
    current_index = license_state["current_field_index"]
    
    # Save the user's response for the current field
    if current_index < len(LICENSE_FIELDS):
        current_field = LICENSE_FIELDS[current_index]
        field_name = current_field["name"]
        
        # Update the license state
        license_state["fields"][field_name] = user_message
        license_state["current_field_index"] += 1
        
        # Save updated state to Redis
        await redis_client.set(
            f"license_collection:{conversation_id}",
            json.dumps(license_state),
            ex=86400  # 24 hours
        )
        
        # Check if we've collected all fields
        if license_state["current_field_index"] >= len(LICENSE_FIELDS):
            # All fields collected, process the license request
            return await complete_license_collection(conversation_id, license_state)
        
        # Prompt for the next field
        next_field = LICENSE_FIELDS[license_state["current_field_index"]]
        return {
            "type": "text",
            "text": next_field["prompt"],
            "sent_by": "ai",
            "freelancer_id": None,
            "conversation_id": conversation_id
        }
    
    # Should not reach here, but just in case
    return {
        "type": "text",
        "text": "There was an issue processing your license application. Please start over by asking for a learner's license.",
        "sent_by": "ai",
        "freelancer_id": None,
        "conversation_id": conversation_id
    }

async def complete_license_collection(conversation_id: str, license_state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Complete the license collection process and call the license function
    
    Args:
        conversation_id: The ID of the conversation
        license_state: The current license collection state
        
    Returns:
        Dict with AI response
    """
    try:
        # Extract the collected fields
        fields = license_state["fields"]
        
        # Clean up Redis state
        await redis_client.delete(f"license_collection:{conversation_id}")
        
        # Log the collected data
        logger.info(f"License data collected for conversation {conversation_id}: {fields}")
        
        # Import the license service and submit the application
        from .license_service import process_license_application
        
        # Format all the collected information for confirmation
        confirmation = "Thank you for providing your information. Here's what I've collected:\n\n"
        for field in LICENSE_FIELDS:
            field_name = field["name"]
            field_value = fields.get(field_name, "Not provided")
            confirmation += f"{field_name.replace('_', ' ').title()}: {field_value}\n"
        
        # Start processing the license application in the background
        # We don't await the result as it might take time
        # In a real application, you could use a task queue like Celery for this
        asyncio.create_task(process_license_application(fields))
        
        confirmation += "\nI'm now processing your learner's license application. The browser will open automatically to handle the application. Please follow the on-screen instructions to complete the process."
        
        return {
            "type": "text",
            "text": confirmation,
            "sent_by": "ai",
            "freelancer_id": None,
            "conversation_id": conversation_id
        }
    except Exception as e:
        logger.error(f"Error completing license collection: {str(e)}")
        return {
            "type": "text",
            "text": f"There was an error processing your license application: {str(e)}. Please try again later.",
            "sent_by": "ai",
            "freelancer_id": None,
            "conversation_id": conversation_id
        }

async def is_utu_request(user_message: str) -> bool:
    """
    Check if the user message is requesting UTU registration
    
    Args:
        user_message: The message text from the user
        
    Returns:
        True if the message is about UTU registration, False otherwise
    """
    utu_keywords = [
        "utu registration", "uttarakhand technical university", "college registration", 
        "university registration", "register for utu", "enroll in utu", 
        "utu admission", "university admission", "college admission",
        "register for college", "apply for utu", "apply for college"
    ]
    
    message_lower = user_message.lower()
    return any(keyword in message_lower for keyword in utu_keywords)

async def start_utu_collection(conversation_id: str) -> Dict[str, Any]:
    """
    Start the UTU registration collection process by saving state to Redis
    and sending the first field prompt
    
    Args:
        conversation_id: The ID of the conversation
        
    Returns:
        Dict with AI response for the first field
    """
    # Initialize UTU data in Redis
    utu_data = {
        "current_field_index": 0,
        "fields": {}
    }
    
    # Save to Redis with expiration (24 hours)
    await redis_client.set(
        f"utu_registration:{conversation_id}",
        json.dumps(utu_data),
        ex=86400  # 24 hours
    )
    
    # Return prompt for first field
    first_field = UTU_FIELDS[0]
    welcome_message = (
        "I'll help you with UTU registration. I'll need to collect some personal details. "
        "You can type 'cancel' at any time to stop this process.\n\n"
        f"{first_field['prompt']}"
    )
    
    return {
        "type": "text",
        "text": welcome_message,
        "sent_by": "ai",
        "freelancer_id": None,
        "conversation_id": conversation_id
    }

async def get_utu_state(conversation_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve the current UTU registration collection state from Redis
    
    Args:
        conversation_id: The ID of the conversation
        
    Returns:
        Dict with current state or None if not in UTU registration collection mode
    """
    state_json = await redis_client.get(f"utu_registration:{conversation_id}")
    if not state_json:
        return None
    
    try:
        return json.loads(state_json)
    except json.JSONDecodeError:
        logger.error(f"Invalid JSON in Redis for UTU registration conversation {conversation_id}")
        return None



async def handle_utu_collection(user_message: str, conversation_id: str, utu_state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle the UTU registration collection flow
    
    Args:
        user_message: The user's message/input
        conversation_id: The ID of the conversation
        utu_state: The current UTU registration collection state
        
    Returns:
        Dict with AI response
    """
    # Check if user wants to cancel
    if user_message.strip().lower() == "cancel":
        # Delete the UTU state from Redis
        await redis_client.delete(f"utu_registration:{conversation_id}")
        
        return {
            "type": "text",
            "text": "UTU registration process cancelled. How else can I assist you?",
            "sent_by": "ai",
            "freelancer_id": None,
            "conversation_id": conversation_id
        }
    
    current_index = utu_state["current_field_index"]
    
    # Save the user's response for the current field
    if current_index < len(UTU_FIELDS):
        current_field = UTU_FIELDS[current_index]
        field_name = current_field["name"]
        
        # Update the UTU state
        utu_state["fields"][field_name] = user_message
        utu_state["current_field_index"] += 1
        
        # Save updated state to Redis
        await redis_client.set(
            f"utu_registration:{conversation_id}",
            json.dumps(utu_state),
            ex=86400  # 24 hours
        )
        
        # Check if we've collected all fields
        if utu_state["current_field_index"] >= len(UTU_FIELDS):
            # All fields collected, process the UTU registration request
            return await complete_utu_collection(conversation_id, utu_state)
        
        # Prompt for the next field
        next_field = UTU_FIELDS[utu_state["current_field_index"]]
        return {
            "type": "text",
            "text": next_field["prompt"],
            "sent_by": "ai",
            "freelancer_id": None,
            "conversation_id": conversation_id
        }
    
    # Should not reach here, but just in case
    return {
        "type": "text",
        "text": "There was an issue processing your UTU registration. Please start over by asking for UTU registration.",
        "sent_by": "ai",
        "freelancer_id": None,
        "conversation_id": conversation_id
    }

async def complete_utu_collection(conversation_id: str, utu_state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Complete the UTU registration collection process and call the registration function
    
    Args:
        conversation_id: The ID of the conversation
        utu_state: The current UTU registration collection state
        
    Returns:
        Dict with AI response
    """
    try:
        # Extract the collected fields
        fields = utu_state["fields"]
        
        # Clean up Redis state
        await redis_client.delete(f"utu_registration:{conversation_id}")
        
        # Log the collected data
        logger.info(f"UTU data collected for conversation {conversation_id}: {fields}")
        
        # Import the UTU service and submit the registration
        from .utu_service import process_utu_registration
        
        # Format all the collected information for confirmation
        confirmation = "Thank you for providing your information for UTU registration. Here's what I've collected:\n\n"
        for field in UTU_FIELDS:
            field_name = field["name"]
            field_value = fields.get(field_name, "Not provided")
            confirmation += f"{field_name.replace('_', ' ').title()}: {field_value}\n"
        
        # Start processing the UTU registration in the background
        # We don't await the result as it might take time
        # In a real application, you could use a task queue like Celery for this
        asyncio.create_task(process_utu_registration(fields))
        
        confirmation += "\nI'm now processing your UTU registration. The browser will open automatically to handle the registration. Please follow the on-screen instructions to complete the process."
        
        return {
            "type": "text",
            "text": confirmation,
            "sent_by": "ai",
            "freelancer_id": None,
            "conversation_id": conversation_id
        }
    except Exception as e:
        logger.error(f"Error completing UTU registration: {str(e)}")
        return {
            "type": "text",
            "text": f"There was an error processing your UTU registration: {str(e)}. Please try again later.",
            "sent_by": "ai",
            "freelancer_id": None,
            "conversation_id": conversation_id
        }

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
    
    # If a freelancer is assigned to this conversation, AI should NOT respond
    # This prevents AI from responding in conversations with freelancers
    return False

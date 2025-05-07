import enum
import json
import pickle
from typing import Dict, List, Any, Optional, Tuple
import google.generativeai as genai
from tenacity import retry, stop_after_attempt, wait_exponential
import os
import redis
from .pan_card import make_pan_card
from .voter_id import make_voter_id
from .learner_license import make_learner_license

# Load API key from environment variable
GOOGLE_API_KEY = os.getenv("GOOGLE_GEMINI_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable not set")

# Configure the Gemini API
genai.configure(api_key=GOOGLE_API_KEY)

# Initialize Redis client for state persistence
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))
REDIS_PREFIX = "gemini_state:"

# Try to connect to Redis, fall back to in-memory if not available
try:
    redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=REDIS_DB)
    redis_client.ping()  # Test connection
    print("Connected to Redis for state persistence")
    USE_REDIS = True
except Exception as e:
    print(f"Warning: Could not connect to Redis ({str(e)}). Using in-memory state storage.")
    USE_REDIS = False

class ResponseType(enum.Enum):
    """Enum for the type of response to generate."""
    AI_RESPONSE = "ai_response"
    AUTOMATION = "automation"
    FREELANCER = "freelancer"

class AutomationType(enum.Enum):
    """Enum for automation types that can be performed."""
    PAN_CARD = "pan_card"
    VOTER_ID = "voter_id"
    LEARNER_LICENSE = "learner_license"
    NONE = "none"

class DocumentField(enum.Enum):
    """Fields required for document processing."""
    NAME = "name"
    FATHER_NAME = "father_name" 
    DOB = "dob"
    EMAIL = "email"
    PHONE = "phone"
    GENDER = "gender"
    ADDRESS = "address"
    CITY = "city"
    STATE = "state"
    PIN_CODE = "pin_code"
    CONFIRMATION = "confirmation"
    COMPLETED = "completed"

class ConversationState:
    """Tracks the state of a document creation conversation."""
    
    def __init__(self):
        """Initialize a new conversation state."""
        self.document_type = AutomationType.NONE
        self.current_field = None
        self.details = {
            "name": "",
            "father_name": "",
            "dob": "",
            "email": "",
            "phone": "",
            "gender": "",
            "address": "",
            "city": "",
            "state": "",
            "pin_code": ""
        }
        
    def set_document_type(self, doc_type: AutomationType):
        """Set the document type being processed."""
        self.document_type = doc_type
        # Start with the first field if not already set
        if not self.current_field:
            self.current_field = DocumentField.NAME
            
    def update_field(self, field: DocumentField, value: str):
        """Update a field value."""
        if field.value in self.details:
            self.details[field.value] = value
            
    def next_field(self):
        """Move to the next field in the sequence."""
        field_sequence = [
            DocumentField.NAME,
            DocumentField.FATHER_NAME,
            DocumentField.DOB,
            DocumentField.EMAIL,
            DocumentField.PHONE,
            DocumentField.GENDER,
            DocumentField.ADDRESS,
            DocumentField.CITY,
            DocumentField.STATE,
            DocumentField.PIN_CODE,
            DocumentField.CONFIRMATION,
            DocumentField.COMPLETED
        ]
        
        if not self.current_field:
            self.current_field = field_sequence[0]
            return
            
        current_index = field_sequence.index(self.current_field)
        if current_index < len(field_sequence) - 1:
            self.current_field = field_sequence[current_index + 1]
            
    def get_missing_fields(self):
        """Get list of fields that still need values."""
        return [field for field, value in self.details.items() if not value]
        
    def is_data_complete(self):
        """Check if all required fields have values."""
        return len(self.get_missing_fields()) == 0
        
    def reset(self):
        """Reset the conversation state."""
        self.document_type = AutomationType.NONE
        self.current_field = None
        self.details = {field: "" for field in self.details}

class GeminiAssistant:
    """Assistant powered by Google's Gemini model."""
    
    def __init__(self):
        """Initialize the Gemini assistant."""
        self.model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            generation_config={
                "temperature": 0.7,
                "top_p": 0.95,
                "top_k": 40,
            }
        )
        
        # List of automated services
        self.automation_services = [service.value for service in AutomationType if service != AutomationType.NONE]
        
        # Tasks that should be directed to freelancers
        self.freelancer_tasks = [
            "website development",
            "custom application",
            "logo design",
            "complex integration",
            "data migration",
            "security audit",
            "performance optimization",
            "custom report",
            "api development"
        ]
        
        # State management for document creation conversations
        self.conversation_states = {}
    
    def _get_or_create_conversation_state(self, user_id: int) -> ConversationState:
        """Get or create a conversation state for a user."""
        if USE_REDIS:
            # Try to load state from Redis
            try:
                state_data = redis_client.get(f"{REDIS_PREFIX}{user_id}")
                if state_data:
                    # Unpickle the data to restore the state
                    state = pickle.loads(state_data)
                    print(f"Loaded state for user {user_id} from Redis")
                    return state
            except Exception as e:
                print(f"Error loading state from Redis: {e}")
        
        # Fallback to in-memory state
        if user_id not in self.conversation_states:
            self.conversation_states[user_id] = ConversationState()
        return self.conversation_states[user_id]
        
    def _save_conversation_state(self, user_id: int, state: ConversationState):
        """Save a user's conversation state to persistent storage."""
        if not USE_REDIS:
            # In-memory storage only, already saved in the dictionary
            return
            
        try:
            # Serialize the state object using pickle
            state_data = pickle.dumps(state)
            # Store it in Redis with an expiration of 1 hour (3600 seconds)
            redis_client.setex(f"{REDIS_PREFIX}{user_id}", 3600, state_data)
            print(f"Saved state for user {user_id} to Redis")
        except Exception as e:
            print(f"Error saving state to Redis: {e}")
            
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def process_chat(self, chat_history: str, language: str = "en") -> Tuple[str, Optional[str]]:
        """
        Process a chat conversation and generate an appropriate response.
        This is the main consolidated function that handles all types of requests.
        
        Args:
            chat_history: String representation of chat messages between user and assistant
                          in the format "Role: Message\n\nRole: Message\n\n"
            language: The preferred language for the response
            
        Returns:
            A tuple containing:
                - The response text to show to the user
                - Optional automation type if automation is detected
        """
        if not chat_history:
            return "Hello! How can I assist you today?", None

        # Extract all user messages and the latest user message from the formatted chat
        user_messages = []
        latest_message = ""
        user_id = 1  # Default user ID
        
        # Parse the chat_history to get all user messages and the latest one
        chat_lines = chat_history.strip().split("\n\n")
        for line in chat_lines:
            if line.startswith("User:"):
                message = line[5:].strip()  # Remove "User: " prefix
                user_messages.append(message)
                
        # Get the latest user message
        if user_messages:
            latest_message = user_messages[-1]
        
        print(f"LATEST USER MESSAGE: {latest_message}")
            
        if not latest_message:
            return "I didn't receive your message. Could you please try again?", None
            
        # Get conversation state for this user
        state = self._get_or_create_conversation_state(user_id)
        
        # Debug the current state
        print(f"CURRENT STATE: Document Type: {state.document_type.value}, Current Field: {state.current_field.value if state.current_field else 'None'}")
        print(f"STORED DETAILS: {state.details}")
        
        # Create a variable to store the result
        response = ""
        automation_result = None
        
        try:
            # Check if we're already in a document creation flow
            if state.document_type != AutomationType.NONE:
                # Continue the document creation conversation
                if state.document_type == AutomationType.PAN_CARD:
                    print("CONTINUING PAN CARD FLOW")
                    response, complete = await self._continue_pan_card_flow(state, latest_message, language)
                    automation_result = AutomationType.PAN_CARD.value if complete else None
                    
                elif state.document_type == AutomationType.VOTER_ID:
                    print("CONTINUING VOTER ID FLOW")
                    response, complete = await self._continue_voter_id_flow(state, latest_message, language)
                    automation_result = AutomationType.VOTER_ID.value if complete else None
                    
                elif state.document_type == AutomationType.LEARNER_LICENSE:
                    print("CONTINUING LEARNER LICENSE FLOW")
                    response, complete = await self._continue_learner_license_flow(state, latest_message, language)
                    automation_result = AutomationType.LEARNER_LICENSE.value if complete else None
            
            # If we're not in a document flow, check if this is a new request
            else:
                # First, detect if this is a freelancer request
                if await self._is_freelancer_request(chat_history, latest_message):
                    return "freelancer", None
                    
                # Then, check if this is an automation request and which type
                automation_type, automation_details = await self._detect_automation(chat_history, latest_message)
                
                # Start a document creation flow if detected
                if automation_type != AutomationType.NONE:
                    print(f"DETECTED AUTOMATION: {automation_type.value}")
                    state.set_document_type(automation_type)
                    
                    # Merge any detected details
                    for field, value in automation_details.items():
                        if field in state.details and value:
                            state.details[field] = value
                            print(f"SETTING FIELD {field} TO {value}")
                            
                    # Start the appropriate document flow
                    if automation_type == AutomationType.PAN_CARD:
                        response = self._start_document_flow(state, "PAN card")
                        
                    elif automation_type == AutomationType.VOTER_ID:
                        response = self._start_document_flow(state, "Voter ID")
                        
                    elif automation_type == AutomationType.LEARNER_LICENSE:
                        response = self._start_document_flow(state, "Learner License")
                else:
                    # Default: Generate a normal AI response
                    response = await self._generate_ai_response(chat_history, latest_message, language)
        except Exception as e:
            print(f"Error processing chat: {str(e)}")
            if language == "en":
                response = "I'm sorry, I encountered an issue while processing your request. Please try again or contact support."
            else:
                response = "I apologize, but I'm having trouble processing your request. Please try again in English or contact our support team."
        
        # Save the updated conversation state
        self._save_conversation_state(user_id, state)
        
        # After processing, dump the state for debugging
        print(f"SAVING STATE: Document Type: {state.document_type.value}, Current Field: {state.current_field.value if state.current_field else 'None'}")
        print(f"UPDATED DETAILS: {state.details}")
                
        return response, automation_result

    def _format_chat_for_model(self, chat_history: List[Dict[str, Any]]) -> str:
        """Format chat history for the model in a conversational format."""
        formatted_chat = ""
        for msg in chat_history:
            # Handle both dict-like objects and Pydantic models
            if hasattr(msg, 'sent_from'):
                role = "User" if msg.sent_from == "user" else "Assistant"
                text = msg.text if hasattr(msg, 'text') else ""
            else:
                role = "User" if msg.get('sent_from') == 'user' else "Assistant"
                text = msg.get('text', '')
                
            formatted_chat += f"{role}: {text}\n\n"
        return formatted_chat

    def _start_document_flow(self, state: ConversationState, document_name: str) -> str:
        """Start a document creation conversation flow."""
        state.current_field = DocumentField.NAME
        return f"I'll help you create your {document_name}. Let's collect the necessary information step by step.\n\nFirst, please provide your full name:"

    async def _continue_pan_card_flow(self, state: ConversationState, latest_message: str, language: str) -> Tuple[str, bool]:
        """Continue a PAN card creation conversation flow."""
        return await self._continue_document_flow(state, latest_message, language, "PAN card", make_pan_card)
        
    async def _continue_voter_id_flow(self, state: ConversationState, latest_message: str, language: str) -> Tuple[str, bool]:
        """Continue a Voter ID creation conversation flow."""
        return await self._continue_document_flow(state, latest_message, language, "Voter ID", make_voter_id)
        
    async def _continue_learner_license_flow(self, state: ConversationState, latest_message: str, language: str) -> Tuple[str, bool]:
        """Continue a Learner License creation conversation flow."""
        return await self._continue_document_flow(state, latest_message, language, "Learner License", make_learner_license)

    async def _continue_document_flow(self, 
                                    state: ConversationState, 
                                    latest_message: str, 
                                    language: str,
                                    document_name: str,
                                    create_document_function) -> Tuple[str, bool]:
        """
        Continue a document creation conversation flow.
        
        Args:
            state: The conversation state
            latest_message: The latest user message
            language: The preferred language
            document_name: The name of the document being created
            create_document_function: Function to call to create the document
            
        Returns:
            Tuple of (response_message, is_completed)
        """
        print(f"CONTINUING DOCUMENT FLOW - Current field: {state.current_field.value if state.current_field else 'None'}")
        
        # Check if we're waiting for confirmation
        if state.current_field == DocumentField.CONFIRMATION:
            confirmation_keywords = ["yes", "confirm", "proceed", "go ahead", "create", "make", "generate", "okay", "ok"]
            is_confirmation = any(keyword in latest_message.lower() for keyword in confirmation_keywords)
            
            if is_confirmation:
                # Process the document creation
                try:
                    create_document_function(
                        name=state.details["name"],
                        father_name=state.details["father_name"],
                        dob=state.details["dob"],
                        email=state.details["email"],
                        phone=state.details["phone"],
                        gender=state.details["gender"],
                        address=state.details["address"],
                        city=state.details["city"],
                        state=state.details["state"],
                        pin_code=state.details["pin_code"]
                    )
                    
                    # Format the success message
                    response = f"Your {document_name} has been processed with the following details:\n\n" \
                              f"Name: {state.details['name']}\n" \
                              f"Father's Name: {state.details['father_name']}\n" \
                              f"Date of Birth: {state.details['dob']}\n" \
                              f"Email: {state.details['email']}\n" \
                              f"Phone: {state.details['phone']}\n" \
                              f"Gender: {state.details['gender']}\n" \
                              f"Address: {state.details['address']}\n" \
                              f"City: {state.details['city']}\n" \
                              f"State: {state.details['state']}\n" \
                              f"PIN Code: {state.details['pin_code']}"
                              
                    # Reset the state
                    state.reset()
                    return response, True
                except Exception as e:
                    print(f"Error processing {document_name}: {str(e)}")
                    return f"There was an error processing your {document_name}. Please try again.", False
            else:
                # If they didn't confirm, ask again
                return f"Would you like me to proceed with creating your {document_name}? Please confirm with 'yes' to continue or 'no' to cancel.", False
                
        # If we're at the completed state but still getting messages, reset
        if state.current_field == DocumentField.COMPLETED:
            state.reset()
            return f"Your {document_name} has already been processed. Is there anything else I can help you with?", True
            
        # Get the current field before moving to the next one
        current_field = state.current_field.value if state.current_field else DocumentField.NAME.value
            
        # Use direct extraction for simple responses and model-based extraction for complex ones
        extracted_value = ""
        
        # For simple responses that are likely just the answer to our question
        if len(latest_message.split()) <= 5 and not any(q in latest_message.lower() for q in ["what", "how", "why", "when", "?"]):
            extracted_value = latest_message.strip()
            print(f"DIRECT EXTRACTION for {current_field}: '{extracted_value}'")
        else:
            # Use model-based extraction for more complex responses
            extracted_value = await self._extract_field_value(latest_message, current_field)
            
        # Update the state with the extracted information if we got something
        if extracted_value and current_field in state.details:
            print(f"UPDATING FIELD {current_field} with value: '{extracted_value}'")
            state.details[current_field] = extracted_value
            
            # Move to the next field only if we successfully extracted a value
            state.next_field()
            print(f"MOVED TO NEXT FIELD: {state.current_field.value}")
        else:
            print(f"FAILED TO EXTRACT VALUE for {current_field}")
            # If extraction failed, ask for the same field again
            
        # Return the prompt for the new current field
        return self._get_next_field_prompt(state, document_name)
    
    def _get_next_field_prompt(self, state: ConversationState, document_name: str) -> Tuple[str, bool]:
        """Get the prompt for the next field in the document creation flow."""
        current_field = state.current_field
        
        # If we've reached confirmation, show a summary and ask for confirmation
        if current_field == DocumentField.CONFIRMATION:
            return (
                f"I have all the required details for your {document_name}:\n\n"
                f"Name: {state.details['name']}\n"
                f"Father's Name: {state.details['father_name']}\n"
                f"Date of Birth: {state.details['dob']}\n"
                f"Email: {state.details['email']}\n"
                f"Phone: {state.details['phone']}\n"
                f"Gender: {state.details['gender']}\n"
                f"Address: {state.details['address']}\n"
                f"City: {state.details['city']}\n"
                f"State: {state.details['state']}\n"
                f"PIN Code: {state.details['pin_code']}\n\n"
                f"Please confirm if you want to proceed with processing your {document_name}. Reply with 'Yes' to confirm."
            ), False
        
        # If we've completed the process, reset and return a completion message
        if current_field == DocumentField.COMPLETED:
            # This state should not normally be reached in this function, but just in case
            state.reset()
            return f"Your {document_name} has been processed successfully. Is there anything else I can help you with?", True
            
        # Field-specific prompts
        field_prompts = {
            DocumentField.NAME: "Please provide your full name:",
            DocumentField.FATHER_NAME: "Please provide your father's name:",
            DocumentField.DOB: "Please provide your date of birth (in DD-MM-YYYY format):",
            DocumentField.EMAIL: "Please provide your email address:",
            DocumentField.PHONE: "Please provide your phone number:",
            DocumentField.GENDER: "Please specify your gender:",
            DocumentField.ADDRESS: "Please provide your street address:",
            DocumentField.CITY: "Please provide your city:",
            DocumentField.STATE: "Please provide your state:",
            DocumentField.PIN_CODE: "Please provide your PIN code:"
        }
        
        return field_prompts.get(current_field, "Please continue providing your details:"), False

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=3))
    async def _extract_field_value(self, message: str, field: str) -> str:
        """Extract a specific field value from a user message."""
        field_descriptions = {
            "name": "the person's full name",
            "father_name": "the person's father's name",
            "dob": "the date of birth (in any format)",
            "email": "the email address",
            "phone": "the phone number",
            "gender": "the gender",
            "address": "the street address",
            "city": "the city name",
            "state": "the state name",
            "pin_code": "the PIN or postal code"
        }
        
        # For simple responses, just use the message directly if it's likely to be the field value
        if len(message.split()) <= 5 and not any(q in message.lower() for q in ["what", "how", "why", "when", "?"]):
            print(f"DIRECT EXTRACTION for {field}: '{message}'")
            return message.strip()
        
        prompt = f"""
        Extract {field_descriptions.get(field, field)} from this message:
        
        "{message}"
        
        Return ONLY the extracted value, nothing else. If you cannot find the value, return an empty string.
        """
        
        try:
            response = await self.model.generate_content_async(prompt)
            result = response.text.strip()
            print(f"EXTRACTION RESULT for {field}: '{result}'")
            return result
        except Exception as e:
            print(f"Error extracting field value: {e}")
            return message.strip()  # Fall back to the message itself if extraction fails

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=3))
    async def _is_freelancer_request(self, chat_history: str, latest_message: str) -> bool:
        """Determine if the user is requesting a freelancer."""
        prompt = f"""
        Analyze this chat conversation and determine if the user is asking to connect with a freelancer or needs services that would require a freelancer.

        Chat history:
        {chat_history}

        Latest user message:
        {latest_message}

        Freelancer services include:
        {', '.join(self.freelancer_tasks)}

        If the user is asking for a freelancer or any of these services DIRECTLY or INDIRECTLY, respond ONLY with the word 'YES'.
        If not, respond ONLY with the word 'NO'.
        """

        try:
            response = await self.model.generate_content_async(prompt)
            result = response.text.strip().upper()
            return result == "YES"
        except Exception as e:
            print(f"Error in freelancer detection: {e}")
            # Be cautious - if we can't determine, don't send to freelancer
            return False

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=3)) 
    async def _detect_automation(self, chat_history: str, latest_message: str) -> Tuple[AutomationType, Dict[str, Any]]:
        """Detect if the conversation requires automation and which type."""
        prompt = f"""
        Analyze this chat conversation and determine if the user is requesting one of these automated services:
        1. PAN card registration
        2. Voter ID registration
        3. Learner license registration

        Chat history:
        {chat_history}

        Latest user message:
        {latest_message}

        Respond with a JSON object that has these fields:
        - "type": one of ["pan_card", "voter_id", "learner_license", "none"]
        - "confidence": a number between 0 and 1
        - "details": any extracted details like name, address, etc. (empty object if none detected)
        """

        try:
            response = await self.model.generate_content_async(prompt)
            result = response.text
            
            # Extract JSON from response
            try:
                # Try parsing as-is first
                analysis = json.loads(result)
            except json.JSONDecodeError:
                # If that fails, try to extract JSON from markdown code block
                if "```json" in result and "```" in result:
                    json_text = result.split("```json")[1].split("```")[0].strip()
                    analysis = json.loads(json_text)
                else:
                    # Fall back if JSON parsing fails
                    return AutomationType.NONE, {}
            
            automation_type = analysis.get("type", "none")
            details = analysis.get("details", {})
            
            if automation_type == AutomationType.PAN_CARD.value:
                return AutomationType.PAN_CARD, details
            elif automation_type == AutomationType.VOTER_ID.value:
                return AutomationType.VOTER_ID, details
            elif automation_type == AutomationType.LEARNER_LICENSE.value:
                return AutomationType.LEARNER_LICENSE, details
            else:
                return AutomationType.NONE, {}
                
        except Exception as e:
            print(f"Error in automation detection: {e}")
            return AutomationType.NONE, {}

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=3))
    async def _generate_ai_response(self, chat_history: str, latest_message: str, language: str) -> str:
        """Generate an AI response to a user message."""
        prompt = f"""
        You are a helpful customer support assistant for a Digital Common Service Center. 
        Respond to the following chat conversation.
        Be concise, helpful, and friendly.

        Chat history:
        {chat_history}

        Latest user message:
        {latest_message}
        
        Respond in this language: {language}
        
        IMPORTANT: If the user is asking for a freelancer, respond ONLY with the word 'freelancer'.
        """
        
        try:
            response = await self.model.generate_content_async(prompt)
            result = response.text.strip()
            
            # Check if this is a freelancer request that slipped through
            if result.lower() == "freelancer":
                return "freelancer"
                
            return result
        except Exception as e:
            print(f"Error generating AI response: {e}")
            raise

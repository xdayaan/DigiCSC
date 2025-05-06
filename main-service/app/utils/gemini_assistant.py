import enum
import json
from typing import Dict, List, Any
import google.generativeai as genai
from tenacity import retry, stop_after_attempt, wait_exponential
import os
from .pan_card import make_pan_card


# Load API key from environment variable
GOOGLE_API_KEY = os.getenv("GOOGLE_GEMINI_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable not set")

# Configure the Gemini API
genai.configure(api_key=GOOGLE_API_KEY)

def is_pan_card_request(message: str) -> bool:
    """Return True if the message is about making a PAN card."""
    keywords = ["pan card", "make pan card", "apply pan card", "generate pan card", "create pan card"]
    lowered = message.lower()
    return any(keyword in lowered for keyword in keywords)

class ResponseType(enum.Enum):
    """Enum for the type of response to generate."""
    AI_RESPONSE = "ai_response"
    AUTOMATION = "automation"
    FREELANCER = "freelancer"
    PAN_CARD = "pan_card"

class AutomationTask(enum.Enum):
    """Enum for automation tasks that can be performed."""
    SCHEDULE_APPOINTMENT = "schedule_appointment"
    CHECK_STATUS = "check_status"
    UPDATE_INFO = "update_info"
    SUBMIT_DOCUMENT = "submit_document"
    CANCEL_REQUEST = "cancel_request"
    OTHER = "other"

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
        
        # List of tasks that can be automated
        self.automation_tasks = [task.value for task in AutomationTask]
        
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
        
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def analyze_message(self, message: str, language: str = "en") -> Dict[str, Any]:
        """
        Analyze a user message to determine the appropriate response type.
        
        Args:
            message: The user message to analyze
            language: The language of the message
            
        Returns:
            A dictionary with analysis results including response_type
        """
        # First check if this is a PAN card related request
        if is_pan_card_request(message):
            return {
                "response_type": ResponseType.PAN_CARD.value,
                "confidence": 0.95,
                "reasoning": "Message contains PAN card related keywords"
            }
            
        # Prompt for message analysis
        prompt = f"""

        IMPORTANT: If the user is asking for a freelancer, do not provide a response. Instead, return the string 'freelancer'. Only and only send the string 'freelancer'.
        IMPORTANT: If the user is asking for a PAN card, do not provide a response. Instead, return the string 'pancard'. Only and only send the string 'pancard'

        Analyze the following user message and determine if it:
        1. Can be handled by automation
        2. Requires a freelancer specialist
        3. Can be answered directly by AI
        
        User message: {message}
        
        If the message is about any of these tasks, it can be automated: {', '.join(self.automation_tasks)}
        If the message is about any of these services, it requires a freelancer: {', '.join(self.freelancer_tasks)}
        
        Respond with a JSON object that has these fields:
        - response_type: "automation", "freelancer", or "ai_response"
        - confidence: a number between 0 and 1
        - automation_task: if response_type is "automation", include which specific task
        - reasoning: brief explanation for your classification

        IMPORTANT: If the user is asking for a freelancer, do not provide a response. Instead, return the string 'freelancer'. Only and only send the string 'freelancer'.
        IMPORTANT: If the user is asking for a PAN card, do not provide a response. Instead, return the string 'pancard'. Only and only send the string 'pancard'
        """
        
        try:
            response = await self.model.generate_content_async(prompt)
            result = response.text
            
            # Extract the JSON from the response
            try:
                # Try to parse as-is first
                analysis = json.loads(result)
            except json.JSONDecodeError:
                # If that fails, try to extract JSON from markdown code block
                if "```json" in result and "```" in result:
                    json_text = result.split("```json")[1].split("```")[0].strip()
                    analysis = json.loads(json_text)
                else:
                    # Fall back to AI response if JSON parsing fails
                    analysis = {"response_type": ResponseType.AI_RESPONSE.value, "confidence": 1.0, 
                                "reasoning": "Failed to parse analysis results"}
            
            return analysis
        except Exception as e:
            # Log the error (in a real implementation)
            print(f"Error analyzing message: {str(e)}")
            # Return default response
            return {"response_type": ResponseType.AI_RESPONSE.value, "confidence": 1.0, 
                    "reasoning": f"Error occurred: {str(e)}"}
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def extract_pan_card_details(self, message: str) -> Dict[str, str]:
        """
        Extract PAN card details from a user message using Gemini.
        
        Args:
            message: The user message containing PAN card details
            
        Returns:
            A dictionary with the extracted PAN card details
        """
        # Define the required fields
        required_fields = [
            "name", "father_name", "dob", "pan_number", 
            "address", "city", "state", "pin_code"
        ]
        
        # Prompt for extraction
        prompt = f"""

        IMPORTANT: If the user is asking for a freelancer, do not provide a response. Instead, return the string 'freelancer'. Only and only send the string 'freelancer'.
        IMPORTANT: If the user is asking for a PAN card, do not provide a response. Instead, return the string 'pancard'. Only and only send the string 'pancard'


        Extract the following PAN card details from the user message. Return the results as a valid JSON object.
        If a field is missing, leave it as an empty string.

        
        
        Required fields:
        - name: Full name of the card holder
        - father_name: Father's name of the card holder
        - dob: Date of birth (format doesn't matter)
        - pan_number: PAN card number
        - address: Street address
        - city: City name
        - state: State name
        - pin_code: PIN/Postal code
        
        User message: {message}
        
        Return ONLY a valid JSON object with these fields, nothing else. Example:
        {{
            "name": "John Doe",
            "father_name": "Richard Doe",
            "dob": "01-01-1990",
            "pan_number": "ABCDE1234F",
            "address": "123 Main St",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pin_code": "400001"
        }}

        IMPORTANT: If the user is asking for a freelancer, do not provide a response. Instead, return the string 'freelancer'. Only and only send the string 'freelancer'.
        IMPORTANT: If the user is asking for a PAN card, do not provide a response. Instead, return the string 'pancard'. Only and only send the string 'pancard'
        """
        
        try:
            response = await self.model.generate_content_async(prompt)
            result = response.text
            
            # Extract the JSON from the response
            try:
                # Try to parse as-is first
                details = json.loads(result)
            except json.JSONDecodeError:
                # If that fails, try to extract JSON from markdown code block
                if "```json" in result and "```" in result:
                    json_text = result.split("```json")[1].split("```")[0].strip()
                    details = json.loads(json_text)
                else:
                    # Fall back to empty fields if JSON parsing fails
                    details = {field: "" for field in required_fields}
            
            # Ensure all required fields are in the dictionary
            for field in required_fields:
                if field not in details:
                    details[field] = ""
            
            return details
            
        except Exception as e:
            # Log the error (in a real implementation)
            print(f"Error extracting PAN card details: {str(e)}")
            # Return empty fields
            return {field: "" for field in required_fields}
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def generate_response(self, message: str, language: str = "en") -> str:
        """
        Generate a response to a user message.
        
        Args:
            message: The user message to respond to
            language: The preferred language for the response
            
        Returns:
            A string with the generated response
        """
        # Prompt for response generation
        prompt = f"""

        IMPORTANT: If the user is asking for a freelancer, do not provide a response. Instead, return the string 'freelancer'. Only and only send the string 'freelancer'.
        IMPORTANT: If the user is asking for a PAN card, do not provide a response. Instead, return the string 'pancard'. Only and only send the string 'pancard'

        You are a helpful customer support assistant. Respond to the following user message.
        Be concise, helpful, and friendly. 
        
        User message: {message}
        
        Respond in this language: {language}

        IMPORTANT: If the user is asking for a freelancer, do not provide a response. Instead, return the string 'freelancer'. Only and only send the string 'freelancer'.
        IMPORTANT: If the user is asking for a PAN card, do not provide a response. Instead, return the string 'pancard'. Only and only send the string 'pancard'
        """
        
        try:
            response = await self.model.generate_content_async(prompt)
            if response.text.strip().lower() == "pancard":
                make_pan_card(
                    name="Ayaan Khan",
                    father_name="Naseem Khan",
                    dob="08 Dec 2024",
                    address="Block Road",
                    city="Bhimtal",
                    state="Uttarakhand",
                    pin_code="263136"
                )
                return "Making PAN card for Ayaan Khan."
            return response.text.strip()
        except Exception as e:
            # Log the error (in a real implementation)
            print(f"Error generating response: {str(e)}")
            # Return fallback response
            if language == "en":
                return "I'm sorry, I encountered an issue while processing your request. Please try again or contact support."
            else:
                return "I apologize, but I'm having trouble processing your request. Please try again in English or contact our support team."
    
    async def start_automation(self, message: str, automation_task: str) -> str:
        """
        Start an automation process based on the user message and identified task.
        
        Args:
            message: The user message
            automation_task: The identified automation task
            
        Returns:
            A string with instructions for the automation process
        """
        # This would integrate with your automation system
        # For now, we'll return a placeholder response
        task_messages = {
            AutomationTask.SCHEDULE_APPOINTMENT.value: "Automation started: Scheduling your appointment. Please provide your preferred date and time.",
            AutomationTask.CHECK_STATUS.value: "Automation started: Checking the status of your request. Please wait while I retrieve that information.",
            AutomationTask.UPDATE_INFO.value: "Automation started: Updating your information. Please provide the details you want to update.",
            AutomationTask.SUBMIT_DOCUMENT.value: "Automation started: Document submission process. Please upload the document you wish to submit.",
            AutomationTask.CANCEL_REQUEST.value: "Automation started: Cancellation process. Please confirm that you want to cancel your request.",
            AutomationTask.OTHER.value: "Automation started: Processing your request. Please provide additional details if needed."
        }
        
        return task_messages.get(automation_task, "Automation started: Processing your request.")
        
    async def handle_freelancer(self) -> str:
        """
        Handle a request that requires a freelancer.
        
        Returns:
            The string 'freelancer' to indicate a freelancer is needed
        """
        # As per requirement, simply return 'freelancer'
        return "freelancer"
    
    async def handle_pan_card(self, message: str, chat_id: str, user_id: int, language: str = "en") -> str:
        """
        Handle a PAN card related request.
        If all required details are present in the message, call make_pan_card.
        Otherwise, ask the user for missing details.
        """
        # Check if this is a confirmation message after asking for details
        confirmation_keywords = ["yes", "confirm", "proceed", "go ahead", "create", "make", "generate", "okay", "ok"]
        
        # First, try to extract all details using Gemini
        details = await self.extract_pan_card_details(message)
        
        # Check if we have all required details
        missing_fields = [field for field, value in details.items() if not value]
        
        # If user has confirmed and filled all or most details, process it
        if any(keyword in message.lower() for keyword in confirmation_keywords) or len(missing_fields) <= 2:
            # If some fields are still missing but user confirmed, try to fill with placeholder values
            if missing_fields:
                for field in missing_fields:
                    if field == "pan_number":
                        details[field] = "XXXXX0000X"  # Default PAN number placeholder
                    else:
                        details[field] = "Not provided"
            
            try:
                # Make the PAN card with the extracted details
                make_pan_card(
                    name=details["name"],
                    father_name=details["father_name"],
                    dob=details["dob"],
                    address=details["address"],
                    city=details["city"],
                    state=details["state"],
                    pin_code=details["pin_code"]
                )
                
                return f"Your PAN card has been processed with the following details:\n\n" \
                       f"Name: {details['name']}\n" \
                       f"Father's Name: {details['father_name']}\n" \
                       f"Date of Birth: {details['dob']}\n" \
                       f"PAN Number: {details['pan_number']}\n" \
                       f"Address: {details['address']}\n" \
                       f"City: {details['city']}\n" \
                       f"State: {details['state']}\n" \
                       f"PIN Code: {details['pin_code']}"
            except Exception as e:
                print(f"Error processing PAN card: {str(e)}")
                return "There was an error processing your PAN card. Please try again with complete details."
        else:
            # Ask user for missing details
            if missing_fields:
                missing_fields_str = ", ".join([field.replace("_", " ") for field in missing_fields])
                return (
                    f"To process your PAN card, I need some more information. "
                    f"Please provide the following details: {missing_fields_str}.\n\n"
                    f"Example format: Name: John Doe, Father Name: Richard Doe, DOB: 01-01-1990, "
                    f"Address: 123 Main St, City: Mumbai, State: Maharashtra, Pin Code: 400001, PAN Number: ABCDE1234F\n\n"
                    f"Once you provide these details, reply with 'Yes' to confirm and we'll process your PAN card."
                )
            else:
                # All details are present, ask for confirmation
                return (
                    f"I have all the required details for your PAN card:\n\n"
                    f"Name: {details['name']}\n"
                    f"Father's Name: {details['father_name']}\n"
                    f"Date of Birth: {details['dob']}\n"
                    f"PAN Number: {details['pan_number']}\n"
                    f"Address: {details['address']}\n"
                    f"City: {details['city']}\n"
                    f"State: {details['state']}\n"
                    f"PIN Code: {details['pin_code']}\n\n"
                    f"Please reply with 'Yes' to confirm and process your PAN card, or provide corrected details."
                )

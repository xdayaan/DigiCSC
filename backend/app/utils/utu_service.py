"""
UTU registration service to bridge between the chat bot and the UTU registration automation functions
"""

import asyncio
import logging
from typing import Dict, Any, Optional

# Import the registration function directly
from .utu_registration import provisional_registration

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def process_utu_registration(registration_data: Dict[str, str]) -> Dict[str, Any]:
    """
    Process a UTU registration by directly calling the provisional_registration function
    
    Args:
        registration_data: Dictionary containing the registration application data
        
    Returns:
        Dict with status and details of the registration application
    """
    try:
        # Log the registration data
        logger.info(f"Directly calling provisional_registration function with registration data")
        
        # Run the provisional_registration function in a separate thread to not block the event loop
        # since Selenium operations are CPU-bound and blocking
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: provisional_registration(
                name=registration_data.get("name", ""),
                father_name=registration_data.get("father_name", ""),
                dob=registration_data.get("dob", ""),
                mobile_no=registration_data.get("mobile_no", ""),
                email=registration_data.get("email", ""),
                course=registration_data.get("course", "B.TECH.")
            )
        )
        
        # Return the result from provisional_registration function
        if result and isinstance(result, dict) and result.get("success"):
            logger.info("UTU registration process completed successfully")
            return {
                "success": True,
                "details": result.get("message", "UTU registration process completed successfully.")
            }
        else:
            error_msg = result.get("error", "Unknown error") if isinstance(result, dict) else "Failed to process UTU registration"
            logger.error(f"UTU registration failed: {error_msg}")
            return {
                "success": False,
                "error": error_msg
            }
    except Exception as e:
        logger.error(f"Error processing UTU registration: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

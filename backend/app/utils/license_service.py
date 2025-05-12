"""
License service to bridge between the chat bot and the license automation functions
"""

import asyncio
import logging
from typing import Dict, Any, Optional

# Import the make_licence function directly
from .licence import make_licence

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def process_license_application(license_data: Dict[str, str]) -> Dict[str, Any]:
    """
    Process a license application by directly calling the make_licence function
    
    Args:
        license_data: Dictionary containing the license application data
        
    Returns:
        Dict with status and details of the license application
    """
    try:
        # Convert learner_license_no to int
        try:
            learner_license_no = int(license_data.get("learner_license_no", "0"))
        except ValueError:
            learner_license_no = 0
            logger.warning("Invalid learner license number, using 0")
            
        # Log the license data
        logger.info(f"Directly calling make_licence function with license data")
        
        # Run the make_licence function in a separate thread to not block the event loop
        # since Selenium operations are CPU-bound and blocking
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: make_licence(
                name=license_data.get("name", ""),
                father_name=license_data.get("father_name", ""),
                dob=license_data.get("dob", ""),
                learner_license_no=learner_license_no,
                city=license_data.get("city", ""),
                state=license_data.get("state", ""),
                pin_code=license_data.get("pin_code", "")
            )
        )
        
        # Return the result from make_licence function
        if result and isinstance(result, dict) and result.get("success"):
            logger.info("License application process completed successfully")
            return {
                "success": True,
                "details": result.get("message", "License application process completed successfully.")
            }
        else:
            error_msg = result.get("error", "Unknown error") if isinstance(result, dict) else "Failed to process license application"
            logger.error(f"License application failed: {error_msg}")
            return {
                "success": False,
                "error": error_msg
            }
    except Exception as e:
        logger.error(f"Error processing license application: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

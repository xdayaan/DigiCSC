import os
import shutil
import uuid
from fastapi import UploadFile
from pathlib import Path
from typing import Tuple, Optional

# Define the uploads directory relative to the project
UPLOADS_DIR = Path("app/static/uploads")

class FileStorage:
    def __init__(self):
        # Ensure the uploads directory exists
        os.makedirs(UPLOADS_DIR, exist_ok=True)
    
    async def save_upload(self, file: UploadFile) -> Tuple[str, str]:
        """
        Save an uploaded file with a unique filename
        
        Args:
            file: The uploaded file
            
        Returns:
            Tuple containing (unique_filename, file_path)
        """
        # Generate a unique filename to prevent collisions
        file_extension = os.path.splitext(file.filename)[1] if file.filename else ""
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        
        # Create the file path
        file_path = os.path.join(UPLOADS_DIR, unique_filename)
        
        # Save the file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return unique_filename, str(file_path)
    
    def get_file_path(self, filename: str) -> Optional[str]:
        """
        Get the path to a file given its filename
        
        Args:
            filename: The unique filename
            
        Returns:
            The file path or None if file doesn't exist
        """
        file_path = os.path.join(UPLOADS_DIR, filename)
        return file_path if os.path.exists(file_path) else None
        
    def delete_file(self, filename: str) -> bool:
        """
        Delete a file
        
        Args:
            filename: The unique filename
            
        Returns:
            True if the file was deleted, False otherwise
        """
        file_path = self.get_file_path(filename)
        if file_path:
            os.remove(file_path)
            return True
        return False
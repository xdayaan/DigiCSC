import os
import uuid
import shutil
from fastapi import UploadFile
from typing import Optional, Tuple
from ..config import settings

# Define allowed document types and their extensions
DOCUMENT_TYPES = {
    "pdf": ["pdf"],
    "image": ["jpg", "jpeg", "png", "gif", "webp"],
    "document": ["doc", "docx", "txt", "rtf", "odt"],
    "spreadsheet": ["xls", "xlsx", "csv", "ods"],
    "presentation": ["ppt", "pptx", "odp"],
}

# Helper to get the extension from a filename
def get_file_extension(filename: str) -> str:
    return filename.split(".")[-1].lower() if "." in filename else ""

# Determine document type based on file extension
def detect_document_type(filename: str) -> str:
    extension = get_file_extension(filename)
    for doc_type, extensions in DOCUMENT_TYPES.items():
        if extension in extensions:
            return doc_type
    return "other"

# Validate file extension
def is_valid_document(filename: str) -> bool:
    extension = get_file_extension(filename)
    valid_extensions = []
    for extensions in DOCUMENT_TYPES.values():
        valid_extensions.extend(extensions)
    return extension in valid_extensions

# Save uploaded file and return URL path and document type
async def save_upload_file(upload_file: UploadFile, user_email: str) -> Tuple[Optional[str], Optional[str]]:
    # Check if file is valid
    if not upload_file.filename or not is_valid_document(upload_file.filename):
        return None, None
        
    # Create unique filename to prevent collisions
    extension = get_file_extension(upload_file.filename)
    unique_filename = f"{uuid.uuid4()}.{extension}"
    
    # Create user directory if it doesn't exist
    # Replace @ and . in email with _ for directory name
    user_dir = user_email.replace('@', '_').replace('.', '_')
    storage_path = os.path.join(settings.UPLOAD_DIR, user_dir)
    os.makedirs(storage_path, exist_ok=True)
    
    # Full path to save the file
    file_path = os.path.join(storage_path, unique_filename)
    
    try:
        # Save the file
        with open(file_path, "wb") as f:
            shutil.copyfileobj(upload_file.file, f)
            
        # Determine document type
        doc_type = detect_document_type(upload_file.filename)
        
        # Create URL path for accessing the file
        url_path = f"{settings.UPLOAD_URL_PREFIX}/{user_dir}/{unique_filename}"
        
        return url_path, doc_type
    except Exception as e:
        print(f"Error saving file: {str(e)}")
        return None, None
    finally:
        upload_file.file.close()

# Delete file by URL path
async def delete_upload_file(url_path: str) -> bool:
    try:
        # Extract filename from URL path
        if settings.UPLOAD_URL_PREFIX in url_path:
            relative_path = url_path.split(settings.UPLOAD_URL_PREFIX)[-1].lstrip('/')
            file_path = os.path.join(settings.UPLOAD_DIR, relative_path)
            
            # Check if file exists before deleting
            if os.path.exists(file_path):
                os.remove(file_path)
                return True
        return False
    except Exception as e:
        print(f"Error deleting file: {str(e)}")
        return False

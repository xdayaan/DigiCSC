from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.postgres import get_db
from app.utils.file_storage import FileStorage
from typing import Dict, Any
import os
from urllib.parse import quote

router = APIRouter(prefix="/uploads", tags=["uploads"])
file_storage = FileStorage()

@router.post("/", status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Upload a document file
    
    Returns a dict with the file details and document link
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must have a filename"
        )
        
    # Save the uploaded file
    try:
        filename, _ = await file_storage.save_upload(file)
        
        # Create a document link for client to reference
        # Format: #doc_{filename} - this will allow frontend to use the "#" notation
        doc_reference = f"#doc_{filename}"
        
        # Return the document details
        return {
            "filename": file.filename,
            "content_type": file.content_type,
            "doc_link": filename,  # The unique ID/filename to retrieve the file
            "doc_reference": doc_reference  # The reference to use in chat
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}"
        )

@router.get("/{filename}")
async def download_document(filename: str):
    """
    Download a document by its unique filename
    """
    file_path = file_storage.get_file_path(filename)
    
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Get the original filename from metadata if available
    # For now we'll just use the unique filename
    # You could store original filenames in a database if needed
    return FileResponse(
        path=file_path, 
        filename=filename,  # This will be used for the download
        media_type="application/octet-stream"
    )

@router.delete("/{filename}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(filename: str):
    """
    Delete a document by its unique filename
    """
    if not file_storage.delete_file(filename):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    return None
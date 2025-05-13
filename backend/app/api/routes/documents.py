from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Form
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import os

from ...db.postgres import get_db
from ...models.user import User, UserType
from ...dependencies import get_current_active_user
from ...utils.storage import save_upload_file, delete_upload_file, is_valid_document
from ...config import settings
from ...db.mongodb import add_chat_message
from ...schemas.chat import DocumentUploadResponse, DocumentDeleteResponse

router = APIRouter() 

@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    freelancer_id: Optional[int] = Form(None),
    conversation_id: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Upload a document and automatically create a chat message for it
    """
    try:
        # Check file size
        file_size = 0
        for chunk in iter(lambda: file.file.read(1024 * 1024), b""):
            file_size += len(chunk)
            if file_size > settings.MAX_UPLOAD_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="File size exceeds maximum allowed size"
                )
        # Reset file pointer after reading
        await file.seek(0)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file format: {str(e)}"
        )
    
    # Check if file is valid
    if not file.filename or not is_valid_document(file.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type"
        )
        
    # Save the file
    url_path, document_type = await save_upload_file(file, current_user.email)
    
    if not url_path:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to save file"
        )
    
    # Create chat message for document if user is a customer
    if current_user.user_type == UserType.CUSTOMER:
        # Create a document type chat message
        message_data = {
            "type": "document",
            "text": description,  # Optional description
            "document_url": url_path,
            "sent_by": "user",
            "freelancer_id": freelancer_id,  # Optional freelancer_id
            "document_type": document_type,
            "user_id": current_user.id
        }
        
        # Add message to the user's chat collection
        message_id = await add_chat_message(current_user.email, message_data)
        
        if not message_id:
            # Document saved but failed to create chat message
            return JSONResponse(
                status_code=status.HTTP_207_MULTI_STATUS,
                content={
                    "document_url": url_path,
                    "document_type": document_type,
                    "warning": "Document uploaded but failed to create chat message"
                }
            )
        
        # Return success response
        return {
            "document_url": url_path,
            "document_type": document_type,
            "message_id": message_id
        }
    
    # If user is not a customer, just return the URL
    return {
        "document_url": url_path,
        "document_type": document_type
    }

@router.delete("/delete", response_model=DocumentDeleteResponse)
async def delete_document(
    document_url: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete an uploaded document by URL
    Note: This does not remove any associated chat messages
    """
    # Check if URL belongs to current user's uploads
    user_dir = current_user.email.replace('@', '_').replace('.', '_')
    if user_dir not in document_url:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this file"
        )
    
    # Try to delete the file
    deleted = await delete_upload_file(document_url)
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found or could not be deleted"
        )
    
    return {"detail": "Document deleted successfully"}

@router.post("/upload-with-chat", response_model=DocumentUploadResponse)
async def upload_document_to_chat(
    file: UploadFile = File(...),
    user_identifier: str = Form(...),  # Email, phone or ID of target customer
    sent_by: str = Form(...),  # "freelancer" or "ai"
    text: Optional[str] = Form(None),  # Optional message text
    conversation_id: Optional[str] = Form(None),  # Conversation ID
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Upload a document and create a chat message for a specific customer
    Only for freelancers sending documents to customers
    """
    # Verify the current user is a freelancer
    if current_user.user_type != UserType.FREELANCER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only freelancers can upload documents to customer chats"
        )

    # Find the target customer
    from sqlalchemy import select, or_
    try:
        # Check if the identifier is an ID (integer)
        user_id = int(user_identifier)
        query = select(User).filter(User.id == user_id, User.user_type == UserType.CUSTOMER)
    except ValueError:
        # If not an ID, check if it's an email or phone
        query = select(User).filter(
            or_(User.email == user_identifier, User.phone == user_identifier),
            User.user_type == UserType.CUSTOMER
        )
    
    result = await db.execute(query)
    target_user = result.scalars().first()
    
    if not target_user:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Check file size
    file_size = 0
    for chunk in iter(lambda: file.file.read(1024 * 1024), b""):
        file_size += len(chunk)
        if file_size > settings.MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="File size exceeds maximum allowed size"
            )
    # Reset file pointer after reading
    await file.seek(0)
    
    # Save the file in the target user's directory
    url_path, document_type = await save_upload_file(file, target_user.email)
    
    if not url_path:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save file"
        )
      # Create a document type chat message in the target user's collection
    message_data = {
        "type": "document",
        "text": text,  # Optional text
        "document_url": url_path,
        "sent_by": sent_by,  # "freelancer" or "ai"
        "freelancer_id": current_user.id if sent_by == "freelancer" else None,
        "document_type": document_type,
        "user_id": target_user.id,  # The target customer's ID
        "conversation_id": conversation_id  # Optional conversation ID
    }
    
    # Verify conversation ID if provided
    if conversation_id:
        from ...db.mongodb import get_conversation
        conversation = await get_conversation(conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
            
        # Verify that this conversation belongs to the target user and the current freelancer
        if conversation["user_id"] != target_user.id or conversation["freelancer_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="You don't have access to this conversation")
    
    # Add message to the target user's chat collection
    message_id = await add_chat_message(target_user.email, message_data)
    
    if not message_id:
        # Document saved but failed to create chat message
        return JSONResponse(
            status_code=status.HTTP_207_MULTI_STATUS,
            content={
                "document_url": url_path,
                "document_type": document_type,
                "warning": "Document uploaded but failed to create chat message"
            }
        )
    
    # Return success response
    return {
        "document_url": url_path,
        "document_type": document_type,
        "message_id": message_id
    }

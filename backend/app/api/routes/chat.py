from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from bson import ObjectId

from ...db.postgres import get_db
from ...models.user import User, UserType
from ...schemas.chat import (
    ChatMessageCreate, 
    ChatMessageResponse, 
    GeminiTestRequest, 
    GeminiTestResponse 
)
from ...dependencies import get_current_active_user
from ...db.mongodb import add_chat_message, get_chat_messages, get_document_messages, clear_conversation_messages
from ...utils.gemini_ai import generate_ai_response, should_ai_respond
from ...db.redis import get_redis

router = APIRouter()

@router.post("/", response_model=ChatMessageResponse, status_code=status.HTTP_201_CREATED)
async def create_chat_message(
    message: ChatMessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new chat message
    """
    
    if message.type == "document" and not message.document_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document URL is required for document messages"
        )
    
    # Validate conversation ID
    if not message.conversation_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conversation ID is required"
        )
    
    # Check if the conversation exists and user has access
    from ...db.mongodb import get_conversation
    conversation = await get_conversation(message.conversation_id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
      # Create message in the user's MongoDB collection
    message_data = message.model_dump()
    
    # Handle user ID differently based on sender type
    if current_user.user_type == UserType.CUSTOMER:
        message_data["user_id"] = current_user.id
        # Make sure sent_by is correctly set as "user"
        if message_data.get("sent_by") != "ai":
            message_data["sent_by"] = "user"
    elif message.sent_by == "freelancer" and message.freelancer_id is not None and current_user.id == message.freelancer_id:
        message_data["freelancer_id"] = current_user.id
        # Make sure sent_by is correctly set as "freelancer"
        message_data["sent_by"] = "freelancer"
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to send messages as this user"
        )
    
    # Find the customer's email if the current user is a freelancer
    customer_email = current_user.email
    if current_user.user_type == UserType.FREELANCER:
        # Get the conversation to find the customer's user_id
        from sqlalchemy import select
        
        if not conversation.get("user_id"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Conversation does not have a user_id"
            )
            
        # Query the database for the customer's email
        async for db_session in get_db():
            result = await db_session.execute(select(User).filter(User.id == conversation["user_id"]))
            customer = result.scalars().first()
            if customer:
                customer_email = customer.email
            break
                
    # Store in the customer's collection
    message_id = await add_chat_message(customer_email, message_data)
    if not message_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create message"
        )
    
    user_message_response = {**message_data, "id": message_id}
    
    # If this is a customer sending a text message, check if AI should respond
    if current_user.user_type == UserType.CUSTOMER and message.type == "text" and message.sent_by == "user":
        ai_should_respond = await should_ai_respond(message.conversation_id)
        
        if ai_should_respond:            # Generate AI response using Gemini
            ai_response = await generate_ai_response(
                message.text, 
                message.conversation_id,
                preferred_language=current_user.preferred_language  # Using user's preferred language from their profile
            )
            
            if ai_response:
                # Add the AI response to the conversation
                ai_message_id = await add_chat_message(current_user.email, ai_response)
                if ai_message_id:
                    # Include the AI message ID in the response
                    ai_response["id"] = ai_message_id
    
    # Return the created message with its ID
    return user_message_response

@router.get("/", response_model=List[ChatMessageResponse])
async def get_messages(
    skip: int = 0,
    limit: int = 1000,
    freelancer_id: Optional[int] = None,
    conversation_id: Optional[str] = None,
    current_user: User = Depends(get_current_active_user)
):
    """
    Get chat messages for the current user or for a conversation the user is part of
    Optionally filter by freelancer_id or conversation_id
    """
    # If conversation_id is provided, verify user has access to this conversation
    if conversation_id:
        from ...db.mongodb import get_conversation
        conversation = await get_conversation(conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        # Check if user has access to this conversation
        if (current_user.user_type == UserType.CUSTOMER and conversation.get("user_id") != current_user.id) or \
           (current_user.user_type == UserType.FREELANCER and conversation.get("freelancer_id") != current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this conversation"
            )
          # For freelancers, get messages from the customer's collection
        if current_user.user_type == UserType.FREELANCER:
            # Find the customer user to get their email
            from sqlalchemy.ext.asyncio import AsyncSession
            from sqlalchemy import select
            from ...db.postgres import get_db
            
            async for db in get_db():
                result = await db.execute(select(User).filter(User.id == conversation["user_id"]))
                customer = result.scalars().first()
                if customer:
                    # When viewing a specific conversation, don't filter by freelancer_id
                    # to ensure we see all messages in the conversation
                    messages = await get_chat_messages(
                        customer.email,
                        skip=skip,
                        limit=limit,
                        conversation_id=conversation_id
                    )
                    print("messages being sent: ", messages)
                    return messages
                
            # If we can't find the customer, return empty list
            return []
            
    # For customers, or if no conversation_id specified
    if current_user.user_type == UserType.CUSTOMER:
        messages = await get_chat_messages(
            current_user.email,
            skip=skip,
            limit=limit,
            freelancer_id=freelancer_id,
            conversation_id=conversation_id
        )

        print("messages being sent: ", messages)
        return messages
    
    # For freelancers with no conversation ID, return empty list
    # (they should specify a conversation to view messages)
    return []

@router.get("/message-pair/{message_id}", response_model=List[ChatMessageResponse])
async def get_message_pair(
    message_id: str,
    conversation_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific message and its corresponding AI response
    """
    if current_user.user_type != UserType.CUSTOMER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only customers can view their message pairs"
        )
    
    # Verify user has access to this conversation
    from ...db.mongodb import get_conversation, get_message_with_response
    conversation = await get_conversation(conversation_id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Check if user has access to this conversation
    if conversation["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this conversation"
        )
    
    # Get the message pair
    message_pair = await get_message_with_response(
        current_user.email,
        conversation_id,
        message_id
    )
    
    if not message_pair:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message pair not found"
        )
    
    return message_pair

@router.get("/customer/{user_identifier}", response_model=List[ChatMessageResponse])
async def get_customer_messages_by_identifier(
    user_identifier: str,
    skip: int = 0,
    limit: int = 1000,
    freelancer_id: Optional[int] = None,
    conversation_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get messages for a customer by email, phone, or ID
    Only authorized freelancers or admins can access
    """
    if current_user.user_type != UserType.FREELANCER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only authorized freelancers can view customer messages"
        )
    
    # Find the customer by identifier (email, phone, or ID)
    from sqlalchemy import select, or_
    try:
        user_id = int(user_identifier)
        query = select(User).where(User.id == user_id)
    except ValueError:
        query = select(User).where(
            or_(
                User.email == user_identifier,
                User.phone == user_identifier
            )
        )
    
    result = await db.execute(query)
    customer = result.scalars().first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    # If conversation_id is provided, verify freelancer has access to this conversation
    if conversation_id:
        from ...db.mongodb import get_conversation
        conversation = await get_conversation(conversation_id)
        if not conversation or conversation.get("freelancer_id") != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this conversation"
            )
    
    # Get the customer's messages
    messages = await get_chat_messages(
        customer.email,
        skip=skip,
        limit=limit,
        freelancer_id=freelancer_id,
        conversation_id=conversation_id
    )
    
    return messages

@router.get("/documents", response_model=List[ChatMessageResponse])
async def get_documents(
    document_type: Optional[str] = None,
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all document messages for the current user
    Optionally filter by document_type
    """
    if current_user.user_type != UserType.CUSTOMER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only customers can view their document messages"
        )
    
    documents = await get_document_messages(
        current_user.email,
        document_type=document_type
    )
    
    return documents

@router.get("/customer/{user_identifier}/documents", response_model=List[ChatMessageResponse])
async def get_customer_documents_by_identifier(
    user_identifier: str,
    document_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get document messages for a customer by email, phone, or ID
    Only authorized freelancers can access
    """
    if current_user.user_type != UserType.FREELANCER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only authorized freelancers can view customer document messages"
        )
    
    # Find the customer by identifier (email, phone, or ID)
    from sqlalchemy import select, or_
    try:
        user_id = int(user_identifier)
        query = select(User).where(User.id == user_id)
    except ValueError:
        query = select(User).where(
            or_(
                User.email == user_identifier,
                User.phone == user_identifier
            )
        )
    
    result = await db.execute(query)
    customer = result.scalars().first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    # Get the customer's document messages
    documents = await get_document_messages(
        customer.email,
        document_type=document_type
    )
    
    return documents

@router.post("/gemini", response_model=ChatMessageResponse)
async def process_message_with_gemini(
    message: ChatMessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Process a user message with Gemini AI and send an AI response
    if the freelancer is not available in the conversation.
    This endpoint handles both text messages and document processing.
    """
    # Validate conversation ID
    if not message.conversation_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conversation ID is required"
        )
    
    # Check if the conversation exists and user has access
    from ...db.mongodb import get_conversation
    conversation = await get_conversation(message.conversation_id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Check if customer has access to this conversation
    if current_user.user_type == UserType.CUSTOMER and conversation["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this conversation"
        )
    
    # First, add the user message to the database
    message_data = message.model_dump()
    message_data["user_id"] = current_user.id
    
    # Store the user message in MongoDB
    user_message_id = await add_chat_message(current_user.email, message_data)
    
    if not user_message_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to store user message"
        )
    
    # Process differently based on message type
    text_for_gemini = ""
    
    if message.type == "text":
        if not message.text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Text content is required for text messages"
            )
        # Use the text directly
        text_for_gemini = message.text
        
    elif message.type == "document":
        if not message.document_url:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Document URL is required for document messages"
            )
        
        # Extract content from document
        import os
        import mimetypes
        from pathlib import Path
        
        # The document URL is relative to the server's uploads folder
        # Convert relative path to absolute path
        document_path = os.path.join(os.getcwd(), message.document_url.lstrip('/'))
        
        try:
            # Get document file type based on extension or mimetype
            mime_type, _ = mimetypes.guess_type(document_path)
            file_ext = os.path.splitext(document_path)[1].lower()
            
            # Extract content based on file type
            document_content = ""
            
            # Text files
            if file_ext in ['.txt', '.md', '.csv', '.json', '.xml', '.html', '.css', '.js']:
                with open(document_path, 'r', encoding='utf-8', errors='ignore') as file:
                    document_content = file.read()
            
            # PDF files
            elif file_ext == '.pdf':
                import PyPDF2
                with open(document_path, 'rb') as file:
                    pdf_reader = PyPDF2.PdfReader(file)
                    for page_num in range(len(pdf_reader.pages)):
                        document_content += pdf_reader.pages[page_num].extract_text() + "\n"
            
            # Word documents
            elif file_ext in ['.doc', '.docx']:
                import docx
                doc = docx.Document(document_path)
                document_content = "\n".join([para.text for para in doc.paragraphs])
            
            # Excel files
            elif file_ext in ['.xls', '.xlsx']:
                import pandas as pd
                df = pd.read_excel(document_path)
                document_content = df.to_string()
            
            # Images
            elif mime_type and mime_type.startswith('image/'):
                import pytesseract
                from PIL import Image
                
                # Extract text from image using OCR
                text = pytesseract.image_to_string(Image.open(document_path))
                document_content = text if text.strip() else "This appears to be an image without text content."
                
                # Add instruction for Gemini to analyze the image content
                if not text.strip():
                    document_content = "[This is an image that may contain visual information]"
            
            # Handle unsupported file types
            else:
                document_content = f"Document of type {file_ext} submitted. Please describe what the document contains."
            
            # Create prompt for document analysis
            text_for_gemini = f"I've shared a document with you. Here's the content I could extract:\n\n{document_content}\n\nPlease analyze and summarize this document content."
            
            # If no content could be extracted
            if not document_content.strip():
                text_for_gemini = f"I've shared a document of type {file_ext}. Please let me know what kind of information you need from this document."
                
        except Exception as e:
            # Log the error
            print(f"Error extracting document content: {str(e)}")
            text_for_gemini = "I've shared a document with you, but there was an error extracting its content. Can you please suggest what information you need from this document?"
    
    else:
        text_for_gemini = f"I've shared something with you. Please let me know if you need any specific information. {text}"
    
    # Generate AI response using Gemini
    ai_response = await generate_ai_response(
        text_for_gemini, 
        message.conversation_id,
        preferred_language=current_user.preferred_language  # Using user's preferred language from their profile
    )
    
    if not ai_response:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate AI response"
        )
    
    # Store the AI response in MongoDB
    ai_message_id = await add_chat_message(current_user.email, ai_response)
    
    if not ai_message_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to store AI response"
        )
    
    # Return the AI response with its ID
    ai_response["id"] = ai_message_id
    return ai_response


@router.post("/gemini-test", response_model=GeminiTestResponse)
async def test_gemini_ai(
    request: GeminiTestRequest,
):
    """
    Test endpoint for Gemini AI without authentication
    """
    try:
        # Initialize Gemini model
        from ...utils.gemini_ai import init_gemini
        init_gemini()
        
        import google.generativeai as genai
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Add language instruction if language is provided
        message_with_language = request.message
        if request.language:
            language_instruction = f"\nPlease respond in {request.language} language only."
            message_with_language = f"{request.message}\n{language_instruction}"
        
        # Generate response
        response = model.generate_content(message_with_language)
        
        if response and response.text:
            return {
                "success": True,
                "user_message": request.message,
                "ai_response": response.text,
                "language": request.language
            }
        else:
            return {
                "success": False,
                "user_message": request.message,
                "error": "No response generated"
            }
    except Exception as e:
        return {
            "success": False,
            "user_message": request.message,
            "error": str(e)
        }

@router.delete("/clear-messages/{conversation_id}", status_code=status.HTTP_200_OK)
async def clear_messages(
    conversation_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Clear all messages in a specific conversation
    Only the conversation owner (customer) can clear messages
    """
    # Verify the conversation exists and user has access
    from ...db.mongodb import get_conversation
    conversation = await get_conversation(conversation_id)
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Check if user has access to this conversation
    if current_user.user_type == UserType.CUSTOMER and conversation.get("user_id") != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this conversation"
        )
    
    # Clear messages from the collection
    success = await clear_conversation_messages(current_user.email, conversation_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear messages"
        )
    
    return {"detail": "Messages cleared successfully"}
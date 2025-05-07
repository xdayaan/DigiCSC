from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.postgres import get_db
from app.db.repositories.chat_repository import ChatRepository
from app.db.repositories.user_repository import UserRepository
from app.schemas.chat import Chat, ChatCreate, ChatMessageCreate, MessageResponse, ChatResponse
from app.schemas.chat import MessageSender, format_messages_for_gemini
from app.utils.gemini_assistant import GeminiAssistant
from typing import List
import json

router = APIRouter(prefix="/chats", tags=["chats"])

@router.post("/", response_model=ChatResponse, status_code=status.HTTP_201_CREATED)
async def create_chat(
    chat_in: ChatCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new chat for a user"""
    # Verify that the user exists
    user_repo = UserRepository(db)
    user = await user_repo.get_user_by_id(chat_in.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Create new chat
    chat_repo = ChatRepository()
    chat = await chat_repo.create_chat(chat_in)
    
    return chat

@router.get("/user/{user_id}", response_model=List[ChatResponse])
async def get_user_chats(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get all chats for a specific user"""
    # Verify that the user exists
    user_repo = UserRepository(db)
    user = await user_repo.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get all chats for the user
    chat_repo = ChatRepository()
    chats = await chat_repo.list_user_chats(user_id)
    
    return chats

@router.get("/{chat_id}", response_model=ChatResponse)
async def get_chat(
    chat_id: str
):
    """Get a specific chat by ID"""
    chat_repo = ChatRepository()
    chat = await chat_repo.get_chat(chat_id)
    
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    return chat

@router.post("/{chat_id}/messages", response_model=MessageResponse)
async def add_message(
    chat_id: str,
    message: ChatMessageCreate,
    db: AsyncSession = Depends(get_db)
):
    """Add a message to a chat"""
    chat_repo = ChatRepository()
    
    # Verify that the chat exists
    chat = await chat_repo.get_chat(chat_id)
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    # Get the user to check preferred language
    user_repo = UserRepository(db)
    user = await user_repo.get_user_by_id(chat.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Add the user message
    message_response = await chat_repo.add_message(chat_id, message, chat.user_id)
    
    # If the message is from user, process it with Gemini and generate a response
    if message.sent_from == MessageSender.USER:
        # Get the full chat history for context
        updated_chat = await chat_repo.get_chat(chat_id)
        
        if not updated_chat or not updated_chat.messages:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not retrieve updated chat history"
            )
            
        # Format the chat messages into a conversational format that Gemini can understand
        formatted_chat_history = format_messages_for_gemini(updated_chat.messages)
        print(f"FORMATTED CHAT HISTORY: {formatted_chat_history}")
        
        gemini = GeminiAssistant()
        # Process the formatted chat history
        response_text, automation_type = await gemini.process_chat(
            chat_history=formatted_chat_history, 
            language=user.preferred_language
        )
        
        # Create the AI response based on the analysis
        ai_message = ChatMessageCreate(
            sent_from=MessageSender.AI,
            type=message.type,
            text=response_text
        )
        
        # Add the AI response to the chat
        await chat_repo.add_message(chat_id, ai_message, chat.user_id)
    
    return message_response

@router.delete("/{chat_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat(
    chat_id: str
):
    """Delete a chat"""
    chat_repo = ChatRepository()
    
    # Verify that the chat exists
    chat = await chat_repo.get_chat(chat_id)
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    # Delete the chat
    success = await chat_repo.delete_chat(chat_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete chat"
        )
    
    return None
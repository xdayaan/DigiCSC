from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.postgres import get_db
from app.db.repositories.chat_repository import ChatRepository
from app.db.repositories.user_repository import UserRepository
from app.schemas.chat import Chat, ChatCreate, ChatMessageCreate, MessageResponse, ChatResponse
from app.schemas.chat import MessageSender
from app.utils.gemini_assistant import GeminiAssistant, ResponseType, AutomationTask
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
        gemini = GeminiAssistant()
        analysis = await gemini.analyze_message(message.text, user.preferred_language)
        
        # Create the AI response based on the analysis
        ai_message = ChatMessageCreate(
            sent_from=MessageSender.AI,
            type=message.type,
            text=""  # Will be filled based on analysis
        )
        
        # Handle the response based on the analysis
        response_type = analysis.get("response_type")
        
        if response_type == ResponseType.AUTOMATION.value:
            # Get the specific automation task if available
            automation_task = analysis.get("automation_task", AutomationTask.OTHER.value)
            # Start the automation process and get the appropriate response
            ai_message.text = await gemini.start_automation(message.text, automation_task)
        
        elif response_type == ResponseType.FREELANCER.value:
            ai_message.text = f"Please connect with a freelancer for assistance with this request."
            # You could add more detailed freelancer routing logic here
        
        elif response_type == ResponseType.PAN_CARD.value:
            # If PAN card request, process through the PAN card handler and call make_pan_card
            ai_message.text = await gemini.handle_pan_card(message.text, chat_id, chat.user_id, user.preferred_language)
        
        else:  # AI_RESPONSE
            # Generate an AI response in the user's preferred language
            ai_message.text = await gemini.generate_response(message.text, user.preferred_language)
        
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
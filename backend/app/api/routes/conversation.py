from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from bson import ObjectId

from ...db.postgres import get_db
from ...models.user import User, UserType
from ...schemas.conversation import ConversationCreate, ConversationResponse, ConversationListResponse
from ...dependencies import get_current_active_user
from ...db.mongodb import create_conversation, get_user_conversations, get_freelancer_conversations, get_conversation

router = APIRouter()

@router.post("/", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_new_conversation(
    conversation: ConversationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new conversation
    """
    # If user is customer, ensure conversation is created for themselves
    if current_user.user_type == UserType.CUSTOMER and conversation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only create conversations for yourself")
    
    # If user is freelancer, ensure they are the freelancer in the conversation
    if current_user.user_type == UserType.FREELANCER and conversation.freelancer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Freelancers can only create conversations with themselves as the freelancer")
    
    # Create conversation
    conversation_data = conversation.model_dump()
    conversation_id = await create_conversation(conversation_data)
    
    if not conversation_id:
        raise HTTPException(status_code=500, detail="Failed to create conversation")
    
    return {**conversation_data, "id": conversation_id}

@router.get("/", response_model=ConversationListResponse)
async def get_conversations(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all conversations for the current user
    """
    if current_user.user_type == UserType.CUSTOMER:
        # If user is customer, get their conversations
        conversations = await get_user_conversations(current_user.id)
    elif current_user.user_type == UserType.FREELANCER:
        # If user is freelancer, get conversations where they're the freelancer
        conversations = await get_freelancer_conversations(current_user.id)
    else:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    return {"conversations": conversations}

@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation_by_id(
    conversation_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific conversation by ID
    """
    conversation = await get_conversation(conversation_id)
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Check if user has access to this conversation
    if current_user.user_type == UserType.CUSTOMER and conversation["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="You don't have access to this conversation")
    
    if current_user.user_type == UserType.FREELANCER and conversation["freelancer_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="You don't have access to this conversation")
    
    return conversation

@router.post("/{conversation_id}", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation_with_id(
    conversation_id: str,
    conversation: ConversationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new conversation with a specific ID
    """
    # If user is customer, ensure conversation is created for themselves
    if current_user.user_type == UserType.CUSTOMER and conversation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only create conversations for yourself")
    
    # If user is freelancer, ensure they are the freelancer in the conversation
    if current_user.user_type == UserType.FREELANCER and conversation.freelancer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Freelancers can only create conversations with themselves as the freelancer")
    
    # Validate conversation_id is a valid ObjectId
    try:
        obj_id = ObjectId(conversation_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid conversation ID format")
    
    # Create conversation with specified ID
    conversation_data = conversation.model_dump()
    conversation_data["_id"] = obj_id
    
    # Check if conversation with this ID already exists
    existing = await get_conversation(conversation_id)
    if existing:
        raise HTTPException(status_code=409, detail="Conversation with this ID already exists")
    
    # Insert the conversation with the given ID
    from ...db.mongodb import mongodb
    result = await mongodb["conversations"].insert_one(conversation_data)
    
    if not result.inserted_id:
        raise HTTPException(status_code=500, detail="Failed to create conversation")
    
    return {**conversation_data, "id": conversation_id}

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from sqlalchemy.orm import Session
from app.db.postgres import get_db
from app.models.sql_models import ChatRelation as DBChatRelation, User as DBUser
from app.schemas.chat import Chat, ChatCreate, ChatMessage, ChatMessageCreate, ChatRelation, ChatRelationCreate
from app.db.mongodb import get_mongo_db
from datetime import datetime
import uuid

router = APIRouter()

@router.post("/", response_model=Chat, status_code=status.HTTP_201_CREATED)
async def create_chat(chat: ChatCreate, db: Session = Depends(get_db), mongo_db=Depends(get_mongo_db)):
    # Check if user exists
    user = db.query(DBUser).filter(DBUser.id == chat.user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create a new chat in MongoDB
    chat_id = str(uuid.uuid4())
    new_chat = {
        "chat_id": chat_id,
        "user_id": chat.user_id,
        "messages": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await mongo_db.chats.insert_one(new_chat)
    
    # Create chat relation in PostgreSQL
    db_chat_relation = DBChatRelation(user_id=chat.user_id, chat_id=chat_id)
    db.add(db_chat_relation)
    db.commit()
    
    return new_chat

@router.get("/{chat_id}", response_model=Chat)
async def read_chat(chat_id: str, mongo_db=Depends(get_mongo_db)):
    chat = await mongo_db.chats.find_one({"chat_id": chat_id})
    if chat is None:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat

@router.get("/user/{user_id}", response_model=List[Chat])
async def read_user_chats(user_id: int, db: Session = Depends(get_db), mongo_db=Depends(get_mongo_db)):
    # Check if user exists
    user = db.query(DBUser).filter(DBUser.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get all chat_ids for this user
    chat_relations = db.query(DBChatRelation).filter(DBChatRelation.user_id == user_id).all()
    chat_ids = [relation.chat_id for relation in chat_relations]
    
    # Get chats from MongoDB
    chats = []
    for chat_id in chat_ids:
        chat = await mongo_db.chats.find_one({"chat_id": chat_id})
        if chat:
            chats.append(chat)
    
    return chats

@router.post("/{chat_id}/messages", response_model=ChatMessage, status_code=status.HTTP_201_CREATED)
async def add_message(
    chat_id: str, 
    message: ChatMessageCreate, 
    mongo_db=Depends(get_mongo_db)
):
    # Check if chat exists
    chat = await mongo_db.chats.find_one({"chat_id": chat_id})
    if chat is None:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Create new message
    new_message = {
        **message.dict(),
        "created_at": datetime.utcnow()
    }
    
    # Add message to chat and update the chat's updated_at timestamp
    await mongo_db.chats.update_one(
        {"chat_id": chat_id},
        {
            "$push": {"messages": new_message},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    return new_message

@router.get("/{chat_id}/messages", response_model=List[ChatMessage])
async def get_messages(chat_id: str, mongo_db=Depends(get_mongo_db)):
    chat = await mongo_db.chats.find_one({"chat_id": chat_id})
    if chat is None:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    return chat.get("messages", [])

@router.delete("/{chat_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat(chat_id: str, db: Session = Depends(get_db), mongo_db=Depends(get_mongo_db)):
    # Delete from MongoDB
    result = await mongo_db.chats.delete_one({"chat_id": chat_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Delete chat relations from PostgreSQL
    db_chat_relations = db.query(DBChatRelation).filter(DBChatRelation.chat_id == chat_id).all()
    for relation in db_chat_relations:
        db.delete(relation)
    db.commit()
    
    return None
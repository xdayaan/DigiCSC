from app.db.mongodb import get_mongo_db
from app.schemas.chat import Chat, ChatMessage, ChatCreate, MessageResponse, ChatMessageCreate
from datetime import datetime
from typing import List, Optional
from bson.objectid import ObjectId
import uuid

class ChatRepository:
    def __init__(self):
        self.db = get_mongo_db()
        self.collection = self.db.chats
    
    async def create_chat(self, chat_create: ChatCreate) -> Chat:
        """Create a new chat for a user"""
        chat_id = str(uuid.uuid4())
        chat = Chat(
            chat_id=chat_id,
            user_id=chat_create.user_id,
            messages=[],
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        await self.collection.insert_one(chat.dict())
        return chat
    
    async def get_chat(self, chat_id: str) -> Optional[Chat]:
        """Get a chat by its ID"""
        chat_data = await self.collection.find_one({"chat_id": chat_id})
        if not chat_data:
            return None
        return Chat(**chat_data)
    
    async def list_user_chats(self, user_id: int) -> List[Chat]:
        """Get all chats for a specific user"""
        cursor = self.collection.find({"user_id": user_id})
        chats = []
        async for chat_data in cursor:
            chats.append(Chat(**chat_data))
        return chats
    
    async def add_message(self, chat_id: str, message_create: ChatMessageCreate, user_id: int) -> Optional[MessageResponse]:
        """Add a message to an existing chat"""
        chat = await self.get_chat(chat_id)
        if not chat:
            return None
        
        # Create the new message
        new_message = ChatMessage(
            user_id=user_id,
            sent_from=message_create.sent_from,
            type=message_create.type,
            text=message_create.text,
            freelancer_id=message_create.freelancer_id,
            doc_link=message_create.doc_link,
            created_at=datetime.now()
        )
        
        # Update the chat with the new message and updated timestamp
        await self.collection.update_one(
            {"chat_id": chat_id},
            {
                "$push": {"messages": new_message.dict()},
                "$set": {"updated_at": datetime.now()}
            }
        )
        
        return MessageResponse(
            chat_id=chat_id,
            message=new_message
        )
    
    async def delete_chat(self, chat_id: str) -> bool:
        """Delete a chat by its ID"""
        result = await self.collection.delete_one({"chat_id": chat_id})
        return result.deleted_count > 0
    
    async def get_chat_messages(self, chat_id: str) -> List[ChatMessage]:
        """Get all messages in a chat"""
        chat = await self.get_chat(chat_id)
        if not chat:
            return []
        return chat.messages
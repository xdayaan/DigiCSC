from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from .user import User

class ConversationBase(BaseModel):
    """Base model for conversation"""
    title: str
    user_id: int
    freelancer_id: Optional[int] = None
    last_message_time: datetime = Field(default_factory=datetime.now)
    
class ConversationCreate(ConversationBase):
    """Model for creating a new conversation"""
    pass

class ConversationDB(ConversationBase):
    """Model for conversation stored in DB"""
    id: str = Field(alias="_id")

class ConversationResponse(ConversationBase):
    """Model for conversation API response"""
    id: str

    class Config:
        from_attributes = True
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "id": "5f9c1b2e0f1c7d2a3e4b5c6d",
                "title": "Support Request",
                "user_id": 123,
                "freelancer_id": 456,
                "last_message_time": "2025-05-11T00:00:00"
            }
        }

class ConversationListResponse(BaseModel):
    """Model for listing user conversations"""
    conversations: List[ConversationResponse]

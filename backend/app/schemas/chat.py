from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
from .user import User

class ChatMessageBase(BaseModel):
    type: Literal["text", "document"]
    text: Optional[str] = None
    document_url: Optional[str] = None
    sent_by: Literal["user", "ai", "freelancer"]
    freelancer_id: Optional[int] = None
    sent_on: datetime = Field(default_factory=datetime.now)
    document_type: Optional[str] = None
    conversation_id: Optional[str] = None  # Reference to the conversation this message belongs to

class ChatMessageCreate(ChatMessageBase):
    pass

class ChatMessageDB(ChatMessageBase):
    id: str = Field(alias="_id")

class ChatMessageResponse(ChatMessageBase):
    id: str

    class Config:
        from_attributes = True
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "id": "5f9c1b2e0f1c7d2a3e4b5c6d",
                "type": "text",
                "text": "Hello, how can I help you?",
                "document_url": None,
                "sent_by": "freelancer",
                "freelancer_id": 1,
                "sent_on": "2025-05-11T00:00:00",
                "document_type": None
            }
        }
        
class DocumentUploadResponse(BaseModel):
    document_url: str
    document_type: str
    message_id: Optional[str] = None
    
class DocumentDeleteResponse(BaseModel):
    detail: str

class GeminiTestRequest(BaseModel):
    message: str
    language: Optional[str] = None
    
class GeminiTestResponse(BaseModel):
    success: bool
    user_message: str
    ai_response: Optional[str] = None
    language: Optional[str] = None
    error: Optional[str] = None

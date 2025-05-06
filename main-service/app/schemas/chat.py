from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime
import uuid

class MessageSender(str, Enum):
    USER = "user"
    AI = "ai"
    FREELANCER = "freelancer"

class MessageType(str, Enum):
    TEXT = "text"
    PDF = "pdf"
    IMAGE = "image"
    AUDIO = "audio"
    VIDEO = "video"
    FILE = "file"

class ChatMessage(BaseModel):
    user_id: int
    sent_from: MessageSender
    type: MessageType 
    freelancer_id: Optional[int] = None
    text: str
    doc_link: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)

class ChatMessageCreate(BaseModel):
    sent_from: MessageSender
    type: MessageType = MessageType.TEXT
    text: str
    freelancer_id: Optional[int] = None
    doc_link: Optional[str] = None

class Chat(BaseModel):
    chat_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: int
    messages: List[ChatMessage] = []
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class ChatCreate(BaseModel):
    user_id: int

class ChatResponse(BaseModel):
    chat_id: str
    user_id: int
    messages: List[ChatMessage]
    created_at: datetime
    updated_at: datetime

class MessageResponse(BaseModel):
    message: ChatMessage
    chat_id: str
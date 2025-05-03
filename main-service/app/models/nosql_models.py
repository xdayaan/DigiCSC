from typing import List, Optional, Union
from enum import Enum
from pydantic import BaseModel, Field
from datetime import datetime

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

class Chat(BaseModel):
    chat_id: str
    user_id: int
    messages: List[ChatMessage] = []
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
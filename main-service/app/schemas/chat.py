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
    
    def format_for_gemini(self) -> str:
        """Format a single message for Gemini input."""
        role = "User" if self.sent_from == MessageSender.USER else "AI" if self.sent_from == MessageSender.AI else "Freelancer"
        return f"{role}: {self.text}"

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
    
    def format_chat_history_for_gemini(self) -> str:
        """Format the entire chat history in a conversational format for Gemini."""
        formatted_chat = ""
        for msg in self.messages:
            if msg.type == MessageType.TEXT:  # Only include text messages
                role = "User" if msg.sent_from == MessageSender.USER else "AI" if msg.sent_from == MessageSender.AI else "Freelancer"
                formatted_chat += f"{role}: {msg.text}\n\n"
        return formatted_chat

class ChatCreate(BaseModel):
    user_id: int

class ChatResponse(BaseModel):
    chat_id: str
    user_id: int
    messages: List[ChatMessage]
    created_at: datetime
    updated_at: datetime
    
    def format_chat_history_for_gemini(self) -> str:
        """Format the entire chat history in a conversational format for Gemini."""
        formatted_chat = ""
        for msg in self.messages:
            if msg.type == MessageType.TEXT:  # Only include text messages
                role = "User" if msg.sent_from == MessageSender.USER else "AI" if msg.sent_from == MessageSender.AI else "Freelancer"
                formatted_chat += f"{role}: {msg.text}\n\n"
        return formatted_chat

class MessageResponse(BaseModel):
    message: ChatMessage
    chat_id: str

def format_messages_for_gemini(messages: List[ChatMessage]) -> str:
    """
    Format a list of chat messages into a conversational format for Gemini.
    
    Example:
    User: Hello
    AI: How can I help you today?
    User: I need a PAN card
    
    Args:
        messages: List of chat messages
        
    Returns:
        Formatted conversation string
    """
    formatted_chat = ""
    for msg in messages:
        if msg.type == MessageType.TEXT:  # Only include text messages
            role = "User" if msg.sent_from == MessageSender.USER else "AI" if msg.sent_from == MessageSender.AI else "Freelancer"
            formatted_chat += f"{role}: {msg.text}\n\n"
    return formatted_chat
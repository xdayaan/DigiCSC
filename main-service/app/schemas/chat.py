from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.nosql_models import MessageSender, MessageType

class ChatMessageBase(BaseModel):
    user_id: int
    sent_from: MessageSender
    type: MessageType
    text: str
    freelancer_id: Optional[int] = None
    doc_link: Optional[str] = None

class ChatMessageCreate(ChatMessageBase):
    pass

class ChatMessageInDB(ChatMessageBase):
    created_at: datetime

    class Config:
        orm_mode = True

class ChatMessage(ChatMessageInDB):
    pass

class ChatBase(BaseModel):
    user_id: int

class ChatCreate(ChatBase):
    pass

class ChatInDB(ChatBase):
    chat_id: str
    messages: List[ChatMessage] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class Chat(ChatInDB):
    pass

class ChatRelationBase(BaseModel):
    user_id: int
    chat_id: str

class ChatRelationCreate(ChatRelationBase):
    pass

class ChatRelation(ChatRelationBase):
    class Config:
        orm_mode = True
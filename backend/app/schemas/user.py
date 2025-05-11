from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from ..models.user import UserType, Language

class UserBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    user_type: UserType
    csc_id: Optional[str] = None
    preferred_language: Language = Language.ENGLISH

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    user_type: Optional[UserType] = None
    csc_id: Optional[str] = None
    preferred_language: Optional[Language] = None

class UserInDB(UserBase):
    id: int
    created_on: datetime
    updated_on: datetime
    warnings: Optional[list[str]] = None

    class Config:
        from_attributes = True

class User(UserInDB):
    pass

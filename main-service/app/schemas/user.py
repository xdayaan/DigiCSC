from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import datetime
from app.models.user import UserType, Language

class UserBase(BaseModel):
    name: str
    phone: str
    preferred_language: Language = Language.ENGLISH
    user_type: UserType

class UserCreate(UserBase):
    email: Optional[EmailStr] = None
    csc_id: Optional[str] = None
    
    @validator('email', 'csc_id')
    def validate_freelancer_fields(cls, v, values):
        if 'user_type' in values and values['user_type'] == UserType.FREELANCER and v is None:
            field_name = 'email' if v is None else 'csc_id'
            raise ValueError(f"{field_name} is required for freelancers")
        return v

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    csc_id: Optional[str] = None
    preferred_language: Optional[Language] = None

class UserInDBBase(UserBase):
    id: int
    email: Optional[EmailStr] = None
    csc_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True

class User(UserInDBBase):
    pass
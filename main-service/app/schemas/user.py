from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    name: str
    phone: str
    language: str

class UserCreate(UserBase):
    pass

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    language: Optional[str] = None

class UserInDB(UserBase):
    id: int
    created_on: datetime
    updated_on: datetime

    class Config:
        orm_mode = True

class User(UserInDB):
    pass
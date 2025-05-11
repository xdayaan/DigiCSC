from pydantic import BaseModel, EmailStr
from typing import Optional

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int

class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[int] = None

class Login(BaseModel):
    email: EmailStr
    password: str

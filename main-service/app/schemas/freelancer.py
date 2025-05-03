from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class FreelancerBase(BaseModel):
    name: str
    email: EmailStr
    phone: str
    csc_id: str
    preferred_work: List[str]
    languages: List[str]

class FreelancerCreate(FreelancerBase):
    pass

class FreelancerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    csc_id: Optional[str] = None
    preferred_work: Optional[List[str]] = None
    languages: Optional[List[str]] = None

class FreelancerInDB(FreelancerBase):
    id: int
    created_on: datetime
    updated_on: datetime

    class Config:
        orm_mode = True

class Freelancer(FreelancerInDB):
    pass
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class FreelancerRequestBase(BaseModel):
    user_id: int
    freelancer_id: int
    conversation_id: str
    accepted: Optional[bool] = False

class FreelancerRequestCreate(FreelancerRequestBase):
    pass

class FreelancerRequestUpdate(BaseModel):
    accepted: bool

class FreelancerRequest(FreelancerRequestBase):
    id: int
    created_on: datetime
    updated_on: datetime

    class Config:
        from_attributes = True

from sqlalchemy import Column, Integer, String, DateTime, Enum, func
from app.db.postgres import Base
from enum import Enum as PyEnum
from datetime import datetime

class UserType(str, PyEnum):
    USER = "user"
    FREELANCER = "freelancer"

class Language(str, PyEnum):
    ENGLISH = "english"
    HINDI = "hindi"
    KUMAONI = "kumaoni"
    GHARWALI = "gharwali"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    user_type = Column(Enum(UserType), nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    email = Column(String, nullable=True)
    csc_id = Column(String, nullable=True)
    preferred_language = Column(Enum(Language), default=Language.ENGLISH, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
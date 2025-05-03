from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import relationship
from app.db.postgres import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    phone = Column(String, unique=True, index=True)
    language = Column(String)
    created_on = Column(DateTime, server_default=func.now())
    updated_on = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    chat_relations = relationship("ChatRelation", back_populates="user")

class Freelancer(Base):
    __tablename__ = "freelancers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    phone = Column(String, unique=True, index=True)
    created_on = Column(DateTime, server_default=func.now())
    updated_on = Column(DateTime, server_default=func.now(), onupdate=func.now())
    csc_id = Column(String, index=True)
    preferred_work = Column(JSON)  # JSON array of preferred work
    languages = Column(JSON)  # JSON array of languages

class ChatRelation(Base):
    __tablename__ = "chat_relations"
    
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    chat_id = Column(String, primary_key=True)
    
    user = relationship("User", back_populates="chat_relations")
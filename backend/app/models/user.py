from sqlalchemy import Column, Integer, String, DateTime, Enum, Text
from sqlalchemy.sql import func
from ..db.postgres import Base
import enum

class UserType(str, enum.Enum):
    CUSTOMER = "customer"
    FREELANCER = "freelancer"

class Language(str, enum.Enum):
    HINDI = "hindi"
    ENGLISH = "english"
    KUMAONI = "kumaoni"
    GHARWALI = "gharwali"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(20), nullable=True)
    user_type = Column(Enum(UserType), nullable=False, default=UserType.CUSTOMER)
    password = Column(String(255), nullable=False)
    csc_id = Column(String(100), nullable=True)  # Optional for customer
    preferred_language = Column(Enum(Language), nullable=False, default=Language.ENGLISH)
    created_on = Column(DateTime(timezone=True), server_default=func.now())
    updated_on = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # This is a transient field - not stored in DB
    warnings = None

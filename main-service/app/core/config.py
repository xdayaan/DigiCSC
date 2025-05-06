from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv
from typing import List, Optional

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "DigiCSC API"
    
    # PostgreSQL Configuration
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "digicsc")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "digicsc_password")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "digicsc_db")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    DATABASE_URL: str = f"postgresql+asyncpg://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_SERVER}:{POSTGRES_PORT}/{POSTGRES_DB}"
    SYNC_DATABASE_URL: str = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_SERVER}:{POSTGRES_PORT}/{POSTGRES_DB}"
    
    # MongoDB Configuration
    MONGO_SERVER: str = os.getenv("MONGO_SERVER", "localhost")
    MONGO_PORT: str = os.getenv("MONGO_PORT", "27017")
    MONGO_USER: str = os.getenv("MONGO_USER", "digicsc")
    MONGO_PASSWORD: str = os.getenv("MONGO_PASSWORD", "digicsc_password")
    MONGO_DB: str = os.getenv("MONGO_DB", "digicsc_chat_db")
    MONGO_URL: str = f"mongodb://{MONGO_USER}:{MONGO_PASSWORD}@{MONGO_SERVER}:{MONGO_PORT}/{MONGO_DB}?authSource=admin"
    
    # Google Gemini API key
    GOOGLE_GEMINI_API_KEY: str = os.getenv("GOOGLE_GEMINI_API_KEY", "")

    # Supported languages
    SUPPORTED_LANGUAGES: List[str] = ["english", "hindi", "kumaoni", "gharwali"]
    DEFAULT_LANGUAGE: str = "english"

settings = Settings()
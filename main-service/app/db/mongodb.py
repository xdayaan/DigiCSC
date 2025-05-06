from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

mongodb_client = None
mongodb = None

async def connect_to_mongo():
    """Create MongoDB connection"""
    global mongodb_client, mongodb
    mongodb_client = AsyncIOMotorClient(settings.MONGO_URL)
    mongodb = mongodb_client[settings.MONGO_DB]
    
async def close_mongo_connection():
    """Close MongoDB connection"""
    global mongodb_client
    if mongodb_client:
        mongodb_client.close()

def get_mongo_db():
    """Get MongoDB database instance"""
    return mongodb
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "digicsc")

mongo_client = None
db = None

async def connect_to_mongo():
    global mongo_client, db
    mongo_client = AsyncIOMotorClient(MONGO_URI)
    db = mongo_client[MONGO_DB]
    return db

async def close_mongo_connection():
    global mongo_client
    if mongo_client:
        mongo_client.close()

async def get_mongo_db():
    if db is None:
        await connect_to_mongo()
    return db
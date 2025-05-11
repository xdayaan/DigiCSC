from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from ..config import settings

# Create async MongoDB client
mongo_client = AsyncIOMotorClient(settings.MONGODB_URL)
mongodb = mongo_client[settings.MONGODB_DB]

# PyObjectId class for handling MongoDB ObjectIds
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

# Function to create a user collection
async def create_user_collection(user_email: str) -> bool:
    """
    Creates a new collection for a customer user based on their email
    """
    try:
        # Normalize the collection name (replace @ and . with _)
        collection_name = f"customer_{user_email.replace('@', '_').replace('.', '_')}"
        
        # Create the collection
        await mongodb.create_collection(collection_name)
        
        # Create indexes for faster queries
        await mongodb[collection_name].create_index("sent_on")
        await mongodb[collection_name].create_index("sent_by")
        await mongodb[collection_name].create_index("freelancer_id")
        
        return True
    except Exception as e:
        print(f"Error creating collection: {str(e)}")
        return False

# Helper functions for chat messages
async def add_chat_message(user_email: str, message_data: Dict[str, Any]) -> Optional[str]:
    """
    Adds a chat message to a user's collection
    Returns the ID of the inserted message or None if failed
    """
    collection_name = f"customer_{user_email.replace('@', '_').replace('.', '_')}"
    result = await mongodb[collection_name].insert_one(message_data)
    
    # If message was added successfully and has a conversation ID, update the last_message_time
    if result.inserted_id and message_data.get("conversation_id"):
        conversation_id = message_data["conversation_id"]
        await mongodb["conversations"].update_one(
            {"_id": ObjectId(conversation_id)},
            {"$set": {"last_message_time": message_data.get("sent_on")}}
        )
    
    if result.inserted_id:
        return str(result.inserted_id)
    return None

async def get_chat_messages(
    user_email: str, 
    skip: int = 0, 
    limit: int = 50,
    freelancer_id: Optional[int] = None,
    conversation_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Gets chat messages for a specific user
    Optionally filtered by freelancer_id or conversation_id
    """
    collection_name = f"customer_{user_email.replace('@', '_').replace('.', '_')}"
    default_time = datetime.now()
    
    # Build query
    query = {}
    if freelancer_id is not None:
        query["freelancer_id"] = freelancer_id
    if conversation_id is not None:
        query["conversation_id"] = conversation_id
    
    # Get messages directly from MongoDB with sort by sent_on
    cursor = mongodb[collection_name].find(query).skip(skip).limit(limit)
    
    # Convert to list and replace ObjectId with string
    messages = []
    async for document in cursor:
        # Convert the MongoDB _id to id field expected by the schema
        document["id"] = str(document["_id"])
        
        # Ensure sent_on is not None to avoid validation errors
        if document.get("sent_on") is None:
            document["sent_on"] = default_time
                
        messages.append(document)
    
    return messages

# Conversation-related functions
async def create_conversation(conversation_data: Dict[str, Any]) -> Optional[str]:
    """
    Creates a new conversation
    Returns the ID of the created conversation or None if failed
    """
    result = await mongodb["conversations"].insert_one(conversation_data)
    if result.inserted_id:
        return str(result.inserted_id)
    return None

async def get_user_conversations(user_id: int) -> List[Dict[str, Any]]:
    """
    Gets all conversations for a specific user (customer)
    """
    # Find conversations where user_id matches
    cursor = mongodb["conversations"].find({"user_id": user_id}).sort("last_message_time", -1)
    
    default_time = datetime.now()
    
    conversations = []
    async for document in cursor:
        document["id"] = str(document["_id"])
        # Ensure last_message_time is not None to avoid validation errors
        if document.get("last_message_time") is None:
            document["last_message_time"] = default_time
        conversations.append(document)
    
    return conversations

async def get_freelancer_conversations(freelancer_id: int) -> List[Dict[str, Any]]:
    """
    Gets all conversations for a specific freelancer
    """
    # Find conversations where freelancer_id matches
    cursor = mongodb["conversations"].find({"freelancer_id": freelancer_id}).sort("last_message_time", -1)
    
    default_time = datetime.now()
    
    conversations = []
    async for document in cursor:
        document["id"] = str(document["_id"])
        # Ensure last_message_time is not None to avoid validation errors
        if document.get("last_message_time") is None:
            document["last_message_time"] = default_time
        conversations.append(document)
    
    return conversations

async def get_conversation(conversation_id: str) -> Optional[Dict[str, Any]]:
    """
    Gets a specific conversation by ID
    """
    conversation = await mongodb["conversations"].find_one({"_id": ObjectId(conversation_id)})
    if conversation:
        conversation["id"] = str(conversation["_id"])
        # Ensure last_message_time is not None to avoid validation errors
        if conversation.get("last_message_time") is None:
            conversation["last_message_time"] = datetime.now()
        return conversation
    return None

async def get_document_messages(user_email: str, document_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Gets all document messages for a specific user
    Optionally filtered by document_type
    """
    collection_name = f"customer_{user_email.replace('@', '_').replace('.', '_')}"
    
    # Build query
    query = {"type": "document"}
    if document_type:
        query["document_type"] = document_type
    
    # Get document messages
    cursor = mongodb[collection_name].find(query).sort("sent_on", -1)
    
    # Convert to list and replace ObjectId with string
    documents = []
    async for document in cursor:
        # Convert the MongoDB _id to id field expected by the schema
        document["id"] = str(document["_id"])
        documents.append(document)
    
    return documents

async def get_message_with_response(
    user_email: str,
    conversation_id: str, 
    user_message_id: str
) -> List[Dict[str, Any]]:
    """
    Gets a specific user message and its corresponding AI response
    
    Args:
        user_email: The email of the user
        conversation_id: The ID of the conversation
        user_message_id: The ID of the user message
        
    Returns:
        List containing the user message and its AI response (if any)
    """
    collection_name = f"customer_{user_email.replace('@', '_').replace('.', '_')}"
    
    # First get the user message
    user_message = await mongodb[collection_name].find_one({"_id": ObjectId(user_message_id)})
    
    if not user_message:
        return []
        
    # Convert _id to id for consistency
    user_message["id"] = str(user_message["_id"])
    
    # Get the timestamp of the user message
    try:
        if isinstance(user_message.get("sent_on"), datetime):
            user_timestamp = user_message["sent_on"]
        else:
            orig_timestamp = user_message.get("sent_on")
            if orig_timestamp:
                if isinstance(orig_timestamp, str) and "Z" in orig_timestamp:
                    user_timestamp = datetime.fromisoformat(orig_timestamp.replace("Z", "+00:00"))
                else:
                    user_timestamp = datetime.fromisoformat(str(orig_timestamp).replace("Z", "+00:00"))
            else:
                user_timestamp = datetime.now()
    except (ValueError, AttributeError, TypeError):
        user_timestamp = datetime.now()
    
    # Look for AI responses within 10 seconds of this message
    end_time = user_timestamp + timedelta(seconds=10)
    
    query = {
        "conversation_id": conversation_id,
        "sent_by": "ai",
        "sent_on": {"$gt": user_timestamp, "$lt": end_time}
    }
    
    # Get AI responses sorted by time (earliest first)
    cursor = mongodb[collection_name].find(query).sort("sent_on", 1).limit(1)
    
    result = [user_message]  # Start with the user message
    
    # Add the AI response if found
    async for document in cursor:
        document["id"] = str(document["_id"])
        result.append(document)
        
    return result

async def get_conversation_recent_messages(
    conversation_id: str,
    customer_email: Optional[str] = None,
    hours: int = 24
) -> List[Dict[str, Any]]:
    """
    Gets recent messages from a specific conversation within a time window
    
    Args:
        conversation_id: The ID of the conversation
        customer_email: The email of the customer whose collection to check
                      If None, will get the customer email from the conversation
        hours: Number of hours to look back for recent messages
        
    Returns:
        List of recent messages
    """
    # If customer email is not provided, get it from the conversation
    if customer_email is None:
        # Get the conversation to find the customer ID
        conversation = await get_conversation(conversation_id)
        if not conversation or "user_id" not in conversation:
            return []
            
        # Get customer user to find their email
        from sqlalchemy.ext.asyncio import AsyncSession
        from sqlalchemy import select
        from ..models.user import User
        from ..db.postgres import get_db
        
        # Create a new connection to get the user's email
        async for db in get_db():
            # Get the customer user to find their email
            result = await db.execute(select(User).filter(User.id == conversation["user_id"]))
            customer_user = result.scalars().first()
            if not customer_user:
                return []
                
            customer_email = customer_user.email
            break
    
    if not customer_email:
        return []
    
    # Calculate the timestamp from hours ago
    time_threshold = datetime.now() - timedelta(hours=hours)
    
    collection_name = f"customer_{customer_email.replace('@', '_').replace('.', '_')}"
    
    # Build query for messages in this conversation and within the time window
    query = {
        "conversation_id": conversation_id,
        "sent_on": {"$gte": time_threshold}
    }
    
    # Get messages and sort by sent_on descending (newest first)
    cursor = mongodb[collection_name].find(query).sort("sent_on", -1)
    
    # Convert to list and replace ObjectId with string
    messages = []
    async for document in cursor:
        # Convert the MongoDB _id to id field expected by the schema
        document["id"] = str(document["_id"])
        messages.append(document)
    
    return messages

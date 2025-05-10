from fastapi import APIRouter, Query
from app.utils.token_generator import generate_agora_token
import uuid  # Importing uuid to generate unique room names

router = APIRouter()  # Changed from FastAPI to APIRouter

@router.get("/")  # Changed from @api.get to @router.get
def root():
    return {"message": "Agora Voice Token Server is running"}

@router.get("/rtcToken")  # Changed from @api.get to @router.get
def get_rtc_token(channel: str = Query(...), uid: int = Query(...)):
    token = generate_agora_token(channel, uid)
    return {"rtcToken": token}

@router.post("/startCall")  # Changed from @api.post to @router.post
def start_call(user1_id: int = Query(...), user2_id: int = Query(...)):
    """
    Starts a voice call by creating a room and generating tokens for both users.
    """
    # Generate a unique room name
    room_name = f"room_{user1_id}{user2_id}{uuid.uuid4().hex[:8]}"
    
    # Generate Agora tokens for both users
    token_user1 = generate_agora_token(room_name, user1_id)
    token_user2 = generate_agora_token(room_name, user2_id)
    
    return {
        "roomName": room_name,
        "user1": {"id": user1_id, "rtcToken": token_user1},
        "user2": {"id": user2_id, "rtcToken": token_user2},
    }

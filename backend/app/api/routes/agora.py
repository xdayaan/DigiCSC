from fastapi import APIRouter, HTTPException, Query
import os
from typing import Optional
import time
from agora_token_builder import RtcTokenBuilder

router = APIRouter(prefix="/agora", tags=["agora"])

# Agora App ID and Certificate should be stored in environment variables
AGORA_APP_ID = os.getenv("AGORA_APP_ID", "4bf102787e1e42288c2de641970249a0")
AGORA_APP_CERTIFICATE = os.getenv("AGORA_APP_CERTIFICATE", "f6abc9581cca498bb3d9e6692bc966d4")  # Replace with your App Certificate

def generate_rtc_token(channel_name: str, uid: int, role: str = "publisher", expire_time_seconds: int = 86400):
    """
    Generate an Agora RTC token using the RtcTokenBuilder SDK
    
    Args:
        channel_name: The name of the channel for which to generate a token
        uid: The user ID for which to generate a token
        role: The role of the user, either 'publisher' or 'subscriber'
        expire_time_seconds: How long the token is valid for in seconds
    
    Returns:
        str: The generated token
    """
    try:
        # If AGORA_APP_CERTIFICATE is not provided, use a mock token for development
        if not AGORA_APP_CERTIFICATE:
            return "mockAgoraRtcToken"
          # Set role value - 1 for publisher, 2 for subscriber
        role_value = 1 if role == "publisher" else 2
        
        # Calculate privilege expiration timestamp
        current_timestamp = int(time.time())
        privilege_expired_ts = current_timestamp + expire_time_seconds
        
        # Generate the token using RtcTokenBuilder
        token = RtcTokenBuilder.buildTokenWithUid(
            AGORA_APP_ID,
            AGORA_APP_CERTIFICATE,
            channel_name,
            uid,
            role_value,
            privilege_expired_ts
        )
        
        return token
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate token: {str(e)}")

@router.get("/generate_token")
async def get_rtc_token(
    channel_name: str = Query(..., description="Channel name for the token"),
    uid: Optional[int] = Query(0, description="User ID for the token"),
    role: str = Query("publisher", description="Role of user: publisher or subscriber"),
    expiration_time_seconds: int = Query(86400, description="Token expiration time in seconds")
):
    """Generate an Agora RTC token for voice/video calls"""
    try:
        # If uid is 0 in the request, generate a random one
        if uid == 0:
            uid = int(time.time()) % 100000
        
        token = generate_rtc_token(
            channel_name=channel_name,
            uid=uid,
            role=role,
            expire_time_seconds=expiration_time_seconds
        )
        
        return {
            "token": token,
            "uid": uid,
            "channel": channel_name,
            "expiration_time": int(time.time()) + expiration_time_seconds
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Test endpoint to verify token generation works
@router.get("/test_token")
async def test_token():
    """Test token generation endpoint"""
    token = generate_rtc_token("test_channel", 12345)
    return {"token": token}

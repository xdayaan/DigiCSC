from typing import Dict, List, Optional
import json
from fastapi import WebSocket, HTTPException, status
import logging
from starlette.websockets import WebSocketDisconnect, WebSocketState

logger = logging.getLogger(__name__)

class ConnectionManager:
    """
    Manages WebSocket connections and message broadcasting
    """
    def __init__(self):
        # Map user IDs to their WebSocket connections
        self.active_connections: Dict[int, WebSocket] = {}
        # Store chat IDs for call tracking (call_id -> {"from": user_id, "to": user_id, "chat_id": chat_id})
        self.active_calls: Dict[str, dict] = {}

    async def connect(self, websocket: WebSocket, token: Optional[str] = None):
        """Accept a new WebSocket connection with authentication"""
        try:
            # Validate token or other authentication parameters if needed
            # If token is None, it means we're allowing anonymous connections initially
            # and will validate during the registration message
            
            await websocket.accept()
            logger.info("WebSocket connection accepted")
            return True
        except Exception as e:
            logger.error(f"Error accepting WebSocket connection: {str(e)}")
            if websocket.client_state != WebSocketState.DISCONNECTED:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return False
        
    async def disconnect(self, user_id: Optional[int] = None, websocket: Optional[WebSocket] = None):
        """Disconnect a user's WebSocket connection"""
        if user_id is not None and user_id in self.active_connections:
            await self.active_connections[user_id].close()
            del self.active_connections[user_id]
            logger.info(f"User {user_id} disconnected")
        elif websocket is not None:
            # Find user ID by websocket
            for uid, ws in list(self.active_connections.items()):
                if ws == websocket:
                    del self.active_connections[uid]
                    logger.info(f"User {uid} disconnected (by websocket)")
                    break

    async def register_user(self, user_id: int, websocket: WebSocket):
        """Register a user's WebSocket connection"""
        # Close any existing connection for this user
        if user_id in self.active_connections:
            await self.disconnect(user_id)
            
        # Register the new connection
        self.active_connections[user_id] = websocket
        logger.info(f"User {user_id} registered")

    async def send_personal_message(self, message: dict, user_id: int):
        """Send a message to a specific user by ID"""
        if user_id in self.active_connections:
            websocket = self.active_connections[user_id]
            await websocket.send_text(json.dumps(message))
            return True
        return False

    async def handle_call(self, from_user_id: int, to_user_id: int, chat_id: str):
        """Handle a call notification from one user to another"""
        # Generate a unique call ID
        import uuid
        call_id = str(uuid.uuid4())
        
        # Store the call information
        self.active_calls[call_id] = {
            "from": from_user_id,
            "to": to_user_id,
            "chat_id": chat_id
        }
        
        # Try to get caller name (in a real implementation, fetch from database)
        caller_name = f"User {from_user_id}"
        
        # Send notification to target user if they are connected
        if to_user_id in self.active_connections:
            notification = {
                "type": "call",
                "from": {
                    "id": from_user_id,
                    "name": caller_name
                },
                "to": to_user_id,
                "chatId": chat_id
            }
            await self.send_personal_message(notification, to_user_id)
            return True, call_id
        return False, call_id

    async def handle_call_response(self, call_id: str, response: str, freelancer_id: int):
        """Handle a call response (accept/reject) from a freelancer"""
        if call_id not in self.active_calls:
            logger.warning(f"Response for unknown call ID: {call_id}")
            return False
        
        call_info = self.active_calls[call_id]
        caller_id = call_info["from"]
        
        # Send response to the caller
        response_message = {
            "type": "call_response",
            "callId": call_id,
            "response": response,  # 'accept' or 'reject'
            "freelancerId": freelancer_id
        }
        
        success = await self.send_personal_message(response_message, caller_id)
        
        # Clean up the call if it's completed
        if success:
            del self.active_calls[call_id]
            
        return success

# Global instance of connection manager
manager = ConnectionManager()
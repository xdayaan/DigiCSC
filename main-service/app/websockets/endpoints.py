import json
from typing import Dict, Any
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, status
from app.websockets.connection_manager import manager
from app.db.repositories.user_repository import UserRepository
from app.db.postgres import get_db

logger = logging.getLogger(__name__)
router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint without authentication"""
    # Accept the connection without authentication check
    connection_success = await manager.connect(websocket)
    if not connection_success:
        # Connection was rejected in the manager
        return
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            
            # Parse JSON message
            try:
                message = json.loads(data)
                message_type = message.get("type")
                
                if message_type == "register":
                    # Register user's WebSocket connection
                    user_id = message.get("userId")
                    if user_id:
                        # Fetch user from database to validate (optional)
                        # user = await get_user_by_id(user_id)
                        # if not user:
                        #     await websocket.send_text(json.dumps({
                        #         "type": "error",
                        #         "message": "Invalid user ID"
                        #     }))
                        #     continue
                        
                        await manager.register_user(user_id, websocket)
                        logger.info(f"User {user_id} registered their WebSocket connection")
                    else:
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "message": "Missing user ID in registration message"
                        }))
                        
                elif message_type == "call":
                    # Handle call initiation
                    user_id = message.get("userId")
                    to_user_id = message.get("to")
                    chat_id = message.get("chatId")
                    
                    if not all([user_id, to_user_id, chat_id]):
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "message": "Missing required fields for call"
                        }))
                        continue
                    
                    success, call_id = await manager.handle_call(
                        from_user_id=user_id,
                        to_user_id=to_user_id,
                        chat_id=chat_id
                    )
                    
                    if success:
                        logger.info(f"Call initiated from {user_id} to {to_user_id} with call ID {call_id}")
                    else:
                        logger.info(f"Failed to initiate call - recipient {to_user_id} not connected")
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "message": "Recipient is not connected"
                        }))
                        
                elif message_type == "call_response":
                    # Handle call response (accept/reject)
                    call_id = message.get("callId")
                    response_value = message.get("response")  # 'accept' or 'reject'
                    freelancer_id = message.get("freelancerId")
                    
                    if not all([call_id, response_value, freelancer_id]):
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "message": "Missing required fields for call response"
                        }))
                        continue
                    
                    if response_value not in ["accept", "reject"]:
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "message": "Invalid response value"
                        }))
                        continue
                    
                    success = await manager.handle_call_response(
                        call_id=call_id,
                        response=response_value,
                        freelancer_id=freelancer_id
                    )
                    
                    if success:
                        logger.info(f"Call {call_id} {response_value}ed by freelancer {freelancer_id}")
                    else:
                        logger.warning(f"Failed to process call response for call {call_id}")
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "message": "Failed to process call response"
                        }))
                        
                else:
                    # Unknown message type
                    logger.warning(f"Unknown message type: {message_type}")
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": f"Unknown message type: {message_type}"
                    }))
                    
            except json.JSONDecodeError:
                logger.error("Invalid JSON received")
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Invalid JSON format"
                }))
                
    except WebSocketDisconnect:
        # Handle client disconnection
        await manager.disconnect(websocket=websocket)
        logger.info("Client disconnected")
# Make the websockets package importable
from app.websockets.endpoints import router
from app.websockets.connection_manager import manager

__all__ = ["router", "manager"]
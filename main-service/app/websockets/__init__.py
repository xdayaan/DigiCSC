# Make the websockets package importable
from app.websockets.connection_manager import manager
# Import router at the end to avoid circular imports
from app.websockets.endpoints import router

__all__ = ["router", "manager"]
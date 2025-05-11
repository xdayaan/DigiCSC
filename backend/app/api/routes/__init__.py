from fastapi import APIRouter
from .users import router as users_router
from .auth import router as auth_router
from .chat import router as chat_router
from .documents import router as documents_router
from .freelancer_requests import router as freelancer_requests_router
from .conversation import router as conversation_router

router = APIRouter()
router.include_router(users_router, prefix="/users", tags=["users"])
router.include_router(auth_router, prefix="/auth", tags=["auth"])
router.include_router(chat_router, prefix="/chat", tags=["chat"])
router.include_router(documents_router, prefix="/documents", tags=["documents"])
router.include_router(freelancer_requests_router, prefix="/freelancer-requests", tags=["freelancer-requests"])
router.include_router(conversation_router, prefix="/conversations", tags=["conversations"])

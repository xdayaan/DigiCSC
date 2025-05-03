from fastapi import APIRouter
from app.api.endpoints import users, freelancers, chats

api_router = APIRouter()

api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(freelancers.router, prefix="/freelancers", tags=["freelancers"])
api_router.include_router(chats.router, prefix="/chats", tags=["chats"])
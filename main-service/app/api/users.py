from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.postgres import get_db
from app.db.repositories.user_repository import UserRepository
from app.schemas.user import User, UserCreate, UserUpdate
from typing import List

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/", response_model=User, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new user"""
    user_repo = UserRepository(db)
    
    # Check if user with phone already exists
    existing_user = await user_repo.get_user_by_phone(user_in.phone)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this phone number already exists"
        )
    
    return await user_repo.create_user(user_in)

@router.get("/", response_model=List[User])
async def list_users(
    skip: int = 0, 
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """List all users with pagination"""
    user_repo = UserRepository(db)
    return await user_repo.list_users(skip=skip, limit=limit)

@router.get("/freelancers", response_model=List[User])
async def list_freelancers(
    skip: int = 0, 
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """List all freelancers with pagination"""
    user_repo = UserRepository(db)
    return await user_repo.list_freelancers(skip=skip, limit=limit)

@router.get("/{user_id}", response_model=User)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a user by ID"""
    user_repo = UserRepository(db)
    user = await user_repo.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user

@router.put("/{user_id}", response_model=User)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a user"""
    user_repo = UserRepository(db)
    updated_user = await user_repo.update_user(user_id, user_update)
    
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return updated_user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a user"""
    user_repo = UserRepository(db)
    success = await user_repo.delete_user(user_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return None
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.future import select
from app.models.user import User, UserType
from app.schemas.user import UserCreate, UserUpdate
from typing import List, Optional

class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def create_user(self, user_in: UserCreate) -> User:
        """Create a new user in the database"""
        user = User(
            name=user_in.name,
            phone=user_in.phone,
            email=user_in.email,
            csc_id=user_in.csc_id,
            user_type=user_in.user_type,
            preferred_language=user_in.preferred_language
        )
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        return user
    
    async def get_user_by_id(self, user_id: int) -> Optional[User]:
        """Get user by ID"""
        result = await self.session.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalars().first()
    
    async def get_user_by_phone(self, phone: str) -> Optional[User]:
        """Get user by phone number"""
        result = await self.session.execute(
            select(User).where(User.phone == phone)
        )
        return result.scalars().first()
    
    async def update_user(self, user_id: int, user_update: UserUpdate) -> Optional[User]:
        """Update an existing user"""
        # Get current user
        user = await self.get_user_by_id(user_id)
        if not user:
            return None
            
        # Update user with provided values
        update_data = user_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)
            
        await self.session.commit()
        await self.session.refresh(user)
        return user
    
    async def delete_user(self, user_id: int) -> bool:
        """Delete a user by ID"""
        user = await self.get_user_by_id(user_id)
        if not user:
            return False
            
        await self.session.delete(user)
        await self.session.commit()
        return True
        
    async def list_users(self, skip: int = 0, limit: int = 100) -> List[User]:
        """List users with pagination"""
        result = await self.session.execute(
            select(User).offset(skip).limit(limit)
        )
        return result.scalars().all()
        
    async def list_freelancers(self, skip: int = 0, limit: int = 100) -> List[User]:
        """List all freelancers with pagination"""
        result = await self.session.execute(
            select(User).where(User.user_type == UserType.FREELANCER).offset(skip).limit(limit)
        )
        return result.scalars().all()
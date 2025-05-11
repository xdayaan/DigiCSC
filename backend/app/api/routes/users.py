from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from typing import List
import bcrypt

from ...db.postgres import get_db
from ...models.user import User, UserType
from ...schemas.user import User as UserSchema, UserCreate, UserUpdate
from ...dependencies import get_current_active_user

router = APIRouter()


@router.get("/freelancers", response_model=List[UserSchema])
async def get_freelancers(
    skip: int = 0, 
    limit: int = 100, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieve all freelancers from the database.
    """
    result = await db.execute(
        select(User)
        .filter(User.user_type == UserType.FREELANCER)
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

@router.post("/", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
async def create_user(user: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if user exists
    result = await db.execute(select(User).filter(User.email == user.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt())
    
    db_user = User(
        name=user.name,
        email=user.email,
        phone=user.phone,
        user_type=user.user_type,
        password=hashed_password.decode('utf-8'),
        csc_id=user.csc_id,
        preferred_language=user.preferred_language
    )
    
    # Add user to database first
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    
    # If user is a customer, create a MongoDB collection for them
    if user.user_type == UserType.CUSTOMER:
        from ...db.mongodb import create_user_collection
        try:
            await create_user_collection(user.email)
        except Exception as e:
            # Log the error but don't fail user creation
            print(f"Error creating MongoDB collection for user {user.email}: {str(e)}")
            # Add warning to response
            db_user.warnings = ["Chat collection creation failed. Some features may be limited."]
    
    return db_user

@router.get("/", response_model=List[UserSchema])
async def get_users(
    skip: int = 0, 
    limit: int = 100, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(select(User).offset(skip).limit(limit))
    return result.scalars().all()

@router.get("/me", response_model=UserSchema)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    return current_user

@router.get("/{user_id}", response_model=UserSchema)
async def get_user(
    user_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(select(User).filter(User.id == user_id))
    db_user = result.scalars().first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@router.put("/{user_id}", response_model=UserSchema)
async def update_user(
    user_id: int, 
    user: UserUpdate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this user")
        
    result = await db.execute(select(User).filter(User.id == user_id))
    db_user = result.scalars().first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_user, key, value)
    
    await db.commit()
    await db.refresh(db_user)
    return db_user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this user")
        
    result = await db.execute(select(User).filter(User.id == user_id))
    db_user = result.scalars().first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.delete(db_user)
    await db.commit()
    return None



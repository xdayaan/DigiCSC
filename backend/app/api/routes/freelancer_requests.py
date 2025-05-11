from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, and_, func
from typing import List, Optional
from datetime import datetime, timedelta

from ...db.postgres import get_db
from ...models.user import User, UserType
from ...models.freelancer_request import FreelancerRequest
from ...schemas.freelancer_request import FreelancerRequestCreate, FreelancerRequestUpdate, FreelancerRequest as FreelancerRequestSchema
from ...dependencies import get_current_active_user

router = APIRouter()

@router.post("/", response_model=FreelancerRequestSchema, status_code=status.HTTP_201_CREATED)
async def create_freelancer_request(
    request_data: FreelancerRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new freelancer request
    """
    # Verify that the current user is either the customer or the freelancer
    if current_user.id != request_data.user_id and current_user.id != request_data.freelancer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="You can only create requests for yourself"
        )
    
    # Verify that the user_id refers to a customer and the freelancer_id refers to a freelancer
    result = await db.execute(select(User).filter(User.id == request_data.user_id))
    user = result.scalars().first()
    
    if not user or user.user_type != UserType.CUSTOMER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User ID must belong to a customer"
        )
    
    result = await db.execute(select(User).filter(User.id == request_data.freelancer_id))
    freelancer = result.scalars().first()
    
    if not freelancer or freelancer.user_type != UserType.FREELANCER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Freelancer ID must belong to a freelancer"
        )
    
    # Create the request
    db_request = FreelancerRequest(
        user_id=request_data.user_id,
        freelancer_id=request_data.freelancer_id,
        conversation_id=request_data.conversation_id,
        accepted=request_data.accepted
    )
    
    db.add(db_request)
    await db.commit()
    await db.refresh(db_request)
    
    return db_request

@router.get("/recent/{freelancer_id}", response_model=Optional[FreelancerRequestSchema])
async def get_recent_freelancer_request(
    freelancer_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get the most recent freelancer request for a freelancer,
    but only if it was created within the last 60 seconds
    """
    # Calculate the cutoff time (60 seconds ago)
    cutoff_time = datetime.now() - timedelta(seconds=60)
    
    # Get the most recent request for this freelancer that's newer than the cutoff time
    query = (
        select(FreelancerRequest)
        .filter(
            and_(
                FreelancerRequest.freelancer_id == freelancer_id,
                FreelancerRequest.created_on >= cutoff_time
            )
        )
        .order_by(FreelancerRequest.created_on.desc())
    )
    
    result = await db.execute(query)
    recent_request = result.scalars().first()
    
    if not recent_request:
        return None
        
    return recent_request

@router.get("/freelancer/{freelancer_id}", response_model=List[FreelancerRequestSchema])
async def get_freelancer_requests(
    freelancer_id: int,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all requests for a specific freelancer
    """
    # Check if the current user is the freelancer or an admin
    if current_user.id != freelancer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own requests"
        )
    
    query = (
        select(FreelancerRequest)
        .filter(FreelancerRequest.freelancer_id == freelancer_id)
        .order_by(FreelancerRequest.created_on.desc())
        .offset(skip)
        .limit(limit)
    )
    
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/customer/{user_id}", response_model=List[FreelancerRequestSchema])
async def get_customer_requests(
    user_id: int,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all requests made by a specific customer
    """
    # Check if the current user is the customer or an admin
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own requests"
        )
    
    query = (
        select(FreelancerRequest)
        .filter(FreelancerRequest.user_id == user_id)
        .order_by(FreelancerRequest.created_on.desc())
        .offset(skip)
        .limit(limit)
    )
    
    result = await db.execute(query)
    return result.scalars().all()

@router.put("/{request_id}", response_model=FreelancerRequestSchema)
async def update_freelancer_request(
    request_id: int,
    request_update: FreelancerRequestUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update a freelancer request (accept/reject)
    """
    # Get the request
    query = select(FreelancerRequest).filter(FreelancerRequest.id == request_id)
    result = await db.execute(query)
    db_request = result.scalars().first()
    
    if not db_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found"
        )
    
    # Only the freelancer can update the request
    if current_user.id != db_request.freelancer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the freelancer can accept or reject requests"
        )
    
    # Update the request
    db_request.accepted = request_update.accepted
    
    await db.commit()
    await db.refresh(db_request)
    
    return db_request

@router.get("/{request_id}", response_model=FreelancerRequestSchema)
async def get_freelancer_request(
    request_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific freelancer request by ID
    """
    query = select(FreelancerRequest).filter(FreelancerRequest.id == request_id)
    result = await db.execute(query)
    db_request = result.scalars().first()
    
    if not db_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found"
        )
    
    # Only the involved freelancer or customer can view the request
    if current_user.id != db_request.freelancer_id and current_user.id != db_request.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this request"
        )
    
    return db_request

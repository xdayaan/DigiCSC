from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
from app.db.postgres import get_db
from app.models.sql_models import Freelancer as DBFreelancer
from app.schemas.freelancer import Freelancer, FreelancerCreate, FreelancerUpdate

router = APIRouter()

@router.post("/", response_model=Freelancer, status_code=status.HTTP_201_CREATED)
def create_freelancer(freelancer: FreelancerCreate, db: Session = Depends(get_db)):
    db_freelancer = DBFreelancer(
        name=freelancer.name,
        email=freelancer.email,
        phone=freelancer.phone,
        csc_id=freelancer.csc_id,
        preferred_work=freelancer.preferred_work,
        languages=freelancer.languages
    )
    db.add(db_freelancer)
    db.commit()
    db.refresh(db_freelancer)
    return db_freelancer

@router.get("/", response_model=List[Freelancer])
def read_freelancers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    freelancers = db.query(DBFreelancer).offset(skip).limit(limit).all()
    return freelancers

@router.get("/{freelancer_id}", response_model=Freelancer)
def read_freelancer(freelancer_id: int, db: Session = Depends(get_db)):
    db_freelancer = db.query(DBFreelancer).filter(DBFreelancer.id == freelancer_id).first()
    if db_freelancer is None:
        raise HTTPException(status_code=404, detail="Freelancer not found")
    return db_freelancer

@router.put("/{freelancer_id}", response_model=Freelancer)
def update_freelancer(freelancer_id: int, freelancer: FreelancerUpdate, db: Session = Depends(get_db)):
    db_freelancer = db.query(DBFreelancer).filter(DBFreelancer.id == freelancer_id).first()
    if db_freelancer is None:
        raise HTTPException(status_code=404, detail="Freelancer not found")
    
    update_data = freelancer.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_freelancer, key, value)
    
    db.add(db_freelancer)
    db.commit()
    db.refresh(db_freelancer)
    return db_freelancer

@router.delete("/{freelancer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_freelancer(freelancer_id: int, db: Session = Depends(get_db)):
    db_freelancer = db.query(DBFreelancer).filter(DBFreelancer.id == freelancer_id).first()
    if db_freelancer is None:
        raise HTTPException(status_code=404, detail="Freelancer not found")
    
    db.delete(db_freelancer)
    db.commit()
    return None
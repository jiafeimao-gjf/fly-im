"""Auth routes"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_db, verify_password, get_password_hash, create_access_token
from models import User
from schemas import UserCreate, UserLogin, TokenResponse, UserResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    existing = db.query(User).filter(User.username == user.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already registered")

    # Create user
    db_user = User(
        username=user.username,
        password_hash=get_password_hash(user.password),
        display_name=user.display_name or user.username,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Generate token
    access_token = create_access_token(data={"sub": db_user.id})

    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=db_user.id,
            username=db_user.username,
            display_name=db_user.display_name,
            avatar_url=db_user.avatar_url,
        )
    )


@router.post("/login", response_model=TokenResponse)
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(data={"sub": db_user.id})

    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=db_user.id,
            username=db_user.username,
            display_name=db_user.display_name,
            avatar_url=db_user.avatar_url,
        )
    )

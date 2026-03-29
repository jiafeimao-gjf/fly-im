"""Auth dependencies"""
from typing import Generator
from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session

from database import SessionLocal
from .utils import decode_token


def get_db() -> Generator[Session, None, None]:
    """Database session dependency"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user_id(authorization: str = Header(None)) -> str:
    """Extract user_id from Authorization header"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = authorization[7:]
    user_id = decode_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user_id

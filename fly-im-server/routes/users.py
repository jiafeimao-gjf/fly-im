"""User routes"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_db
from models import User, Contact
from schemas import UserResponse, ContactAdd
from connection import manager

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
def get_me(db: Session = Depends(get_db)):
    # This would use auth middleware in production
    pass


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/{user_id}/contacts")
def get_contacts(user_id: str, db: Session = Depends(get_db)):
    contacts = db.query(Contact).filter(Contact.user_id == user_id).all()
    result = []
    for c in contacts:
        contact_user = db.query(User).filter(User.id == c.contact_id).first()
        if contact_user:
            result.append({
                "id": contact_user.id,
                "username": contact_user.username,
                "display_name": contact_user.display_name,
                "avatar_url": contact_user.avatar_url,
                "online": manager.is_online(contact_user.id),
            })
    return result


@router.post("/{user_id}/contacts")
def add_contact(user_id: str, contact: ContactAdd, db: Session = Depends(get_db)):
    # Find contact by username
    contact_user = db.query(User).filter(User.username == contact.contact_username).first()
    if not contact_user:
        raise HTTPException(status_code=404, detail="User not found")

    if contact_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot add yourself")

    # Check if already exists
    existing = db.query(Contact).filter(
        Contact.user_id == user_id,
        Contact.contact_id == contact_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Contact already exists")

    # Add contact (bidirectional)
    db.add(Contact(user_id=user_id, contact_id=contact_user.id))
    db.add(Contact(user_id=contact_user.id, contact_id=user_id))
    db.commit()

    return {"status": "ok"}

"""Admin routes for system statistics"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import get_db, get_admin_user_id, create_admin_token
from auth.dependencies import get_db as db_dep
from models import User, Room, Message, Contact, RoomMember
import config

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.post("/login")
def admin_login(username: str, password: str):
    """Admin login - returns admin token"""
    if username != config.ADMIN_USERNAME or password != config.ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    token = create_admin_token({"sub": username})
    return {"access_token": token, "token_type": "bearer", "username": username}


@router.get("/stats")
def get_stats(db: Session = Depends(db_dep), _admin: str = Depends(get_admin_user_id)):
    """Get overall system statistics"""
    user_count = db.query(func.count()).select_from(User).scalar()
    room_count = db.query(func.count()).select_from(Room).scalar()
    message_count = db.query(func.count()).select_from(Message).scalar()
    contact_count = db.query(func.count()).select_from(Contact).scalar()
    room_member_count = db.query(func.count()).select_from(RoomMember).scalar()

    from connection import manager
    online_count = len(manager.active_connections)

    return {
        "users": user_count,
        "rooms": room_count,
        "messages": message_count,
        "contacts": contact_count,
        "room_members": room_member_count,
        "online_users": online_count,
    }


@router.get("/users")
def list_users(limit: int = 50, offset: int = 0, _admin: str = Depends(get_admin_user_id), db: Session = Depends(db_dep)):
    """List all users"""
    users = db.query(User).order_by(User.created_at.desc()).limit(limit).offset(offset).all()
    total = db.query(func.count()).select_from(User).scalar()
    return {"total": total, "users": users}


@router.get("/rooms")
def list_rooms(limit: int = 50, offset: int = 0, _admin: str = Depends(get_admin_user_id), db: Session = Depends(db_dep)):
    """List all rooms with member counts"""
    rooms = db.query(Room).order_by(Room.created_at.desc()).limit(limit).offset(offset).all()
    total = db.query(func.count()).select_from(Room).scalar()
    result = []
    for room in rooms:
        member_count = db.query(func.count()).select_from(RoomMember).filter(
            RoomMember.room_id == room.id
        ).scalar()
        result.append({
            "id": room.id,
            "name": room.name,
            "avatar_url": room.avatar_url,
            "created_by": room.created_by,
            "created_at": room.created_at,
            "member_count": member_count,
        })
    return {"total": total, "rooms": result}


@router.get("/messages/recent")
def recent_messages(limit: int = 50, _admin: str = Depends(get_admin_user_id), db: Session = Depends(db_dep)):
    """Get recent messages (both private and room)"""
    msgs = db.query(Message).order_by(Message.timestamp.desc()).limit(limit).all()
    return {"messages": msgs}

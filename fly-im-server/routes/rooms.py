"""Room routes"""
import asyncio
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from auth import get_db, get_current_user_id
from models import Room, RoomMember, User, Message
from schemas import RoomCreate, RoomResponse, RoomMemberResponse, ContactAdd, MessageResponse
from connection import manager

router = APIRouter(prefix="/api/rooms", tags=["rooms"])


@router.get("", response_model=List[RoomResponse])
def get_my_rooms(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Get all rooms the user is a member of"""
    memberships = db.query(RoomMember).filter(RoomMember.user_id == user_id).all()
    room_ids = [m.room_id for m in memberships]
    if not room_ids:
        return []
    rooms = db.query(Room).filter(Room.id.in_(room_ids)).all()
    return rooms


@router.post("", response_model=RoomResponse)
def create_room(room: RoomCreate, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Create a new room"""
    db_room = Room(
        name=room.name,
        created_by=user_id,
    )
    db.add(db_room)
    db.commit()
    db.refresh(db_room)

    # Add creator as owner
    db.add(RoomMember(room_id=db_room.id, user_id=user_id, role="owner"))
    db.commit()

    return db_room


@router.get("/{room_id}", response_model=RoomResponse)
def get_room(room_id: str, db: Session = Depends(get_db)):
    """Get room details"""
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room


@router.get("/{room_id}/members")
def get_room_members(room_id: str, db: Session = Depends(get_db)):
    """Get room members"""
    members = db.query(RoomMember).filter(RoomMember.room_id == room_id).all()
    result = []
    for m in members:
        user = db.query(User).filter(User.id == m.user_id).first()
        result.append({
            "user_id": m.user_id,
            "role": m.role,
            "joined_at": m.joined_at,
            "user": {
                "id": user.id,
                "username": user.username,
                "display_name": user.display_name,
                "avatar_url": user.avatar_url,
            } if user else None
        })
    return result


@router.post("/{room_id}/members")
async def add_room_member(room_id: str, contact: ContactAdd, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Add a member to room (owner/admin only)"""
    # Check permission
    membership = db.query(RoomMember).filter(
        RoomMember.room_id == room_id,
        RoomMember.user_id == user_id
    ).first()
    if not membership or membership.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Permission denied")

    # Find user to add
    new_member = db.query(User).filter(User.username == contact.contact_username).first()
    if not new_member:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if already member
    existing = db.query(RoomMember).filter(
        RoomMember.room_id == room_id,
        RoomMember.user_id == new_member.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already a member")

    db.add(RoomMember(room_id=room_id, user_id=new_member.id))
    db.commit()

    # Broadcast to room
    asyncio.create_task(manager.broadcast_to_room(room_id, {
        "type": "room_member_joined",
        "room_id": room_id,
        "userId": new_member.id,
    }))

    return {"status": "ok"}


@router.delete("/{room_id}/members/{target_user_id}")
async def remove_room_member(room_id: str, target_user_id: str, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Remove a member from room (owner/admin only)"""
    # Check permission
    membership = db.query(RoomMember).filter(
        RoomMember.room_id == room_id,
        RoomMember.user_id == user_id
    ).first()
    if not membership or membership.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Permission denied")

    # Cannot remove owner
    room = db.query(Room).filter(Room.id == room_id).first()
    if room and room.created_by == target_user_id:
        raise HTTPException(status_code=400, detail="Cannot remove room owner")

    db.query(RoomMember).filter(
        RoomMember.room_id == room_id,
        RoomMember.user_id == target_user_id
    ).delete()
    db.commit()

    # Broadcast to room
    asyncio.create_task(manager.broadcast_to_room(room_id, {
        "type": "room_member_left",
        "room_id": room_id,
        "userId": target_user_id,
    }))

    # Remove from connection manager if online
    asyncio.create_task(manager.leave_room(target_user_id, room_id))

    return {"status": "ok"}


@router.delete("/{room_id}")
async def delete_room(room_id: str, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Delete a room (owner only)"""
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.created_by != user_id:
        raise HTTPException(status_code=403, detail="Only room owner can delete")

    # Broadcast deletion
    asyncio.create_task(manager.broadcast_to_room(room_id, {
        "type": "room_deleted",
        "room_id": room_id,
    }))

    db.delete(room)
    db.commit()
    return {"status": "ok"}


@router.get("/{room_id}/messages")
def get_room_messages(
    room_id: str,
    limit: int = Query(50, le=100),
    before: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get room message history"""
    query = db.query(Message).filter(Message.room_id == room_id)
    if before:
        query = query.filter(Message.timestamp < before)
    messages = query.order_by(Message.timestamp.desc()).limit(limit).all()
    return [MessageResponse.model_validate(m) for m in reversed(messages)]

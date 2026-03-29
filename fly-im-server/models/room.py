"""Room and RoomMember models"""
import uuid
import time
from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship

from database import Base


class Room(Base):
    __tablename__ = "rooms"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(Integer, default=lambda: int(time.time() * 1000))

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    members = relationship("RoomMember", back_populates="room", cascade="all, delete-orphan")


class RoomMember(Base):
    __tablename__ = "room_members"

    room_id = Column(String, ForeignKey("rooms.id"), primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    role = Column(String, default="member")
    joined_at = Column(Integer, default=lambda: int(time.time() * 1000))

    # Relationships
    room = relationship("Room", back_populates="members")
    user = relationship("User")

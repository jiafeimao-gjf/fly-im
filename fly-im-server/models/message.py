"""Message model"""
import uuid
import time
from sqlalchemy import Column, String, Text, Integer, ForeignKey
from sqlalchemy.orm import relationship

from database import Base


class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    from_user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    to_user_id = Column(String, ForeignKey("users.id"), nullable=True)
    room_id = Column(String, ForeignKey("rooms.id"), nullable=True)
    content = Column(Text, nullable=False)
    timestamp = Column(Integer, nullable=False, default=lambda: int(time.time() * 1000), index=True)
    delivered_at = Column(Integer, nullable=True)
    read_at = Column(Integer, nullable=True)

    # Relationships
    sender = relationship("User", foreign_keys=[from_user_id], back_populates="sent_messages")
    recipient = relationship("User", foreign_keys=[to_user_id], back_populates="received_messages")
    room = relationship("Room", foreign_keys=[room_id])

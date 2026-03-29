"""User and Contact models"""
import uuid
import time
from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    display_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    created_at = Column(Integer, default=lambda: int(time.time() * 1000))
    updated_at = Column(Integer, default=lambda: int(time.time() * 1000), onupdate=lambda: int(time.time() * 1000))

    # Relationships
    sent_messages = relationship("Message", foreign_keys="Message.from_user_id", back_populates="sender")
    received_messages = relationship("Message", foreign_keys="Message.to_user_id", back_populates="recipient")
    contacts = relationship("Contact", foreign_keys="Contact.user_id", back_populates="user")


class Contact(Base):
    __tablename__ = "contacts"

    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    contact_id = Column(String, ForeignKey("users.id"), primary_key=True)
    created_at = Column(Integer, default=lambda: int(time.time() * 1000))

    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="contacts")
    contact_user = relationship("User", foreign_keys=[contact_id])

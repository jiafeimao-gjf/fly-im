"""User schemas"""
from typing import Optional
from pydantic import BaseModel


class UserResponse(BaseModel):
    id: str
    username: str
    display_name: Optional[str]
    avatar_url: Optional[str]

    class Config:
        from_attributes = True


class ContactAdd(BaseModel):
    contact_username: str

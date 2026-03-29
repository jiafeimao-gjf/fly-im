"""Message schemas"""
from typing import Optional
from pydantic import BaseModel, Field


class MessageResponse(BaseModel):
    id: str
    from_user_id: str
    to_user_id: str
    content: str
    timestamp: int
    delivered_at: Optional[int]
    read_at: Optional[int]

    class Config:
        from_attributes = True


class WSMessage(BaseModel):
    type: str
    id: Optional[str] = None
    token: Optional[str] = None
    from_: Optional[str] = Field(None, alias="from")
    to: Optional[str] = None
    room_id: Optional[str] = None
    content: Optional[str] = None
    timestamp: Optional[int] = None
    ok: Optional[bool] = None
    error: Optional[str] = None
    userId: Optional[str] = None
    metadata: Optional[dict] = None

    class Config:
        populate_by_name = True

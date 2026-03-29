"""Room schemas"""
from typing import Optional, TYPE_CHECKING
from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from .user import UserResponse


class RoomCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class RoomResponse(BaseModel):
    id: str
    name: str
    avatar_url: Optional[str]
    created_by: str
    created_at: int

    class Config:
        from_attributes = True


class RoomMemberResponse(BaseModel):
    user_id: str
    role: str
    joined_at: int
    user: Optional["UserResponse"] = None


# Import at bottom to avoid circular dependency
from .user import UserResponse  # noqa: E402

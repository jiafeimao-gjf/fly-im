"""Message routes"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from auth import get_db
from models import Message
from schemas import MessageResponse

router = APIRouter(prefix="/api/messages", tags=["messages"])


@router.get("/{user_id}")
def get_messages(
    user_id: str,
    with_user: str = Query(..., alias="with"),
    limit: int = Query(50, le=100),
    before: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Message).filter(
        or_(
            (Message.from_user_id == user_id) & (Message.to_user_id == with_user),
            (Message.from_user_id == with_user) & (Message.to_user_id == user_id),
        )
    )

    if before:
        query = query.filter(Message.timestamp < before)

    messages = query.order_by(Message.timestamp.desc()).limit(limit).all()

    return [MessageResponse.model_validate(m) for m in reversed(messages)]

"""Database setup"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

import config

engine = create_engine(
    config.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in config.DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def init_db():
    """Create all tables"""
    from models import User, Contact, Message, Room, RoomMember  # noqa
    Base.metadata.create_all(bind=engine)

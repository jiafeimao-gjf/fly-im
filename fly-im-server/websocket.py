"""WebSocket endpoint"""
import asyncio
import uuid
import time
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from auth import decode_token
from database import SessionLocal
from models import User, Message, RoomMember, Contact
from schemas import WSMessage
from connection import manager
import config

router = APIRouter(tags=["websocket"])


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    user_id: Optional[str] = None
    ping_task = None

    try:
        # Wait for auth message
        auth_data = await websocket.receive_json()
        token = auth_data.get("token")

        if not token:
            await websocket.send_json({
                "type": "auth_ack",
                "ok": False,
                "error": "Token required"
            })
            await websocket.close()
            return

        # Validate token
        user_id = decode_token(token)
        if not user_id:
            await websocket.send_json({
                "type": "auth_ack",
                "ok": False,
                "error": "Invalid token"
            })
            await websocket.close()
            return

        # Verify user exists
        db = SessionLocal()
        user = db.query(User).filter(User.id == user_id).first()
        db.close()

        if not user:
            await websocket.send_json({
                "type": "auth_ack",
                "ok": False,
                "error": "User not found"
            })
            await websocket.close()
            return

        # Send auth ack
        await websocket.send_json({
            "type": "auth_ack",
            "ok": True,
            "userId": user_id
        })

        # Store connection (now appends for multi-tab support)
        await manager.connect(user_id, websocket)

        # Push contact online statuses to newly connected user
        db = SessionLocal()
        contacts = db.query(Contact).filter(Contact.user_id == user_id).all()
        for contact in contacts:
            online = contact.contact_id in manager.active_connections
            await websocket.send_json({
                "type": "presence",
                "userId": contact.contact_id,
                "online": online
            })
        db.close()

        # Start ping task with timeout tracking
        pong_received = True  # True = expect pong, False = waiting

        async def ping_loop():
            nonlocal pong_received
            while True:
                await asyncio.sleep(config.WS_PING_INTERVAL)
                if not pong_received:
                    # Previous ping timed out, disconnect
                    print(f"[WARN] Pong not received for {user_id}, closing connection")
                    break
                pong_received = False
                try:
                    await websocket.send_json({"type": "ping"})
                except:
                    break
                # Wait for pong with timeout
                try:
                    # We check pong_received after timeout seconds via the outer loop
                    await asyncio.sleep(config.WS_PING_TIMEOUT)
                    if not pong_received:
                        print(f"[WARN] Ping timeout for {user_id}")
                        break
                except:
                    break

        # Message loop
        while True:
            data = await websocket.receive_json()
            msg = WSMessage(**data)

            if msg.type == "pong":
                # Heartbeat response - mark received
                pong_received = True

            elif msg.type == "ping":
                # Client heartbeat request - respond with pong
                await websocket.send_json({"type": "pong"})

            elif msg.type == "message":
                # Send message to recipient
                msg_id = msg.id or str(uuid.uuid4())
                timestamp = msg.timestamp or int(time.time() * 1000)

                # Save to database
                db = SessionLocal()
                message = Message(
                    id=msg_id,
                    from_user_id=user_id,
                    to_user_id=msg.to,
                    content=msg.content,
                    timestamp=timestamp,
                )
                db.add(message)
                db.commit()
                db.close()

                # Send to recipient if online (handles multi-tab: delivers to all tabs)
                if msg.to in manager.active_connections:
                    await manager.send_personal(msg.to, {
                        "type": "message",
                        "id": msg_id,
                        "from": user_id,
                        "to": msg.to,
                        "content": msg.content,
                        "timestamp": timestamp,
                    })

                # Send ack to sender
                await websocket.send_json({
                    "type": "ack",
                    "id": msg_id,
                    "ok": True,
                })

            elif msg.type == "read":
                # Mark message as read
                if msg.id:
                    db = SessionLocal()
                    message = db.query(Message).filter(Message.id == msg.id).first()
                    if message and message.to_user_id == user_id:
                        message.read_at = int(time.time() * 1000)
                        db.commit()
                    db.close()

            elif msg.type == "typing":
                # Send typing indicator to recipient
                if msg.to in manager.active_connections:
                    await manager.send_personal(msg.to, {
                        "type": "typing",
                        "from": user_id,
                        "to": msg.to,
                        "room_id": msg.room_id,
                    })

            elif msg.type == "room_message":
                # Send message to room
                if not msg.room_id:
                    await websocket.send_json({
                        "type": "error",
                        "id": msg.id,
                        "error": "room_id required"
                    })
                    continue

                msg_id = msg.id or str(uuid.uuid4())
                timestamp = msg.timestamp or int(time.time() * 1000)

                # Verify membership
                db = SessionLocal()
                membership = db.query(RoomMember).filter(
                    RoomMember.room_id == msg.room_id,
                    RoomMember.user_id == user_id
                ).first()
                if not membership:
                    db.close()
                    await websocket.send_json({
                        "type": "error",
                        "id": msg_id,
                        "error": "Not a room member"
                    })
                    continue

                # Save message
                message = Message(
                    id=msg_id,
                    from_user_id=user_id,
                    to_user_id=None,
                    room_id=msg.room_id,
                    content=msg.content,
                    timestamp=timestamp,
                )
                db.add(message)
                db.commit()
                db.close()

                # Broadcast to ALL room members from database (not just WebSocket-joined ones)
                room_members = db.query(RoomMember).filter(RoomMember.room_id == msg.room_id).all()
                broadcast_msg = {
                    "type": "room_message",
                    "id": msg_id,
                    "from": user_id,
                    "room_id": msg.room_id,
                    "content": msg.content,
                    "timestamp": timestamp,
                }
                for member in room_members:
                    if member.user_id != user_id and member.user_id in manager.active_connections:
                        await manager.send_personal(member.user_id, broadcast_msg)

                # Send ack to sender
                await websocket.send_json({
                    "type": "ack",
                    "id": msg_id,
                    "ok": True,
                })

            elif msg.type == "room_join":
                # User joins a room
                if not msg.room_id:
                    continue

                db = SessionLocal()
                membership = db.query(RoomMember).filter(
                    RoomMember.room_id == msg.room_id,
                    RoomMember.user_id == user_id
                ).first()
                db.close()

                if membership:
                    await manager.join_room(user_id, msg.room_id)
                    await manager.broadcast_to_room(msg.room_id, {
                        "type": "room_member_joined",
                        "room_id": msg.room_id,
                        "userId": user_id,
                    })
                    await websocket.send_json({
                        "type": "room_joined",
                        "room_id": msg.room_id,
                        "ok": True,
                    })

            elif msg.type == "room_leave":
                # User leaves a room
                if not msg.room_id:
                    continue

                await manager.leave_room(user_id, msg.room_id)
                await manager.broadcast_to_room(msg.room_id, {
                    "type": "room_member_left",
                    "room_id": msg.room_id,
                    "userId": user_id,
                })
                await websocket.send_json({
                    "type": "room_left",
                    "room_id": msg.room_id,
                    "ok": True,
                })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        if ping_task:
            ping_task.cancel()
        if user_id:
            await manager.disconnect(user_id, websocket)

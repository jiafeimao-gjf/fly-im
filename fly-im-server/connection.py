"""WebSocket connection manager"""
import asyncio
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # user_id -> WebSocket
        self.active_connections: dict[str, WebSocket] = {}
        # room_id -> set of user_ids
        self.room_members: dict[str, set[str]] = {}
        # user_id -> set of room_ids (inverse index)
        self.user_rooms: dict[str, set[str]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        await self.broadcast_presence(user_id, True)

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        # Leave all rooms
        if user_id in self.user_rooms:
            for room_id in list(self.user_rooms[user_id]):
                asyncio.create_task(self.leave_room(user_id, room_id))
            del self.user_rooms[user_id]
        asyncio.create_task(self.broadcast_presence(user_id, False))

    async def broadcast_presence(self, user_id: str, online: bool):
        """Broadcast presence change to all connected users who have this user as a contact."""
        for uid, ws in list(self.active_connections.items()):
            if uid != user_id:
                try:
                    await ws.send_json({
                        "type": "presence",
                        "userId": user_id,
                        "online": online
                    })
                except:
                    pass

    async def send_personal(self, user_id: str, message: dict):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_json(message)

    def is_online(self, user_id: str) -> bool:
        return user_id in self.active_connections

    async def join_room(self, user_id: str, room_id: str):
        """User joins a room"""
        if room_id not in self.room_members:
            self.room_members[room_id] = set()
        self.room_members[room_id].add(user_id)

        if user_id not in self.user_rooms:
            self.user_rooms[user_id] = set()
        self.user_rooms[user_id].add(room_id)

    async def leave_room(self, user_id: str, room_id: str):
        """User leaves a room"""
        if room_id in self.room_members:
            self.room_members[room_id].discard(user_id)
            if not self.room_members[room_id]:
                del self.room_members[room_id]

        if user_id in self.user_rooms:
            self.user_rooms[user_id].discard(room_id)
            if not self.user_rooms[user_id]:
                del self.user_rooms[user_id]

    async def broadcast_to_room(self, room_id: str, message: dict, exclude_user: str = None):
        """Broadcast message to all room members"""
        if room_id not in self.room_members:
            return
        for uid in list(self.room_members[room_id]):
            if uid != exclude_user and uid in self.active_connections:
                try:
                    await self.active_connections[uid].send_json(message)
                except:
                    pass

    def get_user_rooms(self, user_id: str) -> set:
        """Get all rooms a user is member of"""
        return self.user_rooms.get(user_id, set())


# Global manager instance
manager = ConnectionManager()

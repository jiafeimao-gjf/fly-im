# Chat Message Push/Receive Architecture

## Stack

- **Server**: FastAPI + WebSockets + SQLAlchemy (SQLite) + python-jose JWT
- **Client**: Vue 3 + Pinia + WebSocket (wrapped in `wsManager.ts`)

---

## 1. 1-to-1 Private Message

### 1.1 Client Sends

```typescript
// wsManager.ts - sendMessage()
{ type: 'message', id, to: recipientUserId, content, timestamp }
```

- `id`: client-generated UUID (used for deduplication and ACK)
- `to`: recipient user ID
- `content`: message text
- `timestamp`: Unix ms at send time

The `ChatPage.vue` handler optimistically adds the message to the Pinia store first (so it appears immediately), then calls `sendMessage`.

### 1.2 Server Receives & Saves

```python
# websocket.py - msg.type == "message"
message = Message(
    id=msg_id,
    from_user_id=user_id,   # from JWT
    to_user_id=msg.to,
    content=msg.content,
    timestamp=timestamp,
)
db.add(message); db.commit()
```

### 1.3 Server Push to Recipient (Online)

```python
if msg.to in manager.active_connections:
    await manager.active_connections[msg.to].send_json({
        "type": "message", "id": msg_id, "from": user_id,
        "to": msg.to, "content": msg.content, "timestamp": timestamp,
    })
```

- Direct lookup in `active_connections: dict[str, WebSocket]`
- **If offline**: message is saved to DB only, no push. Recipient must fetch via REST on page load.

### 1.4 Server ACK to Sender

```python
{ "type": "ack", "id": msg_id, "ok": True }
```

- Client removes `id` from `pendingAcks` set (visual feedback only, no retry)

### 1.5 Client Handles Incoming

```typescript
// ChatPage.vue - onMessage handler
if (msg.type === 'message' && msg.from === contactId) {
    chatStore.addMessage({ ... })  // deduplicated by msg.id
    scrollToBottom()
}
```

- Filters by `msg.from === contactId` -- only messages from the currently open chat partner
- Other private messages received while on this page are silently ignored

### 1.6 Offline Message Fetch (REST)

```
GET /api/messages/{user_id}?with={contact_id}&limit=50
```

Query: `(from=user_id AND to=contact_id) OR (from=contact_id AND to=user_id)`, ordered by timestamp desc.

Called on `ChatPage.vue` mount to populate Pinia `messages` store.

### 1.7 Deduplication

```typescript
// chat.ts - addMessage()
const key = `${msg.from_user_id}-${msg.to_user_id}`
if (!messages.value[key].find((m) => m.id === msg.id)) {
    messages.value[key].push(msg)
}
```

Messages keyed by `${userId}-${withUserId}` (both directions point to same array), deduplicated by `msg.id`.

---

## 2. Chat Room Message

### 2.1 Client Sends

```typescript
// wsManager.ts - sendRoomMessage()
{ type: 'room_message', id, room_id, content, timestamp }
```

### 2.2 Server Validates & Saves

```python
# websocket.py - msg.type == "room_message"
membership = db.query(RoomMember).filter(
    RoomMember.room_id == msg.room_id,
    RoomMember.user_id == user_id
).first()
# → 403 if not a member

message = Message(
    from_user_id=user_id,
    to_user_id=None,
    room_id=msg.room_id,
    content=msg.content,
    timestamp=timestamp,
)
db.add(message); db.commit()
```

- **Verifies DB membership** (not in-memory) on every message
- `to_user_id` is `NULL` for room messages

### 2.3 Server Broadcast to Room Members

```python
# Queries ALL room members from DB (not in-memory set)
room_members = db.query(RoomMember).filter(RoomMember.room_id == msg.room_id).all()
for member in room_members:
    if member.user_id != user_id and member.user_id in manager.active_connections:
        await manager.active_connections[member.user_id].send_json(broadcast_msg)
```

- Uses **DB query** (not in-memory `room_members` set)
- All DB members receive push, regardless of whether they sent `room_join`
- Only **online** members receive push; offline members must fetch via REST

### 2.4 Client Handles Incoming

```typescript
// RoomChatPage.vue - onRoomMessage handler
if (msg.room_id === roomId.value && msg.from && msg.content) {
    chatStore.addRoomMessage({ ... })  // deduplicated by msg.id
    scrollToBottom()
}
```

### 2.5 Offline Message Fetch (REST)

```
GET /api/rooms/{room_id}/messages?limit=50&before={timestamp}
```

Called on `RoomChatPage.vue` mount.

---

## 3. Room Join/Leave

### 3.1 Client Join

```typescript
// wsManager.ts - joinRoom()
{ type: 'room_join', room_id }
```

Called on `RoomChatPage.vue` after auth ack (or directly if manager already connected).

### 3.2 Server Handles Join

```python
# websocket.py - msg.type == "room_join"
membership = db.query(RoomMember).filter(...)  # verify DB membership
if membership:
    await manager.join_room(user_id, room_id)  # populate in-memory set
    await manager.broadcast_to_room(msg.room_id, {
        "type": "room_member_joined", "room_id": msg.room_id, "userId": user_id,
    })
    { "type": "room_joined", "room_id": msg.room_id, "ok": True }
```

- `manager.join_room()` populates in-memory `room_members` and `user_rooms`
- Broadcasts `room_member_joined` to all **in-memory** members (those who previously sent `room_join`)

### 3.3 Disconnect Cleanup

```python
# connection.py - disconnect()
del active_connections[user_id]
for room_id in user_rooms[user_id]:
    leave_room(user_id, room_id)   # removes from in-memory set
broadcast_presence(user_id, False)
```

- User removed from all in-memory room tracking on disconnect
- DB membership is unaffected

### 3.4 Key Inconsistency

Room message broadcast uses **DB membership** (section 2.3), but `room_member_joined/left` broadcasts use **in-memory** `room_members`. This means:
- A DB member who never sent `room_join` receives room messages but won't appear in presence broadcasts
- In practice this is fine because the message push itself works correctly

---

## 4. Known Limitations

| Issue | Description |
|---|---|
| **No offline push** | Private and room messages to offline users are saved to DB only. No push/queue/retry. |
| **No delivery receipt** | Server does not push `delivered_at` to sender. |
| **No read receipt push** | `read_at` is set in DB but sender is not notified. |
| **No retry on failed send** | If `ack` is never received, message stays in UI optimistically with no retry. |
| **Typing not persisted** | Typing indicators are fire-and-forget, not stored. |
| **No infinite scroll** | Client does not use `before` param for pagination. |
| **Room rejoin on reconnect** | If WS fully disconnects, `RoomChatPage` creates new manager and rejoins on auth ack. Works for page-level reconnect but not for full page navigation. |

---

## 5. Message Flow Summary

```
Client A (sender)                    Server                        Client B (recipient)
      |                               |                                  |
      |-- WS: {type:message, ...} --->|                                  |
      |                               |-- Save to DB -------------------->|
      |                               |-- WS push if online ------------->|
      |<-- WS: {type:ack, id} --------|                                  |
      |                               |                                  |
      |   (offline: no push)         |                                  |
      |                               |  (on page load)                   |
      |                               |<-- REST: GET /api/messages -------|
```

```
Client A (sender)                    Server                        Client B (recipient)
      |                               |                                  |
      |-- WS: {type:room_message,..} ->|                                  |
      |                               |-- Verify DB membership ---------->|
      |                               |-- Save to DB -------------------->|
      |                               |-- Query RoomMember from DB ------->|
      |                               |-- WS push to all online members ->|
      |<-- WS: {type:ack, id} --------|                                  |
      |                               |                                  |
      |   (offline: no push)         |                                  |
      |                               |  (on page load)                   |
      |                               |<-- REST: GET /api/rooms/{id}/msg >|
```

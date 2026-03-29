# Bug 修复记录

> 记录所有已修复的 Bug，便于追溯。

---

## 2026-03-29

### 1. 数据库 `messages` 表缺少 `room_id` 列

**严重程度：高**

**现象：** `sqlite3.OperationalError: no such column: messages.room_id`

**原因：** `Message` 模型添加了 `room_id` 字段，但数据库表未同步更新。

**修复：** `ALTER TABLE messages ADD COLUMN room_id STRING REFERENCES rooms(id);`

**文件：** `fly_im.db`

---

### 2. `messages.to_user_id` 被设为 `NOT NULL`

**严重程度：高**

**现象：** `sqlite3.IntegrityError: NOT NULL constraint failed: messages.to_user_id`

**原因：** SQLite 重建表时 `to_user_id` 仍为 `NOT NULL`，但聊天室消息的 `to_user_id` 应为 NULL。

**修复：** 重建 `messages` 表，将 `to_user_id` 设为可为空。

---

### 3. `MessageResponse.to_user_id` 类型为非空字符串

**严重程度：中**

**现象：** `pydantic_core._pydantic_core.ValidationError: Input should be a valid string`

**原因：** 聊天室消息的 `to_user_id` 为 NULL，但 schema 定义为 `str`（非空）。

**修复：** `schemas/message.py` 中 `to_user_id: Optional[str]`

**文件：** `fly-im-server/schemas/message.py`

---

### 4. 聊天室消息不推送给已存在的数据库成员

**严重程度：高**

**现象：** 发送聊天室消息后，接收方收不到推送。

**原因：** `room_message` 广播使用 `manager.broadcast_to_room()`（基于内存 `room_members`），而用户加入房间后只更新内存状态。如果用户通过 REST API 加房间后未发 `room_join`，则不在内存中，无法收到推送。

**修复：** 广播时从数据库查询所有 `RoomMember`，直接推送给在线成员，不再依赖内存 `room_members`。

**文件：** `fly-im-server/websocket.py:192-204`

---

### 5. 同步路由中使用 `asyncio.create_task`

**严重程度：高**

**现象：** `RuntimeError: no running event loop`

**原因：** `add_room_member`、`remove_room_member`、`delete_room` 为同步 `def` 函数，调用 `asyncio.create_task()` 时无运行中事件循环。

**修复：** 改为 `async def`，`finally` 中 `await manager.disconnect()`。

**文件：** `fly-im-server/routes/rooms.py`

---

### 6. `disconnect` 中 `asyncio.create_task` 在同步上下文无效

**严重程度：高**

**现象：** 用户断线后，`presence` 广播不发送，`user_rooms` 内存不清理。

**原因：** `disconnect()` 是同步方法，内部的 `asyncio.create_task()` 创建的任务不会自动调度执行。

**修复：** `disconnect` 改为 `async def`，内部直接 `await leave_room` 和 `await broadcast_presence`。

**文件：** `fly-im-server/connection.py`

---

### 7. `manager.connect()` 重复调用 `accept()`

**严重程度：高**

**现象：** 认证后立即掉线，客户端无法正常使用。

**原因：** `websocket.py` 在 endpoint 开头已 `await websocket.accept()`，但 `connection.py:connect()` 内部再次 `await websocket.accept()`，FastAPI 对已连接 WebSocket 再次 accept 会抛出异常。

**修复：** 移除 `connection.py` 中的重复 `accept()`，添加注释说明由调用方负责 accept。

**文件：** `fly-im-server/connection.py`

---

### 8. `disconnect` 中 `del self.user_rooms[user_id]` KeyError

**严重程度：中**

**现象：** `KeyError: 'user_id'`

**原因：** `leave_room` 内部在 set 为空时已 `del self.user_rooms[user_id]`，`disconnect` 循环外再次 `del` 导致第二个房间时 KeyError。

**修复：** 移除循环外多余的 `del self.user_rooms[user_id]`。

**文件：** `fly-im-server/connection.py`

---

### 9. 消息发送异常被静默吞噬

**严重程度：中**

**现象：** 发送失败时无日志，无法排查。

**原因：** `send_personal` 中 `except: pass` 静默忽略所有异常。

**修复：** 改为 `except Exception as e: print(f"[WARN] Failed to send to {user_id}: {e}")`

**文件：** `fly-im-server/connection.py`

---

### 10. 心跳无超时检测，僵尸连接不清理

**严重程度：中**

**现象：** 网络半开（对端崩溃）时，连接永久存活，`active_connections` 被僵尸占用。

**原因：** `ping_loop` 只发送 `ping`，不验证 `pong`，`WS_PING_TIMEOUT` 定义了但从未使用。

**修复：** 添加 `pong_received` 标志，发送 `ping` 后等待 `WS_PING_TIMEOUT` 秒，未收到 `pong` 则退出循环。

**文件：** `fly-im-server/websocket.py`

---

### 11. 服务端不响应客户端的 `ping`

**严重程度：中**

**现象：** 客户端发送心跳 `ping`，服务端无回应，可能导致客户端认为连接已断开。

**原因：** 服务端只处理 `pong`（响应服务端的 `ping`），缺少对客户端 `ping` 的响应。

**修复：** 添加 `elif msg.type == "ping": await websocket.send_json({"type": "pong"})`

**文件：** `fly-im-server/websocket.py`

---

### 12. 首次 WS 连接未推送联系人在线状态

**严重程度：中**

**现象：** 用户连接 WebSocket 后，不知道联系人是否在线。

**原因：** `broadcast_presence` 只广播给其他人，不主动推送给新连接的用户。

**修复：** 认证成功后查询用户联系人列表，逐个发送 `presence` 消息告知每个联系人的在线状态。

**文件：** `fly-im-server/websocket.py`

---

### 13. Admin API 未导出 `get_admin_user_id`

**严重程度：高**

**现象：** `ImportError: cannot import name 'get_admin_user_id' from 'auth'`

**原因：** `get_admin_user_id` 在 `auth/dependencies.py` 中定义，但未从 `auth/__init__.py` 导出。

**修复：** 添加到 `auth/__init__.py` 导出列表。

**文件：** `fly-im-server/auth/__init__.py`

---

## 未解决问题（待处理）

| 问题 | 严重程度 | 说明 |
|------|---------|------|
| SQLite 并发写入 `database is locked` | 高 | 建议切换 PostgreSQL/MySQL |
| Admin API 初期无授权 | 高 | 已通过 `get_admin_user_id` 修复授权 |
| 多设备同时在线同一用户只保留最后连接 | 中 | `active_connections` 已支持 list，但多 tab 时行为需验证 |
| 消息无序列号，可能乱序 | 中 | 建议服务端生成递增序列号 |
| 离线消息无主动推送 | 中 | 用户上线后需手动拉取历史 |

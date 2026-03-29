# CLAUDE_ZH.md

本文件为 Claude Code (claude.ai/code) 提供代码库工作指南。

## 项目概述

Fly IM 是一个即时通讯系统，包含两个子项目：
- **fly-im-server**: Python FastAPI WebSocket IM 服务器
- **fly-h5-client**: Vue 3 + TypeScript H5 客户端

## 常用命令

### 服务器 (fly-im-server)
```bash
cd fly-im-server
pip install -r requirements.txt
python main.py  # 运行于 http://localhost:8080
```

### 客户端 (fly-h5-client)
```bash
cd fly-h5-client
npm install
npm run dev    # 开发服务器 http://localhost:3000
npm run build  # 生产构建
```

## 架构

### 服务器 (FastAPI + WebSocket)

**技术栈**: FastAPI, SQLAlchemy (默认 SQLite), python-jose JWT, WebSocket

**数据库模型**:
- `User`: id, username, password_hash, display_name, avatar_url
- `Contact`: user_id + contact_id (双向好友关系)
- `Message`: id, from_user_id, to_user_id, content, timestamp, delivered_at, read_at

**REST API 端点**:
- `POST /api/auth/register` - 注册用户
- `POST /api/auth/login` - 登录获取 JWT
- `GET /api/users/{user_id}/contacts` - 获取用户好友列表及在线状态
- `POST /api/users/{user_id}/contacts` - 通过用户名添加好友
- `GET /api/messages/{user_id}?with={contact_id}` - 获取聊天记录（通过 `before` 参数分页）

**WebSocket (`/ws`)**: 客户端先发送认证 token，然后交换消息。消息类型: `auth`, `auth_ack`, `message`, `ack`, `typing`, `read`, `presence`, `ping`, `pong`。

**连接管理器** (`connection.py`): `active_connections` 为 `dict[user_id, list[WebSocket]]` — 支持多 Tab，每个用户的多个 Tab 分别存储。`send_personal()` 向所有 Tab 投递消息。`disconnect(user_id, websocket)` 只移除指定 Tab 的连接。

**心跳**: 服务器每 30s 发一次 `{"type": "ping"}`，客户端必须回 `{"type": "pong"}`。

### 客户端 (Vue 3 + Pinia)

**技术栈**: Vue 3 Composition API, Vite, Pinia, Vue Router 4, Axios, TailwindCSS

**导航**: 底部 Tab 栏式导航（Chats / Contacts / Rooms）。聊天页面 (`/chat/:userId`, `/room/:roomId`) 为全屏，Tab 栏隐藏。

**路由结构**:
- `/login`, `/register` — 认证页面
- `/` (main 路由) — 底部 Tab 栏壳，children: `chats`, `contacts`, `rooms`
- `/chat/:userId` — 全屏 1-on-1 聊天
- `/room/:roomId` — 全屏聊天室聊天

**状态管理**:
- `useAuthStore`: 用户会话，localStorage 中的 JWT token，login/register/logout。`logout()` 同时断开 WebSocket。
- `useChatStore`: 联系人列表、房间列表、以会话 key (`${userId}-${withUserId}`) 索引的消息、`lastActivity` map 用于会话排序、输入提示、在线状态

**组件** (`src/components/`):
- `MainLayout.vue` — 底部 Tab 栏壳；挂载时预加载联系人、房间和所有消息历史
- `TabBar.vue` — 底部导航 (Chats / Contacts / Rooms)
- `ChatsList.vue` — 合并的 1-on-1 + 聊天室会话列表，按最近消息时间排序；含退出登录按钮
- `ContactsList.vue` — 好友列表，内联添加联系人表单
- `RoomsList.vue` — 房间列表，内联创建房间按钮
- `ConversationItem.vue` — 可复用会话项（头像、名称、预览、时间戳）
- `CreateRoomModal.vue` — 创建房间弹窗

**WebSocket 服务** (`src/services/wsManager.ts`): 全局单例 `WsManager`，所有组件共享。通过 `registerHandler()` / `unregisterHandler()` 注册多 handler。各页面在 `onMounted` 注册自己的 handler，`onUnmounted` 时注销。功能包括：
  - 收到服务器 `ping` 后自动回 `pong`
  - 断线时将消息加入队列，重连后清空
  - Token 过期: `auth_ack { ok: false }` 时跳转到 `/login`

**API 服务** (`src/services/api.ts`): 带有 JWT 拦截器的 Axios 客户端，所有端点前缀为 `/api`。

**代理配置**: Vite 代理 `/api` → `http://localhost:8080`，`/ws` → `ws://localhost:8080`。

## 关键实现细节

- JWT token 有效期 7 天；user_id 存储在 `sub` claim 中
- 联系人双向存储（双方都有指向对方的条目）
- 客户端消息以 `${from_user_id}-${to_user_id}` 为 key 存储以实现去重
- `useChatStore` 中的 `lastActivity` 追踪每个会话的最后消息时间戳，用于 Chats 列表排序
- WebSocket ping/pong 心跳：服务器每 30s 发 ping，客户端回 pong
- 用户上线/下线时向所有已连接用户广播在线状态
- Tab 导航是无状态的 — 切换 Tab 直接导航到该 Tab 根路径，不会累积历史记录
- 多 Tab 支持: `connection.py` 按 `list[WebSocket]` 存储每个用户的连接，所有 Tab 都能收到消息；断开时只移除当前 Tab 的连接

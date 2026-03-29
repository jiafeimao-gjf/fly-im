# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fly IM is an instant messaging system with two subprojects:
- **fly-im-server**: Python FastAPI WebSocket IM server
- **fly-h5-client**: Vue 3 + TypeScript H5 client

## Common Commands

### Server (fly-im-server)
```bash
cd fly-im-server
pip install -r requirements.txt
python main.py  # Runs on http://localhost:8080
```

### Client (fly-h5-client)
```bash
cd fly-h5-client
npm install
npm run dev    # Dev server on http://localhost:3000
npm run build  # Production build
```

## Architecture

### Server (FastAPI + WebSocket)

**Stack**: FastAPI, SQLAlchemy (SQLite by default), python-jose JWT, WebSockets

**Database Models**:
- `User`: id, username, password_hash, display_name, avatar_url
- `Contact`: user_id + contact_id (bidirectional friend relationships)
- `Message`: id, from_user_id, to_user_id, content, timestamp, delivered_at, read_at

**REST API Endpoints**:
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT
- `GET /api/users/{user_id}/contacts` - Get user's contacts with online status
- `POST /api/users/{user_id}/contacts` - Add contact by username
- `GET /api/messages/{user_id}?with={contact_id}` - Get message history (pagination via `before` param)

**Admin API Endpoints** (requires admin token):
- `POST /api/admin/login` - Admin login (username + password → admin JWT)
- `GET /api/admin/stats` - System stats: users, rooms, messages, contacts, room_members, online_users
- `GET /api/admin/users?limit=50&offset=0` - Paginated user list
- `GET /api/admin/rooms?limit=50&offset=0` - Paginated room list with member counts
- `GET /api/admin/messages/recent?limit=50` - Recent messages (private + room)

**WebSocket (`/ws`)**: Client sends auth token first, then exchanges messages. Message types: `auth`, `auth_ack`, `message`, `ack`, `typing`, `read`, `presence`, `ping`, `pong`.

**Connection Manager** (`connection.py`): `active_connections` is `dict[user_id, list[WebSocket]]` — supports multi-tab by storing all tabs per user. `send_personal()` delivers messages to all tabs. `disconnect(user_id, websocket)` removes only the specified tab's connection.

**Ping Loop**: Server sends `{"type": "ping"}` every 30s; client must respond with `{"type": "pong"}`.

### Client (Vue 3 + Pinia)

**Stack**: Vue 3 Composition API, Vite, Pinia, Vue Router 4, Axios, TailwindCSS

**Navigation**: Tab-based with bottom tab bar (Chats / Contacts / Rooms). Chat pages (`/chat/:userId`, `/room/:roomId`) are full-screen with tab bar hidden.

**Route Structure**:
- `/login`, `/register` — User auth pages
- `/` (main route) — Shell with bottom tab bar, children: `chats`, `contacts`, `rooms`
- `/chat/:userId` — Full-screen 1-on-1 chat
- `/room/:roomId` — Full-screen room chat
- `/admin/login` — Admin login page
- `/admin` — Admin dashboard (protected, separate session from user app)

**Admin Interface** (`src/pages/admin/`):
- `AdminLoginPage.vue` — Admin credential login
- `AdminDashboardPage.vue` — Dashboard with stats, tabbed panels for users/rooms/messages
- `AdminUsersPage.vue` — Paginated user list
- `AdminRoomsPage.vue` — Paginated room list with member counts
- `AdminMessagesPage.vue` — Recent messages table
- `src/stores/admin.ts` — Admin session (`fly_admin_token` in localStorage)
- `src/services/adminApi.ts` — Axios client for admin API endpoints

**State Management**:
- `useAuthStore`: User session, JWT token in localStorage, login/register/logout. `logout()` also disconnects the WebSocket.
- `useChatStore`: Contacts list, rooms list, messages indexed by conversation key (`${userId}-${withUserId}`), `lastActivity` map for conversation recency, typing indicators, presence

**Components** (`src/components/`):
- `MainLayout.vue` — Shell with bottom tab bar; preloads contacts, rooms, and all message histories on mount
- `TabBar.vue` — Bottom navigation (Chats / Contacts / Rooms)
- `ChatsList.vue` — Merged 1-on-1 + room conversation list sorted by last message time; includes Logout button
- `ContactsList.vue` — Friends list with inline add contact form
- `RoomsList.vue` — Room list with inline create room button
- `ConversationItem.vue` — Reusable chat list item (avatar, name, preview, timestamp)
- `CreateRoomModal.vue` — Modal overlay for creating rooms

**WebSocket Service** (`src/services/wsManager.ts`): Singleton `WsManager` shared across all components. Multi-handler registration via `registerHandler()` / `unregisterHandler()`. Each page registers its own handler in `onMounted` and unregisters in `onUnmounted`. Handles:
  - Auto pong response to server ping
  - Pending message queue when disconnected (flushed on reconnect)
  - Token expiry: `auth_ack { ok: false }` redirects to `/login`

**API Service** (`src/services/api.ts`): Axios client with JWT interceptor. All endpoints prefixed with `/api`.

**Proxy Configuration**: Vite proxies `/api` → `http://localhost:8080` and `/ws` → `ws://localhost:8080`.

## Key Implementation Details

- JWT tokens expire after 7 days; user_id is stored as `sub` claim
- Contacts are stored bidirectionally (both users have entries pointing to each other)
- Messages are keyed by `${from_user_id}-${to_user_id}` in client state for deduplication
- `lastActivity` in `useChatStore` tracks per-conversation last message timestamp, used for sorting the Chats list
- WebSocket ping/pong heartbeat: server sends ping every 30s, client responds with pong
- Presence broadcasts to all connected users when someone goes online/offline
- Tab navigation is stateless — switching tabs navigates directly to the tab's root without accumulating history
- Multi-tab: `connection.py` stores `list[WebSocket]` per user, all tabs receive messages; disconnect removes only the closing tab

# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此代码库中工作时提供指导。

## 项目概述

Fly IM 是一个即时通讯系统，包含两个子项目：
- **fly-im-server**：Python FastAPI WebSocket IM 服务器
- **fly-h5-client**：Vue 3 + TypeScript H5 客户端

## 常用命令

### 服务器（fly-im-server）
```bash
cd fly-im-server
pip install -r requirements.txt
python main.py  # 运行在 http://localhost:8080
```

### 客户端（fly-h5-client）
```bash
cd fly-h5-client
npm install
npm run dev    # 开发服务器在 http://localhost:3000
npm run build  # 生产构建
```

## 架构

### 服务器（FastAPI + WebSocket）

**技术栈**：FastAPI, SQLAlchemy（默认 SQLite）, python-jose JWT, WebSockets

**数据库模型**：
- `User`：id, username, password_hash, display_name, avatar_url
- `Contact`：user_id + contact_id（双向好友关系）
- `Message`：id, from_user_id, to_user_id, content, timestamp, delivered_at, read_at

**REST API 端点**：
- `POST /api/auth/register` - 注册新用户
- `POST /api/auth/login` - 登录并获取 JWT
- `GET /api/users/{user_id}/contacts` - 获取用户联系人（含在线状态）
- `POST /api/users/{user_id}/contacts` - 通过用户名添加联系人
- `GET /api/messages/{user_id}?with={contact_id}` - 获取消息历史（通过 `before` 参数分页）

**WebSocket（`/ws`）**：客户端先发送认证令牌，然后交换消息。消息类型：`auth`, `auth_ack`, `message`, `ack`, `typing`, `read`, `presence`, `ping`, `pong`。

**连接管理器**：追踪 `active_connections`（user_id → WebSocket），在用户连接/断开时广播在线状态变化。

### 客户端（Vue 3 + Pinia）

**技术栈**：Vue 3 Composition API, Vite, Pinia, Vue Router 4, Axios, TailwindCSS

**状态管理**：
- `useAuthStore`：用户会话，localStorage 中的 JWT 令牌，登录/注册/登出
- `useChatStore`：联系人列表，以会话键（`${userId}-${withUserId}`）索引的消息，正在输入提示，在线状态

**WebSocket 服务**（`src/services/ws.ts`）：管理 WebSocket 生命周期，处理认证握手，按类型路由收到的消息至相应处理器。

**API 服务**（`src/services/api.ts`）：带 JWT 拦截器的 Axios 客户端。所有端点前缀 `/api`。

**路由守卫**：受保护路由（`/`, `/chat/:userId`）需要认证。未认证时重定向至 `/login`。

**代理配置**：Vite 将 `/api` 代理至 `http://localhost:8080`，`/ws` 代理至 `ws://localhost:8080`。

## 关键实现细节

- JWT 令牌 7 天过期；user_id 存储在 `sub` claim 中
- 联系人是双向存储的（两个用户都有指向对方的条目）
- 客户端状态中消息以 `${from_user_id}-${to_user_id}` 为键进行去重
- 服务器每 30 秒维护 WebSocket ping/pong 心跳
- 当用户上线/下线时，向所有已连接用户广播在线状态

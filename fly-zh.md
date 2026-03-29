---
summary: "Fly 自定义 WebSocket 频道，用于自主开发的 IM 服务器集成"
read_when:
  - 开发 Fly 频道功能
title: "Fly"
---

# Fly（自定义 WebSocket 频道）

状态：实验性。通过 WebSocket 连接至任何 IM 服务器的自主开发的自定义消息频道。

## 所需插件

Fly 作为插件提供，不随核心安装捆绑。

- 通过 CLI 安装：`openclaw plugins install @openclaw/fly-channel`
- 或在设置中选择 **Fly** 并确认安装提示
- 详情：[插件](/tools/plugin)

## 快速设置

1. 安装 Fly 插件：
   - 从源码检出：`openclaw plugins install ./extensions/fly-channel`
   - 从 npm（如果已发布）：`openclaw plugins install @openclaw/fly-channel`
   - 或在设置中选择 **Fly** 并确认安装提示
2. 配置 WebSocket 服务器 URL 和认证令牌（参见[配置参考](#configuration-reference-fly)）
3. 重启网关（或完成设置）

最小配置：

```json5
{
  channels: {
    fly: {
      enabled: true,
      accounts: {
        default: {
          wsUrl: "ws://localhost:8080/ws",
          token: "your-auth-token",
          dmPolicy: "pairing",
        },
      },
    },
  },
}
```

## 是什么

Fly 是一个自主开发的自定义消息频道，通过 WebSocket 连接至任何 IM 服务器。它提供：

- **WebSocket 连接**至自定义 IM 服务器
- **基于令牌的身份验证**
- **自动重连**（指数退避）
- **通过 WebSocket 协议收发消息**

## 协议

Fly 频道期望 WebSocket 服务器遵循以下简单协议：

### 身份验证

连接后，发送认证消息：

```json
{
  "type": "auth",
  "token": "your-auth-token"
}
```

服务器应响应：

```json
{
  "type": "auth_ack",
  "ok": true,
  "userId": "user-id-here"
}
```

### 发送消息

```json
{
  "type": "message",
  "to": "recipient-id",
  "content": "Hello!",
  "timestamp": 1712000000000
}
```

### 接收消息

```json
{
  "type": "message",
  "id": "msg-id",
  "from": "sender-id",
  "to": "recipient-id",
  "content": "Hi there!",
  "timestamp": 1712000001000
}
```

### 心跳

服务器可能发送：

```json
{
  "type": "ping"
}
```

客户端应响应：

```json
{
  "type": "pong"
}
```

## 功能特性

| 功能              | 状态             |
| ---------------- | ---------------- |
| 私信              | ✅ 支持           |
| 群组（聊天室）      | ✅ 支持           |
| 媒体              | ❌ 不支持         |
| 反应              | ❌ 不支持         |
| 线程              | ❌ 不支持         |
| 投票              | ❌ 不支持         |
| 原生命令          | ❌ 不支持         |
| 流式传输          | ⚠️ 阻止          |
| WebSocket 连接    | ✅ 支持           |
| 令牌认证 (JWT)    | ✅ 支持           |
| 自动重连          | ✅ 支持（客户端）  |
| 在线状态          | ✅ 支持           |
| 正在输入提示      | ✅ 支持           |
| 消息已读回执      | ✅ 支持           |
| 管理后台接口       | ✅ 支持           |

## 架构

Fly 频道插件遵循标准的 OpenClaw 频道插件结构：

```
extensions/fly-channel/
├── package.json           # NPM 包，包含 openclaw.channel 元数据
├── openclaw.plugin.json   # 插件清单
├── index.ts              # defineChannelPluginEntry
├── setup-entry.ts        # defineSetupPluginEntry
└── src/
    ├── channel.ts        # ChannelPlugin 对象
    ├── runtime.ts        # 运行时存储初始化
    ├── runtime-api.ts    # 类型定义
    ├── config-schema.ts  # 配置验证 schema
    ├── probe.ts          # 健康检查
    ├── send.ts           # 出站消息发送
    ├── monitor.ts        # 入站消息处理
    └── ws-client.ts      # 带重连的 WebSocket 客户端
```

### 关键组件

**`ws-client.ts`** - WebSocket 客户端实现：

- 自动重连的连接管理
- 基于令牌的身份验证
- 消息解析和序列化
- 连接状态的 StatusSink

**`monitor.ts`** - 入站消息处理：

- WebSocket 连接生命周期
- 消息路由至回复管道（TODO）
- 私信策略执行

**`send.ts`** - 出站消息发送：

- 发射后遗忘的消息发送
- 用于一次性发送的 WebSocket 连接

## 配置参考（Fly）

完整配置：[配置](/gateway/configuration)

提供商选项：

- `channels.fly.enabled`：启用/禁用频道启动。
- `channels.fly.accounts.<id>.wsUrl`：WebSocket 服务器 URL（例如 `ws://localhost:8080/ws` 或 `wss://example.com/ws`）。
- `channels.fly.accounts.<id>.token`：IM 服务器的认证令牌。
- `channels.fly.accounts.<id>.tokenFile`：改为从文件路径读取令牌。
- `channels.fly.accounts.<id>.dmPolicy`：`pairing | allowlist | open | disabled`（默认：pairing）。
- `channels.fly.accounts.<id>.allowFrom`：私信白名单（用户 ID）。`open` 需要 `"*"`。
- `channels.fly.accounts.<id>.reconnectDelayMs`：重连延迟毫秒（默认：1000）。
- `channels.fly.accounts.<id>.maxReconnectDelayMs`：最大重连延迟毫秒（默认：30000）。
- `channels.fly.accounts.<id>.textChunkLimit`：消息分块大小限制。

环境变量后备：`FLY_AUTH_TOKEN`

## 投递目标（CLI/cron）

- 使用目标 ID 作为目标。
- 示例：`openclaw message send --channel fly --target user123 --message "hi"`

## 故障排除

**频道未启动：**

- 检查插件是否已安装：`openclaw plugins list`
- 验证 WebSocket URL 有效：必须是 `ws://` 或 `wss://`
- 查看网关日志：`openclaw logs --follow`

**认证失败：**

- 验证令牌是否正确
- 检查服务器日志中的认证错误
- 尝试使用 WebSocket 客户端工具连接

**消息发送失败：**

- 检查 WebSocket 连接：`openclaw channels status --probe`
- 验证与 WebSocket 服务器的网络连接
- 检查防火墙规则

---

# Fly IM 系统实现

本文档描述了完整的 Fly IM 系统实现，包括一个 Python WebSocket 服务器和一个 Vue H5 客户端。

## 系统架构

```
┌─────────────────┐     WebSocket      ┌─────────────────┐
│   OpenClaw      │◄─────────────────►│                 │
│  fly-channel    │   ws://.../ws     │   Python IM     │
│                 │                   │   Server        │
└─────────────────┘                   └────────┬────────┘
                                                │
                                         ┌──────▼────────┐
                                         │   SQLite DB   │
                                         └───────────────┘
                                                │
                                                │ HTTP REST
                                         ┌──────┴────────┐
                                         │   Vue H5      │
                                         │   Client      │
                                         └───────────────┘
```

## 协议规范

### 消息类型

| 类型             | 方向           | 描述                     |
| ---------------- | ------------- | ----------------------- |
| `auth`           | 客户端→服务器   | 认证请求                 |
| `auth_ack`       | 服务器→客户端   | 认证响应                 |
| `message`        | 双向           | 私聊消息                 |
| `room_message`   | 双向           | 聊天室消息               |
| `ping`           | 服务器→客户端   | 心跳请求（30秒间隔）       |
| `pong`           | 客户端→服务器   | 心跳响应                 |
| `ack`            | 服务器→客户端   | 消息投递确认             |
| `read`           | 客户端→服务器   | 消息已读标记             |
| `typing`         | 双向           | 正在输入提示             |
| `presence`       | 服务器→客户端   | 联系人上线/下线通知       |
| `room_join`      | 客户端→服务器   | 加入聊天室               |
| `room_leave`     | 客户端→服务器   | 离开聊天室               |
| `room_member_joined` | 服务器→客户端 | 成员加入通知             |
| `room_member_left` | 服务器→客户端 | 成员离开通知             |
| `error`          | 服务器→客户端   | 错误通知                 |

### 消息格式

所有消息均为 JSON：

```json
{
  "type": "message",
  "id": "msg-uuid",
  "from": "user-id",
  "to": "recipient-id",
  "content": "Hello!",
  "timestamp": 1712000000000,
  "metadata": {}
}
```

## Python IM 服务器

位置：`fly-im-server/`

### 技术栈

- **框架**：FastAPI + uvicorn
- **WebSocket**：fastapi websockets
- **数据库**：SQLite（通过 SQLAlchemy）
- **认证**：JWT 令牌

### API 端点

#### REST API

| 方法 | 路径                              | 描述           |
| ---- | --------------------------------- | ------------- |
| POST | `/api/auth/register`              | 注册新用户      |
| POST | `/api/auth/login`                 | 登录并获取令牌   |
| GET  | `/api/users/{user_id}`             | 获取用户信息     |
| GET  | `/api/users/{user_id}/contacts`    | 获取用户联系人   |
| POST | `/api/users/{user_id}/contacts`    | 添加联系人       |
| GET  | `/api/messages/{user_id}?with={id}&limit=50&before={timestamp}` | 获取消息历史（分页） |
| GET  | `/api/rooms`                      | 获取我的聊天室列表 |
| POST | `/api/rooms`                      | 创建聊天室       |
| GET  | `/api/rooms/{room_id}`            | 获取聊天室详情    |
| GET  | `/api/rooms/{room_id}/members`    | 获取聊天室成员列表 |
| POST | `/api/rooms/{room_id}/members`    | 添加聊天室成员    |
| DELETE | `/api/rooms/{room_id}/members/{user_id}` | 删除聊天室成员 |
| DELETE | `/api/rooms/{room_id}`            | 删除聊天室（仅创建者）|
| GET  | `/api/rooms/{room_id}/messages?limit=50&before={timestamp}` | 获取聊天室消息历史 |
| GET  | `/api/admin/stats`                | 系统统计（用户数、房间数、消息数、在线人数）|
| GET  | `/api/admin/users?limit=50&offset=0` | 用户列表（分页）|
| GET  | `/api/admin/rooms?limit=50&offset=0` | 聊天室列表（含成员数，分页）|
| GET  | `/api/admin/messages/recent?limit=50` | 最近消息 |

#### WebSocket

| 路径  | 描述             |
| ----- | --------------- |
| `/ws` | 主 WebSocket 端点 |

**服务器处理逻辑**：
1. 接收 `auth` 消息验证 JWT token
2. 用户连接时广播 `presence` (online=true) 给所有在线联系人
3. 用户断开时广播 `presence` (online=false)
4. 收到 `message` 时：保存消息 → 推送给接收方（如果在线）→ 返回 `ack`
5. 收到 `room_message` 时：验证成员资格 → 保存消息 → 广播给所有在线成员 → 返回 `ack`
6. 收到 `room_join` 时：验证成员资格 → 加入内存追踪 → 广播加入通知
7. 收到 `room_leave` 时：移出内存追踪 → 广播离开通知
8. 收到 `read` 时：更新消息的 `read_at` 时间戳
9. 收到 `typing` 时：转发给接收方（如果在线）
10. 每 30 秒发送 `ping` 维持连接

### 数据库 Schema

```sql
-- 用户表
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 联系人表
CREATE TABLE contacts (
  user_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, contact_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (contact_id) REFERENCES users(id)
);

-- 消息表
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL,
  to_user_id TEXT,
  room_id TEXT,
  content TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  delivered_at INTEGER,
  read_at INTEGER,
  FOREIGN KEY (from_user_id) REFERENCES users(id),
  FOREIGN KEY (to_user_id) REFERENCES users(id),
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);

-- 聊天室表
CREATE TABLE rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 聊天室成员表
CREATE TABLE room_members (
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (room_id, user_id),
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 索引
CREATE INDEX idx_messages_from ON messages(from_user_id);
CREATE INDEX idx_messages_to ON messages(to_user_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX ix_messages_room_id ON messages(room_id);
```

### 安装与运行

```bash
cd fly-im-server

# 安装依赖
pip install -r requirements.txt

# 运行服务器
python main.py  # 运行在 http://localhost:8080
```

### 服务器配置

环境变量：

| 变量              | 默认值                  | 描述                    |
| ---------------- | --------------------- | --------------------- |
| `DATABASE_URL`   | `sqlite:///./fly_im.db` | 数据库连接字符串         |
| `SECRET_KEY`     | （必填）               | JWT 密钥                |
| `WS_PING_INTERVAL` | `30`                | WebSocket ping 间隔（秒）|
| `WS_PING_TIMEOUT` | `10`                | WebSocket ping 超时（秒）|

## Vue H5 客户端

位置：`fly-h5-client/`

### 技术栈

- **框架**：Vue 3 + Composition API
- **构建**：Vite
- **HTTP**：Axios
- **WebSocket**：原生 WebSocket API
- **状态**：Pinia
- **路由**：Vue Router 4
- **UI**：TailwindCSS + HeadlessUI

### 功能特性

| 功能            | 描述                 |
| -------------- | ------------------- |
| 登录/注册        | 用户身份验证          |
| 联系人列表        | 查看和管理联系人       |
| 私聊            | 实时私聊消息          |
| 聊天室列表        | 查看和加入聊天室       |
| 聊天室聊天        | 实时群聊消息          |
| 消息历史         | 加载更早的消息        |
| 在线状态         | 显示在线/离线状态     |
| 正在输入提示      | 显示联系人正在输入     |

### 页面

| 路由            | 组件         | 描述           |
| -------------- | ------------ | ------------- |
| `/login`       | LoginPage    | 用户登录        |
| `/register`    | RegisterPage | 用户注册        |
| `/`            | HomePage     | 联系人列表       |
| `/chat/:userId` | ChatPage    | 私聊对话        |
| `/room/:roomId` | RoomChatPage | 聊天室对话      |

### API 服务

```typescript
// src/services/api.ts
const API_BASE = 'http://localhost:8080/api'

// REST API
export const api = {
  register(username, password, displayName)
  login(username, password)
  getUser(userId)
  getContacts(userId)
  addContact(userId, contactId)
  getMessages(userId, limit, before)
}

// WebSocket
export function createWebSocket(token, handlers)
```

### WebSocket 处理器

```typescript
interface WsHandlers {
  onOpen: () => void;
  onClose: () => void;
  onError: (error) => void;
  onMessage: (message) => void;
  onAuthAck: (result) => void;
  onAck: (messageId) => void;
}
```

## 集成

### OpenClaw 配置

```json5
{
  channels: {
    fly: {
      enabled: true,
      accounts: {
        default: {
          wsUrl: "ws://localhost:8080/ws",
          token: "your-jwt-token",
          dmPolicy: "pairing",
        },
      },
    },
  },
}
```

### 端到端流程

1. **用户在 Vue H5 客户端注册** → 服务器存储用户
2. **用户登录** → 服务器返回 JWT 令牌
3. **客户端使用 JWT 令牌连接 WebSocket**
4. **服务器验证令牌**，发送 `auth_ack`
5. **OpenClaw 使用自己的令牌连接**至同一 WebSocket
6. **用户通过 WebSocket 消息聊天**
7. **OpenClaw AI 响应**通过服务器路由回去

## 另请参阅

- [频道插件开发](/guides/channel-plugin-development)
- [插件](/tools/plugin)
- [配置](/gateway/configuration)

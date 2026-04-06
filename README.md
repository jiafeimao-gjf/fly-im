# Fly IM

即时通讯系统，包含 Python FastAPI WebSocket 服务器和 Vue 3 H5 客户端。

## 项目结构

```
fly-im/
├── fly-im-server/     # Python FastAPI WebSocket IM 服务器
└── fly-h5-client/    # Vue 3 + TypeScript H5 客户端
```

## 快速开始

### 启动服务器

```bash
cd fly-im-server
pip install -r requirements.txt
python main.py
# 运行于 http://localhost:8080
```

### 启动客户端

```bash
cd fly-h5-client
npm install
npm run dev
# 开发服务器 http://localhost:3000
```

## 技术栈

**服务端**: FastAPI, SQLAlchemy (SQLite), python-jose JWT, WebSocket

**客户端**: Vue 3 Composition API, Vite, Pinia, Vue Router 4, Axios, TailwindCSS

## 核心功能

- **用户认证**: 注册、登录、JWT 会话（7 天有效期）
- **联系人管理**: 添加/查看联系人（双向好友关系）
- **私聊**: 实时 WebSocket 消息投递，支持多 Tab 同时在线
- **聊天室**: 创建/加入聊天室，群聊消息推送
- **在线状态**: 联系人上下线实时广播
- **输入提示**: typing 状态实时同步
- **消息已读**: read 回执
- **心跳保活**: 30s ping/pong 机制
- **管理后台**: 系统统计、用户/聊天室/消息管理

## 架构

```
WebSocket / REST API (8080)
         │
         ▼
  ┌──────────────┐
  │  Python IM    │
  │   Server      │
  └──────┬───────┘
         │
    ┌────▼────┐
    │ SQLite  │
    └─────────┘
```

### WebSocket 消息类型

`auth`, `auth_ack`, `message`, `room_message`, `ack`, `ping`, `pong`, `typing`, `read`, `presence`, `room_join`, `room_leave`, `room_member_joined`, `room_member_left`, `error`

### REST API

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/auth/register` | 注册用户 |
| POST | `/api/auth/login` | 登录获取 JWT |
| GET | `/api/users/{user_id}/contacts` | 获取联系人列表 |
| POST | `/api/users/{user_id}/contacts` | 添加联系人 |
| GET | `/api/messages/{user_id}?with={id}` | 获取私聊历史 |
| GET | `/api/rooms` | 获取聊天室列表 |
| POST | `/api/rooms` | 创建聊天室 |
| GET | `/api/rooms/{room_id}/messages` | 获取聊天室消息 |
| GET | `/api/admin/stats` | 系统统计 |
| GET | `/api/admin/users` | 用户列表（分页）|
| GET | `/api/admin/rooms` | 聊天室列表（分页）|

## 多 Tab 支持

服务端 `active_connections` 为 `dict[user_id, list[WebSocket]]`，所有 Tab 均能收到消息。断开时只移除当前 Tab 的连接，全部 Tab 断开才广播离线。

## 已知问题

- SQLite 并发写入可能 `database is locked`（建议生产环境切换 PostgreSQL/MySQL）
- 离线消息无主动推送，用户上线后需手动拉取历史
- 聊天室 `room_member_joined/left` 事件依赖内存状态，与消息推送（数据库查询）不一致

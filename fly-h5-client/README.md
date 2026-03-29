# Fly H5 Client

Fly IM 系统的 Vue 3 + Vite + TypeScript H5 客户端。

## 技术栈

- **框架**: Vue 3 + Composition API
- **构建**: Vite
- **HTTP**: Axios
- **WebSocket**: 原生 WebSocket API
- **状态管理**: Pinia
- **路由**: Vue Router 4
- **UI**: TailwindCSS

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 生产构建
npm run build
```

## 配置

客户端连接 IM 服务器地址为 `http://localhost:8080`。如需修改，请更改 `vite.config.ts` 中的代理配置。

## 功能特性

- 用户注册和登录（JWT 令牌）
- 联系人列表（在线/离线状态）
- 基于 WebSocket 的实时聊天
- 消息历史分页（通过 `before` 时间戳）
- 正在输入提示（3秒超时）
- 在线状态通知
- 消息已读回执
- 基于 ID 的消息去重

## 页面

| 路由 | 组件 | 权限 | 说明 |
|------|------|------|------|
| `/login` | LoginPage | 游客 | 用户登录 |
| `/register` | RegisterPage | 游客 | 用户注册 |
| `/` | HomePage | 需认证 | 联系人列表 |
| `/chat/:userId` | ChatPage | 需认证 | 聊天对话 |

## 状态管理 (Pinia)

### useAuthStore
- `user` - 当前用户信息
- `token` - JWT 令牌（持久化到 localStorage）
- `isLoggedIn` - 登录状态计算属性
- `login()`, `register()`, `logout()` - 认证操作

### useChatStore
- `contacts` - 联系人列表
- `messages` - 消息字典（`${userId}-${withUserId}` → Message[]）
- `typingUsers` - 当前正在输入的用户集合
- `loadContacts()`, `addContact()`, `loadMessages()`, `addMessage()` - 数据操作
- `setTyping()`, `updateContactPresence()` - UI 状态

## 项目结构

```
src/
├── main.ts              # 应用入口
├── App.vue              # 根组件
├── router/index.ts      # Vue Router 配置（含路由守卫）
├── stores/
│   ├── auth.ts          # 认证状态 (Pinia)
│   └── chat.ts          # 聊天状态（联系人、消息、输入提示）
├── services/
│   ├── api.ts           # Axios 客户端（JWT 拦截器）
│   └── ws.ts            # WebSocket 服务
├── pages/
│   ├── LoginPage.vue    # 登录表单
│   ├── RegisterPage.vue # 注册表单
│   ├── HomePage.vue     # 联系人列表
│   └── ChatPage.vue     # 聊天窗口
└── types/index.ts       # TypeScript 类型定义
```

## WebSocket 协议

连接时发送认证：
```json
{ "type": "auth", "token": "jwt-token" }
```

服务器响应：
```json
{ "type": "auth_ack", "ok": true, "userId": "..." }
```

发送消息：
```json
{ "type": "message", "to": "recipient-id", "content": "你好", "timestamp": 1234567890 }
```

其他消息类型：`typing`（正在输入）、`read`（已读标记）、`pong`（响应服务器 `ping`）

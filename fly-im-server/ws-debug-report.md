# WebSocket 连接异常掉线问题分析报告

> 分析日期：2026-03-29
> 修复日期：2026-03-29

---

## 问题 1：重复 `accept()` 导致连接不稳定 ✅ 已修复

**严重程度：高**

**位置：** `websocket.py:21` + `connection.py:15-16`

**修复方案：** 移除 `connection.py:connect()` 中的重复 `await websocket.accept()`，添加注释说明 accept 在 `websocket.py` 中已调用。

---

## 问题 2：`disconnect` 中 `asyncio.create_task` 在同步上下文中无效 ✅ 已修复

**严重程度：高**

**位置：** `connection.py:42-43`、`connection.py:46`

**修复方案：** `disconnect` 改为 `async def`，内部直接 `await leave_room` 和 `await broadcast_presence`，调用方 `finally` 块用 `await manager.disconnect()`。

---

## 问题 3：消息发送异常被静默吞噬 ✅ 已修复

**严重程度：中**

**位置：** `connection.py:66-68`

**修复方案：** `except: pass` 改为 `except Exception as e: print(f"[WARN] Failed to send to {user_id}: {e}")`

---

## 问题 4：心跳无超时检测 ✅ 已修复

**严重程度：中**

**位置：** `websocket.py:76-84`

**修复方案：** 添加 `pong_received` 标志追踪，发送 ping 后等待 `WS_PING_TIMEOUT` 秒，未收到 pong 则退出循环。

---

## 修复状态汇总

| 问题 | 状态 | 修复文件 |
|------|------|---------|
| 重复 accept() | ✅ 已修复 | `connection.py:15` |
| disconnect 同步上下文无效 | ✅ 已修复 | `connection.py:24` + `websocket.py:278` |
| 发送异常静默吞噬 | ✅ 已修复 | `connection.py:68-69` |
| 心跳无超时检测 | ✅ 已修复 | `websocket.py:75-108` |

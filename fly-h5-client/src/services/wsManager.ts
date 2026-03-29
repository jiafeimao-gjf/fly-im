import type { WSMessage } from '@/types'

export type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'

export interface WsManagerOptions {
  url: string
  token: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
}

export interface WsManagerHandlers {
  onStatusChange?: (status: WsStatus) => void
  onMessage?: (message: WSMessage) => void
  onAuthAck?: (result: { ok: boolean; userId?: string; error?: string }) => void
  onAck?: (messageId: string) => void
  onTyping?: (from: string, roomId?: string) => void
  onPresence?: (userId: string, online: boolean) => void
  onRoomMessage?: (message: WSMessage) => void
  onRoomMemberJoined?: (roomId: string, userId: string) => void
  onRoomMemberLeft?: (roomId: string, userId: string) => void
  onRoomJoined?: (roomId: string) => void
  onRoomLeft?: (roomId: string) => void
  onError?: (error: string) => void
}

class WsManager {
  private ws: WebSocket | null = null
  private options: WsManagerOptions
  private handlers: WsManagerHandlers
  private status: WsStatus = 'disconnected'
  private reconnectAttempts = 0
  private heartbeatTimer: number | null = null
  private shouldReconnect = true

  constructor(options: WsManagerOptions, handlers: WsManagerHandlers) {
    this.options = {
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      ...options,
    }
    this.handlers = handlers
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return

    this.setStatus('connecting')
    this.shouldReconnect = true

    try {
      this.ws = new WebSocket(this.options.url)
      this.setupEventHandlers()
    } catch (error) {
      console.error('WebSocket connection error:', error)
      this.scheduleReconnect()
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) return

    this.ws.onopen = () => {
      this.send({ type: 'auth', token: this.options.token })
    }

    this.ws.onclose = () => {
      this.cleanup()
      if (this.shouldReconnect) {
        this.scheduleReconnect()
      }
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    this.ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data)
        this.dispatchMessage(msg)
      } catch {
        // Ignore parse errors
      }
    }
  }

  private dispatchMessage(msg: WSMessage): void {
    switch (msg.type) {
      case 'auth_ack':
        if (msg.ok) {
          this.setStatus('connected')
          this.reconnectAttempts = 0
          this.startHeartbeat()
          this.handlers.onAuthAck?.({ ok: true, userId: msg.userId })
        } else {
          this.setStatus('disconnected')
          this.handlers.onAuthAck?.({ ok: false, error: msg.error })
        }
        break

      case 'pong':
        break

      case 'message':
        this.handlers.onMessage?.(msg)
        break

      case 'room_message':
        this.handlers.onRoomMessage?.(msg)
        break

      case 'room_member_joined':
        if (msg.room_id && msg.userId) {
          this.handlers.onRoomMemberJoined?.(msg.room_id, msg.userId)
        }
        break

      case 'room_member_left':
        if (msg.room_id && msg.userId) {
          this.handlers.onRoomMemberLeft?.(msg.room_id, msg.userId)
        }
        break

      case 'room_joined':
        if (msg.room_id) {
          this.handlers.onRoomJoined?.(msg.room_id)
        }
        break

      case 'room_left':
        if (msg.room_id) {
          this.handlers.onRoomLeft?.(msg.room_id)
        }
        break

      case 'ack':
        if (msg.id) this.handlers.onAck?.(msg.id)
        break

      case 'typing':
        this.handlers.onTyping?.(msg.from || '', msg.room_id)
        break

      case 'presence':
        if (msg.userId) this.handlers.onPresence?.(msg.userId, msg.online ?? false)
        break

      case 'error':
        this.handlers.onError?.(msg.error || 'Unknown error')
        break

      default:
        this.handlers.onMessage?.(msg)
    }
  }

  private setStatus(status: WsStatus): void {
    if (this.status !== status) {
      this.status = status
      this.handlers.onStatusChange?.(status)
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= (this.options.maxReconnectAttempts || 10)) {
      this.setStatus('disconnected')
      return
    }

    this.setStatus('reconnecting')
    this.reconnectAttempts++

    const delay = Math.min(
      (this.options.reconnectInterval || 3000) * Math.pow(1.5, this.reconnectAttempts - 1),
      30000
    )

    setTimeout(() => this.connect(), delay)
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatTimer = window.setInterval(() => {
      this.send({ type: 'ping' })
    }, this.options.heartbeatInterval)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private cleanup(): void {
    this.stopHeartbeat()
    if (this.ws) {
      this.ws.onclose = null
      this.ws.close()
      this.ws = null
    }
  }

  send(message: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  sendMessage(to: string, content: string, id?: string): void {
    this.send({
      type: 'message',
      id: id || crypto.randomUUID(),
      to,
      content,
      timestamp: Date.now(),
    })
  }

  sendRoomMessage(roomId: string, content: string, id?: string): void {
    this.send({
      type: 'room_message',
      id: id || crypto.randomUUID(),
      room_id: roomId,
      content,
      timestamp: Date.now(),
    })
  }

  sendTyping(to: string, roomId?: string): void {
    this.send({ type: 'typing', to, room_id: roomId })
  }

  sendRead(messageId: string): void {
    this.send({ type: 'read', id: messageId })
  }

  sendPong(): void {
    this.send({ type: 'pong' })
  }

  joinRoom(roomId: string): void {
    this.send({ type: 'room_join', room_id: roomId })
  }

  leaveRoom(roomId: string): void {
    this.send({ type: 'room_leave', room_id: roomId })
  }

  disconnect(): void {
    this.shouldReconnect = false
    this.cleanup()
    this.setStatus('disconnected')
  }

  getStatus(): WsStatus {
    return this.status
  }
}

let wsManagerInstance: WsManager | null = null

export function createWsManager(options: WsManagerOptions, handlers: WsManagerHandlers): WsManager {
  if (wsManagerInstance) {
    wsManagerInstance.disconnect()
  }
  wsManagerInstance = new WsManager(options, handlers)
  return wsManagerInstance
}

export function getWsManager(): WsManager | null {
  return wsManagerInstance
}

export { WsManager }

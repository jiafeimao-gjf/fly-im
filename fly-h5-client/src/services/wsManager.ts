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
  private options: WsManagerOptions | null = null
  private handlerSets: WsManagerHandlers[] = []
  private status: WsStatus = 'disconnected'
  private reconnectAttempts = 0
  private heartbeatTimer: number | null = null
  private shouldReconnect = true
  private pendingQueue: object[] = []
  private reconnectTimer: number | null = null

  connect(options: WsManagerOptions): void {
    // If already open, do nothing
    if (this.ws?.readyState === WebSocket.OPEN) return

    // If token changed while connecting, force reconnect with new credentials
    if (this.options?.token !== options.token) {
      this.disconnect(false)
    }

    // Cancel any pending reconnect
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    this.options = options
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
      this.send({ type: 'auth', token: this.options!.token })
      this.flushQueue()
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
    for (const handlers of this.handlerSets) {
      switch (msg.type) {
        case 'auth_ack':
          if (msg.ok) {
            this.setStatus('connected')
            this.reconnectAttempts = 0
            this.startHeartbeat()
            handlers.onAuthAck?.({ ok: true, userId: msg.userId })
          } else {
            this.setStatus('disconnected')
            handlers.onAuthAck?.({ ok: false, error: msg.error })
          }
          break

        case 'pong':
          break

        case 'ping':
          this.send({ type: 'pong' })
          break

        case 'message':
          handlers.onMessage?.(msg)
          break

        case 'room_message':
          handlers.onRoomMessage?.(msg)
          break

        case 'room_member_joined':
          if (msg.room_id && msg.userId) {
            handlers.onRoomMemberJoined?.(msg.room_id, msg.userId)
          }
          break

        case 'room_member_left':
          if (msg.room_id && msg.userId) {
            handlers.onRoomMemberLeft?.(msg.room_id, msg.userId)
          }
          break

        case 'room_joined':
          if (msg.room_id) {
            handlers.onRoomJoined?.(msg.room_id)
          }
          break

        case 'room_left':
          if (msg.room_id) {
            handlers.onRoomLeft?.(msg.room_id)
          }
          break

        case 'ack':
          if (msg.id) handlers.onAck?.(msg.id)
          break

        case 'typing':
          handlers.onTyping?.(msg.from || '', msg.room_id)
          break

        case 'presence':
          if (msg.userId) handlers.onPresence?.(msg.userId, msg.online ?? false)
          break

        case 'error':
          handlers.onError?.(msg.error || 'Unknown error')
          break

        default:
          handlers.onMessage?.(msg)
      }
    }
  }

  private setStatus(status: WsStatus): void {
    if (this.status !== status) {
      this.status = status
      for (const handlers of this.handlerSets) {
        handlers.onStatusChange?.(status)
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) return // Already scheduled

    if (this.reconnectAttempts >= (this.options?.maxReconnectAttempts || 10)) {
      this.setStatus('disconnected')
      return
    }

    this.setStatus('reconnecting')
    this.reconnectAttempts++

    const delay = Math.min(
      (this.options?.reconnectInterval || 3000) * Math.pow(1.5, this.reconnectAttempts - 1),
      30000
    )

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null
      if (this.shouldReconnect && this.options) {
        this.connect(this.options)
      }
    }, delay)
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatTimer = window.setInterval(() => {
      this.send({ type: 'ping' })
    }, this.options?.heartbeatInterval || 30000)
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

  private flushQueue(): void {
    while (this.pendingQueue.length > 0) {
      const msg = this.pendingQueue.shift()
      if (msg && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(msg))
      }
    }
  }

  private send(message: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      // Queue message for when connection is restored
      this.pendingQueue.push(message)
      // Trigger reconnect if not already connecting/reconnecting and we have options
      if (this.options && this.status !== 'connecting' && this.status !== 'reconnecting') {
        this.shouldReconnect = true
        this.reconnectAttempts = 0
        this.connect(this.options)
      }
    }
  }

  // --- Public API ---

  registerHandler(handlers: WsManagerHandlers): void {
    this.handlerSets.push(handlers)
  }

  unregisterHandler(handlers: WsManagerHandlers): void {
    const idx = this.handlerSets.indexOf(handlers)
    if (idx !== -1) this.handlerSets.splice(idx, 1)
  }

  sendMessage(to: string, content: string, id?: string): void {
    const msg = {
      type: 'message',
      id: id || crypto.randomUUID(),
      to,
      content,
      timestamp: Date.now(),
    }
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    } else {
      this.pendingQueue.push(msg)
      this.triggerReconnectIfNeeded()
    }
  }

  sendRoomMessage(roomId: string, content: string, id?: string): void {
    const msg = {
      type: 'room_message',
      id: id || crypto.randomUUID(),
      room_id: roomId,
      content,
      timestamp: Date.now(),
    }
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    } else {
      this.pendingQueue.push(msg)
      this.triggerReconnectIfNeeded()
    }
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

  disconnect(clearReconnect = true): void {
    this.shouldReconnect = !clearReconnect
    this.cleanup()
    this.setStatus('disconnected')
  }

  getStatus(): WsStatus {
    return this.status
  }

  private triggerReconnectIfNeeded(): void {
    if (this.options && this.status !== 'connecting' && this.status !== 'reconnecting') {
      this.shouldReconnect = true
      this.reconnectAttempts = 0
      this.connect(this.options)
    }
  }
}

let wsManagerInstance: WsManager | null = null

export function getOrCreateManager(): WsManager {
  if (!wsManagerInstance) {
    wsManagerInstance = new WsManager()
  }
  return wsManagerInstance
}

export function getWsManager(): WsManager | null {
  return wsManagerInstance
}

export { WsManager }

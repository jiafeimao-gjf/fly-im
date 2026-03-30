import type { WSMessage } from '@/types'
import { uuid } from '@/utils/uuid'

export interface WsHandlers {
  onOpen: () => void
  onClose: () => void
  onError: (error: Event) => void
  onMessage: (message: WSMessage) => void
  onAuthAck: (result: { ok: boolean; userId?: string; error?: string }) => void
  onAck: (messageId: string) => void
  onTyping: (from: string) => void
  onPresence: (userId: string, online: boolean) => void
}

export function createWebSocket(token: string, wsUrl: string, handlers: WsHandlers): WebSocket {
  const ws = new WebSocket(wsUrl)

  ws.onopen = () => {
    // Send auth message
    ws.send(JSON.stringify({ type: 'auth', token }))
  }

  ws.onclose = () => {
    handlers.onClose()
  }

  ws.onerror = (error) => {
    handlers.onError(error)
  }

  ws.onmessage = (event) => {
    try {
      const msg: WSMessage = JSON.parse(event.data)

      switch (msg.type) {
        case 'auth_ack':
          handlers.onAuthAck({
            ok: msg.ok ?? false,
            userId: msg.userId,
            error: msg.error,
          })
          break
        case 'ack':
          if (msg.id) {
            handlers.onAck(msg.id)
          }
          break
        case 'typing':
          if (msg.from) {
            handlers.onTyping(msg.from)
          }
          break
        case 'presence':
          if (msg.userId) {
            handlers.onPresence(msg.userId, msg.online ?? false)
          }
          break
        case 'message':
          handlers.onMessage(msg)
          break
        case 'pong':
          // Heartbeat response - ignore
          break
        default:
          handlers.onMessage(msg)
      }
    } catch {
      // Ignore parse errors
    }
  }

  return ws
}

export function sendMessage(ws: WebSocket, to: string, content: string, id?: string): void {
  const msg: WSMessage = {
    type: 'message',
    id: id || uuid(),
    to,
    content,
    timestamp: Date.now(),
  }
  ws.send(JSON.stringify(msg))
}

export function sendTyping(ws: WebSocket, to: string): void {
  ws.send(JSON.stringify({ type: 'typing', to }))
}

export function sendPong(ws: WebSocket): void {
  ws.send(JSON.stringify({ type: 'pong' }))
}

export function sendRead(ws: WebSocket, messageId: string): void {
  ws.send(JSON.stringify({ type: 'read', id: messageId }))
}

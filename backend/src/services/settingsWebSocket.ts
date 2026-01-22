import { WebSocketServer, WebSocket, type RawData } from 'ws'
import type { Server } from 'http'
import type { IncomingMessage } from 'http'
import jwt from 'jsonwebtoken'
import { env } from '../env'
import { createLogger } from './logger'

const logger = createLogger('settingsWebSocket')

// 扩展 WebSocket 类型
type AuthenticatedWebSocket = WebSocket & {
  userId?: string
  isAlive?: boolean
}

interface SettingsMessage {
  type: 'settings_update' | 'ping' | 'pong'
  userId?: string
  settings?: unknown
  updatedAt?: string
}

// 存储所有连接的客户端，按 userId 分组
const clients = new Map<string, Set<AuthenticatedWebSocket>>()

let wss: WebSocketServer | null = null

/**
 * 初始化 WebSocket 服务器
 */
export function initSettingsWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: '/ws/settings' })

  wss.on('connection', (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
    // 从 URL 参数获取 token
    const url = new URL(req.url || '', `http://${req.headers.host}`)
    const token = url.searchParams.get('token')

    if (!token) {
      ws.close(4001, 'Missing token')
      return
    }

    // 验证 token
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string }
      ws.userId = decoded.userId
      ws.isAlive = true

      // 添加到客户端列表
      if (!clients.has(ws.userId)) {
        clients.set(ws.userId, new Set())
      }
      clients.get(ws.userId)!.add(ws)

      logger.info(`WebSocket connected`, { userId: ws.userId })

      // 心跳检测
      ws.on('pong', () => {
        ws.isAlive = true
      })

      ws.on('message', (data: RawData) => {
        try {
          const message = JSON.parse(data.toString()) as SettingsMessage
          if (message.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }))
          }
        } catch {
          // 忽略无效消息
        }
      })

      ws.on('close', () => {
        if (ws.userId) {
          const userClients = clients.get(ws.userId)
          if (userClients) {
            userClients.delete(ws)
            if (userClients.size === 0) {
              clients.delete(ws.userId)
            }
          }
          logger.info(`WebSocket disconnected`, { userId: ws.userId })
        }
      })

      ws.on('error', (error: Error) => {
        logger.error(`WebSocket error`, { userId: ws.userId, error: error.message })
      })

    } catch {
      ws.close(4002, 'Invalid token')
    }
  })

  // 心跳检测定时器（每 30 秒）
  const heartbeatInterval = setInterval(() => {
    wss?.clients.forEach((ws: WebSocket) => {
      const authWs = ws as AuthenticatedWebSocket
      if (authWs.isAlive === false) {
        return authWs.terminate()
      }
      authWs.isAlive = false
      authWs.ping()
    })
  }, 30000)

  wss.on('close', () => {
    clearInterval(heartbeatInterval)
  })

  logger.info('Settings WebSocket server initialized')
}

/**
 * 广播设置更新给指定用户的所有连接（除了发送者）
 */
export function broadcastSettingsUpdate(
  userId: string,
  settings: unknown,
  excludeWs?: WebSocket
) {
  const userClients = clients.get(userId)
  if (!userClients || userClients.size === 0) {
    return
  }

  const message: SettingsMessage = {
    type: 'settings_update',
    userId,
    settings,
    updatedAt: new Date().toISOString(),
  }

  const payload = JSON.stringify(message)

  userClients.forEach((ws) => {
    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(payload)
    }
  })

  logger.debug(`Broadcasted settings update`, { 
    userId, 
    clientCount: userClients.size - (excludeWs ? 1 : 0) 
  })
}

/**
 * 获取当前连接数
 */
export function getConnectionCount(): number {
  let count = 0
  clients.forEach((set) => {
    count += set.size
  })
  return count
}

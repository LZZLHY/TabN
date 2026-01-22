import { useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '../stores/auth'
import { applySettingsFile } from '../utils/settingsFile'
import { toast } from 'sonner'

interface SettingsMessage {
  type: 'settings_update' | 'ping' | 'pong'
  userId?: string
  settings?: unknown
  updatedAt?: string
}

/**
 * WebSocket 实时同步设置
 * - 连接到后端 WebSocket 服务器
 * - 接收其他设备的设置变更并自动应用
 * - 自动重连机制
 */
export function useSettingsWebSocket() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5
  const baseReconnectDelay = 1000

  // 使用 ref 存储 connect 函数以避免循环依赖
  const connectRef = useRef<() => void>(() => {})

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log('[SettingsWS] Max reconnect attempts reached')
      return
    }

    const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current)
    reconnectAttemptsRef.current++

    console.log(`[SettingsWS] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`)

    reconnectTimeoutRef.current = window.setTimeout(() => {
      connectRef.current()
    }, delay)
  }, [])

  const connect = useCallback(() => {
    if (!token || !user?.id) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    // 构建 WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = import.meta.env.VITE_API_BASE_URL 
      ? new URL(import.meta.env.VITE_API_BASE_URL).host 
      : window.location.host
    const wsUrl = `${protocol}//${host}/ws/settings?token=${encodeURIComponent(token)}`

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0
        console.log('[SettingsWS] Connected')
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as SettingsMessage
          
          if (message.type === 'settings_update' && message.settings) {
            console.log('[SettingsWS] Received settings update from another device')
            
            // 应用收到的设置
            const result = applySettingsFile(message.settings)
            if (result.ok) {
              if (result.applied.length > 0) {
                toast.info('设置已从其他设备同步', {
                  description: `更新了 ${result.applied.length} 项设置`,
                  duration: 3000,
                })
              }
            }
          }
        } catch {
          // 忽略无效消息
        }
      }

      ws.onclose = (event) => {
        console.log('[SettingsWS] Disconnected', event.code, event.reason)
        wsRef.current = null

        // 非正常关闭时尝试重连
        if (event.code !== 1000 && event.code !== 4001 && event.code !== 4002) {
          scheduleReconnect()
        }
      }

      ws.onerror = (error) => {
        console.error('[SettingsWS] Error', error)
      }

    } catch (error) {
      console.error('[SettingsWS] Failed to connect', error)
      scheduleReconnect()
    }
  }, [token, user?.id, scheduleReconnect])

  // 更新 ref（在 effect 中更新避免渲染期间修改）
  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'User logout')
      wsRef.current = null
    }
    reconnectAttemptsRef.current = 0
  }, [])

  // 登录时连接，登出时断开
  useEffect(() => {
    if (token && user?.id) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [token, user?.id, connect, disconnect])

  // 页面可见性变化时重连
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && token && user?.id) {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          reconnectAttemptsRef.current = 0
          connect()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [token, user?.id, connect])

  // 心跳保活
  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }))
      }
    }, 25000)

    return () => {
      clearInterval(pingInterval)
    }
  }, [])
}

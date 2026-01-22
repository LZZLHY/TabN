/**
 * 前端日志服务
 * Requirements: 6.1, 6.3, 6.4, 6.5
 */

import { apiFetch } from './api'

/** 前端日志条目 */
interface FrontendLogEntry {
  timestamp: string
  level: 'error' | 'warn' | 'info'
  message: string
  stack?: string
  url: string
  userAgent: string
  userId?: string
  componentStack?: string
  extra?: Record<string, unknown>
}

/** 日志配置 */
interface LoggerConfig {
  batchSize: number
  flushInterval: number
  maxRetries: number
  dedupeWindow: number
  enabled: boolean
}

const defaultConfig: LoggerConfig = {
  batchSize: 10,
  flushInterval: 30000, // 30 秒
  maxRetries: 3,
  dedupeWindow: 60000, // 1 分钟
  enabled: true,
}

/** 日志缓冲区 */
let logBuffer: FrontendLogEntry[] = []

/** 去重缓存 */
const dedupeCache = new Map<string, number>()

/** 配置 */
let config = { ...defaultConfig }

/** 定时器 */
let flushTimer: ReturnType<typeof setInterval> | null = null

/** 计算日志哈希（用于去重） */
function computeLogHash(entry: FrontendLogEntry): string {
  const content = `${entry.level}:${entry.message}:${entry.stack?.slice(0, 200) || ''}`
  // 简单哈希
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString(16)
}

/** 检查是否为重复日志 */
function isDuplicate(entry: FrontendLogEntry): boolean {
  const hash = computeLogHash(entry)
  const now = Date.now()
  const lastSeen = dedupeCache.get(hash)

  if (lastSeen && now - lastSeen < config.dedupeWindow) {
    return true
  }

  dedupeCache.set(hash, now)
  return false
}

/** 清理过期的去重缓存 */
function cleanupDedupeCache(): void {
  const now = Date.now()
  for (const [hash, time] of dedupeCache.entries()) {
    if (now - time > config.dedupeWindow) {
      dedupeCache.delete(hash)
    }
  }
}

/** 创建日志条目 */
function createLogEntry(
  level: 'error' | 'warn' | 'info',
  message: string,
  extra?: Record<string, unknown>
): FrontendLogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    url: window.location.href,
    userAgent: navigator.userAgent,
    ...extra,
  }
}

/** 添加日志到缓冲区 */
function addToBuffer(entry: FrontendLogEntry): void {
  if (!config.enabled) return
  if (isDuplicate(entry)) return

  logBuffer.push(entry)

  // 达到批量大小时立即发送
  if (logBuffer.length >= config.batchSize) {
    flush()
  }
}

/** 发送日志到服务器 */
async function sendLogs(logs: FrontendLogEntry[], retries = 0): Promise<boolean> {
  try {
    // 获取 token
    const token = localStorage.getItem('token') || undefined
    
    const result = await apiFetch('/api/logs/client', {
      method: 'POST',
      body: JSON.stringify(logs),
      token,
    })
    
    return result.ok
  } catch {
    if (retries < config.maxRetries) {
      // 指数退避重试
      const delay = Math.pow(2, retries) * 1000
      await new Promise(resolve => setTimeout(resolve, delay))
      return sendLogs(logs, retries + 1)
    }

    // 重试失败，保存到 localStorage
    try {
      const stored = localStorage.getItem('pendingLogs')
      const pending = stored ? JSON.parse(stored) : []
      pending.push(...logs)
      // 限制存储大小
      if (pending.length > 100) {
        pending.splice(0, pending.length - 100)
      }
      localStorage.setItem('pendingLogs', JSON.stringify(pending))
    } catch {
      // 忽略存储错误
    }

    return false
  }
}

/** 立即发送缓冲的日志 */
export async function flush(): Promise<void> {
  if (logBuffer.length === 0) return

  const logs = [...logBuffer]
  logBuffer = []

  await sendLogs(logs)
}

/** 发送之前存储的待发送日志 */
async function sendPendingLogs(): Promise<void> {
  try {
    const stored = localStorage.getItem('pendingLogs')
    if (!stored) return

    const pending = JSON.parse(stored)
    if (pending.length === 0) return

    localStorage.removeItem('pendingLogs')
    await sendLogs(pending)
  } catch {
    // 忽略错误
  }
}

/** 记录错误 */
export function logError(error: Error, extra?: Record<string, unknown>): void {
  const entry = createLogEntry('error', error.message, {
    stack: error.stack,
    ...extra,
  })
  addToBuffer(entry)

  // 错误立即发送
  flush()
}

/** 记录警告 */
export function logWarn(message: string, extra?: Record<string, unknown>): void {
  const entry = createLogEntry('warn', message, extra)
  addToBuffer(entry)
}

/** 记录信息 */
export function logInfo(message: string, extra?: Record<string, unknown>): void {
  const entry = createLogEntry('info', message, extra)
  addToBuffer(entry)
}

/** 记录 React 组件错误 */
export function logComponentError(
  error: Error,
  componentStack: string,
  extra?: Record<string, unknown>
): void {
  const entry = createLogEntry('error', error.message, {
    stack: error.stack,
    componentStack,
    ...extra,
  })
  addToBuffer(entry)
  flush()
}

/** 初始化日志服务 */
export function initLogger(options?: Partial<LoggerConfig>): void {
  config = { ...defaultConfig, ...options }

  // 清理旧定时器
  if (flushTimer) {
    clearInterval(flushTimer)
  }

  // 设置定时发送
  flushTimer = setInterval(() => {
    flush()
    cleanupDedupeCache()
  }, config.flushInterval)

  // 页面卸载时发送
  window.addEventListener('beforeunload', () => {
    flush()
  })

  // 发送之前存储的日志
  sendPendingLogs()
}

/** 设置用户 ID */
let currentUserId: string | undefined

export function setLoggerUserId(userId: string | undefined): void {
  currentUserId = userId
}

/** 获取当前用户 ID */
export function getLoggerUserId(): string | undefined {
  return currentUserId
}

/** 全局错误处理器 */
export function setupGlobalErrorHandlers(): void {
  // 捕获未处理的错误
  window.onerror = (message, source, lineno, colno, error) => {
    logError(error || new Error(String(message)), {
      source,
      lineno,
      colno,
      userId: currentUserId,
    })
    return false
  }

  // 捕获未处理的 Promise 拒绝
  window.onunhandledrejection = (event) => {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason))
    
    logError(error, {
      type: 'unhandledrejection',
      userId: currentUserId,
    })
  }
}

export const logger = {
  error: logError,
  warn: logWarn,
  info: logInfo,
  componentError: logComponentError,
  flush,
  init: initLogger,
  setUserId: setLoggerUserId,
  setupGlobalHandlers: setupGlobalErrorHandlers,
}

/**
 * 错误日志中间件
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import type { Request, Response, NextFunction } from 'express'
import crypto from 'node:crypto'
import { createLogger } from '../services/logger'
import { getLogStorage } from '../services/logStorage'
import { ErrorCategory, LogFileType, type ErrorLogData } from '../types/logger'
import { getRequestId } from './requestLogger'

const logger = createLogger('error')

/** 错误去重缓存 */
interface ErrorCacheEntry {
  count: number
  firstSeen: number
  lastSeen: number
}

const errorCache = new Map<string, ErrorCacheEntry>()

/** 去重时间窗口 (毫秒) */
const DEDUPE_WINDOW = 60000 // 1 分钟

/** 缓存清理间隔 */
const CACHE_CLEANUP_INTERVAL = 300000 // 5 分钟

/** 定期清理过期的错误缓存 */
setInterval(() => {
  const now = Date.now()
  for (const [hash, entry] of errorCache.entries()) {
    if (now - entry.lastSeen > DEDUPE_WINDOW) {
      errorCache.delete(hash)
    }
  }
}, CACHE_CLEANUP_INTERVAL)

/** 计算错误哈希（用于去重） */
export function computeErrorHash(error: Error): string {
  const content = `${error.name}:${error.message}:${error.stack?.slice(0, 500) || ''}`
  return crypto.createHash('md5').update(content).digest('hex').slice(0, 16)
}

/** 分类错误 */
export function categorizeError(error: Error): ErrorCategory {
  const message = error.message.toLowerCase()
  const name = error.name.toLowerCase()

  // 验证错误
  if (
    name.includes('validation') ||
    name.includes('zod') ||
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('参数')
  ) {
    return ErrorCategory.VALIDATION
  }

  // 数据库错误
  if (
    name.includes('prisma') ||
    name.includes('database') ||
    name.includes('sql') ||
    message.includes('database') ||
    message.includes('prisma') ||
    message.includes('unique constraint')
  ) {
    return ErrorCategory.DATABASE
  }

  // 网络错误
  if (
    name.includes('fetch') ||
    name.includes('network') ||
    name.includes('timeout') ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('econnrefused') ||
    message.includes('enotfound')
  ) {
    return ErrorCategory.NETWORK
  }

  // 认证错误
  if (
    name.includes('auth') ||
    name.includes('unauthorized') ||
    name.includes('forbidden') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('authentication') ||
    message.includes('登录') ||
    message.includes('权限')
  ) {
    return ErrorCategory.AUTH
  }

  return ErrorCategory.UNKNOWN
}

/** 检查是否为重复错误 */
export function isDuplicateError(errorHash: string): boolean {
  const now = Date.now()
  const entry = errorCache.get(errorHash)

  if (entry && now - entry.lastSeen < DEDUPE_WINDOW) {
    // 更新计数和最后出现时间
    entry.count++
    entry.lastSeen = now
    return true
  }

  // 新错误或已过期
  errorCache.set(errorHash, {
    count: 1,
    firstSeen: now,
    lastSeen: now,
  })

  return false
}

/** 获取错误重复计数 */
export function getErrorCount(errorHash: string): number {
  return errorCache.get(errorHash)?.count || 0
}

/** 清除错误缓存（用于测试） */
export function clearErrorCache(): void {
  errorCache.clear()
}

/** FATAL 级别告警处理器（可扩展） */
type AlertHandler = (error: Error, context: ErrorLogData) => void

let alertHandler: AlertHandler | null = null

/** 设置告警处理器 */
export function setAlertHandler(handler: AlertHandler): void {
  alertHandler = handler
}

/** 触发告警 */
function triggerAlert(error: Error, context: ErrorLogData): void {
  if (alertHandler) {
    try {
      alertHandler(error, context)
    } catch (e) {
      // 忽略告警处理器的错误
      console.error('[ErrorLogger] Alert handler failed:', e)
    }
  }
}

/** 错误日志中间件 */
export function errorLogger(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = getRequestId(req)
  const errorHash = computeErrorHash(error)
  const category = categorizeError(error)

  // 构建错误日志数据
  const errorData: ErrorLogData = {
    category,
    name: error.name,
    message: error.message,
    stack: error.stack,
    requestId,
    url: req.originalUrl || req.url,
    method: req.method,
  }

  // 检查是否为重复错误
  const isDuplicate = isDuplicateError(errorHash)

  if (!isDuplicate) {
    // 记录错误日志
    const isFatal = category === ErrorCategory.UNKNOWN && error.stack?.includes('FATAL')
    
    if (isFatal) {
      logger.fatal('Unhandled error', {
        ...errorData,
        errorHash,
      })
      // 触发告警
      triggerAlert(error, errorData)
    } else {
      logger.error('Request error', {
        ...errorData,
        errorHash,
      })
    }

    // 写入错误日志文件
    const storage = getLogStorage()
    const errorLogEntry = JSON.stringify({
      timestamp: new Date().toISOString(),
      ...errorData,
      errorHash,
    })
    storage.write(LogFileType.ERROR, errorLogEntry).catch(() => {
      // 忽略写入错误
    })
  } else {
    // 重复错误只记录计数
    const count = getErrorCount(errorHash)
    if (count % 10 === 0) {
      // 每 10 次重复记录一次
      logger.warn('Repeated error', {
        errorHash,
        count,
        message: error.message,
      })
    }
  }

  // 继续传递错误给下一个处理器
  next(error)
}

/** 全局未捕获异常处理 */
export function setupGlobalErrorHandlers(): void {
  process.on('uncaughtException', (error: Error) => {
    logger.fatal('Uncaught exception', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    })

    // 写入错误日志
    const storage = getLogStorage()
    const errorLogEntry = JSON.stringify({
      timestamp: new Date().toISOString(),
      type: 'uncaughtException',
      name: error.name,
      message: error.message,
      stack: error.stack,
    })
    storage.write(LogFileType.ERROR, errorLogEntry).catch(() => {})

    // 给日志写入一些时间
    setTimeout(() => {
      process.exit(1)
    }, 1000)
  })

  process.on('unhandledRejection', (reason: unknown) => {
    const error = reason instanceof Error ? reason : new Error(String(reason))
    
    logger.error('Unhandled rejection', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    })

    // 写入错误日志
    const storage = getLogStorage()
    const errorLogEntry = JSON.stringify({
      timestamp: new Date().toISOString(),
      type: 'unhandledRejection',
      name: error.name,
      message: error.message,
      stack: error.stack,
    })
    storage.write(LogFileType.ERROR, errorLogEntry).catch(() => {})
  })
}

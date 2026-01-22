/**
 * 请求日志中间件
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import type { Request, Response, NextFunction } from 'express'
import crypto from 'node:crypto'
import { createLogger } from '../services/logger'
import { sanitizeHeaders, sanitizeObject, sanitizeAndTruncateBody } from '../utils/sanitize'
import type { RequestLogData, ResponseLogData } from '../types/logger'
import { LogFileType } from '../types/logger'
import { getLogStorage } from '../services/logStorage'

const logger = createLogger('request')

/** 请求 ID 头名称 */
export const REQUEST_ID_HEADER = 'x-request-id'

/** 需要记录请求体的 HTTP 方法 */
const BODY_METHODS = ['POST', 'PUT', 'PATCH']

/** 请求体最大记录大小 (bytes) */
const MAX_BODY_SIZE = 10000

/** 不记录日志的路径（健康检查等高频接口） */
const SILENT_PATHS = ['/health', '/api/health']

/** 扩展 Request 类型以包含请求 ID */
declare global {
  namespace Express {
    interface Request {
      requestId?: string
      startTime?: number
    }
  }
}

/** 生成唯一请求 ID */
export function generateRequestId(): string {
  return crypto.randomUUID()
}

/** 获取客户端 IP */
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim()
  }
  if (Array.isArray(forwarded)) {
    return forwarded[0]
  }
  return req.socket?.remoteAddress || req.ip || 'unknown'
}

/** 请求日志中间件 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // 生成请求 ID
  const requestId = req.headers[REQUEST_ID_HEADER] as string || generateRequestId()
  req.requestId = requestId
  req.startTime = Date.now()

  // 将请求 ID 添加到响应头
  res.setHeader(REQUEST_ID_HEADER, requestId)

  // 跳过静默路径的日志记录（健康检查等高频接口）
  const isSilent = SILENT_PATHS.includes(req.path)
  if (isSilent) {
    return next()
  }

  // 设置 logger 的请求上下文
  logger.setRequestContext(requestId)

  // 构建请求日志数据
  const requestData: RequestLogData = {
    requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    path: req.path,
    query: sanitizeObject(req.query as Record<string, unknown>),
    headers: sanitizeHeaders(req.headers),
    ip: getClientIp(req),
    userAgent: req.headers['user-agent'] || 'unknown',
    startTime: req.startTime,
  }

  // 记录请求体（仅 POST/PUT/PATCH）
  if (BODY_METHODS.includes(req.method) && req.body) {
    requestData.body = sanitizeAndTruncateBody(req.body, MAX_BODY_SIZE)
  }

  // 记录请求开始
  logger.info('Request started', {
    requestId,
    method: requestData.method,
    url: requestData.url,
    ip: requestData.ip,
  })

  // 写入详细请求日志到文件
  const storage = getLogStorage()
  const requestLogEntry = JSON.stringify({
    type: 'request',
    timestamp: new Date().toISOString(),
    ...requestData,
  })
  storage.write(LogFileType.REQUEST, requestLogEntry).catch(() => {
    // 忽略写入错误
  })

  // 监听响应完成
  const originalEnd = res.end
  res.end = function (this: Response, ...args: Parameters<Response['end']>): Response {
    const responseTime = Date.now() - (req.startTime || Date.now())
    
    // 构建响应日志数据
    const responseData: ResponseLogData = {
      requestId,
      statusCode: res.statusCode,
      contentLength: parseInt(res.getHeader('content-length') as string) || 0,
      responseTime,
    }

    // 记录响应完成
    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'
    logger[logLevel]('Request completed', {
      requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: responseData.statusCode,
      responseTime: `${responseTime}ms`,
    })

    // 写入响应日志到文件
    const responseLogEntry = JSON.stringify({
      type: 'response',
      timestamp: new Date().toISOString(),
      ...responseData,
      method: req.method,
      url: req.originalUrl || req.url,
    })
    storage.write(LogFileType.REQUEST, responseLogEntry).catch(() => {
      // 忽略写入错误
    })

    // 调用原始 end 方法
    return originalEnd.apply(this, args)
  } as typeof res.end

  next()
}

/** 获取当前请求的 ID（用于其他中间件/控制器） */
export function getRequestId(req: Request): string | undefined {
  return req.requestId
}

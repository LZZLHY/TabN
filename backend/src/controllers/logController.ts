/**
 * 日志控制器
 * Requirements: 7.1, 7.2, 7.3, 7.5
 */

import type { Response } from 'express'
import { z } from 'zod'
import type { AuthedRequest } from '../types/auth'
import { fail, ok } from '../utils/http'
import { getLogStorage } from '../services/logStorage'
import { LogFileType, LogLevel } from '../types/logger'

const QuerySchema = z.object({
  type: z.enum(['app', 'request', 'error', 'audit']).default('app'),
  level: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  keyword: z.string().optional(),
  requestId: z.string().optional(),
  userId: z.string().optional(),
  limit: z.coerce.number().min(1).max(1000).default(100),
  offset: z.coerce.number().min(0).default(0),
})

const ExportSchema = z.object({
  type: z.enum(['app', 'request', 'error', 'audit']),
  startDate: z.string(),
  endDate: z.string(),
  format: z.enum(['json', 'csv']).default('json'),
})

/** 日志类型映射 */
const typeMap: Record<string, LogFileType> = {
  app: LogFileType.APP,
  request: LogFileType.REQUEST,
  error: LogFileType.ERROR,
  audit: LogFileType.AUDIT,
}

/** 日志级别映射 */
const levelMap: Record<string, LogLevel> = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
  fatal: LogLevel.FATAL,
}

/** 查询日志 */
export async function queryLogs(req: AuthedRequest, res: Response) {
  const parsed = QuerySchema.safeParse(req.query)
  if (!parsed.success) return fail(res, 400, parsed.error.issues[0]?.message ?? '参数错误')

  const { type, level, startTime, endTime, keyword, requestId, userId, limit, offset } = parsed.data
  const storage = getLogStorage()
  const fileType = typeMap[type]

  // 确定日期范围
  const end = endTime ? new Date(endTime) : new Date()
  const start = startTime ? new Date(startTime) : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)
  const startStr = start.toISOString().slice(0, 10)
  const endStr = end.toISOString().slice(0, 10)

  // 读取日志
  const lines = await storage.readRange(fileType, startStr, endStr)
  const items: unknown[] = []

  for (const line of lines) {
    try {
      const entry = JSON.parse(line)

      // 级别过滤
      if (level && entry.level !== undefined && entry.level < levelMap[level]) continue

      // 关键词过滤
      if (keyword && !line.toLowerCase().includes(keyword.toLowerCase())) continue

      // 请求 ID 过滤
      if (requestId && entry.requestId !== requestId) continue

      // 用户 ID 过滤
      if (userId && entry.userId !== userId) continue

      // 时间范围过滤
      if (entry.timestamp) {
        const entryTime = new Date(entry.timestamp)
        if (entryTime < start || entryTime > end) continue
      }

      items.push(entry)
    } catch {
      // 跳过无效行
    }
  }

  // 按时间倒序
  items.sort((a: any, b: any) => {
    const ta = new Date(a.timestamp || 0).getTime()
    const tb = new Date(b.timestamp || 0).getTime()
    return tb - ta
  })

  const total = items.length
  const paged = items.slice(offset, offset + limit)

  return ok(res, {
    items: paged,
    total,
    hasMore: offset + limit < total,
  })
}

/** 获取日志统计 */
export async function getLogStats(req: AuthedRequest, res: Response) {
  const storage = getLogStorage()
  const stats = await storage.getStats()
  return ok(res, { stats })
}


/** 导出日志 */
export async function exportLogs(req: AuthedRequest, res: Response) {
  const parsed = ExportSchema.safeParse(req.body)
  if (!parsed.success) return fail(res, 400, parsed.error.issues[0]?.message ?? '参数错误')

  const { type, startDate, endDate, format } = parsed.data
  const storage = getLogStorage()
  const fileType = typeMap[type]

  const lines = await storage.readRange(fileType, startDate, endDate)
  const items: unknown[] = []

  for (const line of lines) {
    try {
      items.push(JSON.parse(line))
    } catch {
      // 跳过无效行
    }
  }

  if (format === 'csv') {
    // 简单 CSV 导出
    if (items.length === 0) {
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="${type}-logs.csv"`)
      return res.send('')
    }

    const headers = Object.keys(items[0] as object)
    const csvLines = [headers.join(',')]
    
    for (const item of items) {
      const values = headers.map(h => {
        const v = (item as Record<string, unknown>)[h]
        if (v === null || v === undefined) return ''
        if (typeof v === 'object') return `"${JSON.stringify(v).replace(/"/g, '""')}"`
        return `"${String(v).replace(/"/g, '""')}"`
      })
      csvLines.push(values.join(','))
    }

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${type}-logs.csv"`)
    return res.send(csvLines.join('\n'))
  }

  // JSON 导出
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', `attachment; filename="${type}-logs.json"`)
  return res.json(items)
}

/** SSE 实时日志流 */
export function streamLogs(req: AuthedRequest, res: Response) {
  const type = (req.query.type as string) || 'app'
  const fileType = typeMap[type] || LogFileType.APP

  // 支持从 URL query 参数获取 token（EventSource 不支持自定义 headers）
  // 认证已在路由中间件中处理，这里只需要检查是否已认证
  if (!req.auth?.userId) {
    return fail(res, 401, '未授权')
  }

  // 设置 SSE 头
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  // 发送初始连接消息
  res.write(`data: ${JSON.stringify({ type: 'connected', logType: type })}\n\n`)

  const storage = getLogStorage()
  let lastPosition = 0

  // 定期检查新日志
  const interval = setInterval(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10)
      const lines = await storage.read(fileType, today, { offset: lastPosition })
      
      for (const line of lines) {
        try {
          const entry = JSON.parse(line)
          res.write(`data: ${JSON.stringify(entry)}\n\n`)
          lastPosition++
        } catch {
          // 跳过无效行
        }
      }
    } catch {
      // 忽略读取错误
    }
  }, 1000)

  // 清理
  req.on('close', () => {
    clearInterval(interval)
  })
}

/** 接收前端日志上报 */
export async function receiveClientLogs(req: AuthedRequest, res: Response) {
  const logs = req.body

  if (!Array.isArray(logs)) {
    return fail(res, 400, '日志格式错误，应为数组')
  }

  const storage = getLogStorage()
  let count = 0

  for (const log of logs) {
    if (!log || typeof log !== 'object') continue

    const entry = {
      timestamp: log.timestamp || new Date().toISOString(),
      source: 'client',
      level: log.level || 'error',
      message: log.message || '',
      url: log.url,
      userAgent: log.userAgent,
      userId: log.userId || (req as any).auth?.userId,
      stack: log.stack,
      componentStack: log.componentStack,
      extra: log.extra,
    }

    await storage.write(LogFileType.ERROR, JSON.stringify(entry))
    count++
  }

  return ok(res, { received: count })
}

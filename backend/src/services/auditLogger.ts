/**
 * 审计日志服务
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import type { Request } from 'express'
import { getLogStorage } from './logStorage'
import { createLogger } from './logger'
import {
  AuditAction,
  LogFileType,
  type AuditEntry,
  type AuditQueryFilter,
} from '../types/logger'

const logger = createLogger('audit')

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

/** 审计日志服务类 */
export class AuditLogger {
  /** 记录审计日志 */
  async log(entry: Omit<AuditEntry, 'timestamp'>): Promise<void> {
    const auditEntry: AuditEntry = {
      timestamp: new Date().toISOString(),
      ...entry,
    }

    // 记录到应用日志
    const logLevel = entry.success ? 'info' : 'warn'
    logger[logLevel](`Audit: ${entry.action} ${entry.resource}`, {
      userId: entry.userId,
      resourceId: entry.resourceId,
      success: entry.success,
      ip: entry.ip,
    })

    // 写入审计日志文件
    const storage = getLogStorage()
    const logLine = JSON.stringify(auditEntry)
    await storage.write(LogFileType.AUDIT, logLine)
  }

  /** 从请求创建审计日志 */
  async logFromRequest(
    req: Request,
    action: AuditAction,
    resource: string,
    options: {
      resourceId?: string
      details?: Record<string, unknown>
      success: boolean
      errorMessage?: string
      userId?: string | null
    }
  ): Promise<void> {
    // 尝试从请求中获取用户 ID
    const userId = options.userId !== undefined 
      ? options.userId 
      : (req as any).auth?.userId || null

    await this.log({
      userId,
      action,
      resource,
      resourceId: options.resourceId,
      details: options.details,
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      success: options.success,
      errorMessage: options.errorMessage,
    })
  }

  /** 查询审计日志 */
  async query(filter: AuditQueryFilter): Promise<AuditEntry[]> {
    const storage = getLogStorage()
    const results: AuditEntry[] = []

    // 确定日期范围
    const endDate = filter.endTime || new Date()
    const startDate = filter.startTime || new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000) // 默认7天

    // 读取日期范围内的日志
    const startStr = startDate.toISOString().slice(0, 10)
    const endStr = endDate.toISOString().slice(0, 10)

    const lines = await storage.readRange(LogFileType.AUDIT, startStr, endStr)

    // 解析并过滤
    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as AuditEntry

        // 应用过滤条件
        if (filter.userId && entry.userId !== filter.userId) continue
        if (filter.action && entry.action !== filter.action) continue
        if (filter.resource && entry.resource !== filter.resource) continue
        if (filter.success !== undefined && entry.success !== filter.success) continue

        // 时间范围过滤
        const entryTime = new Date(entry.timestamp)
        if (filter.startTime && entryTime < filter.startTime) continue
        if (filter.endTime && entryTime > filter.endTime) continue

        results.push(entry)
      } catch {
        // 跳过无效的日志行
      }
    }

    // 按时间倒序排序
    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // 应用分页
    const offset = filter.offset || 0
    const limit = filter.limit || 100

    return results.slice(offset, offset + limit)
  }

  /** 获取用户的审计日志 */
  async getUserLogs(userId: string, limit: number = 50): Promise<AuditEntry[]> {
    return this.query({ userId, limit })
  }

  /** 获取资源的审计日志 */
  async getResourceLogs(resource: string, resourceId?: string, limit: number = 50): Promise<AuditEntry[]> {
    const results = await this.query({ resource, limit: limit * 2 })
    
    if (resourceId) {
      return results.filter(e => e.resourceId === resourceId).slice(0, limit)
    }
    
    return results.slice(0, limit)
  }
}

/** 全局审计日志实例 */
let globalAuditLogger: AuditLogger | null = null

/** 获取全局审计日志实例 */
export function getAuditLogger(): AuditLogger {
  if (!globalAuditLogger) {
    globalAuditLogger = new AuditLogger()
  }
  return globalAuditLogger
}

/** 便捷方法：记录审计日志 */
export async function audit(
  req: Request,
  action: AuditAction,
  resource: string,
  options: {
    resourceId?: string
    details?: Record<string, unknown>
    success: boolean
    errorMessage?: string
    userId?: string | null
  }
): Promise<void> {
  return getAuditLogger().logFromRequest(req, action, resource, options)
}

// 导出 AuditAction 以便使用
export { AuditAction }

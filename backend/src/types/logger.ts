/**
 * 日志服务类型定义
 * Requirements: 1.1, 1.2, 3.3, 4.1
 */

// ============ 日志级别 ============

/** 日志级别枚举 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

/** 日志级别名称映射 */
export const LogLevelNames: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL',
}

/** 从字符串解析日志级别 */
export function parseLogLevel(level: string): LogLevel {
  const upper = level.toUpperCase()
  switch (upper) {
    case 'DEBUG': return LogLevel.DEBUG
    case 'INFO': return LogLevel.INFO
    case 'WARN': return LogLevel.WARN
    case 'ERROR': return LogLevel.ERROR
    case 'FATAL': return LogLevel.FATAL
    default: return LogLevel.INFO
  }
}

// ============ 日志条目 ============

/** 日志条目接口 */
export interface LogEntry {
  timestamp: string          // ISO 8601 格式
  level: LogLevel
  levelName: string          // DEBUG/INFO/WARN/ERROR/FATAL
  message: string
  context?: Record<string, unknown>
  requestId?: string         // 请求关联 ID
  userId?: string            // 用户 ID（如果已认证）
  source: string             // 日志来源模块
}

// ============ Logger 配置 ============

/** Logger 配置接口 */
export interface LoggerConfig {
  level: LogLevel            // 最低输出级别
  enableConsole: boolean     // 是否输出到控制台
  enableFile: boolean        // 是否写入文件
  logDir: string             // 日志目录
  retentionDays: number      // 保留天数
}

/** Logger 接口 */
export interface ILogger {
  debug(message: string, context?: Record<string, unknown>): void
  info(message: string, context?: Record<string, unknown>): void
  warn(message: string, context?: Record<string, unknown>): void
  error(message: string, context?: Record<string, unknown>): void
  fatal(message: string, context?: Record<string, unknown>): void
  child(source: string): ILogger
  setRequestContext(requestId: string, userId?: string): void
}

// ============ 错误分类 ============

/** 错误分类枚举 */
export enum ErrorCategory {
  VALIDATION = 'validation',
  DATABASE = 'database',
  NETWORK = 'network',
  AUTH = 'auth',
  UNKNOWN = 'unknown',
}

/** 错误日志数据 */
export interface ErrorLogData {
  category: ErrorCategory
  name: string
  message: string
  stack?: string
  code?: string | number
  requestId?: string
  userId?: string
  url?: string
  method?: string
}

// ============ 审计日志 ============

/** 审计操作类型枚举 */
export enum AuditAction {
  LOGIN = 'login',
  LOGOUT = 'logout',
  LOGIN_FAILED = 'login_failed',
  REGISTER = 'register',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  EXPORT = 'export',
  SETTINGS_CHANGE = 'settings_change',
}

/** 审计日志条目 */
export interface AuditEntry {
  timestamp: string
  userId: string | null      // 未登录时为 null
  action: AuditAction
  resource: string           // 资源类型，如 'bookmark', 'user'
  resourceId?: string        // 资源 ID
  details?: Record<string, unknown>
  ip: string
  userAgent: string
  success: boolean
  errorMessage?: string
}

/** 审计日志查询过滤器 */
export interface AuditQueryFilter {
  userId?: string
  action?: AuditAction
  resource?: string
  startTime?: Date
  endTime?: Date
  success?: boolean
  limit?: number
  offset?: number
}

// ============ 日志文件存储 ============

/** 日志文件类型枚举 */
export enum LogFileType {
  APP = 'app',               // 应用日志
  REQUEST = 'request',       // 请求日志
  ERROR = 'error',           // 错误日志
  AUDIT = 'audit',           // 审计日志
}

/** 存储配置 */
export interface StorageConfig {
  baseDir: string            // 基础目录 (backend/logs)
  retentionDays: number      // 保留天数
  maxFileSize: number        // 单文件最大大小 (bytes)
}

/** 读取选项 */
export interface ReadOptions {
  limit?: number
  offset?: number
  filter?: string            // 关键词过滤
}

/** 存储统计 */
export interface StorageStats {
  totalSize: number
  fileCount: number
  oldestLog: string
  newestLog: string
}

// ============ 请求日志 ============

/** 请求日志数据 */
export interface RequestLogData {
  requestId: string
  method: string
  url: string
  path: string
  query: Record<string, unknown>
  headers: Record<string, string | string[]>
  body?: unknown             // POST/PUT/PATCH 请求体（脱敏后）
  ip: string
  userAgent: string
  userId?: string
  startTime: number
}

/** 响应日志数据 */
export interface ResponseLogData {
  requestId: string
  statusCode: number
  contentLength: number
  responseTime: number       // 毫秒
}

// ============ 前端日志 ============

/** 前端日志条目 */
export interface FrontendLogEntry {
  timestamp: string
  level: 'error' | 'warn' | 'info'
  message: string
  stack?: string
  url: string
  userAgent: string
  userId?: string
  componentStack?: string    // React 组件堆栈
  extra?: Record<string, unknown>
}

// ============ 日志查询 ============

/** 日志查询参数 */
export interface LogQueryParams {
  type: LogFileType
  level?: LogLevel
  startTime?: string
  endTime?: string
  keyword?: string
  requestId?: string
  userId?: string
  limit?: number
  offset?: number
}

/** 日志查询响应 */
export interface LogQueryResponse {
  items: LogEntry[]
  total: number
  hasMore: boolean
}

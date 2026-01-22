/**
 * 共享 API 类型定义
 * 前后端共用的请求/响应类型
 */

import { ErrorCode } from '../errors'

// ============ 通用响应类型 ============

/** API 成功响应 */
export interface ApiOk<T> {
  ok: true
  data: T
}

/** API 失败响应 */
export interface ApiFail {
  ok: false
  message: string
  code?: ErrorCode
  requestId?: string
  details?: Record<string, unknown>
}

/** API 响应联合类型 */
export type ApiResponse<T> = ApiOk<T> | ApiFail

// ============ 用户相关类型 ============

/** 用户角色 */
export type UserRole = 'USER' | 'ADMIN' | 'ROOT'

/** 用户信息 */
export interface User {
  id: string
  username: string
  email: string | null
  phone: string | null
  nickname: string
  role: UserRole
  createdAt: string
}

/** 登录请求 */
export interface LoginRequest {
  identifier: string
  password: string
}

/** 登录响应数据 */
export interface LoginResponse {
  token: string
  user: User
}

/** 注册请求 */
export interface RegisterRequest {
  username?: string
  password: string
  email?: string
  phone?: string
  nickname?: string
}

/** 注册响应数据 */
export interface RegisterResponse {
  token: string
  user: User
}

// ============ 书签相关类型 ============

/** 书签类型 */
export type BookmarkType = 'LINK' | 'FOLDER'

/** 图标类型 */
export type IconType = 'URL' | 'BASE64'

/** 书签信息 */
export interface Bookmark {
  id: string
  userId: string
  name: string
  url: string | null
  note: string | null
  type: BookmarkType
  parentId: string | null
  tags: string[]
  iconUrl: string | null
  iconData: string | null
  iconType: IconType | null
  createdAt: string
  updatedAt: string
}

/** 创建书签请求 */
export interface CreateBookmarkRequest {
  name?: string
  url?: string
  note?: string
  type?: BookmarkType
  parentId?: string | null
  tags?: string[]
  iconUrl?: string | null
  iconData?: string | null
  iconType?: IconType | null
}

/** 更新书签请求 */
export interface UpdateBookmarkRequest {
  name?: string
  url?: string
  note?: string
  parentId?: string | null
  tags?: string[]
  iconUrl?: string | null
  iconData?: string | null
  iconType?: IconType | null
}

/** 书签列表响应 */
export interface BookmarkListResponse {
  items: Bookmark[]
}

/** 单个书签响应 */
export interface BookmarkResponse {
  item: Bookmark
}

// ============ 标签相关类型 ============

/** 标签统计 */
export interface TagStats {
  tag: string
  count: number
}

/** 标签列表响应 */
export interface TagListResponse {
  items: TagStats[]
}

// ============ 健康检查 & 指标 ============

/** 健康检查响应 */
export interface HealthCheckResponse {
  ok: boolean
  timestamp: string
  uptime: number
  version: string
}

/** 系统指标 */
export interface MetricsResponse {
  timestamp: string
  uptime: number
  memory: {
    rss: number
    heapTotal: number
    heapUsed: number
    external: number
  }
  cpu: {
    user: number
    system: number
  }
  requests: {
    total: number
    success: number
    error: number
    avgResponseTime: number
  }
  database: {
    connected: boolean
    latency: number
  }
}

// ============ 前端日志上报 ============

/** 前端错误日志 */
export interface FrontendErrorLog {
  type: 'error' | 'unhandledrejection'
  message: string
  stack?: string
  url: string
  userAgent: string
  timestamp: string
  userId?: string
  componentStack?: string
  extra?: Record<string, unknown>
}

/** 前端性能指标 */
export interface FrontendPerformanceMetrics {
  url: string
  userAgent: string
  timestamp: string
  userId?: string
  metrics: {
    fcp?: number  // First Contentful Paint
    lcp?: number  // Largest Contentful Paint
    fid?: number  // First Input Delay
    cls?: number  // Cumulative Layout Shift
    ttfb?: number // Time to First Byte
  }
}

/** 前端日志上报请求 */
export interface FrontendLogRequest {
  errors?: FrontendErrorLog[]
  performance?: FrontendPerformanceMetrics
}

// ============ 版本更新 ============

/** 版本信息 */
export interface VersionInfo {
  current: string
  currentPatch: number
  latest: string
  latestPatch: number
  hasUpdate: boolean
  releaseNotes: string
  releaseDate: string
  needsRestart: boolean
  needsDeps: boolean
  needsMigration: boolean
  frontendOnly: boolean
  hasGit: boolean
}

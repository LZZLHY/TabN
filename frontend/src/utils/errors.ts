/**
 * 前端统一错误处理
 * 
 * 错误码从 @start/shared 导入（单一源头）
 * 本文件定义前端特有的错误类和工具函数
 */

// 从共享模块导入错误码和消息
export {
  ErrorCode,
  AUTH_ERROR_CODES,
  UserFriendlyMessages as ErrorMessages,
  isAuthErrorCode,
  isNetworkErrorCode,
  isServerErrorCode,
  getUserFriendlyMessage,
} from '@start/shared'

import { 
  ErrorCode, 
  AUTH_ERROR_CODES, 
  UserFriendlyMessages as ErrorMessages,
} from '@start/shared'

/**
 * API 错误类
 */
export class ApiError extends Error {
  public readonly code: ErrorCode
  public readonly requestId?: string
  public readonly details?: Record<string, unknown>

  constructor(
    code: ErrorCode,
    message: string,
    requestId?: string,
    details?: Record<string, unknown>
  ) {
    super(message)
    this.code = code
    this.requestId = requestId
    this.details = details
    this.name = 'ApiError'
  }

  /** 是否为认证错误（需要重新登录） */
  get isAuthError(): boolean {
    return AUTH_ERROR_CODES.includes(this.code)
  }

  /** 是否为网络错误 */
  get isNetworkError(): boolean {
    return this.code === ErrorCode.NETWORK_ERROR
  }

  /** 是否为服务器错误 */
  get isServerError(): boolean {
    return this.code >= 5000 && this.code < 6000
  }

  /** 获取用户友好的错误消息 */
  get userMessage(): string {
    return ErrorMessages[this.code] || this.message || '发生错误，请稍后重试'
  }
}

/**
 * 判断是否为需要重新登录的错误
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.isAuthError
  }
  return false
}

/**
 * 判断是否为网络错误
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.isNetworkError
  }
  if (error instanceof Error) {
    return error.message.includes('network') || 
           error.message.includes('Network') ||
           error.message.includes('fetch')
  }
  return false
}

/**
 * 从错误中获取用户友好消息
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.userMessage
  }
  if (error instanceof Error) {
    return error.message || '发生错误，请稍后重试'
  }
  return String(error) || '发生错误，请稍后重试'
}

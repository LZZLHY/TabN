/**
 * 统一错误处理 - 自定义错误类
 * 
 * 错误码和消息从 @start/shared 导入（单一源头）
 * 本文件仅定义后端特有的错误类
 */

// 从共享模块导入错误码和消息
export {
  ErrorCode,
  ErrorHttpStatus,
  ErrorMessages,
  AUTH_ERROR_CODES,
  isAuthErrorCode,
  isNetworkErrorCode,
  isServerErrorCode,
} from '@start/shared'

import { ErrorCode, ErrorHttpStatus, ErrorMessages } from '@start/shared'

/**
 * 应用错误基类
 * 所有业务错误都应该继承此类
 */
export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly details?: Record<string, unknown>

  constructor(
    code: ErrorCode,
    message?: string,
    details?: Record<string, unknown>
  ) {
    super(message || ErrorMessages[code])
    this.code = code
    this.statusCode = ErrorHttpStatus[code]
    this.isOperational = true // 标记为可预期的操作错误
    this.details = details

    // 保持正确的原型链
    Object.setPrototypeOf(this, new.target.prototype)
    Error.captureStackTrace(this, this.constructor)
  }

  /** 转换为 JSON 响应格式 */
  toJSON() {
    return {
      ok: false,
      code: this.code,
      message: this.message,
      ...(this.details ? { details: this.details } : {}),
    }
  }
}

/** 验证错误 */
export class ValidationError extends AppError {
  constructor(message?: string, details?: Record<string, unknown>) {
    super(ErrorCode.VALIDATION, message || '参数验证失败', details)
  }
}

/** 未授权错误 */
export class UnauthorizedError extends AppError {
  constructor(code: ErrorCode = ErrorCode.UNAUTHORIZED, message?: string) {
    super(code, message)
  }
}

/** 禁止访问错误 */
export class ForbiddenError extends AppError {
  constructor(message?: string) {
    super(ErrorCode.FORBIDDEN, message || '无权限访问')
  }
}

/** 资源不存在错误 */
export class NotFoundError extends AppError {
  constructor(code: ErrorCode = ErrorCode.NOT_FOUND, message?: string) {
    super(code, message)
  }
}

/** 资源冲突错误 */
export class ConflictError extends AppError {
  constructor(code: ErrorCode = ErrorCode.CONFLICT, message?: string) {
    super(code, message)
  }
}

/** 数据库错误 */
export class DatabaseError extends AppError {
  constructor(code: ErrorCode = ErrorCode.DATABASE_ERROR, message?: string) {
    super(code, message)
  }
}

/**
 * 从 Prisma 错误创建 AppError
 */
export function fromPrismaError(error: unknown): AppError {
  const message = error instanceof Error ? error.message : String(error)
  
  // Prisma 唯一约束错误
  if (message.includes('Unique constraint')) {
    return new ConflictError(ErrorCode.UNIQUE_CONSTRAINT, '数据已存在，请检查是否重复')
  }
  
  // Prisma 外键约束错误
  if (message.includes('Foreign key constraint')) {
    return new DatabaseError(ErrorCode.FOREIGN_KEY_CONSTRAINT, '关联数据不存在')
  }
  
  // 其他数据库错误
  return new DatabaseError(ErrorCode.DATABASE_ERROR, '数据库操作失败')
}

/**
 * 从 Zod 验证错误创建 ValidationError
 */
export function fromZodError(error: { issues: Array<{ message: string; path: (string | number)[] }> }): ValidationError {
  const firstIssue = error.issues[0]
  const message = firstIssue?.message || '参数验证失败'
  const details = {
    errors: error.issues.map(issue => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  }
  return new ValidationError(message, details)
}

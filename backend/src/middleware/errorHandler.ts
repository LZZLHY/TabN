/**
 * 统一错误处理中间件
 * 
 * 提供全局的错误捕获和标准化响应处理
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express'
import { AppError, ErrorCode, ErrorHttpStatus, ErrorMessages, fromPrismaError } from '../utils/errors'
import { createLogger } from '../services/logger'
import { getRequestId } from './requestLogger'

const logger = createLogger('errorHandler')

/**
 * 标准化错误响应格式
 */
interface ErrorResponse {
  ok: false
  code: ErrorCode
  message: string
  requestId?: string
  details?: Record<string, unknown>
}

/**
 * 判断是否为 Prisma 错误
 */
function isPrismaError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    const name = error.name.toLowerCase()
    return (
      name.includes('prisma') ||
      message.includes('prisma') ||
      message.includes('unique constraint') ||
      message.includes('foreign key constraint')
    )
  }
  return false
}

/**
 * 判断是否为 JWT 错误
 */
function isJwtError(error: unknown): boolean {
  if (error instanceof Error) {
    const name = error.name.toLowerCase()
    return (
      name.includes('jsonwebtokenerror') ||
      name.includes('tokenexpirederror') ||
      name.includes('notbeforeerror')
    )
  }
  return false
}

/**
 * 将未知错误转换为 AppError
 */
function normalizeError(error: unknown): AppError {
  // 已经是 AppError
  if (error instanceof AppError) {
    return error
  }

  // Prisma 错误
  if (isPrismaError(error)) {
    return fromPrismaError(error)
  }

  // JWT 错误
  if (isJwtError(error)) {
    const err = error as Error
    if (err.name === 'TokenExpiredError') {
      return new AppError(ErrorCode.TOKEN_EXPIRED, '登录已过期，请重新登录')
    }
    return new AppError(ErrorCode.TOKEN_INVALID, '登录态无效，请重新登录')
  }

  // 普通 Error
  if (error instanceof Error) {
    // 检查是否有 status/statusCode 属性
    const statusCode = (error as any).status || (error as any).statusCode
    if (typeof statusCode === 'number') {
      // 找到匹配的错误码
      const code = Object.entries(ErrorHttpStatus).find(
        ([_, status]) => status === statusCode
      )?.[0] as ErrorCode | undefined

      return new AppError(
        code ? Number(code) : ErrorCode.UNKNOWN,
        error.message
      )
    }
    
    return new AppError(ErrorCode.INTERNAL_ERROR, error.message)
  }

  // 未知类型的错误
  return new AppError(ErrorCode.UNKNOWN, String(error))
}

/**
 * 统一错误处理中间件
 * 
 * 必须放在所有路由之后使用
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = getRequestId(req)
  const appError = normalizeError(error)

  // 构建错误响应
  const response: ErrorResponse = {
    ok: false,
    code: appError.code,
    message: appError.message,
    requestId,
  }

  // 开发环境下包含详细信息
  if (process.env.NODE_ENV === 'development' && appError.details) {
    response.details = appError.details
  }

  // 非预期错误记录详细日志
  if (!appError.isOperational) {
    logger.error('Unexpected error', {
      code: appError.code,
      message: appError.message,
      stack: error.stack,
      requestId,
      path: req.path,
      method: req.method,
    })
  } else {
    // 预期错误只记录简要信息
    logger.warn('Request failed', {
      code: appError.code,
      message: appError.message,
      requestId,
      path: req.path,
    })
  }

  res.status(appError.statusCode).json(response)
}

/**
 * 异步处理器包装器
 * 
 * 自动捕获异步函数中的错误并传递给错误处理中间件
 * 
 * @example
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await prisma.user.findMany()
 *   res.json({ ok: true, data: users })
 * }))
 */
export function asyncHandler<T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<any>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req as T, res, next)).catch(next)
  }
}

/**
 * 404 处理中间件
 * 
 * 放在所有路由之后，errorHandler 之前
 */
export function notFoundHandler(req: Request, res: Response, _next: NextFunction): void {
  const requestId = getRequestId(req)
  
  res.status(404).json({
    ok: false,
    code: ErrorCode.NOT_FOUND,
    message: `Not Found: ${req.method} ${req.path}`,
    requestId,
  })
}

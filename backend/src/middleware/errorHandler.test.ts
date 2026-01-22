/**
 * 错误处理中间件测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { errorHandler, asyncHandler, notFoundHandler } from './errorHandler'
import { 
  AppError, 
  ErrorCode, 
  ValidationError, 
  UnauthorizedError, 
  NotFoundError,
  ForbiddenError,
  fromPrismaError,
  fromZodError,
} from '../utils/errors'

// Mock requestLogger
vi.mock('./requestLogger', () => ({
  getRequestId: vi.fn(() => 'test-request-id'),
}))

// Mock logger
vi.mock('../services/logger', () => ({
  createLogger: vi.fn(() => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  })),
}))

describe('errorHandler middleware', () => {
  let mockReq: Request
  let mockRes: Response
  let mockNext: NextFunction
  let jsonSpy: ReturnType<typeof vi.fn>
  let statusSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    jsonSpy = vi.fn()
    statusSpy = vi.fn(() => ({ json: jsonSpy }))
    
    mockReq = {
      path: '/test',
      method: 'GET',
    } as unknown as Request
    mockRes = {
      status: statusSpy,
      json: jsonSpy,
    } as unknown as Response
    mockNext = vi.fn()
  })

  it('should handle AppError correctly', () => {
    const error = new ValidationError('Invalid input', { field: 'email' })
    
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext)
    
    expect(statusSpy).toHaveBeenCalledWith(400)
    expect(jsonSpy).toHaveBeenCalledWith({
      ok: false,
      code: ErrorCode.VALIDATION,
      message: 'Invalid input',
      requestId: 'test-request-id',
    })
  })

  it('should handle UnauthorizedError', () => {
    const error = new UnauthorizedError(ErrorCode.TOKEN_EXPIRED, '登录已过期')
    
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext)
    
    expect(statusSpy).toHaveBeenCalledWith(401)
    expect(jsonSpy).toHaveBeenCalledWith({
      ok: false,
      code: ErrorCode.TOKEN_EXPIRED,
      message: '登录已过期',
      requestId: 'test-request-id',
    })
  })

  it('should handle ForbiddenError', () => {
    const error = new ForbiddenError('无权限访问')
    
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext)
    
    expect(statusSpy).toHaveBeenCalledWith(403)
    expect(jsonSpy).toHaveBeenCalledWith({
      ok: false,
      code: ErrorCode.FORBIDDEN,
      message: '无权限访问',
      requestId: 'test-request-id',
    })
  })

  it('should handle NotFoundError', () => {
    const error = new NotFoundError(ErrorCode.BOOKMARK_NOT_FOUND, '书签不存在')
    
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext)
    
    expect(statusSpy).toHaveBeenCalledWith(404)
    expect(jsonSpy).toHaveBeenCalledWith({
      ok: false,
      code: ErrorCode.BOOKMARK_NOT_FOUND,
      message: '书签不存在',
      requestId: 'test-request-id',
    })
  })

  it('should handle generic Error as internal error', () => {
    const error = new Error('Something went wrong')
    
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext)
    
    expect(statusSpy).toHaveBeenCalledWith(500)
    expect(jsonSpy).toHaveBeenCalledWith({
      ok: false,
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Something went wrong',
      requestId: 'test-request-id',
    })
  })
})

describe('asyncHandler', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    mockReq = {}
    mockRes = {
      json: vi.fn(),
    }
    mockNext = vi.fn()
  })

  it('should call handler and pass through for successful async functions', async () => {
    const handler = asyncHandler(async (_req, res) => {
      res.json({ ok: true })
    })

    await handler(mockReq as Request, mockRes as Response, mockNext)

    expect(mockRes.json).toHaveBeenCalledWith({ ok: true })
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should catch errors and pass to next', async () => {
    const error = new Error('Async error')
    const handler = asyncHandler(async () => {
      throw error
    })

    await handler(mockReq as Request, mockRes as Response, mockNext)

    expect(mockNext).toHaveBeenCalledWith(error)
  })

  it('should catch AppError and pass to next', async () => {
    const error = new ValidationError('Invalid data')
    const handler = asyncHandler(async () => {
      throw error
    })

    await handler(mockReq as Request, mockRes as Response, mockNext)

    expect(mockNext).toHaveBeenCalledWith(error)
  })
})

describe('notFoundHandler', () => {
  it('should return 404 with correct message', () => {
    const jsonSpy = vi.fn()
    const statusSpy = vi.fn(() => ({ json: jsonSpy }))
    
    const mockReq = {
      method: 'GET',
      path: '/api/unknown',
    } as unknown as Request
    
    const mockRes = {
      status: statusSpy,
      json: jsonSpy,
    } as unknown as Response

    notFoundHandler(mockReq, mockRes, vi.fn())

    expect(statusSpy).toHaveBeenCalledWith(404)
    expect(jsonSpy).toHaveBeenCalledWith({
      ok: false,
      code: ErrorCode.NOT_FOUND,
      message: 'Not Found: GET /api/unknown',
      requestId: 'test-request-id',
    })
  })
})

describe('Error utilities', () => {
  describe('fromPrismaError', () => {
    it('should convert unique constraint error', () => {
      const prismaError = new Error('Unique constraint failed on the fields: (`email`)')
      const appError = fromPrismaError(prismaError)
      
      expect(appError.code).toBe(ErrorCode.UNIQUE_CONSTRAINT)
      expect(appError.statusCode).toBe(409)
    })

    it('should convert foreign key constraint error', () => {
      const prismaError = new Error('Foreign key constraint failed')
      const appError = fromPrismaError(prismaError)
      
      expect(appError.code).toBe(ErrorCode.FOREIGN_KEY_CONSTRAINT)
      expect(appError.statusCode).toBe(400)
    })

    it('should convert generic database error', () => {
      const prismaError = new Error('Database connection failed')
      const appError = fromPrismaError(prismaError)
      
      expect(appError.code).toBe(ErrorCode.DATABASE_ERROR)
      expect(appError.statusCode).toBe(500)
    })
  })

  describe('fromZodError', () => {
    it('should convert zod validation error', () => {
      const zodError = {
        issues: [
          { message: 'Invalid email format', path: ['email'] },
          { message: 'Password too short', path: ['password'] },
        ],
      }
      
      const appError = fromZodError(zodError)
      
      expect(appError.code).toBe(ErrorCode.VALIDATION)
      expect(appError.message).toBe('Invalid email format')
      expect(appError.details).toEqual({
        errors: [
          { path: 'email', message: 'Invalid email format' },
          { path: 'password', message: 'Password too short' },
        ],
      })
    })
  })
})

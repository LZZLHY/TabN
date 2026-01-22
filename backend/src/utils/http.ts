import type { Response } from 'express'
import { ErrorCode, ErrorHttpStatus } from './errors'

/** 成功响应 */
export function ok<T>(res: Response, data: T) {
  return res.json({ ok: true, data })
}

/** 失败响应（兼容旧接口） */
export function fail(res: Response, status: number, message: string, code?: ErrorCode) {
  return res.status(status).json({ 
    ok: false, 
    message,
    ...(code !== undefined ? { code } : {}),
  })
}

/** 
 * 带错误码的失败响应
 * @param res Express Response 对象
 * @param code 错误码
 * @param message 可选的自定义消息
 */
export function failWithCode(res: Response, code: ErrorCode, message?: string) {
  const status = ErrorHttpStatus[code] || 500
  return res.status(status).json({
    ok: false,
    code,
    message: message || '操作失败',
  })
}

/**
 * 从 unknown 类型错误中提取错误消息
 * @param e unknown 类型的错误
 * @param fallback 默认消息
 */
export function getErrorMessage(e: unknown, fallback = '操作失败'): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  if (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string') {
    return e.message
  }
  return fallback
}



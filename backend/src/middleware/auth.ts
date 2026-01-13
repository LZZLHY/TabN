import type { NextFunction, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../env'
import type { AuthedRequest, AuthPayload } from '../types/auth'
import { fail } from '../utils/http'
import { prisma } from '../prisma'

/** 从请求中提取 token（支持 header 和 query 参数） */
function extractToken(req: AuthedRequest): string {
  // 优先从 Authorization header 获取
  const header = req.header('authorization') ?? ''
  if (header.toLowerCase().startsWith('bearer ')) {
    return header.slice('bearer '.length).trim()
  }
  
  // 其次从 URL query 参数获取（用于 SSE 等不支持自定义 header 的场景）
  const queryToken = req.query.token
  if (typeof queryToken === 'string' && queryToken) {
    return queryToken
  }
  
  return ''
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req)

  if (!token) return fail(res, 401, '未登录')

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload
    if (!payload?.sub) return fail(res, 401, '登录态无效')
    // 为了做权限控制，这里附带查询一次 role
    prisma.user
      .findUnique({ where: { id: payload.sub }, select: { role: true } })
      .then((u) => {
        if (!u) return fail(res, 401, '用户不存在')
        req.auth = { userId: payload.sub, role: u.role }
        return next()
      })
      .catch(() => fail(res, 500, '鉴权失败'))
  } catch {
    return fail(res, 401, '登录态已过期或无效')
  }
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.auth) return fail(res, 401, '未登录')
  if (req.auth.role !== 'ADMIN' && req.auth.role !== 'ROOT') return fail(res, 403, '无权限')
  return next()
}

export function requireRoot(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.auth) return fail(res, 401, '未登录')
  if (req.auth.role !== 'ROOT') return fail(res, 403, '无权限')
  return next()
}



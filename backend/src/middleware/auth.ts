import type { NextFunction, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../env'
import type { AuthedRequest, AuthPayload } from '../types/auth'
import { fail } from '../utils/http'
import { ErrorCode } from '../utils/errors'
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

  if (!token) return fail(res, 401, '未登录', ErrorCode.UNAUTHORIZED)

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload & { v?: number }
    if (!payload?.sub) return fail(res, 401, '登录态无效', ErrorCode.TOKEN_INVALID)
    const tokenVersion = payload.v ?? 0
    // 为了做权限控制，这里附带查询一次 role 和 tokenVersion
    prisma.user
      .findUnique({ where: { id: payload.sub }, select: { role: true, tokenVersion: true } })
      .then((u) => {
        if (!u) return fail(res, 401, '用户不存在', ErrorCode.USER_NOT_FOUND)
        // 检查 tokenVersion，密码修改后旧 token 失效
        // 使用 ?? 0 处理迁移前的旧数据（tokenVersion 字段可能不存在）
        if ((u.tokenVersion ?? 0) !== tokenVersion) {
          return fail(res, 401, '登录态已失效，请重新登录', ErrorCode.TOKEN_INVALID)
        }
        req.auth = { userId: payload.sub, role: u.role }
        return next()
      })
      .catch(() => fail(res, 500, '鉴权失败', ErrorCode.INTERNAL_ERROR))
  } catch {
    return fail(res, 401, '登录态已过期或无效', ErrorCode.TOKEN_EXPIRED)
  }
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.auth) return fail(res, 401, '未登录', ErrorCode.UNAUTHORIZED)
  if (req.auth.role !== 'ADMIN' && req.auth.role !== 'ROOT') return fail(res, 403, '无权限', ErrorCode.FORBIDDEN)
  return next()
}

export function requireRoot(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.auth) return fail(res, 401, '未登录', ErrorCode.UNAUTHORIZED)
  if (req.auth.role !== 'ROOT') return fail(res, 403, '无权限', ErrorCode.FORBIDDEN)
  return next()
}



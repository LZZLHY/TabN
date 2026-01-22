import type { NextFunction, Response } from 'express'
import { prisma } from '../prisma'
import type { AuthedRequest } from '../types/auth'
import { fail } from '../utils/http'

/**
 * API 密钥认证中间件
 * 
 * 从请求头 `X-API-Key` 获取密钥，验证其有效性，并将用户 ID 附加到请求对象上。
 * 
 * API Key 格式: "bk_{userId}_{randomString}"
 * 示例: "bk_clx123abc_a1b2c3d4e5f6"
 * 
 * Requirements: 5.3, 5.4
 */
export async function requireAPIKey(req: AuthedRequest, res: Response, next: NextFunction) {
  // 从请求头获取 API 密钥
  const apiKey = req.header('X-API-Key')

  // 检查密钥是否存在
  if (!apiKey) {
    return fail(res, 401, '缺少 API 密钥')
  }

  // 验证密钥格式: bk_{userId}_{randomString}
  if (!isValidAPIKeyFormat(apiKey)) {
    return fail(res, 401, 'API 密钥无效')
  }

  try {
    // 在数据库中查找密钥
    const apiKeyRecord = await prisma.aPIKey.findUnique({
      where: { key: apiKey },
      select: { userId: true },
    })

    // 检查密钥是否存在于数据库中
    if (!apiKeyRecord) {
      return fail(res, 401, 'API 密钥无效')
    }

    // 从密钥中提取用户 ID 并验证与数据库记录一致
    const extractedUserId = extractUserIdFromAPIKey(apiKey)
    if (extractedUserId !== apiKeyRecord.userId) {
      return fail(res, 401, 'API 密钥无效')
    }

    // 将用户 ID 附加到请求对象上（与 JWT 认证保持一致的格式）
    // 对于 API 密钥认证，默认角色为 USER
    req.auth = { userId: apiKeyRecord.userId, role: 'USER' }

    return next()
  } catch (error) {
    return fail(res, 500, '验证 API 密钥失败')
  }
}

/**
 * 验证 API 密钥格式是否有效
 * 格式: bk_{userId}_{randomString}
 * - 必须以 "bk_" 开头
 * - 必须包含用户 ID 和随机字符串
 * - 随机字符串为 32 位十六进制字符
 */
export function isValidAPIKeyFormat(apiKey: string): boolean {
  // 基本格式检查
  if (!apiKey || typeof apiKey !== 'string') {
    return false
  }

  // 必须以 "bk_" 开头
  if (!apiKey.startsWith('bk_')) {
    return false
  }

  // 分割密钥: bk_{userId}_{randomString}
  const parts = apiKey.split('_')
  
  // 至少需要 3 部分: "bk", userId, randomString
  // 但 userId 本身可能包含下划线，所以我们检查最后一部分是否为 32 位十六进制
  if (parts.length < 3) {
    return false
  }

  // 最后一部分应该是 32 位十六进制随机字符串
  const randomString = parts[parts.length - 1]
  if (!/^[a-f0-9]{32}$/i.test(randomString)) {
    return false
  }

  // 中间部分（userId）不能为空
  const userIdParts = parts.slice(1, -1)
  const userId = userIdParts.join('_')
  if (!userId) {
    return false
  }

  return true
}

/**
 * 从 API 密钥中提取用户 ID
 * 格式: bk_{userId}_{randomString}
 */
export function extractUserIdFromAPIKey(apiKey: string): string | null {
  if (!isValidAPIKeyFormat(apiKey)) {
    return null
  }

  const parts = apiKey.split('_')
  // 移除 "bk" 前缀和最后的随机字符串，剩余部分为 userId
  const userIdParts = parts.slice(1, -1)
  return userIdParts.join('_')
}

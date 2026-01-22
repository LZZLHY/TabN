import type { Response } from 'express'
import crypto from 'crypto'
import { prisma } from '../prisma'
import { ok, fail, getErrorMessage } from '../utils/http'
import type { AuthedRequest } from '../types/auth'

/**
 * 生成 API 密钥
 * API Key 格式: "bk_{userId}_{randomString}"
 * 示例: "bk_clx123abc_a1b2c3d4e5f6"
 */
function generateAPIKeyString(userId: string): string {
  const random = crypto.randomBytes(16).toString('hex')
  return `bk_${userId}_${random}`
}

/**
 * 生成新的 API 密钥
 * POST /api-keys
 * Requirements: 5.1
 */
export async function generateAPIKey(req: AuthedRequest, res: Response) {
  const userId = req.auth?.userId
  if (!userId) return fail(res, 401, '未登录')

  try {
    // 检查用户是否已有 API 密钥
    const existingKey = await prisma.aPIKey.findUnique({
      where: { userId },
    })

    if (existingKey) {
      return fail(res, 409, 'API 密钥已存在，请使用重新生成接口')
    }

    // 生成新密钥
    const key = generateAPIKeyString(userId)

    const apiKey = await prisma.aPIKey.create({
      data: {
        userId,
        key,
      },
    })

    return ok(res, {
      key: apiKey.key,
      createdAt: apiKey.createdAt.toISOString(),
    })
  } catch (e: unknown) {
    const msg = getErrorMessage(e, '生成 API 密钥失败')
    if (msg.includes('Unique constraint')) {
      return fail(res, 409, 'API 密钥已存在')
    }
    return fail(res, 500, '生成 API 密钥失败')
  }
}

/**
 * 重新生成 API 密钥（作废旧密钥并生成新密钥）
 * DELETE /api-keys
 * Requirements: 5.2
 */
export async function regenerateAPIKey(req: AuthedRequest, res: Response) {
  const userId = req.auth?.userId
  if (!userId) return fail(res, 401, '未登录')

  try {
    // 生成新密钥
    const newKey = generateAPIKeyString(userId)

    // 使用 upsert 来处理：如果存在则更新，如果不存在则创建
    const apiKey = await prisma.aPIKey.upsert({
      where: { userId },
      update: {
        key: newKey,
        updatedAt: new Date(),
      },
      create: {
        userId,
        key: newKey,
      },
    })

    return ok(res, {
      key: apiKey.key,
      createdAt: apiKey.createdAt.toISOString(),
    })
  } catch (_e: unknown) {
    return fail(res, 500, '重新生成 API 密钥失败')
  }
}

/**
 * 获取当前 API 密钥状态
 * GET /api-keys
 * Requirements: 5.1
 */
export async function getAPIKeyStatus(req: AuthedRequest, res: Response) {
  const userId = req.auth?.userId
  if (!userId) return fail(res, 401, '未登录')

  try {
    const apiKey = await prisma.aPIKey.findUnique({
      where: { userId },
    })

    if (!apiKey) {
      return ok(res, {
        hasKey: false,
        key: null,
        createdAt: null,
      })
    }

    return ok(res, {
      hasKey: true,
      key: apiKey.key,
      createdAt: apiKey.createdAt.toISOString(),
    })
  } catch (_e: unknown) {
    return fail(res, 500, '获取 API 密钥状态失败')
  }
}

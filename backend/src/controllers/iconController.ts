import type { Response } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'
import type { AuthedRequest } from '../types/auth'
import { fail, ok } from '../utils/http'
import { validateIconUrl, validateBase64Icon } from '../utils/icon'

// IconType 枚举值（与 Prisma schema 保持一致）
const IconTypeEnum = {
  URL: 'URL',
  BASE64: 'BASE64',
} as const

/**
 * 图标扩展 API 控制器
 * 
 * 提供给第三方扩展开发者使用的图标更新接口
 * 所有接口都需要通过 API Key 认证
 * 
 * Requirements: 6.1, 6.2, 6.4, 7.1, 7.2, 7.4
 */

/** 单个图标更新请求 Schema */
const IconUpdateSchema = z.object({
  iconType: z.enum(['URL', 'BASE64']),
  iconData: z.string().min(1, '图标数据不能为空'),
})

/** 批量图标更新请求 Schema */
const BatchIconUpdateSchema = z.object({
  updates: z.array(z.object({
    bookmarkId: z.string().min(1, '书签 ID 不能为空'),
    iconType: z.enum(['URL', 'BASE64']),
    iconData: z.string().min(1, '图标数据不能为空'),
  })).min(1, '更新列表不能为空').max(100, '单次批量更新最多 100 个书签'),
})

/**
 * 验证图标数据
 * @param iconType 图标类型
 * @param iconData 图标数据
 * @returns 验证结果
 */
function validateIconData(
  iconType: 'URL' | 'BASE64',
  iconData: string
): { valid: true } | { valid: false; error: string } {
  if (iconType === 'URL') {
    if (!validateIconUrl(iconData)) {
      return { valid: false, error: '图标 URL 格式无效' }
    }
  } else if (iconType === 'BASE64') {
    const result = validateBase64Icon(iconData)
    if (!result.valid) {
      return { valid: false, error: result.errors[0] ?? '图标数据格式无效' }
    }
  }
  return { valid: true }
}

/**
 * 更新单个书签图标
 * PATCH /icons/:bookmarkId
 * 
 * Requirements:
 * - 6.1: 更新指定书签的图标
 * - 6.2: 接受书签 ID 和图标数据作为参数
 * - 6.4: 返回更新后的书签数据
 */
export async function updateIcon(req: AuthedRequest, res: Response) {
  const userId = req.auth?.userId
  if (!userId) return fail(res, 401, '未授权')

  const bookmarkId = String(req.params.bookmarkId || '').trim()
  if (!bookmarkId) return fail(res, 400, '缺少书签 ID')

  // 验证请求体
  const parsed = IconUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    return fail(res, 400, parsed.error.issues[0]?.message ?? '参数错误')
  }

  const { iconType, iconData } = parsed.data

  // 验证图标数据格式 - Requirements: 6.5
  const validation = validateIconData(iconType, iconData)
  if (!validation.valid) {
    return fail(res, 400, validation.error)
  }

  // 查找书签并验证所有权 - Requirements: 6.3
  const bookmark = await prisma.bookmark.findFirst({
    where: { id: bookmarkId, userId },
  })

  if (!bookmark) {
    return fail(res, 404, '书签不存在')
  }

  // 更新书签图标
  const updatedBookmark = await prisma.bookmark.update({
    where: { id: bookmarkId },
    data: {
      iconType: iconType === 'URL' ? IconTypeEnum.URL : IconTypeEnum.BASE64,
      iconUrl: iconType === 'URL' ? iconData : null,
      iconData: iconType === 'BASE64' ? iconData : null,
    },
  })

  // 返回更新后的数据 - Requirements: 6.4
  return ok(res, {
    bookmarkId: updatedBookmark.id,
    iconType: updatedBookmark.iconType,
    iconUrl: updatedBookmark.iconUrl,
    iconData: updatedBookmark.iconData,
  })
}

/**
 * 批量更新书签图标
 * POST /icons/batch
 * 
 * Requirements:
 * - 7.1: 更新多个书签的图标
 * - 7.2: 接受书签 ID 与图标数据的映射数组
 * - 7.4: 返回每个书签的更新结果
 */
export async function batchUpdateIcons(req: AuthedRequest, res: Response) {
  const userId = req.auth?.userId
  if (!userId) return fail(res, 401, '未授权')

  // 验证请求体
  const parsed = BatchIconUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    const errorMessage = parsed.error.issues[0]?.message ?? '参数错误'
    // 检查是否是超过 100 个的错误
    if (errorMessage.includes('100')) {
      return fail(res, 400, '单次批量更新最多 100 个书签')
    }
    return fail(res, 400, errorMessage)
  }

  const { updates } = parsed.data

  // 处理每个更新请求
  const results: Array<{
    bookmarkId: string
    success: boolean
    error?: string
  }> = []

  let successCount = 0
  let failureCount = 0

  for (const update of updates) {
    const { bookmarkId, iconType, iconData } = update

    try {
      // 验证图标数据格式
      const validation = validateIconData(iconType, iconData)
      if (!validation.valid) {
        results.push({
          bookmarkId,
          success: false,
          error: validation.error,
        })
        failureCount++
        continue
      }

      // 查找书签并验证所有权
      const bookmark = await prisma.bookmark.findFirst({
        where: { id: bookmarkId, userId },
      })

      if (!bookmark) {
        results.push({
          bookmarkId,
          success: false,
          error: '书签不存在',
        })
        failureCount++
        continue
      }

      // 更新书签图标
      await prisma.bookmark.update({
        where: { id: bookmarkId },
        data: {
          iconType: iconType === 'URL' ? IconTypeEnum.URL : IconTypeEnum.BASE64,
          iconUrl: iconType === 'URL' ? iconData : null,
          iconData: iconType === 'BASE64' ? iconData : null,
        },
      })

      results.push({
        bookmarkId,
        success: true,
      })
      successCount++
    } catch (error) {
      results.push({
        bookmarkId,
        success: false,
        error: '更新失败',
      })
      failureCount++
    }
  }

  // 返回批量更新结果 - Requirements: 7.4
  return ok(res, {
    results,
    successCount,
    failureCount,
  })
}

/**
 * 获取用户书签列表（供扩展使用）
 * GET /icons/bookmarks
 * 
 * 返回用户的所有书签，供扩展开发者查看可以更新图标的书签
 */
export async function listBookmarksForExtension(req: AuthedRequest, res: Response) {
  const userId = req.auth?.userId
  if (!userId) return fail(res, 401, '未授权')

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      url: true,
      type: true,
      iconType: true,
      iconUrl: true,
      iconData: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  return ok(res, {
    bookmarks: bookmarks.map(b => ({
      id: b.id,
      name: b.name,
      url: b.url,
      type: b.type,
      iconType: b.iconType,
      iconUrl: b.iconUrl,
      iconData: b.iconData,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    })),
  })
}

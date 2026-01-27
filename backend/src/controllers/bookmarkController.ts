import type { Response } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'
import type { AuthedRequest } from '../types/auth'
import { fail, ok } from '../utils/http'
import { ErrorCode } from '../utils/errors'
import { BookmarkType, IconType } from '@prisma/client'
import { extractDomainName } from '../utils/url'
import { audit, AuditAction } from '../services/auditLogger'
import { validateAndSanitizeTags } from '../utils/tags'
import { validateIconUrl, validateBase64Icon } from '../utils/icon'

const CreateSchema = z.object({
  name: z.string().trim().max(120).optional().or(z.literal('')),  // 名称改为可选
  // URL is optional for folders
  url: z.string().trim().url().max(2048).optional().or(z.literal('')),
  note: z.string().trim().max(500).optional(),
  type: z.nativeEnum(BookmarkType).default(BookmarkType.LINK),
  parentId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),  // 新增：标签数组
  // 图标相关字段 - Requirements: 4.1, 4.4
  iconUrl: z.string().trim().optional().nullable(),
  iconData: z.string().optional().nullable(),
  iconType: z.nativeEnum(IconType).optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.type === BookmarkType.LINK && !data.url) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '书签必须填写网址',
      path: ['url'],
    })
  }
  // 文件夹必须有名称
  if (data.type === BookmarkType.FOLDER && !data.name) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '文件夹必须填写名称',
      path: ['name'],
    })
  }
})

const UpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  url: z.string().trim().url().max(2048).optional().or(z.literal('')),
  note: z.string().trim().max(500).optional(),
  parentId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),  // 新增：标签数组
  // 图标相关字段 - Requirements: 4.1, 4.4
  iconUrl: z.string().trim().optional().nullable(),
  iconData: z.string().optional().nullable(),
  iconType: z.nativeEnum(IconType).optional().nullable(),
  iconBg: z.string().trim().optional().nullable(),  // 图标背景：null/default=原始, transparent=透明, #RRGGBB=自定义颜色
})

/**
 * 验证图标数据
 * Requirements: 4.2, 4.4, 4.5
 * @returns 验证结果，包含错误信息或处理后的图标数据
 */
function validateIconFields(data: {
  iconUrl?: string | null
  iconData?: string | null
  iconType?: IconType | null
}): { valid: true; iconUrl: string | null; iconData: string | null; iconType: IconType | null } | { valid: false; error: string } {
  const { iconUrl, iconData, iconType } = data

  // 如果没有提供任何图标字段，返回空值
  if (!iconUrl && !iconData && !iconType) {
    return { valid: true, iconUrl: null, iconData: null, iconType: null }
  }

  // 如果提供了 iconType，必须同时提供对应的数据
  if (iconType === IconType.URL) {
    if (!iconUrl) {
      return { valid: false, error: '图标类型为 URL 时必须提供 iconUrl' }
    }
    // 支持 source: 前缀的图标来源标记
    const validSources = ['auto', 'google', 'duckduckgo', 'iconhorse']
    if (iconUrl.startsWith('source:')) {
      const sourceKey = iconUrl.slice(7)
      if (validSources.includes(sourceKey)) {
        return { valid: true, iconUrl, iconData: null, iconType: IconType.URL }
      }
      return { valid: false, error: '图标来源无效' }
    }
    // 验证 URL 格式
    if (!validateIconUrl(iconUrl)) {
      return { valid: false, error: '图标 URL 格式无效' }
    }
    return { valid: true, iconUrl, iconData: null, iconType: IconType.URL }
  }

  if (iconType === IconType.BASE64) {
    if (!iconData) {
      return { valid: false, error: '图标类型为 BASE64 时必须提供 iconData' }
    }
    // 验证 Base64 格式
    const base64Result = validateBase64Icon(iconData)
    if (!base64Result.valid) {
      return { valid: false, error: base64Result.errors[0] ?? '图标数据格式无效' }
    }
    return { valid: true, iconUrl: null, iconData, iconType: IconType.BASE64 }
  }

  // 如果只提供了 iconUrl 但没有 iconType，自动设置为 URL 类型
  if (iconUrl && !iconType) {
    // 支持 source: 前缀的图标来源标记（如 source:google, source:duckduckgo）
    const validSources = ['auto', 'google', 'duckduckgo', 'iconhorse']
    if (iconUrl.startsWith('source:')) {
      const sourceKey = iconUrl.slice(7)
      if (validSources.includes(sourceKey)) {
        // 图标来源标记，直接存储
        return { valid: true, iconUrl, iconData: null, iconType: IconType.URL }
      }
      return { valid: false, error: '图标来源无效' }
    }
    // 普通 URL 验证
    if (!validateIconUrl(iconUrl)) {
      return { valid: false, error: '图标 URL 格式无效' }
    }
    return { valid: true, iconUrl, iconData: null, iconType: IconType.URL }
  }

  // 如果只提供了 iconData 但没有 iconType，自动设置为 BASE64 类型
  if (iconData && !iconType) {
    const base64Result = validateBase64Icon(iconData)
    if (!base64Result.valid) {
      return { valid: false, error: base64Result.errors[0] ?? '图标数据格式无效' }
    }
    return { valid: true, iconUrl: null, iconData, iconType: IconType.BASE64 }
  }

  // 其他情况返回空值
  return { valid: true, iconUrl: null, iconData: null, iconType: null }
}

/**
 * 获取用户书签列表
 * GET /bookmarks - 返回所有书签
 * GET /bookmarks?tag=xxx - 返回包含指定标签的书签
 * Requirements: 2.1, 2.2
 */
export async function listBookmarks(req: AuthedRequest, res: Response) {
  const userId = req.auth?.userId
  if (!userId) return fail(res, 401, '未登录', ErrorCode.UNAUTHORIZED)

  // 获取 tag 查询参数
  const tag = typeof req.query.tag === 'string' ? req.query.tag.trim() : undefined

  // 构建查询条件
  const whereClause: { userId: string; tags?: { has: string } } = { userId }
  
  // 如果提供了 tag 参数，添加标签筛选条件
  if (tag) {
    whereClause.tags = { has: tag }
  }

  const items = await prisma.bookmark.findMany({
    where: whereClause,
    orderBy: { createdAt: 'asc' },
  })

  return ok(res, { items })
}

export async function createBookmark(req: AuthedRequest, res: Response) {
  const userId = req.auth?.userId
  if (!userId) return fail(res, 401, '未登录', ErrorCode.UNAUTHORIZED)

  const parsed = CreateSchema.safeParse(req.body)
  if (!parsed.success) return fail(res, 400, parsed.error.issues[0]?.message ?? '参数错误')

  // 验证并清理标签
  const { tags: sanitizedTags, validation: tagValidation } = validateAndSanitizeTags(parsed.data.tags || [])
  if (!tagValidation.valid) {
    return fail(res, 400, tagValidation.errors[0] ?? '标签格式错误')
  }

  // 验证图标数据 - Requirements: 4.1, 4.4
  const iconValidation = validateIconFields({
    iconUrl: parsed.data.iconUrl,
    iconData: parsed.data.iconData,
    iconType: parsed.data.iconType,
  })
  if (!iconValidation.valid) {
    return fail(res, 400, iconValidation.error)
  }

  // Check parent ownership if provided
  if (parsed.data.parentId) {
    const parent = await prisma.bookmark.findFirst({
      where: { id: parsed.data.parentId, userId, type: BookmarkType.FOLDER },
    })
    if (!parent) return fail(res, 400, '目标文件夹不存在', ErrorCode.FOLDER_NOT_FOUND)
  }

  // 检查 URL 是否已存在（仅对 LINK 类型）
  if (parsed.data.type === BookmarkType.LINK && parsed.data.url) {
    const existing = await prisma.bookmark.findFirst({
      where: { userId, url: parsed.data.url, type: BookmarkType.LINK },
    })
    if (existing) {
      return fail(res, 409, `书签已存在：${existing.name}`, ErrorCode.DUPLICATE_BOOKMARK)
    }
  }

  // 如果名称为空且是 LINK 类型，使用 URL 主域名作为默认名称
  let name = parsed.data.name?.trim() || ''
  if (!name && parsed.data.type === BookmarkType.LINK && parsed.data.url) {
    name = extractDomainName(parsed.data.url) || '未命名书签'
  }

  const item = await prisma.bookmark.create({
    data: {
      userId,
      name,
      url: parsed.data.type === BookmarkType.LINK ? parsed.data.url : null,
      note: parsed.data.note || null,
      type: parsed.data.type,
      parentId: parsed.data.parentId || null,
      tags: sanitizedTags,  // 保存标签
      // 保存图标数据 - Requirements: 4.1, 4.4
      iconUrl: iconValidation.iconUrl,
      iconData: iconValidation.iconData,
      iconType: iconValidation.iconType,
    },
  })

  // 记录创建审计日志
  await audit(req, AuditAction.CREATE, 'bookmark', {
    resourceId: item.id,
    details: { 
      name: item.name, 
      type: item.type, 
      url: item.url, 
      tags: item.tags,
      iconType: item.iconType,
    },
    success: true,
  })

  return ok(res, { item })
}

export async function updateBookmark(req: AuthedRequest, res: Response) {
  const userId = req.auth?.userId
  if (!userId) return fail(res, 401, '未登录')

  const id = String(req.params.id || '').trim()
  if (!id) return fail(res, 400, '缺少书签 id')

  const parsed = UpdateSchema.safeParse(req.body)
  if (!parsed.success) return fail(res, 400, parsed.error.issues[0]?.message ?? '参数错误')

  // 验证并清理标签（如果提供了标签）
  let sanitizedTags: string[] | undefined
  if (parsed.data.tags !== undefined) {
    const { tags, validation: tagValidation } = validateAndSanitizeTags(parsed.data.tags)
    if (!tagValidation.valid) {
      return fail(res, 400, tagValidation.errors[0] ?? '标签格式错误')
    }
    sanitizedTags = tags
  }

  // 验证图标数据（如果提供了图标相关字段）- Requirements: 4.1, 4.4
  let iconData: { iconUrl: string | null; iconData: string | null; iconType: IconType | null } | undefined
  const hasIconFields = parsed.data.iconUrl !== undefined || 
                        parsed.data.iconData !== undefined || 
                        parsed.data.iconType !== undefined
  
  if (hasIconFields) {
    const iconValidation = validateIconFields({
      iconUrl: parsed.data.iconUrl,
      iconData: parsed.data.iconData,
      iconType: parsed.data.iconType,
    })
    if (!iconValidation.valid) {
      return fail(res, 400, iconValidation.error)
    }
    iconData = {
      iconUrl: iconValidation.iconUrl,
      iconData: iconValidation.iconData,
      iconType: iconValidation.iconType,
    }
  }

  const existed = await prisma.bookmark.findFirst({ where: { id, userId } })
  if (!existed) return fail(res, 404, '书签不存在', ErrorCode.BOOKMARK_NOT_FOUND)

  // Prevent self-parenting or circular (simple check: cannot set parentId to self)
  if (parsed.data.parentId === id) {
    return fail(res, 400, '无法移动到自己内部')
  }

  // Check parent ownership if parentId changed
  if (parsed.data.parentId && parsed.data.parentId !== existed.parentId) {
    const parent = await prisma.bookmark.findFirst({
      where: { id: parsed.data.parentId, userId, type: BookmarkType.FOLDER },
    })
    if (!parent) return fail(res, 400, '目标文件夹不存在', ErrorCode.FOLDER_NOT_FOUND)
  }

  const item = await prisma.bookmark.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.url !== undefined ? { url: parsed.data.url?.trim() || null } : {}),
      ...(parsed.data.note !== undefined ? { note: parsed.data.note?.trim() || null } : {}),
      ...(parsed.data.parentId !== undefined ? { parentId: parsed.data.parentId } : {}),
      ...(sanitizedTags !== undefined ? { tags: sanitizedTags } : {}),  // 更新标签
      // 更新图标数据 - Requirements: 4.1, 4.4
      ...(iconData !== undefined ? {
        iconUrl: iconData.iconUrl,
        iconData: iconData.iconData,
        iconType: iconData.iconType,
      } : {}),
      // 更新图标背景
      ...(parsed.data.iconBg !== undefined ? { iconBg: parsed.data.iconBg || null } : {}),
    },
  })

  // 记录更新审计日志
  await audit(req, AuditAction.UPDATE, 'bookmark', {
    resourceId: id,
    details: { 
      changes: { 
        ...parsed.data, 
        tags: sanitizedTags,
        iconUrl: iconData?.iconUrl,
        iconData: iconData?.iconData ? '[BASE64_DATA]' : undefined,  // 不记录完整的 Base64 数据
        iconType: iconData?.iconType,
      },
      previousName: existed.name,
      previousTags: existed.tags,
      previousIconType: existed.iconType,
    },
    success: true,
  })

  return ok(res, { item })
}

export async function deleteBookmark(req: AuthedRequest, res: Response) {
  const userId = req.auth?.userId
  if (!userId) return fail(res, 401, '未登录', ErrorCode.UNAUTHORIZED)

  const id = String(req.params.id || '').trim()
  if (!id) return fail(res, 400, '缺少书签 id')

  // 是否级联删除（删除文件夹及其所有子项）
  const cascade = req.query.cascade === 'true'

  const existed = await prisma.bookmark.findFirst({ where: { id, userId } })
  if (!existed) return fail(res, 404, '书签不存在', ErrorCode.BOOKMARK_NOT_FOUND)

  let deletedCount = 1
  if (existed.type === BookmarkType.FOLDER) {
    if (cascade) {
      // 级联删除：递归删除所有子项
      const deleteRecursive = async (folderId: string): Promise<number> => {
        const children = await prisma.bookmark.findMany({
          where: { parentId: folderId, userId },
          select: { id: true, type: true },
        })
        let count = 0
        for (const child of children) {
          if (child.type === BookmarkType.FOLDER) {
            count += await deleteRecursive(child.id)
          }
          await prisma.bookmark.delete({ where: { id: child.id } })
          count++
        }
        return count
      }
      deletedCount += await deleteRecursive(id)
    } else {
      // 释放模式：将子项移动到父级
      await prisma.bookmark.updateMany({
        where: { parentId: id },
        data: { parentId: existed.parentId },
      })
    }
  }

  await prisma.bookmark.delete({ where: { id } })

  // 记录删除审计日志
  await audit(req, AuditAction.DELETE, 'bookmark', {
    resourceId: id,
    details: { 
      name: existed.name, 
      type: existed.type, 
      url: existed.url,
      cascade,
      deletedCount,
    },
    success: true,
  })

  return ok(res, { id, deletedCount })
}

/**
 * 批量更新所有书签的图标背景
 * POST /bookmarks/batch-update-bg
 */
export async function batchUpdateIconBg(req: AuthedRequest, res: Response) {
  const userId = req.auth?.userId
  if (!userId) return fail(res, 401, '未登录')

  const { iconBg } = req.body as { iconBg: string | null }

  // 使用原生 SQL 更新用户所有书签的 iconBg
  const result = await prisma.$executeRaw`
    UPDATE "Bookmark" SET "iconBg" = ${iconBg} WHERE "userId" = ${userId}
  `

  return ok(res, { updated: result })
}

/**
 * 获取用户所有书签的标签列表（去重）
 * GET /bookmarks/tags
 * Requirements: 1.3
 */
export async function listTags(req: AuthedRequest, res: Response) {
  const userId = req.auth?.userId
  if (!userId) return fail(res, 401, '未登录')

  // 获取用户所有书签
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId },
    select: { tags: true },
  })

  // 聚合所有标签并去重
  const tagSet = new Set<string>()
  for (const bookmark of bookmarks) {
    for (const tag of bookmark.tags) {
      tagSet.add(tag)
    }
  }

  // 转换为数组并排序
  const tags = Array.from(tagSet).sort()

  return ok(res, { tags })
}

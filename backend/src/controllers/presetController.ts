/**
 * 图标预设控制器
 * Requirements: 1.2, 1.5, 5.2, 6.4, 7.1, 7.2, 7.3
 */
import type { Response } from 'express'
import { prisma } from '../prisma'
import type { AuthedRequest } from '../types/auth'
import { fail, ok } from '../utils/http'
import { ErrorCode } from '../utils/errors'
import {
  validatePresetName,
  sanitizePresetName,
  validateIconType,
  validateIconBg,
  MAX_PRESETS_PER_USER,
} from '../utils/preset'

/**
 * 获取书签的所有预设
 * GET /api/presets?bookmarkId=xxx
 * Requirements: 6.4 - 按创建时间倒序排列
 */
export async function listPresets(req: AuthedRequest, res: Response) {
  const userId = req.auth?.userId
  if (!userId) return fail(res, 401, '未登录', ErrorCode.UNAUTHORIZED)

  const bookmarkId = String(req.query.bookmarkId || '').trim()
  if (!bookmarkId) return fail(res, 400, '缺少书签 ID')

  // 验证书签存在且属于当前用户
  const bookmark = await prisma.bookmark.findUnique({ where: { id: bookmarkId } })
  if (!bookmark) return fail(res, 404, '书签不存在')
  if (bookmark.userId !== userId) return fail(res, 403, '无权访问此书签', ErrorCode.FORBIDDEN)

  const items = await prisma.iconPreset.findMany({
    where: { userId, bookmarkId },
    orderBy: { createdAt: 'desc' },
  })

  return ok(res, { items })
}

/**
 * 创建预设
 * POST /api/presets
 * Requirements: 1.2, 1.5, 7.2
 */
export async function createPreset(req: AuthedRequest, res: Response) {
  const userId = req.auth?.userId
  if (!userId) return fail(res, 401, '未登录', ErrorCode.UNAUTHORIZED)

  const { bookmarkId, name, iconType, iconData, iconUrl, iconBg } = req.body

  // 验证书签 ID
  if (!bookmarkId || typeof bookmarkId !== 'string') {
    return fail(res, 400, '缺少书签 ID')
  }

  // 验证书签存在且属于当前用户
  const bookmark = await prisma.bookmark.findUnique({ where: { id: bookmarkId } })
  if (!bookmark) return fail(res, 404, '书签不存在')
  if (bookmark.userId !== userId) return fail(res, 403, '无权访问此书签', ErrorCode.FORBIDDEN)

  // 验证名称
  const nameError = validatePresetName(name)
  if (nameError) {
    return fail(res, 400, nameError, ErrorCode.INVALID_PRESET_NAME)
  }

  // 验证图标类型
  const iconTypeError = validateIconType(iconType)
  if (iconTypeError) {
    return fail(res, 400, iconTypeError, ErrorCode.INVALID_ICON_TYPE)
  }

  // 验证图标背景
  const iconBgError = validateIconBg(iconBg)
  if (iconBgError) {
    return fail(res, 400, iconBgError, ErrorCode.INVALID_ICON_BG)
  }

  // 检查该书签的预设数量限制
  const count = await prisma.iconPreset.count({ where: { userId, bookmarkId } })
  if (count >= MAX_PRESETS_PER_USER) {
    return fail(res, 400, `已达到预设数量上限（${MAX_PRESETS_PER_USER}个）`, ErrorCode.PRESET_LIMIT_EXCEEDED)
  }

  // 创建预设
  const item = await prisma.iconPreset.create({
    data: {
      userId,
      bookmarkId,
      name: sanitizePresetName(name),
      iconType: iconType || null,
      iconData: iconData || null,
      iconUrl: iconUrl || null,
      iconBg: iconBg || null,
    },
  })

  return ok(res, { item })
}

/**
 * 删除预设
 * DELETE /api/presets/:id
 * Requirements: 5.2, 7.3
 */
export async function deletePreset(req: AuthedRequest, res: Response) {
  const userId = req.auth?.userId
  if (!userId) return fail(res, 401, '未登录', ErrorCode.UNAUTHORIZED)

  const id = String(req.params.id || '').trim()
  if (!id) return fail(res, 400, '缺少预设 ID')

  // 查找预设
  const preset = await prisma.iconPreset.findUnique({ where: { id } })
  
  if (!preset) {
    return fail(res, 404, '预设不存在', ErrorCode.PRESET_NOT_FOUND)
  }

  // 检查权限
  if (preset.userId !== userId) {
    return fail(res, 403, '无权删除此预设', ErrorCode.FORBIDDEN)
  }

  // 删除预设
  await prisma.iconPreset.delete({ where: { id } })

  return ok(res, { id })
}

/**
 * 更新预设（重命名）
 * PATCH /api/presets/:id
 */
export async function updatePreset(req: AuthedRequest, res: Response) {
  const userId = req.auth?.userId
  if (!userId) return fail(res, 401, '未登录', ErrorCode.UNAUTHORIZED)

  const id = String(req.params.id || '').trim()
  if (!id) return fail(res, 400, '缺少预设 ID')

  const { name } = req.body

  // 验证名称
  const nameError = validatePresetName(name)
  if (nameError) {
    return fail(res, 400, nameError, ErrorCode.INVALID_PRESET_NAME)
  }

  // 查找预设
  const preset = await prisma.iconPreset.findUnique({ where: { id } })
  
  if (!preset) {
    return fail(res, 404, '预设不存在', ErrorCode.PRESET_NOT_FOUND)
  }

  // 检查权限
  if (preset.userId !== userId) {
    return fail(res, 403, '无权修改此预设', ErrorCode.FORBIDDEN)
  }

  // 更新预设
  const item = await prisma.iconPreset.update({
    where: { id },
    data: { name: sanitizePresetName(name) },
  })

  return ok(res, { item })
}

import type { Response } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'
import type { AuthedRequest } from '../types/auth'
import { fail, ok } from '../utils/http'
import { BookmarkType } from '@prisma/client'
import { extractDomainName } from '../utils/url'
import { audit, AuditAction } from '../services/auditLogger'

const CreateSchema = z.object({
  name: z.string().trim().max(120).optional().or(z.literal('')),  // 名称改为可选
  // URL is optional for folders
  url: z.string().trim().url().max(2048).optional().or(z.literal('')),
  note: z.string().trim().max(500).optional(),
  type: z.nativeEnum(BookmarkType).default(BookmarkType.LINK),
  parentId: z.string().optional().nullable(),
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
})

export async function listBookmarks(req: AuthedRequest, res: Response) {
  const userId = req.auth?.userId
  if (!userId) return fail(res, 401, '未登录')

  const items = await prisma.bookmark.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  })

  return ok(res, { items })
}

export async function createBookmark(req: AuthedRequest, res: Response) {
  const userId = req.auth?.userId
  if (!userId) return fail(res, 401, '未登录')

  const parsed = CreateSchema.safeParse(req.body)
  if (!parsed.success) return fail(res, 400, parsed.error.issues[0]?.message ?? '参数错误')

  // Check parent ownership if provided
  if (parsed.data.parentId) {
    const parent = await prisma.bookmark.findFirst({
      where: { id: parsed.data.parentId, userId, type: BookmarkType.FOLDER },
    })
    if (!parent) return fail(res, 400, '目标文件夹不存在')
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
    },
  })

  // 记录创建审计日志
  await audit(req, AuditAction.CREATE, 'bookmark', {
    resourceId: item.id,
    details: { name: item.name, type: item.type, url: item.url },
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

  const existed = await prisma.bookmark.findFirst({ where: { id, userId } })
  if (!existed) return fail(res, 404, '书签不存在')

  // Prevent self-parenting or circular (simple check: cannot set parentId to self)
  if (parsed.data.parentId === id) {
    return fail(res, 400, '无法移动到自己内部')
  }

  // Check parent ownership if parentId changed
  if (parsed.data.parentId && parsed.data.parentId !== existed.parentId) {
    const parent = await prisma.bookmark.findFirst({
      where: { id: parsed.data.parentId, userId, type: BookmarkType.FOLDER },
    })
    if (!parent) return fail(res, 400, '目标文件夹不存在')
  }

  const item = await prisma.bookmark.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.url !== undefined ? { url: parsed.data.url?.trim() || null } : {}),
      ...(parsed.data.note !== undefined ? { note: parsed.data.note?.trim() || null } : {}),
      ...(parsed.data.parentId !== undefined ? { parentId: parsed.data.parentId } : {}),
    },
  })

  // 记录更新审计日志
  await audit(req, AuditAction.UPDATE, 'bookmark', {
    resourceId: id,
    details: { 
      changes: parsed.data,
      previousName: existed.name,
    },
    success: true,
  })

  return ok(res, { item })
}

export async function deleteBookmark(req: AuthedRequest, res: Response) {
  const userId = req.auth?.userId
  if (!userId) return fail(res, 401, '未登录')

  const id = String(req.params.id || '').trim()
  if (!id) return fail(res, 400, '缺少书签 id')

  const existed = await prisma.bookmark.findFirst({ where: { id, userId } })
  if (!existed) return fail(res, 404, '书签不存在')

  // If it's a folder, move children up (to the same parent level)
  if (existed.type === BookmarkType.FOLDER) {
    await prisma.bookmark.updateMany({
      where: { parentId: id },
      data: { parentId: existed.parentId },
    })
  }

  await prisma.bookmark.delete({ where: { id } })

  // 记录删除审计日志
  await audit(req, AuditAction.DELETE, 'bookmark', {
    resourceId: id,
    details: { name: existed.name, type: existed.type, url: existed.url },
    success: true,
  })

  return ok(res, { id })
}

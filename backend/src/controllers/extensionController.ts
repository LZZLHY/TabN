import type { Response } from 'express'
import { z } from 'zod'
import type { AuthedRequest } from '../types/auth'
import { prisma } from '../prisma'
import { fail, ok } from '../utils/http'

const SubmitSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
  sourceUrl: z.string().trim().url().max(2048).optional(),
})

export async function submitExtension(req: AuthedRequest, res: Response) {
  const userId = req.auth?.userId
  if (!userId) return fail(res, 401, '未登录')

  const parsed = SubmitSchema.safeParse(req.body)
  if (!parsed.success) return fail(res, 400, parsed.error.issues[0]?.message ?? '参数错误')

  const item = await prisma.extension.create({
    data: {
      userId,
      name: parsed.data.name,
      description: parsed.data.description?.trim() || null,
      sourceUrl: parsed.data.sourceUrl?.trim() || null,
      status: 'PENDING',
    },
  })

  return ok(res, { item })
}

export async function listApprovedExtensions(_req: AuthedRequest, res: Response) {
  const items = await prisma.extension.findMany({
    where: { status: 'APPROVED' },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      description: true,
      sourceUrl: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, nickname: true } },
    },
  })

  return ok(res, { items })
}



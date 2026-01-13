import type { Response } from 'express'
import { z } from 'zod'
import type { AuthedRequest } from '../types/auth'
import { prisma } from '../prisma'
import { fail, ok } from '../utils/http'

const UpdateNicknameSchema = z.object({
  nickname: z.string().trim().min(2).max(32),
})

export async function updateMyNickname(req: AuthedRequest, res: Response) {
  const userId = req.auth?.userId
  if (!userId) return fail(res, 401, '未登录')

  const parsed = UpdateNicknameSchema.safeParse(req.body)
  if (!parsed.success) return fail(res, 400, parsed.error.issues[0]?.message ?? '参数错误')

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { nickname: parsed.data.nickname },
      select: { id: true, username: true, email: true, phone: true, nickname: true, role: true, createdAt: true },
    })
    return ok(res, { user })
  } catch (e: any) {
    const msg = typeof e?.message === 'string' ? e.message : '更新失败'
    if (msg.includes('Unique constraint')) return fail(res, 409, '昵称已被占用')
    return fail(res, 500, '更新失败')
  }
}



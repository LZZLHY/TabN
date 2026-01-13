import type { Response } from 'express'
import { z } from 'zod'
import type { AuthedRequest } from '../types/auth'
import { fail, ok } from '../utils/http'
import { readUserSettings, writeUserSettings } from '../services/userSettings'
import { audit, AuditAction } from '../services/auditLogger'

const AppearanceSchema = z.object({
  mode: z.enum(['system', 'light', 'dark']),
  accent: z.string().min(1),
  backgroundType: z.enum(['bing', 'custom']),
  backgroundCustomUrl: z.string(),
  sidebarExpanded: z.boolean(),
  clockHourCycle: z.enum(['12', '24']),
  clockShowSeconds: z.boolean(),
  clockShowDate: z.boolean(),
  clockFollowAccent: z.boolean(),
})

const SettingsFileSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().optional(),
  updatedAt: z.string().optional(),
  appearance: AppearanceSchema,
})

export async function getMySettings(req: AuthedRequest, res: Response) {
  const userId = req.auth?.userId
  if (!userId) return fail(res, 401, '未登录')

  const raw = await readUserSettings(userId)
  if (!raw) return fail(res, 404, '暂无云端设置文件')

  const parsed = SettingsFileSchema.safeParse(raw)
  if (!parsed.success) return fail(res, 500, '云端设置文件损坏')

  return ok(res, { settings: parsed.data })
}

export async function putMySettings(req: AuthedRequest, res: Response) {
  const userId = req.auth?.userId
  if (!userId) return fail(res, 401, '未登录')

  const parsed = SettingsFileSchema.safeParse(req.body)
  if (!parsed.success) return fail(res, 400, parsed.error.issues[0]?.message ?? '参数错误')

  const data = {
    ...parsed.data,
    updatedAt: new Date().toISOString(),
  }
  await writeUserSettings(userId, data)

  // 记录设置变更审计日志
  await audit(req, AuditAction.SETTINGS_CHANGE, 'settings', {
    resourceId: userId,
    details: { 
      mode: data.appearance.mode,
      accent: data.appearance.accent,
      backgroundType: data.appearance.backgroundType,
    },
    success: true,
  })

  return ok(res, { settings: data })
}



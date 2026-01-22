import type { Response } from 'express'
import { z } from 'zod'
import type { AuthedRequest } from '../types/auth'
import { fail, ok } from '../utils/http'
import { readUserSettings, writeUserSettings } from '../services/userSettings'
import { audit, AuditAction } from '../services/auditLogger'
import { broadcastSettingsUpdate } from '../services/settingsWebSocket'

const AppearanceSchema = z.object({
  mode: z.enum(['system', 'light', 'dark']),
  accent: z.string().min(1),
  backgroundType: z.enum(['bing', 'custom']),
  backgroundCustomUrl: z.string(),
  sidebarExpanded: z.boolean(),
  sidebarAutoHide: z.boolean(),
  sidebarAutoHideDelay: z.number().min(1).max(10),
  sidebarClickKeepCollapsed: z.boolean(),
  clockHourCycle: z.enum(['12', '24']),
  clockShowSeconds: z.boolean(),
  clockShowDate: z.boolean(),
  clockFollowAccent: z.boolean(),
  clockScale: z.number().min(50).max(150).default(100),
  cornerRadius: z.number().min(0).max(50),
  searchEngine: z.enum(['baidu', 'bing', 'google', 'custom']),
  customSearchUrl: z.string(),
  searchHistoryCount: z.number().min(0).max(20),
  searchRowHeight: z.number().min(32).max(56),
  recentBookmarksCount: z.number().min(1).max(12),
  recentBookmarksEnabled: z.boolean(),
  recentBookmarksMode: z.enum(['fixed', 'dynamic']),
  searchGlowBorder: z.boolean(),
  searchGlowLight: z.boolean(),
  searchGlowLightMove: z.boolean(),
  bookmarkDrawerSortMode: z.enum(['custom', 'folders-first', 'links-first', 'alphabetical', 'click-count', 'by-tag']),
  bookmarkSortLocked: z.boolean(),
  mobileNavHideText: z.boolean(),
  homeLayoutMode: z.enum(['dynamic', 'fixed']),
  homeFixedPosition: z.number().min(15).max(50),
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

  // 广播设置更新给该用户的其他设备
  broadcastSettingsUpdate(userId, data)

  return ok(res, { settings: data })
}



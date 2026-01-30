/**
 * 图标预设类型定义
 * Requirements: 1.4
 */

import type { IconType } from './api'

/** 图标预设 */
export interface IconPreset {
  id: string
  userId: string
  bookmarkId: string
  name: string
  iconType: IconType | null
  iconData: string | null
  iconUrl: string | null
  iconBg: string | null
  createdAt: string
  updatedAt: string
}

/** 创建预设请求 */
export interface CreatePresetRequest {
  bookmarkId: string
  name: string
  iconType?: IconType | null
  iconData?: string | null
  iconUrl?: string | null
  iconBg?: string | null
}

/** 预设列表响应 */
export interface PresetsListResponse {
  ok: true
  data: {
    items: IconPreset[]
  }
}

/** 创建预设响应 */
export interface CreatePresetResponse {
  ok: true
  data: {
    item: IconPreset
  }
}

/** 删除预设响应 */
export interface DeletePresetResponse {
  ok: true
  data: {
    id: string
  }
}

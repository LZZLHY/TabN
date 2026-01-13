import type { SettingsFileV1 } from '../utils/settingsFile'
import { apiFetch } from './api'

export async function fetchMySettings(token: string) {
  // 兼容历史云端文件：返回值可能不是当前 SettingsFileV1
  return await apiFetch<{ settings: unknown }>('/api/settings/me', {
    method: 'GET',
    token,
  })
}

export async function saveMySettings(token: string, settings: SettingsFileV1) {
  return await apiFetch<{ settings: SettingsFileV1 }>('/api/settings/me', {
    method: 'PUT',
    token,
    body: JSON.stringify(settings),
  })
}



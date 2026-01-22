import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useAppearanceStore } from '../stores/appearance'
import { useBookmarkDndStore } from '../stores/bookmarkDnd'
import { useAuthStore } from '../stores/auth'
import { fetchMySettings, saveMySettings } from '../services/settings'
import { applySettingsFile, createSettingsFile } from '../utils/settingsFile'

/**
 * 云端设置文件：
 * - 登录后尝试拉取一次并应用
 * - 本地设置变化后（防抖）写回云端
 *
 * 注意：云端文件存储在后端文件系统（非数据库）。
 */
export function useCloudSettingsSync() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)

  const pulledRef = useRef(false)
  const lastUploadedRef = useRef<string>('')
  const debounceRef = useRef<number | null>(null)

  // 登录后拉取一次
  useEffect(() => {
    pulledRef.current = false
  }, [user?.id])

  useEffect(() => {
    if (!token || !user?.id) return
    if (pulledRef.current) return
    pulledRef.current = true

    ;(async () => {
      const resp = await fetchMySettings(token)
      if (!resp.ok) {
        // 404：新账号还没有云端文件
        return
      }
      const applied = applySettingsFile(resp.data.settings)
      if (!applied.ok) {
        toast.warning(`云端设置文件不兼容，已忽略：${applied.message}`)
        return
      }
      if (applied.partial) {
        toast.message(`已从云端部分同步：${applied.message}`)
      }
    })()
  }, [token, user?.id])

  // 本地变化 -> 防抖写回云端
  useEffect(() => {
    if (!token || !user?.id) return

    const uploadNow = async () => {
      const data = createSettingsFile()
      const json = JSON.stringify(data)
      if (json === lastUploadedRef.current) return
      const resp = await saveMySettings(token, data)
      if (resp.ok) {
        lastUploadedRef.current = json
      } else {
        // 保存失败时提示用户
        toast.error(`设置保存失败：${resp.message}`)
      }
    }

    const scheduleUpload = () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
      debounceRef.current = window.setTimeout(uploadNow, 800)
    }

    // 页面卸载前立即保存（防止关闭标签页时丢失设置）
    const handleBeforeUnload = () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current)
        debounceRef.current = null
        // 使用 sendBeacon 确保请求在页面关闭时也能发送
        const data = createSettingsFile()
        const json = JSON.stringify(data)
        if (json !== lastUploadedRef.current) {
          navigator.sendBeacon(
            '/api/settings/me',
            new Blob([json], { type: 'application/json' })
          )
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    const unsubA = useAppearanceStore.subscribe(scheduleUpload)
    const unsubB = useBookmarkDndStore.subscribe(scheduleUpload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      unsubA()
      unsubB()
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
  }, [token, user?.id])
}



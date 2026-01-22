/**
 * useUpdateChecker Hook
 * 
 * 在管理员后台自动检测系统更新
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 * 
 * - 组件挂载时执行一次更新检测
 * - 有更新时显示 toast 提示
 * - 无更新或请求失败时静默处理
 */

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '../services/api'
import { useAuthStore } from '../stores/auth'

interface VersionInfo {
  current: string
  currentPatch: number
  latest: string
  latestPatch: number
  hasUpdate: boolean
  releaseNotes: string
  releaseDate: string
}

interface UseUpdateCheckerOptions {
  /** 是否启用检测，默认 true */
  enabled?: boolean
}

/**
 * 自动检测系统更新的 Hook
 * 
 * @param options 配置选项
 */
export function useUpdateChecker(options: UseUpdateCheckerOptions = {}): void {
  const { enabled = true } = options
  const token = useAuthStore((s) => s.token)
  const hasChecked = useRef(false)

  useEffect(() => {
    // 如果禁用或没有 token，不执行检测
    if (!enabled || !token) {
      return
    }

    // 防止重复检测（React StrictMode 会触发两次 effect）
    if (hasChecked.current) {
      return
    }
    hasChecked.current = true

    // 执行更新检测
    const checkUpdate = async () => {
      try {
        const resp = await apiFetch<VersionInfo>('/api/admin/update/check', {
          method: 'GET',
          token,
        })

        // 请求失败时静默处理 (Requirement 1.5)
        if (!resp.ok) {
          return
        }

        // 有更新时显示 toast (Requirement 1.3)
        if (resp.data.hasUpdate) {
          const patchInfo = resp.data.latestPatch ? ` (${resp.data.latestPatch})` : ''
          toast.success(`发现新版本 v${resp.data.latest}${patchInfo}`)
        }
        // 无更新时不显示任何提示 (Requirement 1.4)
      } catch {
        // 网络错误时静默处理 (Requirement 1.5)
      }
    }

    // 添加小延迟确保 toast 组件已挂载
    const timer = setTimeout(checkUpdate, 300)

    return () => {
      clearTimeout(timer)
    }
  }, [enabled, token])
}

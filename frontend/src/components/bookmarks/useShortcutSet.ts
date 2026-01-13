import { useEffect } from 'react'
import { useShortcutSetStore, getMaxShortcuts } from '../../stores/shortcutSet'

export type UseShortcutSetReturn = {
  /** 快捷方式 ID 列表 */
  shortcutIds: string[]
  /** 添加快捷方式（幂等） */
  addShortcut: (id: string) => void
  /** 移除快捷方式 */
  removeShortcut: (id: string) => void
  /** 检查是否为快捷方式 */
  isShortcut: (id: string) => boolean
  /** 清理无效 ID（书签已删除） */
  cleanupInvalidIds: (validIds: string[]) => void
  /** 检查是否已满 */
  isFull: () => boolean
  /** 获取最大数量 */
  maxShortcuts: number
}

/**
 * 管理快捷方式集合的 Hook
 * 使用 Zustand store 实现跨组件同步
 */
export function useShortcutSet(userId: string | null | undefined): UseShortcutSetReturn {
  const store = useShortcutSetStore()

  // 初始化/切换用户时加载数据
  useEffect(() => {
    store.init(userId ?? null)
  }, [userId, store.init])

  return {
    shortcutIds: store.shortcutIds,
    addShortcut: store.addShortcut,
    removeShortcut: store.removeShortcut,
    isShortcut: store.isShortcut,
    cleanupInvalidIds: store.cleanupInvalidIds,
    isFull: store.isFull,
    maxShortcuts: getMaxShortcuts(),
  }
}

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
  /** 在目标位置替换多个 ID 为新 ID（用于建夹时在目标位置插入文件夹） */
  replaceShortcutsAt: (idsToRemove: string[], newId: string, targetId: string) => void
  /** 将文件夹替换为其子项（用于删除文件夹时将子项插入当前显示位置） */
  replaceShortcutWithChildren: (folderId: string, childIds: string[], displayIndex: number) => void
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- store.init is stable
  }, [userId])

  return {
    shortcutIds: store.shortcutIds,
    addShortcut: store.addShortcut,
    removeShortcut: store.removeShortcut,
    isShortcut: store.isShortcut,
    cleanupInvalidIds: store.cleanupInvalidIds,
    isFull: store.isFull,
    maxShortcuts: getMaxShortcuts(),
    replaceShortcutsAt: store.replaceShortcutsAt,
    replaceShortcutWithChildren: store.replaceShortcutWithChildren,
  }
}

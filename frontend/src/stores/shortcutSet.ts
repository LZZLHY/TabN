import { create } from 'zustand'
import {
  getShortcutSet,
  saveShortcutSet,
  cleanupShortcutSet,
} from '../components/bookmarks/shortcutStorage'

// 快捷栏最大行数
const MAX_ROWS = 3

// 每行图标数量（根据屏幕宽度不同）
const getItemsPerRow = () => {
  if (typeof window === 'undefined') return 8
  const width = window.innerWidth
  if (width >= 1024) return 8 // lg
  if (width >= 768) return 6  // md
  if (width >= 640) return 5  // sm
  return 4
}

// 计算最大快捷方式数量（减1是为了给"更多"按钮留位置）
export const getMaxShortcuts = () => MAX_ROWS * getItemsPerRow() - 1

type ShortcutSetStore = {
  /** 当前用户 ID */
  userId: string | null
  /** 快捷方式 ID 列表 */
  shortcutIds: string[]
  /** 初始化/切换用户 */
  init: (userId: string | null) => void
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
  /** 获取当前数量 */
  count: () => number
}

export const useShortcutSetStore = create<ShortcutSetStore>((set, get) => ({
  userId: null,
  shortcutIds: [],

  init: (userId) => {
    if (!userId) {
      set({ userId: null, shortcutIds: [] })
      return
    }
    const ids = getShortcutSet(userId)
    set({ userId, shortcutIds: ids })
  },

  addShortcut: (id) => {
    const { userId, shortcutIds } = get()
    if (!userId) return
    if (shortcutIds.includes(id)) return
    const next = [...shortcutIds, id]
    saveShortcutSet(userId, next)
    set({ shortcutIds: next })
  },

  removeShortcut: (id) => {
    const { userId, shortcutIds } = get()
    if (!userId) return
    const next = shortcutIds.filter(x => x !== id)
    saveShortcutSet(userId, next)
    set({ shortcutIds: next })
  },

  isShortcut: (id) => {
    return get().shortcutIds.includes(id)
  },

  cleanupInvalidIds: (validIds) => {
    const { userId } = get()
    if (!userId) return
    const cleaned = cleanupShortcutSet(userId, validIds)
    set({ shortcutIds: cleaned })
  },

  isFull: () => {
    return get().shortcutIds.length >= getMaxShortcuts()
  },

  count: () => {
    return get().shortcutIds.length
  },
}))

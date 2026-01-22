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
  /** 在目标位置替换多个 ID 为新 ID（用于建夹时在目标位置插入文件夹） */
  replaceShortcutsAt: (idsToRemove: string[], newId: string, targetId: string) => void
  /** 将文件夹替换为其子项（用于删除文件夹时将子项插入当前显示位置） */
  replaceShortcutWithChildren: (folderId: string, childIds: string[], displayIndex: number) => void
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

  replaceShortcutsAt: (idsToRemove, newId, targetId) => {
    const { userId, shortcutIds } = get()
    if (!userId) return
    
    // 找到目标 ID（baseItem）的位置，在该位置插入新文件夹
    const targetIndex = shortcutIds.indexOf(targetId)
    const removeSet = new Set(idsToRemove)
    
    // 过滤掉要移除的 ID
    const filtered = shortcutIds.filter(id => !removeSet.has(id))
    
    // 如果新 ID 已存在，不重复添加
    if (filtered.includes(newId)) {
      saveShortcutSet(userId, filtered)
      set({ shortcutIds: filtered })
      return
    }
    
    // 在目标位置插入新 ID
    if (targetIndex !== -1) {
      // 计算插入位置（考虑到目标前面已移除的元素数量）
      let removedBeforeTarget = 0
      for (let i = 0; i < targetIndex; i++) {
        if (removeSet.has(shortcutIds[i])) {
          removedBeforeTarget++
        }
      }
      const actualIndex = Math.min(targetIndex - removedBeforeTarget, filtered.length)
      filtered.splice(actualIndex, 0, newId)
    } else {
      // 如果目标不在 shortcutIds 中，添加到末尾
      filtered.push(newId)
    }
    
    saveShortcutSet(userId, filtered)
    set({ shortcutIds: filtered })
  },

  replaceShortcutWithChildren: (folderId, childIds, displayIndex) => {
    const { userId, shortcutIds } = get()
    if (!userId) return
    
    // 移除文件夹
    const withoutFolder = shortcutIds.filter(id => id !== folderId)
    
    // 过滤掉已存在的子项（避免重复）
    const existingSet = new Set(withoutFolder)
    const newChildren = childIds.filter(id => !existingSet.has(id))
    
    // 使用传入的显示位置（而非 shortcutIds 中的存储位置）
    // displayIndex 是文件夹在 visibleIds 中的位置
    const insertIdx = displayIndex >= 0 ? Math.min(displayIndex, withoutFolder.length) : withoutFolder.length
    
    // 在显示位置插入子项
    const result = [
      ...withoutFolder.slice(0, insertIdx),
      ...newChildren,
      ...withoutFolder.slice(insertIdx),
    ]
    
    saveShortcutSet(userId, result)
    set({ shortcutIds: result })
  },
}))

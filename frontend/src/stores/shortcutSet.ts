import { create } from 'zustand'
import {
  getShortcutSet,
  saveShortcutSet,
  cleanupShortcutSet,
} from '../components/bookmarks/shortcutStorage'
import { useAppearanceStore } from './appearance'

// 移动端 Dock 栏最大图标数
const MOBILE_MAX_ITEMS = 5

// 计算电脑端 Dock 栏最大图标数（根据屏幕宽度）
// 每个图标约 56px（48px 图标 + 8px 间距）
const getDesktopMaxItems = () => {
  if (typeof window === 'undefined') return 12
  const width = window.innerWidth
  // 预留空间：左侧边栏(80px) + 功能按钮(约200px: 书签入口+设置+分隔线+添加按钮) + dock栏padding(24px) + 额外安全边距(100px)
  // 增加安全边距确保在挤压发生之前就踢出图标
  const reservedWidth = 80 + 200 + 24 + 100
  const availableWidth = width - reservedWidth
  const itemWidth = 56
  return Math.max(4, Math.min(20, Math.floor(availableWidth / itemWidth)))
}

// 计算最大快捷方式数量
export const getMaxShortcuts = () => {
  if (typeof window === 'undefined') return 12
  const width = window.innerWidth
  // 移动端使用固定数量，电脑端根据屏幕宽度计算
  return width < 768 ? MOBILE_MAX_ITEMS : getDesktopMaxItems()
}

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
  /** 设置快捷方式顺序（用于拖拽重排） */
  setShortcutOrder: (ids: string[]) => void
  /** 根据当前屏幕宽度裁剪超出的图标 */
  trimToMaxItems: () => void
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
    
    // 根据设置决定添加位置
    const dockAddPosition = useAppearanceStore.getState().dockAddPosition
    const maxItems = getMaxShortcuts() // 根据屏幕宽度动态计算
    
    let next: string[]
    if (dockAddPosition === 'left') {
      // 新书签添加到开头（最左边），超出时踢出末尾（最右边）
      next = [id, ...shortcutIds]
      if (next.length > maxItems) {
        next = next.slice(0, maxItems)
      }
    } else {
      // 新书签添加到末尾（最右边），超出时踢出开头（最左边）
      next = [...shortcutIds, id]
      if (next.length > maxItems) {
        next = next.slice(-maxItems)
      }
    }
    
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

  setShortcutOrder: (ids) => {
    const { userId } = get()
    if (!userId) return
    saveShortcutSet(userId, ids)
    set({ shortcutIds: ids })
  },

  trimToMaxItems: () => {
    const { userId, shortcutIds } = get()
    if (!userId) return
    const maxItems = getMaxShortcuts()
    if (shortcutIds.length <= maxItems) return
    
    // 根据添加位置设置决定从哪边踢出
    const dockAddPosition = useAppearanceStore.getState().dockAddPosition
    let next: string[]
    if (dockAddPosition === 'left') {
      // 新书签在左边，踢出右边（末尾）
      next = shortcutIds.slice(0, maxItems)
    } else {
      // 新书签在右边，踢出左边（开头）
      next = shortcutIds.slice(-maxItems)
    }
    
    saveShortcutSet(userId, next)
    set({ shortcutIds: next })
  },
}))

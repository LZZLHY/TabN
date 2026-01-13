import type { BookmarkContext } from '../../types/bookmark'

export function storageKey(userId: string, parentId: string | null, context: BookmarkContext = 'shortcut') {
  const contextSuffix = context === 'drawer' ? ':drawer' : ''
  return `start:bookmarkOrder:${userId}:${parentId ?? 'root'}${contextSuffix}`
}

export function getOrder(userId: string, parentId: string | null, context: BookmarkContext = 'shortcut'): string[] {
  try {
    const raw = localStorage.getItem(storageKey(userId, parentId, context))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveOrder(userId: string, parentId: string | null, order: string[], context: BookmarkContext = 'shortcut') {
  localStorage.setItem(storageKey(userId, parentId, context), JSON.stringify(order))
}


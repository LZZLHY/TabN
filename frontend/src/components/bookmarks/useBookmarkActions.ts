import { useCallback } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '../../services/api'
import { normalizeUrl } from '../../utils/url'
import type { Bookmark, BookmarkType } from './types'

type UseBookmarkActionsOptions = {
  token: string | null
  userId: string | undefined
  activeFolderId: string | null
  visibleIds: string[]
  getOrder: (userId: string, folderId: string | null) => string[]
  saveOrder: (userId: string, folderId: string | null, order: string[]) => void
  setOrder: (order: string[]) => void
  load: () => Promise<void>
  loadTags: () => Promise<void>
  addShortcut: (id: string) => void
  removeShortcut: (id: string) => void
  allItems: Bookmark[]
}

type CreateBookmarkParams = {
  name: string
  url: string
  note: string
  type: BookmarkType
  parentId: string | null
  tags: string[]
}

type UpdateBookmarkParams = {
  id: string
  name: string
  url?: string
  note?: string
  tags?: string[]
  iconUrl?: string | null
}

/**
 * 书签 API 操作 Hook
 * 封装创建、更新、删除书签的 API 调用逻辑
 */
export function useBookmarkActions({
  token,
  userId,
  activeFolderId,
  visibleIds,
  getOrder,
  saveOrder,
  setOrder,
  load,
  loadTags,
  addShortcut,
  removeShortcut,
  allItems,
}: UseBookmarkActionsOptions) {
  
  /**
   * 创建书签或文件夹
   */
  const createBookmark = useCallback(async (params: CreateBookmarkParams): Promise<Bookmark | null> => {
    if (!token) return null
    
    const name = params.name.trim()
    const url = normalizeUrl(params.url)
    
    // 文件夹必须有名称，书签名称可选
    if (params.type === 'FOLDER' && !name) {
      toast.warning('文件夹名称不能为空')
      return null
    }
    if (params.type === 'LINK' && !url) {
      toast.warning('网址不能为空')
      return null
    }

    const resp = await apiFetch<{ item: Bookmark }>('/api/bookmarks', {
      method: 'POST',
      token,
      body: JSON.stringify({
        name: name || undefined,
        url: params.type === 'LINK' ? url : undefined,
        note: params.note.trim() || undefined,
        type: params.type,
        parentId: params.parentId,
        tags: params.tags.length > 0 ? params.tags : undefined,
      }),
    })

    if (!resp.ok) {
      toast.error(resp.message)
      return null
    }

    toast.success('已创建')

    // 快捷栏创建的书签自动添加到快捷方式集合（仅 LINK 类型）
    if (params.type === 'LINK') {
      addShortcut(resp.data.item.id)
    }

    // Append to current order
    const pid = params.parentId ?? activeFolderId
    if (userId) {
      const currentOrder = getOrder(userId, pid)
      const base = currentOrder.length ? currentOrder : visibleIds
      const newOrder = [...base.filter((x) => x !== resp.data.item.id), resp.data.item.id]
      saveOrder(userId, pid, newOrder)
      setOrder(newOrder)
    }

    // Refresh
    await Promise.all([load(), loadTags()])
    
    return resp.data.item
  }, [token, userId, activeFolderId, visibleIds, getOrder, saveOrder, setOrder, load, loadTags, addShortcut])

  /**
   * 更新书签
   */
  const updateBookmark = useCallback(async (params: UpdateBookmarkParams): Promise<boolean> => {
    if (!token) return false

    const body: Record<string, unknown> = { name: params.name, tags: params.tags }
    if (params.url !== undefined) body.url = normalizeUrl(params.url)
    if (params.note !== undefined) body.note = params.note
    if (params.iconUrl !== undefined) body.iconUrl = params.iconUrl

    const resp = await apiFetch(`/api/bookmarks/${params.id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(body),
    })

    if (resp.ok) {
      toast.success('已更新')
      await Promise.all([load(), loadTags()])
      return true
    } else {
      toast.error(resp.message)
      return false
    }
  }, [token, load, loadTags])

  /**
   * 删除书签或文件夹
   */
  const deleteBookmark = useCallback(async (
    item: Bookmark,
    onDeleted?: (item: Bookmark, nextParentOrder: string[] | null) => void
  ): Promise<boolean> => {
    if (!token) return false

    const isFolder = item.type === 'FOLDER'
    const folderId = item.id
    const parentId = item.parentId ?? null

    let nextParentOrder: string[] | null = null
    
    // 删除文件夹时：把文件夹内书签按"文件夹所在位置"插回上一级顺序
    if (isFolder && userId) {
      const childIdsRaw = allItems.filter((x) => x.parentId === folderId).map((x) => x.id)
      const folderOrder = getOrder(userId, folderId)
      const set = new Set(childIdsRaw)
      const orderedChildren = [
        ...folderOrder.filter((id) => set.has(id)),
        ...childIdsRaw.filter((id) => !folderOrder.includes(id)),
      ]

      const persistedParent = getOrder(userId, parentId)
      const fallbackParent = allItems.filter((x) => x.parentId === parentId).map((x) => x.id)
      const baseOrder = persistedParent.length ? persistedParent : fallbackParent

      const rawIdx = baseOrder.indexOf(folderId)
      const insertIdx = rawIdx >= 0 ? rawIdx : baseOrder.length
      const base = baseOrder.filter((id) => id !== folderId && !set.has(id))
      const idx = Math.max(0, Math.min(insertIdx, base.length))
      nextParentOrder = [
        ...base.slice(0, idx),
        ...orderedChildren,
        ...base.slice(idx),
      ]
    }

    const resp = await apiFetch(`/api/bookmarks/${item.id}`, { method: 'DELETE', token })
    
    if (resp.ok) {
      toast.success('已删除')
      removeShortcut(item.id)
      onDeleted?.(item, nextParentOrder)
      await load()
      return true
    } else {
      toast.error(resp.message)
      return false
    }
  }, [token, userId, allItems, getOrder, removeShortcut, load])

  /**
   * 移动书签到文件夹
   */
  const moveToFolder = useCallback(async (item: Bookmark, targetFolderId: string): Promise<boolean> => {
    if (!token) return false

    const resp = await apiFetch(`/api/bookmarks/${item.id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ parentId: targetFolderId }),
    })

    if (resp.ok) {
      toast.success('已移动')
      
      // 更新顺序
      if (userId) {
        // 从当前层级移除
        const currentParentId = item.parentId ?? null
        const currentOrder = getOrder(userId, currentParentId)
        if (currentOrder.length) {
          const newCurrentOrder = currentOrder.filter(id => id !== item.id)
          saveOrder(userId, currentParentId, newCurrentOrder)
          if (currentParentId === activeFolderId) {
            setOrder(newCurrentOrder)
          }
        }
        
        // 添加到目标文件夹
        const targetOrder = getOrder(userId, targetFolderId)
        const newTargetOrder = [...targetOrder, item.id]
        saveOrder(userId, targetFolderId, newTargetOrder)
      }
      
      await load()
      return true
    } else {
      toast.error(resp.message)
      return false
    }
  }, [token, userId, activeFolderId, getOrder, saveOrder, setOrder, load])

  return {
    createBookmark,
    updateBookmark,
    deleteBookmark,
    moveToFolder,
  }
}

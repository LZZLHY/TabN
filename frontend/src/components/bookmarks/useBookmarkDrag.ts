import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

type XY = { x: number; y: number }

function getPointerXYFromEvent(ev: Event | null | undefined): XY | null {
  if (!ev) return null
  const maybeMouse = ev as unknown as { clientX?: unknown; clientY?: unknown }
  if (typeof maybeMouse.clientX === 'number' && typeof maybeMouse.clientY === 'number') {
    return { x: maybeMouse.clientX, y: maybeMouse.clientY }
  }
  const maybeTouch = ev as unknown as {
    touches?: ArrayLike<{ clientX: number; clientY: number }>
    changedTouches?: ArrayLike<{ clientX: number; clientY: number }>
  }
  if (maybeTouch.touches && typeof maybeTouch.touches.length === 'number') {
    const t = maybeTouch.touches[0] ?? maybeTouch.changedTouches?.[0]
    return t ? { x: t.clientX, y: t.clientY } : null
  }
  return null
}

function moveId(ids: string[], activeId: string, insertIndex: number) {
  const from = ids.indexOf(activeId)
  if (from === -1) return ids
  const next = [...ids]
  next.splice(from, 1)
  const clamped = Math.max(0, Math.min(insertIndex, next.length))
  next.splice(clamped, 0, activeId)
  return next
}

function cancelElementAnimations(el: Element | null | undefined) {
  if (!el) return
  try {
    // 取消可能残留的 fill/进行中动画，避免它覆盖我们手动设置的 opacity
    const withGetAnimations = el as Element & { getAnimations?: () => Animation[] }
    const anims = withGetAnimations.getAnimations?.()
    if (anims && typeof anims.length === 'number') {
      for (const a of anims) a.cancel()
    }
  } catch {
    // ignore
  }
}

type RectItem = { id: string; rect: DOMRect }

function buildRowsInDomOrder(items: RectItem[]) {
  // items 已按 DOM 顺序（即 visibleIds 顺序）排列
  // 按 top 分行：top 差异超过阈值就认为换行
  const rows: RectItem[][] = []
  let lastTop: number | null = null
  let rowThreshold = 18
  for (const it of items) {
    const h = it.rect.height || 1
    rowThreshold = Math.max(10, Math.floor(h * 0.6))
    if (lastTop == null || Math.abs(it.rect.top - lastTop) > rowThreshold) {
      rows.push([it])
      lastTop = it.rect.top
    } else {
      rows[rows.length - 1].push(it)
    }
  }
  return rows
}

// 记录上一次的行边界信息，用于稳定行选择
let lastRowBoundsSnapshot: Array<{ top: number; bottom: number; rowIndex: number }> | null = null
let lastIntendedRow: number | null = null
let lastInsertIndex: number | null = null // 记录上一次的插入索引

function pickInsertIndexFromRows(args: {
  p: XY
  rows: RectItem[][]
}) {
  const { p, rows } = args
  if (!rows.length) {
    lastRowBoundsSnapshot = null
    lastIntendedRow = null
    lastInsertIndex = null
    return 0
  }

  // 计算每行的边界信息
  const rowBounds: Array<{ top: number; bottom: number; cy: number; left: number; right: number }> = []
  for (let i = 0; i < rows.length; i++) {
    const r0 = rows[i][0]?.rect
    const rn = rows[i][rows[i].length - 1]?.rect
    if (!r0 || !rn) {
      rowBounds.push({ top: 0, bottom: 0, cy: 0, left: 0, right: 0 })
      continue
    }
    const top = Math.min(r0.top, rn.top)
    const bottom = Math.max(r0.bottom, rn.bottom)
    const cy = (top + bottom) / 2
    const left = Math.min(r0.left, rn.left)
    const right = Math.max(r0.right, rn.right)
    rowBounds.push({ top, bottom, cy, left, right })
  }

  // 改进的行选择逻辑：使用"意图行"来稳定选择
  let bestRow = 0
  let foundInRow = false
  
  // 关键修复：首先检查是否应该保持之前的"意图行"
  // 如果之前用户明确进入了某一行（非第一行），且当前指针 Y 坐标仍然在那个行的原始范围内
  // 即使布局变化导致那一行现在变空了，也应该保持意图
  // 这样可以防止"挤压后又换回去"的闪烁问题
  if (lastIntendedRow !== null && lastIntendedRow > 0 && lastRowBoundsSnapshot !== null) {
    const prevBounds = lastRowBoundsSnapshot.find(b => b.rowIndex === lastIntendedRow)
    if (prevBounds && p.y >= prevBounds.top - 5 && p.y <= prevBounds.bottom + 5) {
      // 指针仍在之前意图行的 Y 范围内
      // 关键：如果之前的意图行现在不存在了（被挤空了），保持上一次的插入索引
      if (lastIntendedRow >= rows.length && lastInsertIndex !== null) {
        // 意图行已经不存在了，保持上一次的插入索引
        return lastInsertIndex
      }
      // 意图行仍然存在，使用它
      bestRow = lastIntendedRow
      foundInRow = true
    }
  }
  
  if (!foundInRow) {
    // 检查指针是否在某一行的垂直范围内
    for (let i = 0; i < rows.length; i++) {
      const bounds = rowBounds[i]
      if (p.y >= bounds.top && p.y <= bounds.bottom) {
        foundInRow = true
        bestRow = i
        break
      }
    }
  }
  
  if (!foundInRow) {
    // 指针在行间隙中或行外
    // 关键修复：在行间隙中时，保持当前意图行不变，避免抽搐
    // 只有当指针明确进入某一行的区域时才改变意图行
    if (lastIntendedRow !== null && lastInsertIndex !== null) {
      // 保持上一次的状态
      return lastInsertIndex
    }
    
    // 如果没有之前的状态，才根据位置判断
    for (let i = 0; i < rows.length - 1; i++) {
      const currentBottom = rowBounds[i].bottom
      const nextTop = rowBounds[i + 1].top
      if (p.y > currentBottom && p.y < nextTop) {
        // 在间隙中，保持在当前行（不主动切换到下一行）
        bestRow = i
        foundInRow = true
        break
      }
    }
    
    if (!foundInRow) {
      if (rows.length > 0 && p.y < rowBounds[0].top) {
        bestRow = 0
      } else if (rows.length > 0 && p.y > rowBounds[rows.length - 1].bottom) {
        bestRow = rows.length - 1
      }
    }
  }

  // 更新意图行记录
  lastIntendedRow = bestRow
  lastRowBoundsSnapshot = rowBounds.map((b, i) => ({ top: b.top, bottom: b.bottom, rowIndex: i }))

  const row = rows[bestRow]
  if (!row || row.length === 0) {
    // 如果选中的行是空的，保持上一次的插入索引
    if (lastInsertIndex !== null) return lastInsertIndex
    return 0
  }

  // 行内按中心点决定插入位置（左->右）
  const centers = row.map((it) => it.rect.left + it.rect.width / 2)
  let local = centers.length

  // 关键修复：最后一行的特殊处理
  const isLastRow = bestRow === rows.length - 1
  if (isLastRow && bestRow > 0 && row.length > 0) {
    // 获取最后一行最后一个图标的右边界
    const lastItemRect = row[row.length - 1]?.rect
    
    if (lastItemRect && p.x > lastItemRect.right) {
      // 指针在最后一个图标的右侧空白区域
      // 插入到最后，这会把最后一个图标挤到上一行末尾
      local = row.length
    } else {
      // 指针在图标区域内
      // 检查指针是否正好在某个图标的 X 范围内（可能要建夹）
      let isOverIcon = false
      for (const it of row) {
        if (p.x >= it.rect.left && p.x <= it.rect.right) {
          isOverIcon = true
          break
        }
      }
      
      if (isOverIcon && lastInsertIndex !== null) {
        // 指针在某个图标的 X 范围内，可能要建夹
        // 保持当前状态不变，让 hitItem 检测来处理
        return lastInsertIndex
      }
      
      // 指针在图标之间的缝隙，按正常逻辑预挤压
      for (let i = 0; i < centers.length; i++) {
        if (p.x < centers[i]) {
          local = i
          break
        }
      }
    }
  } else {
    // 非最后一行或第一行：按中心点判断插入位置
    for (let i = 0; i < centers.length; i++) {
      if (p.x < centers[i]) {
        local = i
        break
      }
    }
  }

  // 转换为全局 insertIndex：前面所有行长度 + local
  let offset = 0
  for (let i = 0; i < bestRow; i++) offset += rows[i].length
  const result = offset + local
  lastInsertIndex = result // 保存插入索引
  return result
}

// 重置意图行记录（在拖拽开始时调用）
function resetIntendedRow() {
  lastRowBoundsSnapshot = null
  lastIntendedRow = null
  lastInsertIndex = null
}

export function useBookmarkDrag(args: {
  visibleIds: string[]
  setVisibleIds: (ids: string[]) => void
  getItemById: (id: string) => { id: string; type: 'LINK' | 'FOLDER' } | null
  // DOM refs
  getEl: (id: string) => HTMLDivElement | undefined
  onMergeIntoFolder: (activeId: string, folderId: string) => Promise<void>
  onCreateFolderWith: (baseId: string, incomingId: string) => Promise<void>
  onPersistReorder: (ids: string[]) => void
  options?: {
    prePush?: boolean
    pushAnimation?: boolean
    dropAnimation?: boolean
  }
  // 禁用拖拽（排序锁定时使用）
  disabled?: boolean
  // 允许未来扩展字段（避免 TS/LSP 缓存导致的“未知属性”误报）
  [key: string]: unknown
}) {
  const {
    visibleIds,
    setVisibleIds,
    getItemById,
    getEl,
    onMergeIntoFolder,
    onCreateFolderWith,
    onPersistReorder,
    options: rawOptions,
    disabled = false,
  } = args

  const options = {
    prePush: rawOptions?.prePush ?? true,
    pushAnimation: rawOptions?.pushAnimation ?? true,
    dropAnimation: rawOptions?.dropAnimation ?? true,
  }

  const [activeId, setActiveId] = useState<string | null>(null)
  // 关键：用 ref 同步保存 activeId，避免“快速拖拽/快速松手时 state 尚未更新”导致：
  // - 预挤压不生效（updateByPointerNow 直接 return）
  // - 松手不收尾（onDragEnd 直接 return）从而“粘手上”
  const activeIdRef = useRef<string | null>(null)
  const [overlayPos, setOverlayPos] = useState<XY | null>(null)
  const startPointerRef = useRef<XY | null>(null)
  const pointerRef = useRef<XY | null>(null)
  const grabOffsetRef = useRef<XY>({ x: 24, y: 24 })
  const pointerIdRef = useRef<number | null>(null)
  const isDragConfirmedRef = useRef(false) // 标记是否真的进入了拖拽状态（移动距离超过阈值）
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const overlayBoxRef = useRef<HTMLDivElement | null>(null)

  const [combineCandidateId, setCombineCandidateId] = useState<string | null>(null)
  const [combineTargetId, setCombineTargetId] = useState<string | null>(null)
  // 用 ref 同步保存 combine 状态，避免闭包依赖 state 导致高亮残留和叠加建夹失效
  const combineCandidateIdRef = useRef<string | null>(null)
  const combineTargetIdRef = useRef<string | null>(null)
  // 用“停留计时”替代 setTimeout，避免指针移走后定时器迟到导致高亮残留
  const combineHoverRef = useRef<{ id: string; startedAt: number } | null>(null)
  const hoveredIdRef = useRef<string | null>(null)
  const rafRef = useRef<number | null>(null)
  const visibleIdsRef = useRef<string[]>(visibleIds)
  const finalOrderRef = useRef<string[] | null>(null)
  const activeHiddenElRef = useRef<HTMLElement | null>(null)
  const activeHiddenInnerRef = useRef<HTMLElement | null>(null)
  const dropRevealIdRef = useRef<string | null>(null)
  const sessionRef = useRef(0)
  const lastReorderRef = useRef<{ idx: number; x: number; y: number; t: number } | null>(null)
  const cleanupListenersRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    visibleIdsRef.current = visibleIds
  }, [visibleIds])

  const clearCombine = useCallback(() => {
    combineHoverRef.current = null
    combineCandidateIdRef.current = null
    combineTargetIdRef.current = null
    setCombineCandidateId(null)
    setCombineTargetId(null)
  }, [])

  const resetOverlayAnim = useCallback(() => {
    const el = overlayBoxRef.current
    if (!el) return
    cancelElementAnimations(el)
    el.style.transform = ''
    el.style.opacity = ''
  }, [])

  const overlayStyle = useMemo(() => {
    if (!activeId || !overlayPos) return { display: 'none' } as const
    const p = overlayPos
    const off = grabOffsetRef.current
    return {
      position: 'fixed',
      left: `${p.x - off.x}px`,
      top: `${p.y - off.y}px`,
      zIndex: 9999,
      pointerEvents: 'none',
    } as const
  }, [activeId, overlayPos])

  const computeRects = useCallback(() => {
    const aId = activeIdRef.current
    const ids = visibleIdsRef.current.filter((id) => id !== aId)
    const rects: Array<{ id: string; rect: DOMRect }> = []
    for (const id of ids) {
      const el = getEl(id)
      if (!el) continue
      rects.push({ id, rect: el.getBoundingClientRect() })
    }
    return rects
  }, [getEl])

  const updateByPointerNow = useCallback(() => {
    const aId = activeIdRef.current
    const p = pointerRef.current
    if (!aId || !p) {
      // 关键：如果已经没有 activeId 或指针，立即清除所有 combine 状态，避免高亮残留
      if (combineCandidateIdRef.current || combineTargetIdRef.current) clearCombine()
      return
    }

    const idsNow = visibleIdsRef.current
    const rects = computeRects()
    if (!rects.length) {
      // 没有其他元素时，清除 combine 状态
      if (combineCandidateIdRef.current || combineTargetIdRef.current) clearCombine()
      hoveredIdRef.current = null
      return
    }

    // 命中矩形：只做建夹/放入，不做换位（多行时用“真实命中”而不是 nearest，避免抽搐）
    let hitItem: RectItem | null = null
    for (const it of rects) {
      if (p.x >= it.rect.left && p.x <= it.rect.right && p.y >= it.rect.top && p.y <= it.rect.bottom) {
        hitItem = it
        break
      }
    }

    if (hitItem) {
      hoveredIdRef.current = hitItem.id
      const target = getItemById(hitItem.id)
      if (!target) {
        // 目标不存在，清除 combine 状态
        if (combineCandidateIdRef.current || combineTargetIdRef.current) clearCombine()
        return
      }

      const w = hitItem.rect.width || 1
      const h = hitItem.rect.height || 1
      const relX = p.x - hitItem.rect.left
      const relY = p.y - hitItem.rect.top
      const inCenter = relX > w * 0.3 && relX < w * 0.7 && relY > h * 0.3 && relY < h * 0.7

      if (target.type === 'FOLDER') {
        // 文件夹：直接设置为目标，悬浮即可触发高亮
        if (combineTargetIdRef.current !== hitItem.id) {
          clearCombine()
          setCombineCandidateId(hitItem.id)
          setCombineTargetId(hitItem.id)
          combineCandidateIdRef.current = hitItem.id
          combineTargetIdRef.current = hitItem.id
        }
        combineHoverRef.current = null
        return
      }

      // 普通图标：悬浮即可触发候选高亮（显示高亮边框），不需要在中心区域
      // 中心区域停留 320ms 后自动点亮为目标（松手时自动完成合并）
      // 边缘区域也显示高亮，但松手时如果不在中心区域则不自动完成（需要明确移动到中心再松手）
      if (combineCandidateIdRef.current !== hitItem.id) {
        clearCombine()
        setCombineCandidateId(hitItem.id)
        setCombineTargetId(null)
        combineCandidateIdRef.current = hitItem.id
        combineTargetIdRef.current = null
        combineHoverRef.current = { id: hitItem.id, startedAt: performance.now() }
        return
      }
      
      // 已经在候选状态，检查是否在中心区域并停留足够时间
      if (inCenter) {
        // 中心停留：先进入候选，再停留 320ms 才点亮为“目标”
        if (combineCandidateIdRef.current !== hitItem.id) {
          clearCombine()
          setCombineCandidateId(hitItem.id)
          setCombineTargetId(null)
          combineCandidateIdRef.current = hitItem.id
          combineTargetIdRef.current = null
          combineHoverRef.current = { id: hitItem.id, startedAt: performance.now() }
          return
        }
        const h0 = combineHoverRef.current
        if (!combineTargetIdRef.current && h0 && h0.id === hitItem.id) {
          if (performance.now() - h0.startedAt >= 320) {
            setCombineTargetId(hitItem.id)
            combineTargetIdRef.current = hitItem.id
          }
        } else if (!h0 || h0.id !== hitItem.id) {
          combineHoverRef.current = { id: hitItem.id, startedAt: performance.now() }
        }
      } else {
        // 不在中心区域：保持候选状态（显示高亮），但清除目标状态，重置计时
        // 这样用户可以随时看到高亮，但需要移动到中心区域停留才能自动完成
        if (combineTargetIdRef.current) {
          setCombineTargetId(null)
          combineTargetIdRef.current = null
        }
        combineHoverRef.current = { id: hitItem.id, startedAt: performance.now() }
      }
      return
    }

    // 缝隙/空白：换位，清除所有 combine 状态
    if (combineCandidateIdRef.current || combineTargetIdRef.current) {
      clearCombine()
    }
    hoveredIdRef.current = null

    // 多行稳定插入：按 DOM 顺序分行 + 计算插入槽位（支持跨行）
    const otherIds = idsNow.filter((id) => id !== aId)
    const rectMap = new Map<string, DOMRect>()
    for (const it of rects) rectMap.set(it.id, it.rect)
    const itemsInOrder: RectItem[] = []
    for (const id of otherIds) {
      const r = rectMap.get(id)
      if (r) itemsInOrder.push({ id, rect: r })
    }
    const rows = buildRowsInDomOrder(itemsInOrder)
    const insertIndex = pickInsertIndexFromRows({ p, rows })

    const next = moveId(idsNow, aId, insertIndex)
    if (next.every((v, i) => v === idsNow[i])) return

    // 轻量滞回：避免在行边界/列边界附近来回抖动
    {
      const now = performance.now()
      const prev = lastReorderRef.current
      if (prev) {
        const dist = Math.abs(p.x - prev.x) + Math.abs(p.y - prev.y)
        const dt = now - prev.t
        
        // 如果插入索引和之前不同
        if (prev.idx !== insertIndex) {
          // 基本滞回：时间间隔很短且移动距离很小时，保持之前的索引
          if (dt < 45 && dist < 14) return
          
          // 关键修复：检测"布局变化导致的自动切换"
          // 当相邻位置切换且指针几乎没有移动时，说明是布局变化导致的
          // 而不是用户主动移动，应该阻止这种切换
          const isAdjacentSwitch = Math.abs(prev.idx - insertIndex) === 1
          
          // 如果指针移动距离很小（< 5px），无论时间间隔多长，都阻止相邻切换
          // 这是因为布局变化后，即使经过了一段时间，如果指针没有移动，
          // 就不应该触发新的换位
          if (isAdjacentSwitch && dist < 5) {
            return // 阻止布局变化导致的自动切换
          }
          
          // 如果时间间隔很短且移动距离较小，也阻止
          if (isAdjacentSwitch && dt < 150 && dist < 15) {
            return
          }
        }
      }
      lastReorderRef.current = { idx: insertIndex, x: p.x, y: p.y, t: now }
    }

    // 预挤压：拖拽过程中就更新顺序，让其它图标实时挤开
    finalOrderRef.current = next
    if (options.prePush) setVisibleIds(next)
  }, [
    clearCombine,
    computeRects,
    getItemById,
    options.prePush,
    setVisibleIds,
  ])

  const scheduleUpdate = useCallback(() => {
    if (rafRef.current != null) return
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null
      updateByPointerNow()
    })
  }, [updateByPointerNow])

  const flushUpdate = useCallback(() => {
    if (rafRef.current != null) {
      window.cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    updateByPointerNow()
  }, [updateByPointerNow])

  // 简单 FLIP：每次 visibleIds 变更，给非 active 项做平滑挤压
  const flipPrevRef = useRef<Map<string, DOMRect>>(new Map())
  // 记录上一次的 activeId，用于检测是否是刚开始拖拽
  const lastActiveIdRef = useRef<string | null>(null)
  
  useLayoutEffect(() => {
    const prev = flipPrevRef.current
    const next = new Map<string, DOMRect>()
    for (const id of visibleIds) {
      const el = getEl(id)
      if (!el) continue
      next.set(id, el.getBoundingClientRect())
    }
    
    // 检测是否是刚开始拖拽（activeId 从 null 变成有值）
    const justStartedDragging = activeId && !lastActiveIdRef.current
    lastActiveIdRef.current = activeId
    
    // 关键修复：
    // 1. 必须正在拖拽（activeId 存在）
    // 2. 不是刚开始拖拽（避免第一次设置 activeId 时的跳动）
    // 3. 有之前的位置记录
    const shouldAnimate = activeId && !justStartedDragging && options.pushAnimation && prev.size > 0
    
    if (shouldAnimate) {
      for (const id of visibleIds) {
        if (id === activeId) continue
        const el = getEl(id)
        const a = prev.get(id)
        const b = next.get(id)
        if (!el || !a || !b) continue
        const dx = a.left - b.left
        const dy = a.top - b.top
        if (!dx && !dy) continue
        const inner = el.querySelector<HTMLElement>('.bm-inner') ?? el
        inner.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0,0)' }],
          { duration: 160, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
        )
      }
    }
    
    flipPrevRef.current = next
  }, [activeId, getEl, options.pushAnimation, visibleIds])

  const onPointerDown = (id: string, ev: PointerEvent, targetEl?: HTMLElement | null) => {
    if (ev.button !== 0) return // only primary button
    // 禁用拖拽时直接返回，不阻止默认行为（允许点击）
    if (disabled) return
    ev.preventDefault()

    clearCombine()
    resetOverlayAnim()

    // 新的拖拽会“作废”上一轮的归位淡入回调，避免多次拖拽后出现状态回滚（例如把 opacity 又清回去）
    sessionRef.current += 1
    // 关键：立即设置 activeIdRef，确保 updateByPointerNow 可以正常工作（拖拽换位和叠加建夹）
    // 拖拽确认标记 isDragConfirmedRef 会在 onMove 中根据移动距离设置，用于区分点击和拖拽
    activeIdRef.current = id // 关键：立即设置，确保 updateByPointerNow 可以正常工作（拖拽换位和叠加建夹）

    // 关键：同步挂监听，避免“快速拖拽松手”时 useEffect 还没挂上导致丢 pointerup（会出现预换位回滚、残留等）
    if (cleanupListenersRef.current) {
      try { cleanupListenersRef.current() } catch { /* ignore */ }
      cleanupListenersRef.current = null
    }

    // 防御：如果上一次拖拽的“隐藏样式”还没来得及清理，先清掉，避免影响下一次
    if (activeHiddenInnerRef.current) {
      const prev = activeHiddenInnerRef.current
      cancelElementAnimations(prev)
      prev.style.removeProperty('opacity')
      prev.style.removeProperty('transform')
      prev.style.removeProperty('will-change')
    }
    if (activeHiddenElRef.current) {
      const prevEl = activeHiddenElRef.current
      cancelElementAnimations(prevEl)
      prevEl.style.removeProperty('opacity')
      prevEl.style.removeProperty('visibility')
      prevEl.style.removeProperty('transform')
      prevEl.style.removeProperty('will-change')
      prevEl.style.removeProperty('pointer-events')
    }
    activeHiddenElRef.current = null
    activeHiddenInnerRef.current = null
    dropRevealIdRef.current = null
    lastReorderRef.current = null
    isDragConfirmedRef.current = false // 重置拖拽确认标记
    resetIntendedRow() // 重置意图行记录

    pointerIdRef.current = ev.pointerId
    const p = getPointerXYFromEvent(ev)
    pointerRef.current = p
    startPointerRef.current = p
    setOverlayPos(p)
    hoveredIdRef.current = null
    finalOrderRef.current = null

    const el = (targetEl as HTMLElement | null) ?? getEl(id) ?? null
    if (p && el) {
      // 立刻隐藏原内容（占位但不绘制），避免“移走残影”
      activeHiddenElRef.current = el
      activeHiddenInnerRef.current = el.querySelector<HTMLElement>('.bm-inner')
      // 最强兜底：直接用 important 强制隐藏，彻底杜绝“原位置还看到正在移动的图标”
      cancelElementAnimations(el)
      el.style.setProperty('opacity', '0', 'important')
      el.style.setProperty('visibility', 'hidden', 'important')
      el.style.setProperty('transform', 'translateZ(0)', 'important')
      el.style.setProperty('will-change', 'opacity,transform,visibility', 'important')
      el.style.setProperty('pointer-events', 'none', 'important')
      // 先把内部内容透明（即使 overlay 还没渲染出来，也不会露出“残影”）
      if (activeHiddenInnerRef.current) {
        const inner = activeHiddenInnerRef.current
        cancelElementAnimations(inner)
        inner.style.setProperty('opacity', '0', 'important')
        inner.style.setProperty('transform', 'scale(0.98)', 'important')
        inner.style.setProperty('will-change', 'transform,opacity', 'important')
      }
      // 用整块 tile（icon+文字）的 rect 计算抓取偏移，确保“按住哪里就吸附哪里”
      const r = (activeHiddenInnerRef.current ?? el).getBoundingClientRect()
      const ox = p.x - r.left
      const oy = p.y - r.top
      grabOffsetRef.current = {
        x: Math.max(0, Math.min(ox, r.width)),
        y: Math.max(0, Math.min(oy, r.height)),
      }
    } else {
      grabOffsetRef.current = { x: 24, y: 24 }
    }

    // 最后再进入拖拽态（避免 React 更新前出现一帧“原图标仍可见”）
    setActiveId(id)
    // 立即更新一次
    scheduleUpdate()

    // pointer capture + window 监听（同步）
    try {
      const withCapture = el as unknown as { setPointerCapture?: (id: number) => void }
      withCapture.setPointerCapture?.(ev.pointerId)
    } catch {
      // ignore
    }

    const onMove = (e: PointerEvent) => {
      if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current) return
      const pp = getPointerXYFromEvent(e)
      if (!pp || !startPointerRef.current) return
      
      // 检查移动距离是否超过拖拽阈值（5px）
      const dx = pp.x - startPointerRef.current.x
      const dy = pp.y - startPointerRef.current.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      const dragThreshold = 5
      
      // 如果还没有确认是拖拽，先检查距离
      if (!isDragConfirmedRef.current) {
        if (distance < dragThreshold) {
          // 移动距离不够，还不是拖拽，不执行拖拽逻辑，也不阻止默认行为
          return
        }
        // 移动距离足够，确认是拖拽
        isDragConfirmedRef.current = true
      }
      
      // 确认是拖拽后，正常执行拖拽逻辑
      e.preventDefault()
      // 兜底：拖拽过程中持续确保“原 tile”不可见，防止迟到回调把它改回可见
      const aId = activeIdRef.current
      if (aId) {
        // 每次移动都重新查找元素（可能被 React 重排/重建），确保隐藏最新元素
        const currentEl = getEl(aId)
        if (currentEl) {
          // 如果 ref 保存的元素和当前 DOM 中的元素不一致，更新 ref
          if (activeHiddenElRef.current !== currentEl) {
            // 清理旧元素的样式（如果有）
            if (activeHiddenElRef.current && activeHiddenElRef.current !== currentEl) {
              const oldEl = activeHiddenElRef.current
              if (oldEl.isConnected) {
                oldEl.style.opacity = ''
                oldEl.style.pointerEvents = ''
              }
            }
            activeHiddenElRef.current = currentEl
          }
          // 强制隐藏当前元素（无论它是否在 ref 中）
          cancelElementAnimations(currentEl)
          currentEl.style.setProperty('opacity', '0', 'important')
          currentEl.style.setProperty('pointer-events', 'none', 'important')
          currentEl.style.setProperty('visibility', 'hidden', 'important')
          const inner = currentEl.querySelector<HTMLElement>('.bm-inner')
          if (inner) {
            cancelElementAnimations(inner)
            inner.style.setProperty('opacity', '0', 'important')
          }
        }
      }
      pointerRef.current = pp
      setOverlayPos(pp)
      scheduleUpdate()
    }
    const onUp = (e: PointerEvent) => {
      if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current) return
      e.preventDefault() // 始终阻止默认行为，避免点击事件触发
      
      // 关键：在 flushUpdate 之前保存 combine 状态，避免被清除
      // flushUpdate 会调用 updateByPointerNow，如果指针在空白区域会清除 combine 状态
      const savedHoveredId = hoveredIdRef.current
      const savedTargetId = combineTargetIdRef.current
      
      flushUpdate() // 确保 finalOrderRef.current 已更新
      
      // 如果没有确认是拖拽（只是点击），清理状态并允许点击事件执行
      if (!isDragConfirmedRef.current) {
        // 清理所有状态，允许点击事件正常执行
        setActiveId(null)
        activeIdRef.current = null
        pointerIdRef.current = null
        pointerRef.current = null
        startPointerRef.current = null
        setOverlayPos(null)
        hoveredIdRef.current = null
        finalOrderRef.current = null
        isDragConfirmedRef.current = false
        
        // 恢复元素的可见性
        if (el) {
          el.style.removeProperty('opacity')
          el.style.removeProperty('visibility')
          el.style.removeProperty('transform')
          el.style.removeProperty('will-change')
          el.style.removeProperty('pointer-events')
          if (activeHiddenInnerRef.current) {
            activeHiddenInnerRef.current.style.removeProperty('opacity')
            activeHiddenInnerRef.current.style.removeProperty('transform')
            activeHiddenInnerRef.current.style.removeProperty('will-change')
          }
          activeHiddenElRef.current = null
          activeHiddenInnerRef.current = null
        }
        return
      }
      
      // 已经确认是拖拽，正常结束拖拽（这会执行排序逻辑）
      // 注意：不要立即清理 activeId，让 onClick 可以检查到并阻止点击
      // activeId 会在 onDragEnd 的 endInternal 中被清理
      isDragConfirmedRef.current = false
      // 关键：恢复保存的 combine 状态，确保 onDragEnd 能正确判断是否合并
      // 因为 flushUpdate 可能已经清除了这些状态
      // 如果保存了 targetId，说明之前满足过合并条件，应该允许合并
      // 同时需要确保 hoveredId 和 targetId 一致
      if (savedTargetId) {
        // 如果保存了 targetId，说明之前满足过合并条件，恢复状态
        combineTargetIdRef.current = savedTargetId
        // 如果 hoveredId 存在且等于 targetId，恢复它；否则使用 targetId
        hoveredIdRef.current = (savedHoveredId === savedTargetId) ? savedHoveredId : savedTargetId
      } else if (savedHoveredId) {
        // 如果没有 targetId 但有 hoveredId，只恢复 hoveredId（不会触发合并）
        hoveredIdRef.current = savedHoveredId
      }
      void onDragEnd()
    }
    const onCancel = (e: PointerEvent) => {
      if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current) return
      e.preventDefault()
      onDragCancel()
    }
    const onBlur = () => {
      // 窗口失焦/切应用时，强制取消，避免“粘手上”
      onDragCancel()
    }
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') onDragCancel()
    }
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp, { passive: false })
    window.addEventListener('pointercancel', onCancel, { passive: false })
    window.addEventListener('blur', onBlur)
    document.addEventListener('visibilitychange', onVisibility)
    cleanupListenersRef.current = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }

  const endInternal = useCallback(() => {
    const revealId = dropRevealIdRef.current
    const shouldReveal = Boolean(revealId && options.dropAnimation)
    const sessionAtEnd = sessionRef.current
    
    // 关键：先清除所有 combine 状态（包括 ref），避免高亮残留
    clearCombine()
    
    // 关键：在 endInternal 中不清理 activeId，让它在 onDragEnd 中延迟清理
    // 这样可以确保 onClick 可以检查到 activeId 并阻止点击事件
    // activeId 会在 onDragEnd 的 finally 中延迟清理（见 onDragEnd 中的 setTimeout）
    // 注意：如果在 onDragCancel 中调用 endInternal，会在 onDragCancel 中立即清理 activeId
    // 这里不清理 activeId，由调用者决定是否延迟清理
    setOverlayPos(null)
    startPointerRef.current = null
    pointerRef.current = null
    hoveredIdRef.current = null
    pointerIdRef.current = null
    finalOrderRef.current = null
    // 不清理 activeId，让调用者决定是否延迟清理
    
    // 内部内容的透明/缩放先不要清，交给“归位淡入”做衔接（否则会有一帧跳闪）
    if (!shouldReveal && activeHiddenInnerRef.current) {
      const inner = activeHiddenInnerRef.current
      cancelElementAnimations(inner)
      inner.style.removeProperty('opacity')
      inner.style.removeProperty('transform')
      inner.style.removeProperty('will-change')
      activeHiddenInnerRef.current = null
      dropRevealIdRef.current = null
    }
    if (!shouldReveal && activeHiddenElRef.current) {
      const hiddenEl = activeHiddenElRef.current
      cancelElementAnimations(hiddenEl)
      hiddenEl.style.removeProperty('opacity')
      hiddenEl.style.removeProperty('visibility')
      hiddenEl.style.removeProperty('transform')
      hiddenEl.style.removeProperty('will-change')
      hiddenEl.style.removeProperty('pointer-events')
      activeHiddenElRef.current = null
    }
    
    resetOverlayAnim()
    if (cleanupListenersRef.current) {
      try { cleanupListenersRef.current() } catch { /* ignore */ }
      cleanupListenersRef.current = null
    }

    if (shouldReveal && revealId) {
      // 下一帧：元素已恢复可见/已落在目标位置，再做一次淡入，消除“吸附回位时跳闪”
      requestAnimationFrame(() => {
        // 如果期间用户又开始了新一轮拖拽，则取消本次“归位淡入”，并立即恢复样式，避免把新一轮的隐藏打回去
        if (sessionRef.current !== sessionAtEnd) {
          const prevEl = activeHiddenElRef.current
          if (prevEl) {
            cancelElementAnimations(prevEl)
            prevEl.style.removeProperty('opacity')
            prevEl.style.removeProperty('visibility')
            prevEl.style.removeProperty('transform')
            prevEl.style.removeProperty('will-change')
            prevEl.style.removeProperty('pointer-events')
            activeHiddenElRef.current = null
          }
          const prevInner = activeHiddenInnerRef.current
          if (prevInner) {
            cancelElementAnimations(prevInner)
            prevInner.style.removeProperty('opacity')
            prevInner.style.removeProperty('transform')
            prevInner.style.removeProperty('will-change')
            activeHiddenInnerRef.current = null
          }
          dropRevealIdRef.current = null
          return
          }

          const el = getEl(revealId)
          const inner =
            el?.querySelector<HTMLElement>('.bm-inner') ?? activeHiddenInnerRef.current
          if (el) {
          cancelElementAnimations(el)
          // 确保从透明开始，再淡入（不依赖上一帧是否恢复）
          // 注意：不要用 important，让动画能覆盖
          el.style.opacity = '0'
          el.style.removeProperty('visibility')
          el.style.removeProperty('pointer-events')
          const a = el.animate(
            [{ opacity: 0 }, { opacity: 1 }],
            { duration: 140, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'forwards' },
          )
          void a.finished
            .catch(() => undefined)
            .finally(() => {
              // 只在同一轮 session 下清理，避免“多次拖拽后又把 opacity 清回去”
              if (sessionRef.current !== sessionAtEnd) return
              el.style.removeProperty('opacity')
              el.style.removeProperty('transform')
              el.style.removeProperty('will-change')
              el.style.removeProperty('pointer-events')
              el.style.removeProperty('visibility')
              // 这轮结束后，允许下一轮重新接管
              if (activeHiddenElRef.current === el) activeHiddenElRef.current = null
            })
        }
        if (!inner) {
          dropRevealIdRef.current = null
          activeHiddenInnerRef.current = null
          return
        }
        cancelElementAnimations(inner)
        try {
          // 确保从初始状态开始动画
          inner.style.opacity = '0'
          inner.style.transform = 'scale(0.98)'
          const anim = inner.animate(
            [
              { opacity: 0, transform: 'scale(0.98)' },
              { opacity: 1, transform: 'scale(1)' },
            ],
            { duration: 140, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'forwards' },
          )
          void anim.finished
            .catch(() => undefined)
            .finally(() => {
              if (sessionRef.current !== sessionAtEnd) return
              inner.style.removeProperty('opacity')
              inner.style.removeProperty('transform')
              inner.style.removeProperty('will-change')
              dropRevealIdRef.current = null
              activeHiddenInnerRef.current = null
            })
        } catch {
          inner.style.removeProperty('opacity')
          inner.style.removeProperty('transform')
          inner.style.removeProperty('will-change')
          dropRevealIdRef.current = null
          activeHiddenInnerRef.current = null
        }
      })
    }
  }, [clearCombine, getEl, options.dropAnimation, resetOverlayAnim])

  const animateMergeToTarget = async (targetId: string) => {
    const box = overlayBoxRef.current
    const targetEl = getEl(targetId)
    if (!box || !targetEl) return

    const o = box.getBoundingClientRect()
    const t = targetEl.getBoundingClientRect()
    const dx = t.left + t.width / 2 - (o.left + o.width / 2)
    const dy = t.top + t.height / 2 - (o.top + o.height / 2)

    resetOverlayAnim()
    const a1 = box.animate(
      [
        { transform: 'translate(0px,0px) scale(1)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.12)`, opacity: 0.05 },
      ],
      { duration: 320, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'forwards' },
    )
    const a2 = targetEl.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(0.96)' }, { transform: 'scale(1.03)' }, { transform: 'scale(1)' }],
      { duration: 320, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
    )
    await Promise.all([a1.finished.catch(() => undefined), a2.finished.catch(() => undefined)])
  }

  const onDragEnd = async () => {
    const aId = activeIdRef.current
    const hovered = hoveredIdRef.current
    // 关键：用 ref 判断，确保读到最新值（state 可能还没同步）
    // 保存 combineTargetIdRef.current，避免指针移开后 hovered 被清除
    const targetId = combineTargetIdRef.current
    const shouldMerge = Boolean(aId && hovered && targetId && targetId === hovered)

    try {
      // 即使 aId 为空（极端快速操作/异常时序），也必须走 finally 清理，避免“粘手上/高亮不消失”
      if (!aId) {
        endInternal()
        return
      }
      
      // 处理合并逻辑
      if (shouldMerge && hovered && targetId) {
        const target = getItemById(hovered)
        if (target) {
          if (target.type === 'FOLDER') {
            await Promise.all([animateMergeToTarget(hovered), onMergeIntoFolder(aId!, hovered)])
          } else {
            await Promise.all([animateMergeToTarget(hovered), onCreateFolderWith(hovered, aId!)])
          }
          // 合并完成后，清理状态
          endInternal()
          return
        }
      }
      // 即使 finalOrderRef.current 是 null，也应该执行排序（使用当前顺序）
      // 这样可以确保拖拽后即使没有换位，也会触发持久化
      const finalIds = finalOrderRef.current ?? visibleIdsRef.current
      // 确保执行排序逻辑，即使顺序没有变化
      onPersistReorder(finalIds)
      setVisibleIds(finalIds)

      // 归位动画：overlay 平滑落到目标格子，再结束（避免瞬移）
      if (options.dropAnimation) {
        const box = overlayBoxRef.current
        const targetEl = getEl(aId!)
        if (box && targetEl) {
          const o = box.getBoundingClientRect()
          const t = targetEl.getBoundingClientRect()
          const dx = t.left + t.width / 2 - (o.left + o.width / 2)
          const dy = t.top + t.height / 2 - (o.top + o.height / 2)
          resetOverlayAnim()
          const anim = box.animate(
            [
              { transform: 'translate(0px,0px) scale(1)', opacity: 1 },
              { transform: `translate(${dx}px, ${dy}px) scale(0.98)`, opacity: 0 },
            ],
            { duration: 140, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'forwards' },
          )
          await anim.finished.catch(() => undefined)
        }
      }

      // 标记需要做“归位淡入”（在 endInternal 里执行）
      dropRevealIdRef.current = aId
    } finally {
      endInternal()
      // 关键：延迟清理 activeId，确保 onClick 可以检查到并阻止点击事件
      // 因为 onClick 事件可能在 onDragEnd 完成后才被触发（React 事件系统）
      // 只有在确认是拖拽时才延迟清理（通过检查 aId 是否还在）
      if (aId && activeIdRef.current === aId) {
        setTimeout(() => {
          if (activeIdRef.current === aId) {
            setActiveId(null)
            activeIdRef.current = null
          }
        }, 150) // 延迟 150ms 清理，确保点击事件被阻止
      }
    }
  }

  const onDragCancel = () => {
    // 取消拖拽时，立即清理 activeId
    setActiveId(null)
    activeIdRef.current = null
    endInternal()
  }

  return {
    activeId,
    overlayRef,
    overlayBoxRef,
    overlayStyle,
    combineCandidateId,
    combineTargetId,
    onPointerDown,
    onDragEnd,
    onDragCancel,
  }
}


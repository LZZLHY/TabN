import { useCallback, useEffect, useRef, useState } from 'react'
import { LAZY_LOAD_THRESHOLD } from './types'

/**
 * 懒加载 Hook - 使用 IntersectionObserver 跟踪元素可见性
 * 只有书签数量超过阈值时才启用，小量书签直接渲染
 */
export function useLazyVisibility(itemCount: number) {
  const enabled = itemCount > LAZY_LOAD_THRESHOLD
  const [visibleIds, setVisibleIds] = useState<Set<string>>(() => new Set())
  const observerRef = useRef<IntersectionObserver | null>(null)
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const scrollContainerRef = useRef<HTMLElement | null>(null)
  
  // 设置滚动容器引用
  const setScrollContainer = useCallback((el: HTMLElement | null) => {
    scrollContainerRef.current = el
    // 重新创建 observer 以使用新的 root
    if (el && enabled) {
      observerRef.current?.disconnect()
      observerRef.current = new IntersectionObserver(
        (entries) => {
          setVisibleIds((prev) => {
            const next = new Set(prev)
            let changed = false
            entries.forEach((entry) => {
              const id = entry.target.getAttribute('data-lazy-id')
              if (id && entry.isIntersecting && !next.has(id)) {
                next.add(id)
                changed = true
              }
            })
            return changed ? next : prev
          })
        },
        {
          root: el,
          rootMargin: '150px 0px', // 提前 150px 加载
          threshold: 0,
        }
      )
      // 重新观察所有元素
      itemRefs.current.forEach((itemEl) => {
        observerRef.current?.observe(itemEl)
      })
    }
  }, [enabled])
  
  // 清理
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect()
    }
  }, [])
  
  // 注册元素
  const registerRef = useCallback((id: string, el: HTMLDivElement | null) => {
    const prev = itemRefs.current.get(id)
    if (prev && observerRef.current) {
      observerRef.current.unobserve(prev)
    }
    
    if (el) {
      itemRefs.current.set(id, el)
      observerRef.current?.observe(el)
    } else {
      itemRefs.current.delete(id)
    }
  }, [])
  
  // 重置可见性（当列表变化时调用）
  const resetVisibility = useCallback(() => {
    setVisibleIds(new Set())
  }, [])
  
  const isVisible = useCallback((id: string) => {
    return !enabled || visibleIds.has(id)
  }, [enabled, visibleIds])
  
  return { enabled, isVisible, registerRef, setScrollContainer, resetVisibility }
}

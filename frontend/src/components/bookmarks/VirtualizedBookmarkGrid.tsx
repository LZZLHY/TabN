/**
 * 虚拟化书签网格组件
 * 
 * 使用 IntersectionObserver 实现简单的懒加载渲染
 * 只渲染视窗内及附近的元素，提升大量书签时的性能
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// 网格间距
const GAP = 12

interface VirtualizedBookmarkGridProps<T> {
  /** 要显示的书签 ID 列表 */
  itemIds: string[]
  /** 根据 ID 获取书签数据 */
  getItemById: (id: string) => T | undefined
  /** 渲染单个书签项 */
  renderItem: (item: T) => React.ReactNode
  /** 渲染添加按钮 */
  renderAddButton?: () => React.ReactNode
  /** 最小列数 */
  minColumns?: number
  /** 最大列数 */
  maxColumns?: number
  /** 当项目数量超过此值时，启用懒加载 */
  lazyThreshold?: number
  /** 自定义类名 */
  className?: string
}

export function VirtualizedBookmarkGrid<T>({
  itemIds,
  getItemById,
  renderItem,
  renderAddButton,
  minColumns = 4,
  maxColumns = 8,
  lazyThreshold = 100,
  className,
}: VirtualizedBookmarkGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set())
  const observerRef = useRef<IntersectionObserver | null>(null)
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  
  // 是否启用懒加载
  const enableLazy = itemIds.length > lazyThreshold
  
  // 设置 IntersectionObserver
  useEffect(() => {
    if (!enableLazy) return
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        setVisibleItems((prev) => {
          const next = new Set(prev)
          entries.forEach((entry) => {
            const id = entry.target.getAttribute('data-id')
            if (id) {
              if (entry.isIntersecting) {
                next.add(id)
              }
              // 不移除，保持已渲染的项目
            }
          })
          return next
        })
      },
      {
        root: containerRef.current?.closest('.overflow-y-auto') || null,
        rootMargin: '200px 0px', // 提前 200px 开始加载
        threshold: 0,
      }
    )
    
    return () => {
      observerRef.current?.disconnect()
    }
  }, [enableLazy])
  
  // 注册/注销观察
  const setItemRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (!enableLazy) return
    
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
  }, [enableLazy])
  
  // 计算列数
  const columnCount = useMemo(() => {
    if (typeof window === 'undefined') return minColumns
    const width = window.innerWidth
    if (width >= 1024) return maxColumns
    if (width >= 768) return 6
    if (width >= 640) return 5
    return minColumns
  }, [minColumns, maxColumns])
  
  return (
    <div 
      ref={containerRef}
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
        gap: GAP,
        alignItems: 'start',
      }}
    >
      {itemIds.map((id) => {
        const item = getItemById(id)
        if (!item) return null
        
        // 懒加载模式：未进入视窗的显示占位符
        if (enableLazy && !visibleItems.has(id)) {
          return (
            <div
              key={id}
              ref={(el) => setItemRef(id, el)}
              data-id={id}
              className="flex justify-center"
              style={{ minHeight: 90 }}
            >
              {/* 占位符 - 简单骨架 */}
              <div className="w-16">
                <div className="h-12 w-12 mx-auto rounded-[var(--start-radius)] bg-glass/20 animate-pulse" />
                <div className="mt-1.5 h-3 w-12 mx-auto rounded bg-glass/10 animate-pulse" />
              </div>
            </div>
          )
        }
        
        return (
          <div 
            key={id} 
            ref={enableLazy ? (el) => setItemRef(id, el) : undefined}
            data-id={id}
            className="flex justify-center"
          >
            {renderItem(item)}
          </div>
        )
      })}
      {renderAddButton && (
        <div className="flex justify-center">{renderAddButton()}</div>
      )}
    </div>
  )
}

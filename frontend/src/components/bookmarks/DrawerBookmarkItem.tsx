import { Folder } from 'lucide-react'
import { cn } from '../../utils/cn'
import { Favicon } from '../Favicon'
import { Tooltip } from '../ui/Tooltip'
import { DraggableBookmarkItem } from './DraggableItem'
import { getSortedFolderChildren } from './folderOperations'
import { getIconUrl } from '../../utils/iconSource'
import { useAppearanceStore } from '../../stores/appearance'
import type { Bookmark } from './types'

type DrawerBookmarkItemProps = {
  item: Bookmark
  allItems: Bookmark[]
  userId?: string
  drag: {
    activeId: string | null
    combineCandidateId: string | null
    combineTargetId: string | null
    onPointerDown: (id: string, ev: PointerEvent, el: HTMLElement) => void
    onDragCancel: () => void
  }
  customIconOk: Record<string, boolean>
  setCustomIconOk: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  setElRef: (id: string, el: HTMLDivElement | null) => void
  onFolderClick: (id: string, rect?: DOMRect) => void
  onBookmarkClick: (item: Bookmark) => void
  onContextMenu: (item: Bookmark, x: number, y: number) => void
  onLongPress: (x: number, y: number) => void
  onTagClick: (tag: string) => void
}

/**
 * 书签页单个书签/文件夹渲染组件
 */
export function DrawerBookmarkItem({
  item: b,
  allItems,
  userId,
  drag,
  customIconOk,
  setCustomIconOk,
  setElRef,
  onFolderClick,
  onBookmarkClick,
  onContextMenu,
  onLongPress,
  onTagClick,
}: DrawerBookmarkItemProps) {
  const isFolder = b.type === 'FOLDER'
  const isCombineCandidate = drag.combineCandidateId === b.id
  const isCombineTarget = drag.combineTargetId === b.id
  const bookmarkIconSize = useAppearanceStore((s) => s.bookmarkIconSize)
  
  const folderItems = isFolder 
    ? getSortedFolderChildren(allItems.filter(x => x.parentId === b.id), userId, b.id, 'drawer').slice(0, 9) 
    : []
  
  // Determine custom icon source
  let customIconSrc = ''
  if (!isFolder) {
    if (b.iconType === 'BASE64' && b.iconData) {
      // Base64 图标优先
      customIconSrc = b.iconData
    } else if (b.iconUrl) {
      // 使用 iconUrl（可能是来源标记或自定义 URL）
      customIconSrc = getIconUrl(b.url, b.iconUrl)
    }
  }
  const hasCustomIcon = Boolean(customIconSrc)
  const customIconFailed = customIconOk[b.id] === false
  const showCustomIcon = hasCustomIcon && !customIconFailed

  const showCombine = isCombineCandidate || isCombineTarget
  const iconRing = isCombineTarget
    ? 'ring-2 ring-primary ring-offset-2'
    : isCombineCandidate
      ? 'ring-2 ring-primary/60 ring-offset-2'
      : ''

  // 计算图标背景样式
  const getIconBgStyle = (): { className: string; style?: React.CSSProperties } => {
    // 文件夹使用固定样式
    if (isFolder) {
      return { className: 'bg-glass/20 border border-glass-border/20 p-[2px]' }
    }
    
    // 根据 iconBg 设置背景
    const iconBg = b.iconBg
    
    // 透明背景
    if (iconBg === 'transparent') {
      return { className: '' }  // 无背景
    }
    
    // 自定义颜色背景
    if (iconBg && iconBg.startsWith('#')) {
      return { 
        className: '',
        style: { backgroundColor: iconBg }
      }
    }
    
    // 毛玻璃背景（default 或 default:primary:blur:N 格式）
    if (!iconBg || iconBg.startsWith('default')) {
      const usePrimary = iconBg?.includes('primary') || false
      const blurMatch = iconBg?.match(/blur:(\d+)/)
      const blurIntensity = blurMatch ? parseInt(blurMatch[1]) : 70  // 默认 70
      
      // 根据强度计算 backdrop-blur 和背景透明度
      const blurPx = Math.round(blurIntensity / 10)  // 0-10px
      const bgOpacity = blurIntensity / 100 * 0.7  // 0-0.7
      
      // 毛玻璃效果：白色半透明背景 + 可选的主题色叠加
      // 主题色时：使用主题色作为背景色（通过内联样式设置 RGBA）
      // 非主题色时：纯白色毛玻璃
      const baseStyle: React.CSSProperties = {
        backdropFilter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
        WebkitBackdropFilter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
      }
      
      if (usePrimary) {
        // 主题色背景：使用 CSS 变量或固定的主题色
        // 由于无法直接获取主题色 RGB 值，使用类名 + 白色底层的组合
        return { 
          className: 'bg-primary/20',
          style: {
            ...baseStyle,
            // 添加白色底层增强毛玻璃效果
            boxShadow: `inset 0 0 0 100px rgba(255, 255, 255, ${bgOpacity * 0.5})`
          }
        }
      } else {
        return { 
          className: '',
          style: {
            ...baseStyle,
            backgroundColor: `rgba(255, 255, 255, ${bgOpacity})`
          }
        }
      }
    }
    
    // 默认背景（原始）- fallback
    if (showCustomIcon) {
      return { className: 'bg-white/70' }
    }
    return { className: 'bg-primary/15 text-primary font-semibold' }
  }
  
  const iconBgStyle = getIconBgStyle()

  return (
    <DraggableBookmarkItem
      key={b.id}
      item={b}
      activeDragId={drag.activeId}
      setElRef={setElRef}
      iconOnlyDrag
      onPointerDown={(id, ev) => {
        if (ev.button !== 0) return
        drag.onPointerDown(id, ev.nativeEvent, ev.currentTarget)
      }}
      onClick={(e) => {
        if (drag.activeId) {
          e.preventDefault()
          e.stopPropagation()
          return
        }
        if (isFolder) {
          // 获取图标元素的位置用于动画
          const target = e.currentTarget
          const iconEl = target.querySelector('.bookmark-icon')
          const rect = iconEl?.getBoundingClientRect()
          onFolderClick(b.id, rect)
        } else {
          onBookmarkClick(b)
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        onContextMenu(b, e.clientX + 8, e.clientY + 8)
      }}
      onLongPress={(x, y) => {
        onLongPress(x, y)
        onContextMenu(b, x, y)
      }}
      onCancelDrag={drag.onDragCancel}
    >
      <Tooltip
        content={
          <div className="space-y-1">
            <div className="font-medium">{b.name}</div>
            {b.note && <div className="text-fg/70 text-xs">{b.note}</div>}
            {b.tags && b.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {b.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-1.5 py-0.5 rounded text-[10px] bg-primary/20 text-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        }
        position="top"
        delay={600}
      >
      <div className="grid place-items-center group/icon">
        <div
          className={cn(
            'bookmark-icon rounded-[var(--start-radius)] overflow-hidden grid place-items-center relative',
            'group-hover/icon:scale-110 group-hover/icon:shadow-lg group-hover/icon:shadow-black/10',
            'group-active/icon:scale-95',
            iconBgStyle.className,
            iconRing,
            showCombine && 'scale-[1.03]',
          )}
          style={{
            width: bookmarkIconSize,
            height: bookmarkIconSize,
            transition: 'transform 150ms ease-out, box-shadow 150ms ease-out, width 200ms, height 200ms',
            ...iconBgStyle.style,
          }}
        >
          {showCombine && !isFolder ? (
            <div className="absolute inset-0 rounded-[var(--start-radius)] bg-glass/25 border border-primary/60 grid place-items-center">
              <Folder className="w-5 h-5 text-primary" />
            </div>
          ) : null}

          <div className={cn('absolute inset-0', showCombine && !isFolder ? 'opacity-15' : 'opacity-100')}>
            {isFolder ? (
              <div className="grid grid-cols-3 gap-0.5 w-full h-full content-start p-[8%]">
                {folderItems.map((sub) => {
                  const isSubFolder = sub.type === 'FOLDER'
                  
                  // 如果是子文件夹，显示其内容预览
                  if (isSubFolder) {
                    const subFolderItems = allItems.filter(x => x.parentId === sub.id).slice(0, 4)
                    if (subFolderItems.length === 0) {
                      // 空文件夹显示文件夹图标
                      return (
                        <div
                          key={sub.id}
                          className="w-full pt-[100%] relative bg-amber-100/50 rounded-[2px] overflow-hidden"
                        >
                          <Folder className="absolute inset-0 w-full h-full p-0.5 text-amber-500" />
                        </div>
                      )
                    }
                    // 显示子文件夹内的前 4 个项目的缩略图（始终保持 2x2 布局）
                    const gridItems = [...subFolderItems]
                    // 填充到 4 个位置
                    while (gridItems.length < 4) {
                      gridItems.push(null as unknown as typeof subFolderItems[0])
                    }
                    return (
                      <div
                        key={sub.id}
                        className="w-full pt-[100%] relative bg-amber-100/30 rounded-[2px] overflow-hidden"
                      >
                        <div className="absolute inset-0 grid grid-cols-2 gap-px p-px">
                          {gridItems.slice(0, 4).map((child, idx) => {
                            // 空位置显示透明占位符（保持正方形）
                            if (!child) {
                              return <div key={`empty-${idx}`} className="bg-black/5 rounded-[1px] aspect-square" />
                            }
                            const isChildFolder = child.type === 'FOLDER'
                            if (isChildFolder) {
                              // 获取嵌套文件夹内的子项
                              const nestedItems = allItems.filter(x => x.parentId === child.id).slice(0, 4)
                              if (nestedItems.length === 0) {
                                // 空文件夹显示文件夹图标
                                return (
                                  <div key={child.id} className="w-full h-full bg-amber-100/50 rounded-[1px] flex items-center justify-center aspect-square">
                                    <Folder className="w-full h-full p-[1px] text-amber-500" />
                                  </div>
                                )
                              }
                              // 显示嵌套文件夹内的前 4 个图标（2x2 网格）
                              return (
                                <div key={child.id} className="w-full h-full bg-amber-100/30 rounded-[1px] grid grid-cols-2 gap-[0.5px] p-[0.5px] aspect-square">
                                  {[0, 1, 2, 3].map((nestedIdx) => {
                                    const nestedChild = nestedItems[nestedIdx]
                                    if (!nestedChild) {
                                      return <div key={`nested-empty-${nestedIdx}`} className="bg-black/5 rounded-[0.5px] aspect-square" />
                                    }
                                    if (nestedChild.type === 'FOLDER') {
                                      return (
                                        <div key={nestedChild.id} className="bg-amber-100/50 rounded-[0.5px] flex items-center justify-center aspect-square">
                                          <Folder className="w-full h-full p-px text-amber-500" />
                                        </div>
                                      )
                                    }
                                    let nestedIcon = ''
                                    if (nestedChild.iconType === 'BASE64' && nestedChild.iconData) {
                                      nestedIcon = nestedChild.iconData
                                    } else if (nestedChild.iconUrl) {
                                      nestedIcon = getIconUrl(nestedChild.url, nestedChild.iconUrl)
                                    }
                                    if (nestedIcon) {
                                      return (
                                        <img
                                          key={nestedChild.id}
                                          src={nestedIcon}
                                          className="w-full h-full object-cover rounded-[0.5px] aspect-square"
                                          alt=""
                                          loading="lazy"
                                          decoding="async"
                                        />
                                      )
                                    }
                                    return (
                                      <Favicon
                                        key={nestedChild.id}
                                        url={nestedChild.url || ''}
                                        size={6}
                                        className="w-full h-full object-cover rounded-[0.5px] aspect-square"
                                      />
                                    )
                                  })}
                                </div>
                              )
                            }
                            let childIcon = ''
                            if (child.iconType === 'BASE64' && child.iconData) {
                              childIcon = child.iconData
                            } else if (child.iconUrl) {
                              childIcon = getIconUrl(child.url, child.iconUrl)
                            }
                            if (childIcon) {
                              return (
                                <img
                                  key={child.id}
                                  src={childIcon}
                                  className="w-full h-full object-cover rounded-[1px]"
                                  alt=""
                                  loading="lazy"
                                  decoding="async"
                                />
                              )
                            }
                            return (
                              <Favicon
                                key={child.id}
                                url={child.url || ''}
                                size={8}
                                className="w-full h-full object-cover rounded-[1px]"
                              />
                            )
                          })}
                        </div>
                      </div>
                    )
                  }
                  
                  // 普通书签图标逻辑
                  let subIcon = ''
                  if (sub.iconType === 'BASE64' && sub.iconData) {
                    subIcon = sub.iconData
                  } else if (sub.iconUrl) {
                    subIcon = getIconUrl(sub.url, sub.iconUrl)
                  }
                  const hasCustomSubIcon = Boolean(subIcon)
                  return (
                    <div
                      key={sub.id}
                      className="w-full pt-[100%] relative bg-black/10 rounded-[2px] overflow-hidden"
                    >
                      {hasCustomSubIcon ? (
                        <img
                          src={subIcon}
                          className="absolute inset-0 w-full h-full object-cover"
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                      ) : sub.url ? (
                        <Favicon
                          url={sub.url}
                          size={16}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <Folder className="absolute inset-0 w-full h-full p-0.5 text-amber-500" />
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <>
                {showCustomIcon ? (
                  <img
                    src={customIconSrc}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                    onError={() => {
                      setCustomIconOk((prev) => ({ ...prev, [b.id]: false }))
                    }}
                  />
                ) : null}
                {!showCustomIcon && (
                  <Favicon
                    url={b.url || ''}
                    name={b.name}
                    className="h-full w-full object-cover"
                    letterClassName="h-full w-full"
                  />
                )}
              </>
            )}
          </div>
        </div>
        <div 
          className="mt-1.5 text-[11px] text-fg/80 truncate text-center"
          style={{ width: Math.max(bookmarkIconSize, 64) }}
        >
          {b.name}
        </div>
        {/* Tags display */}
        <div 
          className="flex flex-wrap justify-center gap-0.5 mt-0.5 min-h-[14px]"
          style={{ width: Math.max(bookmarkIconSize, 64) }}
        >
          {b.tags && b.tags.length > 0 && (
            <>
              {b.tags.slice(0, 2).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onTagClick(tag)
                  }}
                  className={cn(
                    'px-1 py-0 rounded text-[8px] leading-tight',
                    'bg-primary/10 text-primary/80 hover:bg-primary/20',
                    'transition-colors truncate max-w-[30px]'
                  )}
                  title={tag}
                >
                  {tag}
                </button>
              ))}
              {b.tags.length > 2 && (
                <span className="text-[8px] text-fg/50">+{b.tags.length - 2}</span>
              )}
            </>
          )}
        </div>
      </div>
      </Tooltip>
    </DraggableBookmarkItem>
  )
}

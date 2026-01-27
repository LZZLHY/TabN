import { createPortal } from 'react-dom'
import { useState } from 'react'
import { Folder } from 'lucide-react'
import { cn } from '../../utils/cn'
import { Favicon } from '../Favicon'
import { getSortedFolderChildren } from './folderOperations'
import { getIconUrl } from '../../utils/iconSource'
import type { Bookmark } from './types'
import type { BookmarkContext } from '../../types/bookmark'

/**
 * 拖拽图标组件
 * 支持自定义图标加载失败后回退到 Favicon
 */
function DragIcon({ bookmark }: { bookmark: Bookmark }) {
  const [iconFailed, setIconFailed] = useState(false)
  
  // 检查自定义图标
  let customIcon = ''
  if (bookmark.iconType === 'BASE64' && bookmark.iconData) {
    customIcon = bookmark.iconData
  } else if (bookmark.iconUrl) {
    customIcon = getIconUrl(bookmark.url, bookmark.iconUrl)
  }
  const hasCustomIcon = Boolean(customIcon) && !iconFailed
  
  if (hasCustomIcon) {
    return (
      <img
        src={customIcon}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
        decoding="async"
        onError={() => setIconFailed(true)}
      />
    )
  }
  
  return (
    <Favicon
      url={bookmark.url || ''}
      name={bookmark.name}
      className="h-full w-full object-cover"
      letterClassName="h-full w-full"
    />
  )
}

/**
 * 极小图标组件（用于嵌套文件夹预览中的 2x2 网格内的图标）
 * 不再递归，只显示简单图标
 */
function DragTinyIcon({ bookmark }: { bookmark: Bookmark }) {
  const [iconFailed, setIconFailed] = useState(false)
  const isFolder = bookmark.type === 'FOLDER'
  
  if (isFolder) {
    return (
      <div className="bg-amber-100/50 rounded-[0.5px] flex items-center justify-center">
        <Folder className="w-full h-full p-px text-amber-500" />
      </div>
    )
  }
  
  let customIcon = ''
  if (bookmark.iconType === 'BASE64' && bookmark.iconData) {
    customIcon = bookmark.iconData
  } else if (bookmark.iconUrl) {
    customIcon = getIconUrl(bookmark.url, bookmark.iconUrl)
  }
  const hasCustomIcon = Boolean(customIcon) && !iconFailed
  
  if (hasCustomIcon) {
    return (
      <img
        src={customIcon}
        className="w-full h-full object-cover rounded-[0.5px]"
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setIconFailed(true)}
      />
    )
  }
  
  return (
    <Favicon
      url={bookmark.url || ''}
      size={6}
      className="w-full h-full object-cover rounded-[0.5px]"
    />
  )
}

/**
 * 超小图标组件（用于子文件夹预览中的 2x2 网格）
 * 支持显示嵌套文件夹内的图标预览
 */
function DragMiniIcon({ bookmark, nestedItems }: { bookmark: Bookmark; nestedItems?: Bookmark[] }) {
  const [iconFailed, setIconFailed] = useState(false)
  const isFolder = bookmark.type === 'FOLDER'
  
  if (isFolder) {
    const children = nestedItems || []
    if (children.length === 0) {
      // 空文件夹显示文件夹图标
      return (
        <div className="w-full h-full bg-amber-100/50 rounded-[1px] flex items-center justify-center aspect-square">
          <Folder className="w-full h-full p-[1px] text-amber-500" />
        </div>
      )
    }
    // 显示嵌套文件夹内的前 4 个图标（2x2 网格）
    return (
      <div className="w-full h-full bg-amber-100/30 rounded-[1px] grid grid-cols-2 gap-[0.5px] p-[0.5px] aspect-square">
        {[0, 1, 2, 3].map((idx) => {
          const child = children[idx]
          if (!child) {
            return <div key={`empty-${idx}`} className="bg-black/5 rounded-[0.5px] aspect-square" />
          }
          // 嵌套文件夹内的图标只显示简单图标，不再递归
          return <DragTinyIcon key={child.id} bookmark={child} />
        })}
      </div>
    )
  }
  
  let customIcon = ''
  if (bookmark.iconType === 'BASE64' && bookmark.iconData) {
    customIcon = bookmark.iconData
  } else if (bookmark.iconUrl) {
    customIcon = getIconUrl(bookmark.url, bookmark.iconUrl)
  }
  const hasCustomIcon = Boolean(customIcon) && !iconFailed
  
  if (hasCustomIcon) {
    return (
      <img
        src={customIcon}
        className="w-full h-full object-cover rounded-[1px]"
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setIconFailed(true)}
      />
    )
  }
  
  return (
    <Favicon
      url={bookmark.url || ''}
      size={8}
      className="w-full h-full object-cover rounded-[1px]"
    />
  )
}

/**
 * 拖拽文件夹预览中的小图标组件
 * 支持显示书签图标或子文件夹预览
 */
function DragFolderPreviewIcon({ bookmark, subFolderItems, allItems }: { bookmark: Bookmark; subFolderItems?: Bookmark[]; allItems?: Bookmark[] }) {
  const [iconFailed, setIconFailed] = useState(false)
  const isSubFolder = bookmark.type === 'FOLDER'
  
  // 如果是子文件夹，显示其内容预览
  if (isSubFolder) {
    const children = subFolderItems || []
    if (children.length === 0) {
      return (
        <div className="w-full pt-[100%] relative bg-amber-100/50 rounded-[2px] overflow-hidden">
          <Folder className="absolute inset-0 w-full h-full p-0.5 text-amber-500" />
        </div>
      )
    }
    // 显示子文件夹内的前 4 个项目的缩略图（始终保持 2x2 布局）
    return (
      <div className="w-full pt-[100%] relative bg-amber-100/30 rounded-[2px] overflow-hidden">
        <div className="absolute inset-0 grid grid-cols-2 gap-px p-px">
          {[0, 1, 2, 3].map((idx) => {
            const child = children[idx]
            if (!child) {
              return <div key={`empty-${idx}`} className="bg-black/5 rounded-[1px] aspect-square" />
            }
            // 如果子项是文件夹，获取其嵌套子项
            const nestedItems = child.type === 'FOLDER' && allItems
              ? allItems.filter(x => x.parentId === child.id).slice(0, 4)
              : undefined
            return <DragMiniIcon key={child.id} bookmark={child} nestedItems={nestedItems} />
          })}
        </div>
      </div>
    )
  }
  
  // 普通书签图标逻辑
  let customIcon = ''
  if (bookmark.iconType === 'BASE64' && bookmark.iconData) {
    customIcon = bookmark.iconData
  } else if (bookmark.iconUrl) {
    customIcon = getIconUrl(bookmark.url, bookmark.iconUrl)
  }
  const hasCustomIcon = Boolean(customIcon) && !iconFailed
  
  return (
    <div className="w-full pt-[100%] relative bg-black/10 rounded-[2px] overflow-hidden">
      {hasCustomIcon ? (
        <img
          src={customIcon}
          className="absolute inset-0 w-full h-full object-cover"
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setIconFailed(true)}
        />
      ) : bookmark.url ? (
        <Favicon
          url={bookmark.url}
          name={bookmark.name}
          size={16}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <Folder className="absolute inset-0 w-full h-full p-0.5 text-amber-500" />
      )}
    </div>
  )
}

type DragOverlayProps = {
  activeId: string | null
  allItems: Bookmark[]
  userId?: string
  context?: BookmarkContext
  overlayRef: React.RefObject<HTMLDivElement>
  overlayBoxRef: React.RefObject<HTMLDivElement>
  overlayStyle: React.CSSProperties
}

/**
 * 拖拽覆盖层组件
 * 显示正在拖拽的书签项
 */
export function DragOverlay({
  activeId,
  allItems,
  userId,
  context = 'shortcut',
  overlayRef,
  overlayBoxRef,
  overlayStyle,
}: DragOverlayProps) {
  if (!activeId) return null

  const item = allItems.find((x) => x.id === activeId)
  if (!item) return null

  const isFolder = item.type === 'FOLDER'
  const folderItems = isFolder
    ? getSortedFolderChildren(allItems.filter((x) => x.parentId === item.id), userId, item.id, context).slice(0, 9)
    : []

  return createPortal(
    <div ref={overlayRef} style={overlayStyle}>
      <div className="bm-inner">
        <div className="grid place-items-center select-none">
          <div
            ref={overlayBoxRef}
            className={cn(
              'bookmark-icon h-12 w-12 rounded-[var(--start-radius)] overflow-hidden grid place-items-center shadow-2xl select-none',
              isFolder
                ? 'bg-glass/20 border border-glass-border/20 p-1'
                : 'bg-primary/15 text-primary font-semibold',
            )}
          >
            {isFolder ? (
              <div className="grid grid-cols-3 gap-0.5 w-full h-full content-start p-[8%]">
                {folderItems.map((sub) => {
                  // 如果是子文件夹，获取其子项
                  const subFolderItems = sub.type === 'FOLDER'
                    ? allItems.filter(x => x.parentId === sub.id).slice(0, 4)
                    : undefined
                  return (
                    <DragFolderPreviewIcon key={sub.id} bookmark={sub} subFolderItems={subFolderItems} allItems={allItems} />
                  )
                })}
              </div>
            ) : (
              <DragIcon bookmark={item} />
            )}
          </div>
          <div className="mt-1.5 text-[11px] text-fg/80 truncate w-16 text-center">
            {item.name}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

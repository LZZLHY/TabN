import { Folder } from 'lucide-react'
import { cn } from '../../utils/cn'
import { Favicon } from '../Favicon'
import { getSortedFolderChildren } from './folderOperations'
import { getIconUrl } from '../../utils/iconSource'
import type { Bookmark } from './types'
import type { BookmarkContext } from '../../types/bookmark'

/**
 * 极小图标组件（用于嵌套文件夹预览中的 2x2 网格内的图标）
 * 不再递归，只显示简单图标
 */
function TinyIcon({ bookmark }: { bookmark: Bookmark }) {
  const isFolder = bookmark.type === 'FOLDER'
  
  if (isFolder) {
    return (
      <div className="bg-amber-100/50 rounded-[0.5px] flex items-center justify-center aspect-square">
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
  const hasCustomIcon = Boolean(customIcon)
  
  if (hasCustomIcon) {
    return (
      <img
        src={customIcon}
        className="w-full h-full object-cover rounded-[0.5px] aspect-square"
        alt=""
        loading="lazy"
        decoding="async"
      />
    )
  }
  
  return (
    <Favicon
      url={bookmark.url || ''}
      size={6}
      className="w-full h-full object-cover rounded-[0.5px] aspect-square"
    />
  )
}

/**
 * 超小图标组件（用于子文件夹预览中的 2x2 网格）
 * 支持显示嵌套文件夹内的图标预览
 */
function MiniIcon({ bookmark, nestedItems }: { bookmark: Bookmark; nestedItems?: Bookmark[] }) {
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
          return <TinyIcon key={child.id} bookmark={child} />
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
  const hasCustomIcon = Boolean(customIcon)
  
  if (hasCustomIcon) {
    return (
      <img
        src={customIcon}
        className="w-full h-full object-cover rounded-[1px]"
        alt=""
        loading="lazy"
        decoding="async"
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
 * 文件夹预览中的小图标组件
 * 支持显示书签图标或子文件夹预览
 */
function FolderPreviewIcon({ bookmark, subFolderItems, allItems }: { bookmark: Bookmark; subFolderItems?: Bookmark[]; allItems?: Bookmark[] }) {
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
            return <MiniIcon key={child.id} bookmark={child} nestedItems={nestedItems} />
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
  const hasCustomIcon = Boolean(customIcon)
  
  return (
    <div className="w-full pt-[100%] relative bg-black/10 rounded-[2px] overflow-hidden">
      {hasCustomIcon ? (
        <img
          src={customIcon}
          className="absolute inset-0 w-full h-full object-cover"
          alt=""
          loading="lazy"
          decoding="async"
        />
      ) : bookmark.url ? (
        <Favicon
          url={bookmark.url}
          size={16}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <Folder className="absolute inset-0 w-full h-full p-0.5 text-amber-500" />
      )}
    </div>
  )
}

type BookmarkIconProps = {
  bookmark: Bookmark
  allItems: Bookmark[]
  userId?: string
  context?: BookmarkContext
  /** 是否显示合并候选/目标样式 */
  showCombine?: boolean
  isCombineTarget?: boolean
  isCombineCandidate?: boolean
  /** Dock 模式样式 */
  dockMode?: boolean
  /** 自定义图标是否失败（用于 fallback） */
  customIconFailed?: boolean
  /** 自定义图标加载失败回调 */
  onCustomIconError?: () => void
}

/**
 * 书签图标渲染组件
 * 支持文件夹预览、自定义图标、Favicon、首字母 fallback
 */
export function BookmarkIcon({
  bookmark: b,
  allItems,
  userId,
  context = 'shortcut',
  showCombine = false,
  isCombineTarget = false,
  isCombineCandidate = false,
  dockMode = false,
  customIconFailed = false,
  onCustomIconError,
}: BookmarkIconProps) {
  const isFolder = b.type === 'FOLDER'
  const folderItems = isFolder 
    ? getSortedFolderChildren(allItems.filter(x => x.parentId === b.id), userId, b.id, context).slice(0, 9) 
    : []

  // 计算样式
  const iconRing = isCombineTarget
    ? 'ring-2 ring-primary ring-offset-2'
    : isCombineCandidate
      ? 'ring-2 ring-primary/60 ring-offset-2'
      : ''
  
  const dockIconClass = dockMode 
    ? 'group-hover:scale-125 group-hover:-translate-y-3' 
    : ''

  // 自定义图标逻辑
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
  const showCustomIcon = hasCustomIcon && !customIconFailed

  // 计算图标背景样式
  const getIconBgStyle = (): { className: string; style?: React.CSSProperties } => {
    // 文件夹使用固定样式
    if (isFolder) {
      return {
        className: dockMode 
          ? 'bg-white/30 dark:bg-white/10 border border-white/40 dark:border-white/20 p-[2px]'
          : 'bg-glass/20 border border-glass-border/20 p-[2px]'
      }
    }
    
    // Dock 模式使用固定样式
    if (dockMode) {
      return { className: 'bg-white/40 dark:bg-white/15' }
    }
    
    // 书签页：根据 iconBg 设置背景
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
      const blurIntensity = blurMatch ? parseInt(blurMatch[1]) : 70
      
      const blurPx = Math.round(blurIntensity / 10)
      const bgOpacity = blurIntensity / 100 * 0.7
      
      // 毛玻璃效果：白色半透明背景 + 可选的主题色叠加
      const baseStyle: React.CSSProperties = {
        backdropFilter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
        WebkitBackdropFilter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
      }
      
      if (usePrimary) {
        return { 
          className: 'bg-primary/20',
          style: {
            ...baseStyle,
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
    <div
      className={cn(
        'bookmark-icon h-12 w-12 overflow-hidden grid place-items-center transition-all duration-200 relative',
        dockMode ? 'rounded-xl' : 'rounded-[var(--start-radius)]',
        iconBgStyle.className,
        iconRing,
        showCombine && 'scale-[1.03]',
        dockIconClass,
      )}
      style={iconBgStyle.style}
    >
      {/* 叠加创建收藏夹：在目标图标上显示"文件夹框"覆盖提示 */}
      {showCombine && !isFolder ? (
        <div className={cn(
          'absolute inset-0 bg-glass/25 border border-primary/60 grid place-items-center',
          dockMode ? 'rounded-xl' : 'rounded-[var(--start-radius)]'
        )}>
          <Folder className="w-5 h-5 text-primary" />
        </div>
      ) : null}

      <div className={cn('absolute inset-0', showCombine && !isFolder ? 'opacity-15' : 'opacity-100')}>
        {isFolder ? (
          <div className="grid grid-cols-3 gap-0.5 w-full h-full content-start p-[8%]">
            {folderItems.map((sub) => {
              // 如果是子文件夹，获取其子项
              const subFolderItems = sub.type === 'FOLDER'
                ? allItems.filter(x => x.parentId === sub.id).slice(0, 4)
                : undefined
              return (
                <FolderPreviewIcon key={sub.id} bookmark={sub} subFolderItems={subFolderItems} allItems={allItems} />
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
                onError={onCustomIconError}
              />
            ) : (
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
  )
}

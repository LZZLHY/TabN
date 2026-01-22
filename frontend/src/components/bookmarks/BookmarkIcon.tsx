import { Folder } from 'lucide-react'
import { cn } from '../../utils/cn'
import { Favicon } from '../Favicon'
import { getSortedFolderChildren } from './folderOperations'
import type { Bookmark } from './types'
import type { BookmarkContext } from '../../types/bookmark'

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
    if (b.iconType === 'URL' && b.iconUrl) {
      customIconSrc = b.iconUrl
    } else if (b.iconType === 'BASE64' && b.iconData) {
      customIconSrc = b.iconData
    }
  }
  const hasCustomIcon = Boolean(customIconSrc)
  const showCustomIcon = hasCustomIcon && !customIconFailed

  return (
    <div
      className={cn(
        'bookmark-icon h-12 w-12 overflow-hidden grid place-items-center transition-all duration-200 relative',
        dockMode ? 'rounded-xl' : 'rounded-[var(--start-radius)]',
        isFolder
          ? dockMode 
            ? 'bg-white/30 dark:bg-white/10 border border-white/40 dark:border-white/20 p-[2px]'
            : 'bg-glass/20 border border-glass-border/20 p-[2px]'
          : dockMode
            ? 'bg-white/40 dark:bg-white/15'
            : showCustomIcon
              ? 'bg-white/70'
              : 'bg-primary/15 text-primary font-semibold',
        iconRing,
        showCombine && 'scale-[1.03]',
        dockIconClass,
      )}
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
          <div className="grid grid-cols-3 gap-0.5 w-full h-full content-start">
            {folderItems.map((sub) => {
              // 检查子项自定义图标
              let subIcon = ''
              if (sub.iconType === 'URL' && sub.iconUrl) {
                subIcon = sub.iconUrl
              } else if (sub.iconType === 'BASE64' && sub.iconData) {
                subIcon = sub.iconData
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
                      name={sub.name}
                      size={16}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : null}
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

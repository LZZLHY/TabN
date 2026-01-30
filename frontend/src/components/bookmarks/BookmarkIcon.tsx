import { Folder } from 'lucide-react'
import { cn } from '../../utils/cn'
import { getSortedFolderChildren } from './folderOperations'
import { FolderPreviewIcon } from './FolderPreviewIcon'
import { UnifiedIcon, type IconData } from '../ui/UnifiedIcon'
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
 * 
 * 使用 UnifiedIcon 组件进行图标渲染，确保所有图标类型正确显示
 * 使用 FolderPreviewIcon 组件进行文件夹预览渲染
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
    // 判断是否有自定义图标
    const hasCustomIcon = Boolean(
      (b.iconType === 'BASE64' && b.iconData) || 
      b.iconUrl || 
      b.iconType === 'TEXT'
    )
    if (hasCustomIcon && !customIconFailed) {
      return { className: 'bg-white/70' }
    }
    return { className: 'bg-primary/15 text-primary font-semibold' }
  }
  
  const iconBgStyle = getIconBgStyle()

  // 将 Bookmark 转换为 IconData 格式
  const convertToIconData = (bookmark: Bookmark): IconData & { id: string; type: string; parentId: string | null } => ({
    id: bookmark.id,
    type: bookmark.type,
    parentId: bookmark.parentId,
    iconType: bookmark.iconType,
    iconData: bookmark.iconData,
    iconUrl: bookmark.iconUrl,
    iconBg: bookmark.iconBg,
    url: bookmark.url,
    name: bookmark.name,
  })

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
          // 文件夹使用 FolderPreviewIcon 组件
          <FolderPreviewIcon
            children={folderItems.map(convertToIconData)}
            allItems={allItems.map(convertToIconData)}
            variant="full"
            size={48}
            borderRadius="var(--start-radius)"
            className="w-full h-full"
          />
        ) : (
          // 普通书签使用 UnifiedIcon 组件
          <UnifiedIcon
            iconType={b.iconType}
            iconData={b.iconData}
            iconUrl={b.iconUrl}
            iconBg={b.iconBg}
            url={b.url}
            name={b.name}
            variant="full"
            size={48}
            borderRadius="var(--start-radius)"
            className="h-full w-full"
            onError={onCustomIconError}
          />
        )}
      </div>
    </div>
  )
}

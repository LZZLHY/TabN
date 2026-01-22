import { cn } from '../../utils/cn'

export interface TagFilterProps {
  /** All available tags */
  tags: string[]
  /** Currently selected tag (null means "All") */
  selectedTag: string | null
  /** Callback when a tag is selected */
  onSelectTag: (tag: string | null) => void
  /** Additional class names */
  className?: string
}

/**
 * Tag filter component for filtering bookmarks by tag.
 * Displays all available tags as clickable chips with an "All" option to clear the filter.
 * 
 * Requirements: 2.1 - WHEN 用户点击某个标签时 THEN Bookmark_System SHALL 显示所有包含该标签的书签
 */
export function TagFilter({
  tags,
  selectedTag,
  onSelectTag,
  className,
}: TagFilterProps) {
  // Don't render if there are no tags
  if (tags.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1',
        className
      )}
    >
      {/* "All" option to clear filter */}
      <button
        type="button"
        onClick={() => onSelectTag(null)}
        className={cn(
          'shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-all',
          'border backdrop-blur-sm',
          selectedTag === null
            ? 'bg-primary/20 text-primary border-primary/30'
            : 'bg-glass/10 text-fg/70 border-glass-border/20 hover:bg-glass/20 hover:text-fg'
        )}
      >
        全部
      </button>

      {/* Tag chips */}
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => onSelectTag(tag)}
          className={cn(
            'shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-all',
            'border backdrop-blur-sm',
            selectedTag === tag
              ? 'bg-primary/20 text-primary border-primary/30'
              : 'bg-glass/10 text-fg/70 border-glass-border/20 hover:bg-glass/20 hover:text-fg'
          )}
        >
          {tag}
        </button>
      ))}
    </div>
  )
}

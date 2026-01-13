import { Clock } from '../../components/Clock'
import { BookmarkGrid } from '../../components/BookmarkGrid'
import { SearchBox } from '../../components/SearchBox'
import { BookmarkDrawer } from '../../components/BookmarkDrawer'
import { useBookmarkDrawerStore } from '../../stores/bookmarkDrawer'
import { useSearchFocusStore } from '../../stores/searchFocus'
import { cn } from '../../utils/cn'

export function HomePage() {
  const drawerOpen = useBookmarkDrawerStore((s) => s.open)
  const setDrawerOpen = useBookmarkDrawerStore((s) => s.setOpen)
  const searchFocused = useSearchFocusStore((s) => s.isFocused)

  return (
    <div className="w-full flex flex-col items-center justify-center gap-2 sm:gap-3 -translate-y-12">
      {/* 时钟 - 搜索聚焦时保持清晰 */}
      <div className="relative z-50">
        <Clock />
      </div>

      {/* 搜索框 - 搜索聚焦时保持清晰，w-full 保持居中布局 */}
      <div className="relative z-50 w-full flex justify-center">
        <SearchBox className="w-[min(640px,100%)]" />
      </div>

      {/* 书签网格 - 搜索聚焦时模糊 */}
      <div
        className={cn(
          'transition-all duration-500 ease-out',
          searchFocused && 'blur-sm opacity-60 pointer-events-none',
        )}
      >
        <BookmarkGrid />
      </div>
      
      {/* 书签抽屉 */}
      <BookmarkDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}







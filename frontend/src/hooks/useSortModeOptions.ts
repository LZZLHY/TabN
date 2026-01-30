import { ArrowDownAZ, FolderUp, FolderDown, GripVertical, MousePointerClick, Tag } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { createElement } from 'react'
import type { SelectOption } from '../components/ui/Select'
import type { SortMode } from '../types/bookmark'

/**
 * 动态生成排序选项（支持 i18n）
 */
export function useSortModeOptions(): SelectOption<SortMode>[] {
  const { t } = useTranslation()
  return [
    { value: 'custom', label: t('bookmarks.sortCustom'), icon: createElement(GripVertical, { className: 'w-4 h-4' }), tooltip: t('bookmarks.sortCustomHint') },
    { value: 'folders-first', label: t('bookmarks.sortFoldersFirst'), icon: createElement(FolderUp, { className: 'w-4 h-4' }), tooltip: t('bookmarks.sortFoldersFirstHint') },
    { value: 'links-first', label: t('bookmarks.sortLinksFirst'), icon: createElement(FolderDown, { className: 'w-4 h-4' }), tooltip: t('bookmarks.sortLinksFirstHint') },
    { value: 'alphabetical', label: t('bookmarks.sortAlphabetical'), icon: createElement(ArrowDownAZ, { className: 'w-4 h-4' }), tooltip: t('bookmarks.sortAlphabeticalHint') },
    { value: 'click-count', label: t('bookmarks.sortClickCount'), icon: createElement(MousePointerClick, { className: 'w-4 h-4' }), tooltip: t('bookmarks.sortClickCountHint') },
    { value: 'by-tag', label: t('bookmarks.sortByTag'), icon: createElement(Tag, { className: 'w-4 h-4' }), tooltip: t('bookmarks.sortByTagHint') },
  ]
}

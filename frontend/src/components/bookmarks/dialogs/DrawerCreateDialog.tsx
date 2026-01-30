import { createPortal } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../../utils/cn'
import { Button } from '../../ui/Button'
import { Input } from '../../ui/Input'
import { TagInput } from '../../ui/TagInput'
import { normalizeUrl } from '../../../utils/url'
import type { BookmarkType } from '../types'

type TitleFetchState = {
  loading: boolean
  title: string | null
  fallback: string | null
  fetchTitle: (url: string) => void
  reset: () => void
}

type DrawerCreateDialogProps = {
  open: boolean
  isClosing: boolean
  parentId: string | null
  // Form state
  createType: BookmarkType
  setCreateType: (type: BookmarkType) => void
  createUrl: string
  setCreateUrl: (url: string) => void
  createName: string
  setCreateName: (name: string) => void
  createNameSource: 'user' | 'auto' | 'none'
  setCreateNameSource: (source: 'user' | 'auto' | 'none') => void
  createNote: string
  setCreateNote: (note: string) => void
  createTags: string[]
  setCreateTags: (tags: string[]) => void
  // Helpers
  titleFetch: TitleFetchState
  allTags: string[]
  // Callbacks
  onCloseWithReset: () => void
  onCreate: () => void
}

/**
 * 书签页创建对话框
 */
export function DrawerCreateDialog({
  open,
  isClosing,
  parentId,
  createType,
  setCreateType,
  createUrl,
  setCreateUrl,
  createName,
  setCreateName,
  createNameSource,
  setCreateNameSource,
  createNote,
  setCreateNote,
  createTags,
  setCreateTags,
  titleFetch,
  allTags,
  onCloseWithReset,
  onCreate,
}: DrawerCreateDialogProps) {
  const { t } = useTranslation()
  
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
      <div 
        className={`absolute inset-0 bg-black/40 ${isClosing ? 'backdrop-exit' : 'backdrop-enter'}`} 
        onClick={onCloseWithReset} 
      />
      <div className={`relative w-full max-w-sm glass-modal rounded-[var(--start-radius)] p-6 shadow-2xl space-y-4 ${isClosing ? 'modal-exit' : 'modal-enter'}`}>
        <h3 className="font-semibold text-lg">{parentId ? t('bookmarks.addToFolder') : t('bookmarks.createNew')}</h3>
        
        <div className="flex gap-2 bg-glass/5 p-1 rounded-xl">
          <button 
            className={cn("flex-1 py-1.5 text-xs font-medium rounded-lg transition-all", createType === 'LINK' ? "bg-white/20 shadow-sm text-fg" : "text-fg/50")} 
            onClick={() => { setCreateType('LINK'); titleFetch.reset(); }}
          >
            {t('bookmarks.typeLink')}
          </button>
          <button 
            className={cn("flex-1 py-1.5 text-xs font-medium rounded-lg transition-all", createType === 'FOLDER' ? "bg-white/20 shadow-sm text-fg" : "text-fg/50")} 
            onClick={() => { setCreateType('FOLDER'); titleFetch.reset(); }}
          >
            {t('bookmarks.typeFolder')}
          </button>
        </div>

        {createType === 'LINK' && (
          <div className="space-y-1">
            <label className="text-xs text-fg/60">{t('bookmarks.url')}</label>
            <Input 
              value={createUrl} 
              onChange={e => {
                const val = e.target.value
                setCreateUrl(val)
                if (val.trim()) {
                  titleFetch.fetchTitle(val)
                } else {
                  titleFetch.reset()
                  if (createNameSource === 'auto') {
                    setCreateName('')
                    setCreateNameSource('none')
                  }
                }
              }}
              onBlur={() => {
                const n = normalizeUrl(createUrl)
                if (n) {
                  setCreateUrl(n)
                  titleFetch.fetchTitle(n)
                }
                if (createNameSource === 'none' && (titleFetch.title || titleFetch.fallback)) {
                  setCreateName(titleFetch.title || titleFetch.fallback || '')
                  setCreateNameSource('auto')
                }
              }}
              placeholder="example.com" 
              autoFocus
            />
          </div>
        )}

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <label className="text-xs text-fg/60">{createType === 'FOLDER' ? t('bookmarks.name') : t('bookmarks.nameOptional')}</label>
            {titleFetch.loading && createType === 'LINK' && (
              <Loader2 className="w-3 h-3 animate-spin text-fg/40" />
            )}
          </div>
          <Input 
            value={createName} 
            onChange={e => {
              setCreateName(e.target.value)
              if (e.target.value.trim()) {
                setCreateNameSource('user')
              }
            }}
            placeholder={createType === 'LINK' ? (titleFetch.fallback || t('bookmarks.autoOrManual')) : ''}
            autoFocus={createType === 'FOLDER'}
          />
        </div>
        
        <div className="space-y-1">
          <label className="text-xs text-fg/60">{t('bookmarks.note')}</label>
          <Input value={createNote} onChange={e => setCreateNote(e.target.value)} />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-fg/60">{t('bookmarks.tags')}</label>
          <TagInput
            value={createTags}
            onChange={setCreateTags}
            suggestions={allTags}
            placeholder={t('bookmarks.tagsPlaceholder')}
          />
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Button variant="ghost" onClick={onCloseWithReset}>{t('common.cancel')}</Button>
          <Button variant="primary" onClick={onCreate}>{t('common.create')}</Button>
        </div>
      </div>
    </div>,
    document.body
  )
}

/**
 * 图标预设选择器组件
 * Requirements: 3.1, 3.2, 4.1, 5.1, 6.1, 6.2, 6.3
 */
import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Trash2, X, Check, Loader2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { apiFetch } from '../../services/api'
import { cn } from '../../utils/cn'
import { UnifiedIcon } from '../ui/UnifiedIcon'
import type { IconPreset } from '@start/shared'
import type { IconType } from '@start/shared'

/** 最大预设数量 */
const MAX_PRESETS = 8

/** 预设选择器属性 */
interface PresetSelectorProps {
  /** 认证 token */
  token: string | null
  /** 书签 ID */
  bookmarkId: string
  /** 应用预设回调 */
  onApply: (preset: IconPreset) => void
  /** 当前图标配置 */
  currentConfig: {
    iconType: IconType | null
    iconData: string | null
    iconUrl: string | null
    iconBg: string | null
  }
  /** 书签名称（用于文字图标默认文字） */
  bookmarkName: string
  /** 书签 URL（用于文字图标默认文字） */
  bookmarkUrl: string
  /** 刷新键，变化时重新加载预设列表 */
  refreshKey?: number
}

/** 右键菜单位置 */
interface ContextMenuPosition {
  x: number
  y: number
  presetId: string
  presetName: string
}

/**
 * 图标预设选择器
 */
export function PresetSelector({
  token,
  bookmarkId,
  onApply,
  currentConfig,
  bookmarkName,
  bookmarkUrl,
  refreshKey,
}: PresetSelectorProps) {
  const { t } = useTranslation()
  const [presets, setPresets] = useState<IconPreset[]>([])
  const [loading, setLoading] = useState(false)
  const [showNameDialog, setShowNameDialog] = useState(false)
  const [newPresetName, setNewPresetName] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<ContextMenuPosition | null>(null)
  
  // 重命名对话框状态
  const [renameDialog, setRenameDialog] = useState<{ id: string; name: string } | null>(null)
  const [renaming, setRenaming] = useState(false)

  // 加载预设列表
  const loadPresets = useCallback(async () => {
    if (!token || !bookmarkId) return
    
    setLoading(true)
    try {
      const resp = await apiFetch<{ items: IconPreset[] }>(`/api/presets?bookmarkId=${bookmarkId}`, {
        token,
        silent: true,
      })
      if (resp.ok) {
        setPresets(resp.data.items)
      }
    } catch {
      // 静默处理错误
    } finally {
      setLoading(false)
    }
  }, [token, bookmarkId])

  // 初始加载
  useEffect(() => {
    loadPresets()
  }, [loadPresets, refreshKey])

  // 点击其他地方关闭右键菜单
  useEffect(() => {
    if (!contextMenu) return
    
    const handleClick = (e: MouseEvent) => {
      // 检查点击是否在右键菜单内部，如果是则不关闭
      const target = e.target as HTMLElement
      if (target.closest('[data-preset-context-menu]')) {
        return
      }
      setContextMenu(null)
    }
    const handleContextMenu = () => setContextMenu(null)
    
    // 延迟添加监听器，避免立即触发
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClick)
      document.addEventListener('contextmenu', handleContextMenu)
    }, 0)
    
    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleClick)
      document.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [contextMenu])

  // 添加预设
  const handleAddPreset = async () => {
    if (!token) {
      toast.error(t('toast.pleaseLogin'))
      return
    }

    const name = newPresetName.trim()
    if (!name) {
      toast.error(t('presets.nameRequired'))
      return
    }

    if (name.length > 50) {
      toast.error(t('presets.nameTooLong'))
      return
    }

    setSaving(true)
    try {
      const resp = await apiFetch<{ item: IconPreset }>('/api/presets', {
        method: 'POST',
        token,
        body: JSON.stringify({
          bookmarkId,
          name,
          iconType: currentConfig.iconType,
          iconData: currentConfig.iconData,
          iconUrl: currentConfig.iconUrl,
          iconBg: currentConfig.iconBg,
        }),
      })

      if (resp.ok) {
        toast.success(t('presets.saved'))
        setPresets([resp.data.item, ...presets])
        setShowNameDialog(false)
        setNewPresetName('')
      } else {
        toast.error(resp.message || t('toast.operationFailed'))
      }
    } catch {
      toast.error(t('toast.operationFailed'))
    } finally {
      setSaving(false)
    }
  }

  // 删除预设
  const handleDeletePreset = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setContextMenu(null)
    
    if (!token) return

    setDeletingId(id)
    try {
      const resp = await apiFetch<{ id: string }>(`/api/presets/${id}`, {
        method: 'DELETE',
        token,
      })

      if (resp.ok) {
        toast.success(t('presets.deleted'))
        setPresets(presets.filter(p => p.id !== id))
      } else {
        toast.error(resp.message || t('toast.operationFailed'))
      }
    } catch {
      toast.error(t('toast.operationFailed'))
    } finally {
      setDeletingId(null)
    }
  }

  // 重命名预设
  const handleRenamePreset = async () => {
    if (!token || !renameDialog) return

    const name = renameDialog.name.trim()
    if (!name) {
      toast.error(t('presets.nameRequired'))
      return
    }

    if (name.length > 50) {
      toast.error(t('presets.nameTooLong'))
      return
    }

    setRenaming(true)
    try {
      const resp = await apiFetch<{ item: IconPreset }>(`/api/presets/${renameDialog.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ name }),
      })

      if (resp.ok) {
        toast.success(t('presets.renamed'))
        setPresets(presets.map(p => p.id === renameDialog.id ? { ...p, name } : p))
        setRenameDialog(null)
      } else {
        toast.error(resp.message || t('toast.operationFailed'))
      }
    } catch {
      toast.error(t('toast.operationFailed'))
    } finally {
      setRenaming(false)
    }
  }

  // 右键菜单
  const handleContextMenu = (e: React.MouseEvent, preset: IconPreset) => {
    e.preventDefault()
    e.stopPropagation()
    
    // 计算菜单位置，确保不超出视口
    const menuWidth = 120
    const menuHeight = 80
    let x = e.clientX
    let y = e.clientY
    
    // 防止菜单超出右边界
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 8
    }
    // 防止菜单超出下边界
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 8
    }
    
    setContextMenu({
      x,
      y,
      presetId: preset.id,
      presetName: preset.name,
    })
  }

  // 打开重命名对话框
  const openRenameDialog = () => {
    if (contextMenu) {
      setRenameDialog({ id: contextMenu.presetId, name: contextMenu.presetName })
      setContextMenu(null)
    }
  }

  // 应用预设
  const handleApplyPreset = (preset: IconPreset) => {
    onApply(preset)
  }

  // 未登录或无书签 ID 时不显示
  if (!token || !bookmarkId) return null

  return (
    <div className="space-y-2">
      {/* 标题和添加按钮 */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-fg/80">{t('presets.title')}</span>
        <button
          type="button"
          onClick={() => {
            if (presets.length >= MAX_PRESETS) {
              toast.error(t('presets.limitReached'))
              return
            }
            setShowNameDialog(true)
          }}
          disabled={loading}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all',
            'bg-glass/20 text-fg/70 hover:bg-glass/30 hover:text-fg'
          )}
        >
          <Plus className="w-3.5 h-3.5" />
          {t('presets.add')}
        </button>
      </div>

      {/* 预设列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 text-fg/40 animate-spin" />
        </div>
      ) : presets.length === 0 ? (
        <div className="text-center py-4 text-sm text-fg/40">
          {t('presets.empty')}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className={cn(
                'relative group flex flex-col items-center gap-1 p-2 rounded-xl transition-all cursor-pointer',
                'bg-glass/10 hover:bg-glass/20'
              )}
              onClick={() => handleApplyPreset(preset)}
              onContextMenu={(e) => handleContextMenu(e, preset)}
            >
              {/* 图标预览 */}
              <UnifiedIcon
                iconType={preset.iconType}
                iconData={preset.iconData}
                iconUrl={preset.iconUrl}
                iconBg={preset.iconBg}
                url={bookmarkUrl}
                name={bookmarkName}
                size={40}
                borderRadius={8}
              />

              {/* 预设名称 */}
              <span className="text-xs text-fg/70 truncate w-full text-center">
                {preset.name}
              </span>

              {/* 删除按钮 */}
              <button
                type="button"
                onClick={(e) => handleDeletePreset(preset.id, e)}
                disabled={deletingId === preset.id}
                className={cn(
                  'absolute -top-1 -right-1 p-1 rounded-full transition-all',
                  'bg-red-500 text-white opacity-0 group-hover:opacity-100',
                  'hover:bg-red-600'
                )}
              >
                {deletingId === preset.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 预设数量提示 */}
      {presets.length > 0 && (
        <div className="text-xs text-fg/40 text-right">
          {presets.length}/{MAX_PRESETS}
        </div>
      )}

      {/* 右键菜单 - 使用 Portal 渲染到 body */}
      {contextMenu && createPortal(
        <div
          data-preset-context-menu
          className="fixed z-[300] py-1 min-w-[120px] glass-panel-strong rounded-lg border border-glass-border/25 shadow-xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={openRenameDialog}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-fg/80 hover:bg-glass/20 transition-colors"
          >
            <Pencil className="w-4 h-4" />
            {t('presets.rename')}
          </button>
          <button
            type="button"
            onClick={() => handleDeletePreset(contextMenu.presetId)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-500 hover:bg-glass/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            {t('common.delete')}
          </button>
        </div>,
        document.body
      )}

      {/* 命名对话框 */}
      {showNameDialog && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          onClick={() => setShowNameDialog(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-xs glass-panel-strong rounded-xl border border-glass-border/25 shadow-xl p-4 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-fg">{t('presets.nameTitle')}</h4>
              <button
                type="button"
                onClick={() => setShowNameDialog(false)}
                className="p-1 rounded-lg hover:bg-glass/20 transition-colors"
              >
                <X className="w-4 h-4 text-fg/60" />
              </button>
            </div>

            <input
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder={t('presets.namePlaceholder')}
              maxLength={50}
              autoFocus
              className="w-full px-3 py-2 rounded-lg bg-glass/20 border border-glass-border/20 text-sm text-fg placeholder:text-fg/40"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !saving) {
                  handleAddPreset()
                }
              }}
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNameDialog(false)}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg text-sm text-fg/70 hover:bg-glass/20 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleAddPreset}
                disabled={saving || !newPresetName.trim()}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors',
                  'bg-primary text-white hover:bg-primary/90',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 重命名对话框 */}
      {renameDialog && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          onClick={() => setRenameDialog(null)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-xs glass-panel-strong rounded-xl border border-glass-border/25 shadow-xl p-4 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-fg">{t('presets.renameTitle')}</h4>
              <button
                type="button"
                onClick={() => setRenameDialog(null)}
                className="p-1 rounded-lg hover:bg-glass/20 transition-colors"
              >
                <X className="w-4 h-4 text-fg/60" />
              </button>
            </div>

            <input
              type="text"
              value={renameDialog.name}
              onChange={(e) => setRenameDialog({ ...renameDialog, name: e.target.value })}
              placeholder={t('presets.namePlaceholder')}
              maxLength={50}
              autoFocus
              className="w-full px-3 py-2 rounded-lg bg-glass/20 border border-glass-border/20 text-sm text-fg placeholder:text-fg/40"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !renaming) {
                  handleRenamePreset()
                }
              }}
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenameDialog(null)}
                disabled={renaming}
                className="px-3 py-1.5 rounded-lg text-sm text-fg/70 hover:bg-glass/20 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleRenamePreset}
                disabled={renaming || !renameDialog.name.trim()}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors',
                  'bg-primary text-white hover:bg-primary/90',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {renaming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useCallback, useEffect, useLayoutEffect } from 'react'
import { X, Check, Plus, ChevronUp } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'
import { isValidSearchUrl, PRESET_SEARCH_ENGINES } from '../../utils/searchEngine'
import type { SearchEngineConfig } from '../../utils/searchEngine'
import { useAppearanceStore } from '../../stores/appearance'
import type { SyncedIconInfo } from '../../services/iconSyncService'
import { UnifiedIcon } from '../ui/UnifiedIcon'
import { calculateProportionalRadius } from '../../utils/iconRadius'

export interface AddEngineDialogProps {
  /** 是否显示 */
  isOpen: boolean
  /** 关闭回调 */
  onClose: () => void
  /** 切换引擎启用状态 */
  onToggleEngine?: (engineId: string) => void
  /** 保存自定义引擎回调 */
  onSaveCustom?: (engine: Omit<SearchEngineConfig, 'id' | 'isPreset'>) => void
  /** 获取引擎的同步图标信息 */
  getSyncedIcon?: (engineDomain: string) => SyncedIconInfo | null
  /** 全局背景设置 */
  globalBg?: string | null
  /** 面板可容纳的最大引擎数量 */
  maxEngineCount?: number
  /** 图标自定义尺寸 */
  iconSize?: number
}

/** 动画持续时间（毫秒） */
const ANIMATION_DURATION = 250

/**
 * 搜索引擎管理弹窗
 * 两列卡片布局，毛玻璃背景
 * 使用比例化圆角计算
 */
export function AddEngineDialog({
  isOpen,
  onClose,
  onToggleEngine,
  onSaveCustom,
  getSyncedIcon,
  globalBg,
  maxEngineCount = 8,
  iconSize = 40,
}: AddEngineDialogProps) {
  const { t } = useTranslation()
  const accent = useAppearanceStore((s) => s.accent)
  const enabledEngineIds = useAppearanceStore((s) => s.enabledEngineIds)
  const iconRadiusRatio = useAppearanceStore((s) => s.iconRadiusRatio)
  
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customUrl, setCustomUrl] = useState('')
  const [customIconUrl, setCustomIconUrl] = useState('')
  const [errors, setErrors] = useState<{ name?: string; url?: string }>({})
  
  // 动画状态：控制是否渲染 DOM 和动画类名
  // shouldRender 使用 useLayoutEffect 同步更新，避免闪烁
  const [shouldRender, setShouldRender] = useState(isOpen)
  const [isAnimating, setIsAnimating] = useState(false)

  const enabledCount = enabledEngineIds.length
  const isMaxReached = enabledCount >= maxEngineCount

  // 同步更新 shouldRender（打开时立即渲染 DOM）
  useLayoutEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 动画需要同步更新 DOM 渲染状态
      setShouldRender(true)
    }
  }, [isOpen])

  // 处理动画状态
  useEffect(() => {
    if (isOpen) {
      // 打开：触发进入动画
      const rafId = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true)
        })
      })
      return () => cancelAnimationFrame(rafId)
    } else {
      // 关闭：先触发退出动画，再移除 DOM
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 动画需要同步更新状态
      setIsAnimating(false)
      const timer = setTimeout(() => {
        setShouldRender(false)
      }, ANIMATION_DURATION)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const extractDomainFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url.replace('{query}', 'test'))
      let hostname = urlObj.hostname.toLowerCase()
      if (hostname.startsWith('www.')) {
        hostname = hostname.slice(4)
      }
      return hostname
    } catch {
      return ''
    }
  }

  const isEngineEnabled = useCallback((engineId: string) => {
    return enabledEngineIds.includes(engineId)
  }, [enabledEngineIds])

  const handleToggleEngine = useCallback((engine: SearchEngineConfig) => {
    const enabled = isEngineEnabled(engine.id)
    if (!enabled && isMaxReached) return
    onToggleEngine?.(engine.id)
  }, [onToggleEngine, isEngineEnabled, isMaxReached])

  const validateCustomForm = useCallback((): boolean => {
    const newErrors: { name?: string; url?: string } = {}

    if (!customName.trim()) {
      newErrors.name = t('settings.engineDialog.errors.nameRequired')
    }

    if (!customUrl.trim()) {
      newErrors.url = t('settings.engineDialog.errors.urlRequired')
    } else if (!isValidSearchUrl(customUrl)) {
      newErrors.url = t('settings.engineDialog.errors.urlInvalid')
    } else {
      try {
        new URL(customUrl.replace('{query}', 'test'))
      } catch {
        newErrors.url = t('settings.engineDialog.errors.urlMalformed')
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [customName, customUrl, t])

  const handleSubmitCustom = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateCustomForm()) return

    const domain = extractDomainFromUrl(customUrl)
    
    onSaveCustom?.({
      name: customName.trim(),
      urlTemplate: customUrl.trim(),
      domain,
      iconUrl: customIconUrl.trim() || undefined,
    })

    setCustomName('')
    setCustomUrl('')
    setCustomIconUrl('')
    setErrors({})
    setShowCustomForm(false)
  }, [customName, customUrl, customIconUrl, validateCustomForm, onSaveCustom])

  const handleClose = useCallback(() => {
    setCustomName('')
    setCustomUrl('')
    setCustomIconUrl('')
    setErrors({})
    setShowCustomForm(false)
    onClose()
  }, [onClose])

  if (!shouldRender) return null

  const dialogContent = (
    <div data-engine-dialog="true" className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div 
        className={cn(
          'absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity',
          isAnimating ? 'opacity-100' : 'opacity-0',
        )}
        style={{ transitionDuration: `${ANIMATION_DURATION}ms` }}
        onClick={handleClose}
      />
      
      {/* 弹窗内容 */}
      <div 
        className={cn(
          'relative w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl',
          'bg-glass/95 backdrop-blur-xl border border-glass-border/30',
          'flex flex-col',
          'transition-all ease-out',
          isAnimating 
            ? 'opacity-100 scale-100 translate-y-0' 
            : 'opacity-0 scale-95 translate-y-4',
        )}
        style={{ transitionDuration: `${ANIMATION_DURATION}ms` }}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-glass-border/20">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-medium text-fg">{t('settings.engineDialog.title')}</h3>
            <span className={cn(
              'text-sm',
              isMaxReached ? 'text-amber-400' : 'text-fg/60',
            )}>
              {t('settings.engineDialog.maxCount', { max: maxEngineCount, count: enabledCount })}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-fg/60" />
          </button>
        </div>

        {/* 引擎网格 - 两列布局 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-3">
            {PRESET_SEARCH_ENGINES.map((engine) => {
              const enabled = isEngineEnabled(engine.id)
              const syncedIcon = getSyncedIcon?.(engine.domain) ?? null
              const isLocked = !enabled && isMaxReached
              
              return (
                <button
                  key={engine.id}
                  type="button"
                  onClick={() => handleToggleEngine(engine)}
                  disabled={isLocked}
                  className={cn(
                    'relative flex items-center gap-3 p-3 rounded-xl transition-all duration-200',
                    'bg-white/5 backdrop-blur-sm',
                    'border-2',
                    enabled
                      ? 'border-current hover:bg-white/10'
                      : isLocked
                        ? 'border-transparent opacity-40 cursor-not-allowed'
                        : 'border-transparent hover:bg-white/10 hover:border-white/20',
                  )}
                  style={enabled ? { borderColor: accent } : undefined}
                >
                  {/* 图标 - 使用 UnifiedIcon */}
                  <UnifiedIcon
                    iconType={syncedIcon?.iconType}
                    iconData={syncedIcon?.iconData}
                    iconUrl={syncedIcon?.iconUrl || engine.iconUrl}
                    iconBg={syncedIcon?.iconBg || globalBg}
                    url={`https://${engine.domain}`}
                    name={engine.name}
                    size={iconSize}
                    borderRadius={calculateProportionalRadius(iconSize, iconRadiusRatio)}
                    className="flex-shrink-0"
                  />

                  {/* 名称和 URL */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className={cn(
                      'text-sm font-medium truncate',
                      enabled ? 'text-fg' : 'text-fg/70',
                    )}>
                      {engine.name}
                    </div>
                    <div className="text-xs text-fg/40 truncate">
                      {engine.urlTemplate.replace('{query}', '')}
                    </div>
                  </div>

                  {/* 复选框 */}
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center transition-all flex-shrink-0',
                      enabled
                        ? 'text-white'
                        : 'border-2 border-white/30',
                    )}
                    style={enabled ? { backgroundColor: accent } : undefined}
                  >
                    {enabled && <Check className="w-4 h-4" strokeWidth={3} />}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* 自定义引擎区域 */}
        <div className="border-t border-glass-border/20 p-4">
          {!showCustomForm ? (
            <button
              type="button"
              onClick={() => setShowCustomForm(true)}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-3 rounded-xl',
                'border border-dashed border-white/30 hover:border-white/50',
                'text-fg/70 hover:text-fg transition-all',
              )}
            >
              <Plus className="w-5 h-5" />
              <span>{t('settings.engineDialog.addCustom')}</span>
            </button>
          ) : (
            <form onSubmit={handleSubmitCustom} className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-fg">{t('settings.engineDialog.addCustomTitle')}</span>
                <button
                  type="button"
                  onClick={() => setShowCustomForm(false)}
                  className="p-1 rounded hover:bg-white/10"
                >
                  <ChevronUp className="w-4 h-4 text-fg/60" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder={t('settings.engineDialog.namePlaceholder')}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg text-sm',
                      'bg-white/10 border border-white/20',
                      'text-fg placeholder:text-fg/40',
                      'focus:outline-none focus:ring-2 focus:ring-primary/50',
                      errors.name && 'border-red-500/50',
                    )}
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-400">{errors.name}</p>
                  )}
                </div>

                <div>
                  <input
                    type="text"
                    value={customIconUrl}
                    onChange={(e) => setCustomIconUrl(e.target.value)}
                    placeholder={t('settings.engineDialog.iconUrlPlaceholder')}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg text-sm',
                      'bg-white/10 border border-white/20',
                      'text-fg placeholder:text-fg/40',
                      'focus:outline-none focus:ring-2 focus:ring-primary/50',
                    )}
                  />
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder={t('settings.engineDialog.urlPlaceholder')}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg text-sm',
                    'bg-white/10 border border-white/20',
                    'text-fg placeholder:text-fg/40',
                    'focus:outline-none focus:ring-2 focus:ring-primary/50',
                    errors.url && 'border-red-500/50',
                  )}
                />
                {errors.url && (
                  <p className="mt-1 text-xs text-red-400">{errors.url}</p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomForm(false)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm',
                    'text-fg/70 hover:bg-white/10 transition-colors',
                  )}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm',
                    'text-white transition-colors',
                  )}
                  style={{ backgroundColor: accent }}
                >
                  {t('settings.engineDialog.add')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(dialogContent, document.body)
}

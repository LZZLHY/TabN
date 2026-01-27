import { useState, useEffect, useRef } from 'react'
import { Input } from '../ui/Input'
import { parseIconSource, serializeIconSource, getIconPreviews, type IconSourceType, ICON_SOURCES } from '../../utils/iconSource'
import { cn } from '../../utils/cn'
import { extractDomain } from '../../utils/url'

type IconSourceSelectorProps = {
  bookmarkUrl: string
  iconUrl: string
  onIconUrlChange: (url: string) => void
  iconPreviewError: boolean
  onIconPreviewError: (error: boolean) => void
}

/**
 * 图标来源选择器组件
 * 显示多个图标来源的预览缩略图，用户可以选择不同的图标获取方式
 */
export function IconSourceSelector({
  bookmarkUrl,
  iconUrl,
  onIconUrlChange,
  iconPreviewError,
  onIconPreviewError,
}: IconSourceSelectorProps) {
  const parsed = parseIconSource(iconUrl)
  const [selectedSource, setSelectedSource] = useState<IconSourceType>(parsed.source)
  const [customIconUrl, setCustomIconUrl] = useState(parsed.customUrl)
  const [previewErrors, setPreviewErrors] = useState<Record<string, boolean>>({})
  const [lastIconUrl, setLastIconUrl] = useState(iconUrl)
  // 检测当前实际使用的图标来源（竞速检测）
  const [detectedSource, setDetectedSource] = useState<IconSourceType | null>(null)
  const detectionRef = useRef<{ cancelled: boolean }>({ cancelled: false })

  // 当外部 iconUrl 变化时同步状态（避免在 effect 中调用 setState）
  if (iconUrl !== lastIconUrl) {
    const { source, customUrl: url } = parseIconSource(iconUrl)
    setSelectedSource(source)
    setCustomIconUrl(url)
    setLastIconUrl(iconUrl)
  }

  // 获取所有来源的预览图标
  const previews = getIconPreviews(bookmarkUrl)
  
  // 检测当前实际使用的图标来源（并行竞速）
  useEffect(() => {
    const hostname = extractDomain(bookmarkUrl)
    if (!hostname) {
      setDetectedSource(null)
      return
    }

    // 取消之前的检测
    detectionRef.current.cancelled = true
    const currentDetection = { cancelled: false }
    detectionRef.current = currentDetection

    setDetectedSource(null)

    // 定义检测顺序（与 Favicon 组件一致）
    const sourcesToCheck: IconSourceType[] = ['duckduckgo', 'google', 'iconhorse']
    
    sourcesToCheck.forEach((source) => {
      const url = ICON_SOURCES[source].getUrl(hostname)
      const img = new Image()
      img.onload = () => {
        if (currentDetection.cancelled) return
        // 第一个成功的就是当前使用的
        if (!detectedSource) {
          setDetectedSource(source)
          currentDetection.cancelled = true // 阻止后续更新
        }
      }
      img.src = url
    })

    return () => {
      currentDetection.cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookmarkUrl])

  const handleSourceSelect = (source: IconSourceType) => {
    setSelectedSource(source)
    if (source === 'custom') {
      // 选择自定义时，使用当前的自定义 URL
      onIconUrlChange(serializeIconSource(source, customIconUrl) || '')
    } else {
      // 选择预设来源时，清空自定义 URL
      onIconUrlChange(serializeIconSource(source, '') || '')
    }
  }

  const handleCustomUrlChange = (url: string) => {
    setCustomIconUrl(url)
    onIconPreviewError(false)
    onIconUrlChange(serializeIconSource('custom', url) || '')
  }

  const handlePreviewError = (source: string) => {
    setPreviewErrors(prev => ({ ...prev, [source]: true }))
  }

  const handlePreviewLoad = (source: string) => {
    setPreviewErrors(prev => ({ ...prev, [source]: false }))
  }

  // 计算当前实际使用的来源
  const currentSource = selectedSource === 'auto' ? detectedSource : selectedSource

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-fg/60">图标来源</label>
        {/* 显示当前实际使用的图标来源 */}
        {currentSource && currentSource !== 'custom' && (
          <span className="text-[10px] text-fg/40">
            当前使用: {ICON_SOURCES[currentSource].label}
          </span>
        )}
      </div>
      
      {/* 预览缩略图网格 */}
      <div className="grid grid-cols-4 gap-2">
        {previews.map(({ source, label, url }) => {
          // 自动模式下检测到的来源，或者用户选择的来源
          const isCurrentlyUsed = selectedSource === 'auto' 
            ? detectedSource === source 
            : selectedSource === source
          return (
            <button
              key={source}
              type="button"
              onClick={() => handleSourceSelect(source)}
              className={cn(
                'flex flex-col items-center gap-1 p-2 rounded-lg border transition-all relative',
                selectedSource === source
                  ? 'border-[rgb(var(--primary))] bg-[rgb(var(--primary))]/10'
                  : isCurrentlyUsed
                    ? 'border-green-500/50 bg-green-500/5'
                    : 'border-glass-border/20 hover:border-glass-border/40'
              )}
            >
              {/* 当前使用标记 */}
              {isCurrentlyUsed && selectedSource !== source && (
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 flex items-center justify-center">
                  <span className="text-[8px] text-white">✓</span>
                </div>
              )}
              <div className="w-8 h-8 rounded-md overflow-hidden bg-glass/20 grid place-items-center">
                {previewErrors[source] ? (
                  <span className="text-xs text-fg/40">×</span>
                ) : (
                  <img
                    src={url}
                    alt={label}
                    className="w-full h-full object-contain"
                    onError={() => handlePreviewError(source)}
                    onLoad={() => handlePreviewLoad(source)}
                  />
                )}
              </div>
              <span className="text-[10px] text-fg/60 truncate w-full text-center">{label}</span>
            </button>
          )
        })}
        
        {/* 自定义选项 */}
        <button
          type="button"
          onClick={() => handleSourceSelect('custom')}
          className={cn(
            'flex flex-col items-center gap-1 p-2 rounded-lg border transition-all',
            selectedSource === 'custom'
              ? 'border-[rgb(var(--primary))] bg-[rgb(var(--primary))]/10'
              : 'border-glass-border/20 hover:border-glass-border/40'
          )}
        >
          <div className="w-8 h-8 rounded-md overflow-hidden bg-glass/20 grid place-items-center">
            {selectedSource === 'custom' && customIconUrl.trim() ? (
              iconPreviewError ? (
                <span className="text-xs text-fg/40">×</span>
              ) : (
                <img
                  src={customIconUrl.trim()}
                  alt="自定义"
                  className="w-full h-full object-contain"
                  onError={() => onIconPreviewError(true)}
                  onLoad={() => onIconPreviewError(false)}
                />
              )
            ) : (
              <span className="text-lg text-fg/40">+</span>
            )}
          </div>
          <span className="text-[10px] text-fg/60">自定义</span>
        </button>
      </div>

      {/* 自定义 URL 输入框 */}
      {selectedSource === 'custom' && (
        <div className="space-y-1">
          <Input
            value={customIconUrl}
            onChange={e => handleCustomUrlChange(e.target.value)}
            placeholder="https://example.com/icon.png"
            className="text-sm"
          />
          <p className="text-[10px] text-fg/40">输入自定义图标的 URL 地址</p>
        </div>
      )}

      {/* 提示信息 */}
      <p className="text-[10px] text-fg/40">
        {selectedSource === 'auto' && (detectedSource 
          ? `自动竞速获取，当前使用 ${ICON_SOURCES[detectedSource].label}` 
          : '自动竞速获取（DuckDuckGo → Google → Icon Horse）')}
        {selectedSource === 'google' && '固定使用 Google Favicon 服务'}
        {selectedSource === 'duckduckgo' && '固定使用 DuckDuckGo 图标服务'}
        {selectedSource === 'iconhorse' && '固定使用 Icon Horse 高清图标'}
        {selectedSource === 'custom' && '使用自定义图标 URL'}
      </p>
    </div>
  )
}

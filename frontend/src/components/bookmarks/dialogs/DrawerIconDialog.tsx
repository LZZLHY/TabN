import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Check, ChevronDown, Image, Type } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Button } from '../../ui/Button'
import { IconSourceSelector } from '../IconSourceSelector'
import { TextIconPanel } from '../TextIconPanel'
import { TextIcon } from '../TextIcon'
import { PresetSelector } from '../PresetSelector'
import type { Bookmark } from '../types'
import { apiFetch } from '../../../services/api'
import { getIconUrl } from '../../../utils/iconSource'
import { useBookmarkRefreshStore } from '../../../stores/bookmarkRefresh'
import { cn } from '../../../utils/cn'
import { parseTextIconConfig, serializeTextIconConfig, getDefaultText } from '@start/shared'
import type { TextIconConfig } from '@start/shared'
import type { IconPreset } from '@start/shared'

// 图标背景类型
type IconBgType = 'default' | 'custom' | 'transparent'

// 图标显示模式
type IconDisplayMode = 'image' | 'text'

// ============ 类型定义 ============

/** 图片图标缓存配置 */
interface ImageIconCache {
  iconUrl: string
  iconBgType: IconBgType
  customBgColor: string
  usePrimaryColor: boolean
  blurIntensity: number
}

/** 文字图标缓存配置 */
interface TextIconCache {
  config: TextIconConfig
  iconBgType: IconBgType
  customBgColor: string
  usePrimaryColor: boolean
  blurIntensity: number
}



// ============ 工具函数 ============

/** 安全解析 iconBg 字符串 */
function safeParseIconBg(iconBg: string | null): {
  iconBgType: IconBgType
  customBgColor: string
  usePrimaryColor: boolean
  blurIntensity: number
} {
  if (!iconBg || iconBg === 'default' || iconBg.startsWith('default')) {
    return {
      iconBgType: 'default',
      customBgColor: '#FFFFFF',
      usePrimaryColor: iconBg?.includes('primary') || false,
      blurIntensity: parseInt(iconBg?.match(/blur:(\d+)/)?.[1] || '70'),
    }
  }
  if (iconBg === 'transparent') {
    return {
      iconBgType: 'transparent',
      customBgColor: '#FFFFFF',
      usePrimaryColor: false,
      blurIntensity: 70,
    }
  }
  if (iconBg.startsWith('#')) {
    return {
      iconBgType: 'custom',
      customBgColor: iconBg,
      usePrimaryColor: false,
      blurIntensity: 70,
    }
  }
  // 默认值
  return {
    iconBgType: 'default',
    customBgColor: '#FFFFFF',
    usePrimaryColor: false,
    blurIntensity: 70,
  }
}

// 标准色列表（一行显示）
const STANDARD_COLORS = [
  { name: '白', color: '#FFFFFF', shades: ['#FFFFFF', '#FAFAFA', '#F5F5F5', '#EEEEEE', '#E0E0E0', '#BDBDBD'] },
  { name: '灰', color: '#9E9E9E', shades: ['#9E9E9E', '#757575', '#616161', '#424242', '#212121', '#000000'] },
  { name: '红', color: '#F44336', shades: ['#FFEBEE', '#FFCDD2', '#EF9A9A', '#EF5350', '#F44336', '#C62828'] },
  { name: '橙', color: '#FF9800', shades: ['#FFF3E0', '#FFE0B2', '#FFCC80', '#FFA726', '#FF9800', '#E65100'] },
  { name: '黄', color: '#FFEB3B', shades: ['#FFFDE7', '#FFF9C4', '#FFF59D', '#FFEE58', '#FFEB3B', '#F9A825'] },
  { name: '绿', color: '#4CAF50', shades: ['#E8F5E9', '#C8E6C9', '#A5D6A7', '#66BB6A', '#4CAF50', '#2E7D32'] },
  { name: '青', color: '#00BCD4', shades: ['#E0F7FA', '#B2EBF2', '#80DEEA', '#26C6DA', '#00BCD4', '#00838F'] },
  { name: '蓝', color: '#2196F3', shades: ['#E3F2FD', '#BBDEFB', '#90CAF9', '#42A5F5', '#2196F3', '#1565C0'] },
  { name: '紫', color: '#9C27B0', shades: ['#F3E5F5', '#E1BEE7', '#CE93D8', '#AB47BC', '#9C27B0', '#6A1B9A'] },
  { name: '粉', color: '#E91E63', shades: ['#FCE4EC', '#F8BBD9', '#F48FB1', '#EC407A', '#E91E63', '#AD1457'] },
]

// 深色列表（用于判断勾选图标颜色）
const DARK_COLORS = ['#000000', '#212121', '#424242', '#616161', '#C62828', '#E65100', '#2E7D32', '#00838F', '#1565C0', '#6A1B9A', '#AD1457']

type DrawerIconDialogProps = {
  open: boolean
  item: Bookmark | null
  token: string | null
  onClose: () => void
  onSaved: () => void
}

/**
 * 图标更改模态框
 * 独立的图标选择对话框，用于更改书签图标
 */
export function DrawerIconDialog({
  open,
  item,
  token,
  onClose,
  onSaved,
}: DrawerIconDialogProps) {
  const { t } = useTranslation()
  const [iconUrl, setIconUrl] = useState('')
  const [iconPreviewError, setIconPreviewError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [closing, setClosing] = useState(false)
  
  // 图标背景状态
  const [iconBgType, setIconBgType] = useState<IconBgType>('default')
  const [customBgColor, setCustomBgColor] = useState('#FFFFFF')
  const [usePrimaryColor, setUsePrimaryColor] = useState(false)  // 原始背景是否跟随主题色
  const [blurIntensity, setBlurIntensity] = useState(70)  // 毛玻璃强度 0-100，默认 70
  const [expandedColorIndex, setExpandedColorIndex] = useState<number | null>(null)  // 展开的颜色索引
  
  // 图标显示模式状态
  const [iconDisplayMode, setIconDisplayMode] = useState<IconDisplayMode>('image')
  const [textIconConfig, setTextIconConfig] = useState<TextIconConfig>({
    text: '',
    color: '',
    fontFamily: 'system',
    fontSize: 50,
  })
  
  // 临时缓存状态
  const [imageCache, setImageCache] = useState<ImageIconCache | null>(null)
  const [textCache, setTextCache] = useState<TextIconCache | null>(null)
  
  // 添加预设状态
  const [addingPreset, setAddingPreset] = useState(false)
  const [presetRefreshKey, setPresetRefreshKey] = useState(0)

  // 打开时初始化
  useEffect(() => {
    if (open && item) {
      setIconUrl(item.iconUrl || '')
      setIconPreviewError(false)
      setClosing(false)
      setExpandedColorIndex(null)
      
      // 解析当前图标背景
      const bgConfig = safeParseIconBg(item.iconBg || null)
      setIconBgType(bgConfig.iconBgType)
      setCustomBgColor(bgConfig.customBgColor)
      setUsePrimaryColor(bgConfig.usePrimaryColor)
      setBlurIntensity(bgConfig.blurIntensity)
      
      // 初始化图标显示模式和缓存
      if (item.iconType === 'TEXT') {
        setIconDisplayMode('text')
        const config = parseTextIconConfig(item.iconData || null)
        setTextIconConfig(config)
        // 初始化 textCache
        setTextCache({
          config,
          iconBgType: bgConfig.iconBgType,
          customBgColor: bgConfig.customBgColor,
          usePrimaryColor: bgConfig.usePrimaryColor,
          blurIntensity: bgConfig.blurIntensity,
        })
        setImageCache(null)
      } else {
        setIconDisplayMode('image')
        setTextIconConfig({ text: '', color: '', fontFamily: 'system', fontSize: 50 })
        // 初始化 imageCache
        setImageCache({
          iconUrl: item.iconUrl || '',
          iconBgType: bgConfig.iconBgType,
          customBgColor: bgConfig.customBgColor,
          usePrimaryColor: bgConfig.usePrimaryColor,
          blurIntensity: bgConfig.blurIntensity,
        })
        setTextCache(null)
      }
    }
  }, [open, item])

  if (!open || !item) return null

  // 保存当前配置到临时缓存
  const saveToCache = (mode: IconDisplayMode) => {
    if (mode === 'image') {
      setImageCache({
        iconUrl,
        iconBgType,
        customBgColor,
        usePrimaryColor,
        blurIntensity,
      })
    } else {
      setTextCache({
        config: textIconConfig,
        iconBgType,
        customBgColor,
        usePrimaryColor,
        blurIntensity,
      })
    }
  }

  // 从临时缓存恢复配置
  const restoreFromCache = (mode: IconDisplayMode) => {
    if (mode === 'image' && imageCache) {
      setIconUrl(imageCache.iconUrl)
      setIconBgType(imageCache.iconBgType)
      setCustomBgColor(imageCache.customBgColor)
      setUsePrimaryColor(imageCache.usePrimaryColor)
      setBlurIntensity(imageCache.blurIntensity)
    } else if (mode === 'text' && textCache) {
      setTextIconConfig(textCache.config)
      setIconBgType(textCache.iconBgType)
      setCustomBgColor(textCache.customBgColor)
      setUsePrimaryColor(textCache.usePrimaryColor)
      setBlurIntensity(textCache.blurIntensity)
    }
  }

  // 切换图标类型
  const handleIconModeChange = (newMode: IconDisplayMode) => {
    if (newMode === iconDisplayMode) return
    
    // 保存当前配置到缓存
    saveToCache(iconDisplayMode)
    
    // 切换模式
    setIconDisplayMode(newMode)
    
    // 从缓存恢复目标类型配置
    restoreFromCache(newMode)
  }

  // 应用预设库中的预设（选择即保存，但不关闭对话框）
  const handleApplyLibraryPreset = async (preset: IconPreset) => {
    if (!token) {
      toast.error('请先登录')
      return
    }

    setSaving(true)
    try {
      // 构建请求体
      let requestBody: Record<string, unknown>
      
      if (preset.iconType === 'TEXT') {
        requestBody = {
          iconType: 'TEXT',
          iconData: preset.iconData,
          iconUrl: null,
          iconBg: preset.iconBg,
        }
      } else {
        requestBody = {
          iconType: preset.iconType === 'BASE64' ? 'BASE64' : null,
          iconData: preset.iconType === 'BASE64' ? preset.iconData : null,
          iconUrl: preset.iconUrl || null,
          iconBg: preset.iconBg,
        }
      }
      
      const resp = await apiFetch(`/api/bookmarks/${item.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(requestBody),
      })

      if (!resp.ok) {
        throw new Error(resp.message || '保存失败')
      }

      // 更新本地状态以反映预设配置
      if (preset.iconType === 'TEXT') {
        setIconDisplayMode('text')
        const config = parseTextIconConfig(preset.iconData)
        setTextIconConfig(config)
      } else {
        setIconDisplayMode('image')
        setIconUrl(preset.iconUrl || '')
      }
      
      // 恢复背景设置
      const bgConfig = safeParseIconBg(preset.iconBg)
      setIconBgType(bgConfig.iconBgType)
      setCustomBgColor(bgConfig.customBgColor)
      setUsePrimaryColor(bgConfig.usePrimaryColor)
      setBlurIntensity(bgConfig.blurIntensity)

      // 触发全局刷新，让书签列表更新
      useBookmarkRefreshStore.getState().triggerRefresh()
      
      toast.success(t('presets.applied'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setClosing(true)
    setTimeout(() => {
      onClose()
      setClosing(false)
      // 清除临时缓存
      setImageCache(null)
      setTextCache(null)
    }, 150)
  }

  const handleSave = async () => {
    if (!token) {
      toast.error('请先登录')
      return
    }

    setSaving(true)
    try {
      // 计算 iconBg 值
      let iconBgValue: string | null = null
      if (iconBgType === 'transparent') {
        iconBgValue = 'transparent'
      } else if (iconBgType === 'custom') {
        iconBgValue = customBgColor
      } else if (iconBgType === 'default') {
        // 原始背景：构建 default:primary:blur:N 格式
        const parts = ['default']
        if (usePrimaryColor) parts.push('primary')
        if (blurIntensity !== 70) parts.push(`blur:${blurIntensity}`)
        iconBgValue = parts.length > 1 ? parts.join(':') : null  // 纯 default 时为 null
      }
      // 纯 default 时 iconBg 为 null
      
      // 根据图标显示模式构建请求体
      let requestBody: Record<string, unknown>
      
      if (iconDisplayMode === 'text') {
        // 文字图标模式
        requestBody = {
          iconType: 'TEXT',
          iconData: serializeTextIconConfig(textIconConfig),
          iconUrl: null,  // 清除图片图标 URL
          iconBg: iconBgValue,
        }
      } else {
        // 图片图标模式
        requestBody = {
          iconUrl: iconUrl.trim() || null,
          iconBg: iconBgValue,
          // 如果之前是文字图标，切换回图片模式时清除 TEXT 类型
          iconType: item.iconType === 'TEXT' ? null : undefined,
          iconData: item.iconType === 'TEXT' ? null : undefined,
        }
        // 移除 undefined 值
        Object.keys(requestBody).forEach(key => {
          if (requestBody[key] === undefined) {
            delete requestBody[key]
          }
        })
      }
      
      const resp = await apiFetch(`/api/bookmarks/${item.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(requestBody),
      })

      if (!resp.ok) {
        throw new Error(resp.message || '保存失败')
      }

      toast.success('图标已更新')
      // 触发全局刷新，通知其他组件更新数据
      useBookmarkRefreshStore.getState().triggerRefresh()
      
      onSaved()
      handleClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  // 计算当前 iconBg 值
  const getIconBgValue = (): string | null => {
    if (iconBgType === 'transparent') {
      return 'transparent'
    } else if (iconBgType === 'custom') {
      return customBgColor
    } else if (iconBgType === 'default') {
      const parts = ['default']
      if (usePrimaryColor) parts.push('primary')
      if (blurIntensity !== 70) parts.push(`blur:${blurIntensity}`)
      return parts.length > 1 ? parts.join(':') : null
    }
    return null
  }

  // 应用背景到全部书签
  const handleApplyToAll = async () => {
    if (!token) {
      toast.error('请先登录')
      return
    }

    const iconBgValue = getIconBgValue()
    
    setSaving(true)
    try {
      const resp = await apiFetch('/api/bookmarks/batch-update-bg', {
        method: 'POST',
        token,
        body: JSON.stringify({ iconBg: iconBgValue }),
      })

      if (!resp.ok) {
        throw new Error(resp.message || t('toast.operationFailed'))
      }

      toast.success(t('bookmarks.appliedToAll'))
      useBookmarkRefreshStore.getState().triggerRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('toast.operationFailed'))
    } finally {
      setSaving(false)
    }
  }

  // 添加当前配置到预设库
  const handleAddToPreset = async () => {
    if (!token) {
      toast.error(t('common.pleaseLogin'))
      return
    }

    setAddingPreset(true)
    try {
      // 先获取现有预设列表以生成自动名称
      const listResp = await apiFetch<{ items: IconPreset[] }>(`/api/presets?bookmarkId=${item.id}`, { token })
      if (!listResp.ok) {
        throw new Error(listResp.message || t('toast.operationFailed'))
      }
      
      const existingPresets = listResp.data?.items || []
      
      // 检查是否已达上限
      if (existingPresets.length >= 8) {
        toast.error(t('preset.limitReached'))
        return
      }
      
      // 生成自动名称：我的预设1, 我的预设2, ...
      const baseNameZh = '我的预设'
      const baseNameEn = 'My Preset '
      const existingNumbers = existingPresets
        .map((p: IconPreset) => {
          const matchZh = p.name.match(/^我的预设(\d+)$/)
          const matchEn = p.name.match(/^My Preset (\d+)$/i)
          return matchZh ? parseInt(matchZh[1]) : matchEn ? parseInt(matchEn[1]) : 0
        })
        .filter((n: number) => n > 0)
      
      let nextNumber = 1
      while (existingNumbers.includes(nextNumber)) {
        nextNumber++
      }
      
      // 根据当前语言选择名称格式
      const isZh = t('common.save') === '保存'
      const autoName = isZh ? `${baseNameZh}${nextNumber}` : `${baseNameEn}${nextNumber}`
      
      // 保存原始的图标 URL（保留 source:xxx 格式，不转换为实际 URL）
      let iconUrlToSave: string | null = null
      if (iconDisplayMode === 'image') {
        iconUrlToSave = iconUrl.trim() || item.iconUrl || null
      }
      
      // 创建预设
      const createResp = await apiFetch('/api/presets', {
        method: 'POST',
        token,
        body: JSON.stringify({
          bookmarkId: item.id,
          name: autoName,
          iconType: iconDisplayMode === 'text' ? 'TEXT' : (item.iconType === 'BASE64' ? 'BASE64' : 'URL'),
          iconData: iconDisplayMode === 'text' ? serializeTextIconConfig(textIconConfig) : item.iconData || null,
          iconUrl: iconUrlToSave,
          iconBg: getIconBgValue(),
        }),
      })

      if (!createResp.ok) {
        throw new Error(createResp.message || t('toast.operationFailed'))
      }

      toast.success(t('preset.addSuccess'))
      // 触发预设列表刷新
      setPresetRefreshKey(prev => prev + 1)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('toast.operationFailed'))
    } finally {
      setAddingPreset(false)
    }
  }

  // 获取当前图标预览 URL
  // 优先使用书签已有的图标数据（BASE64 或自定义 URL），否则使用 getIconUrl 获取
  const getPreviewIconUrl = () => {
    // 如果用户已经输入了新的 iconUrl，使用它
    if (iconUrl && iconUrl.trim()) {
      return getIconUrl(item.url || '', iconUrl)
    }
    // 如果书签有 BASE64 图标数据，使用它
    if (item.iconType === 'BASE64' && item.iconData) {
      return item.iconData
    }
    // 如果书签有自定义图标 URL，使用它
    if (item.iconUrl) {
      return getIconUrl(item.url || '', item.iconUrl)
    }
    // 否则使用 DuckDuckGo 作为默认预览
    try {
      const url = new URL(item.url || '')
      return `https://icons.duckduckgo.com/ip3/${url.hostname}.ico`
    } catch {
      return ''
    }
  }
  const previewIconUrl = getPreviewIconUrl()

  return createPortal(
    <div
      className={`fixed inset-0 z-[160] flex items-center justify-center p-4 ${
        closing ? 'animate-[fadeOut_150ms_ease-in]' : 'animate-[fadeIn_150ms_ease-out]'
      }`}
      onClick={handleClose}
    >
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* 对话框 */}
      <div
        className={`relative w-full max-w-sm glass-panel-strong rounded-2xl border border-glass-border/25 shadow-2xl max-h-[90vh] flex flex-col ${
          closing ? 'animate-[menuCollapse_150ms_ease-in]' : 'animate-[menuExpand_150ms_ease-out]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-glass-border/10 flex-shrink-0">
          <h3 className="text-base font-medium text-fg">{t('bookmarks.changeIcon')}</h3>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-glass/20 transition-colors"
          >
            <X className="w-5 h-5 text-fg/60" />
          </button>
        </div>

        {/* 固定预览区域 - 不随滚动 */}
        <div className="px-4 pt-4 pb-2 flex-shrink-0 border-b border-glass-border/10">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-glass/10">
            <div 
              className={cn(
                'w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 relative',
                iconBgType === 'transparent' ? '' :
                iconBgType === 'custom' ? '' :
                usePrimaryColor ? 'bg-primary/20' : ''
              )}
              style={(() => {
                if (iconBgType === 'transparent') {
                  return {}
                }
                if (iconBgType === 'custom') {
                  return { backgroundColor: customBgColor }
                }
                const blurPx = Math.round(blurIntensity / 10)
                const bgOpacity = blurIntensity / 100 * 0.7
                if (usePrimaryColor) {
                  return {
                    backdropFilter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
                    WebkitBackdropFilter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
                    boxShadow: `inset 0 0 0 100px rgba(255, 255, 255, ${bgOpacity * 0.5})`
                  }
                }
                return {
                  backdropFilter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
                  WebkitBackdropFilter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
                  backgroundColor: `rgba(255, 255, 255, ${bgOpacity})`
                }
              })()}
            >
              <div className="absolute inset-0">
                {iconDisplayMode === 'text' ? (
                  <TextIcon
                    text={textIconConfig.text || getDefaultText(item.name, item.url || '')}
                    color={textIconConfig.color || 'var(--color-primary)'}
                    fontFamily={textIconConfig.fontFamily}
                    fontSize={textIconConfig.fontSize ?? 50}
                    size={48}
                    className="h-full w-full"
                  />
                ) : previewIconUrl ? (
                  <img
                    src={previewIconUrl}
                    alt={item.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-2xl text-fg/40">🔖</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-fg truncate">{item.name}</div>
              <div className="text-xs text-fg/50 truncate">{item.url}</div>
            </div>
          </div>
        </div>

        {/* 内容区 - 可滚动 */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 min-h-0">
          {/* 预设库 */}
          <PresetSelector
            token={token}
            bookmarkId={item.id}
            onApply={handleApplyLibraryPreset}
            currentConfig={{
              iconType: iconDisplayMode === 'text' ? 'TEXT' : (item.iconType === 'BASE64' ? 'BASE64' : 'URL'),
              iconData: iconDisplayMode === 'text' ? serializeTextIconConfig(textIconConfig) : item.iconData || null,
              iconUrl: iconDisplayMode === 'image' ? (iconUrl.trim() || null) : null,
              iconBg: getIconBgValue(),
            }}
            bookmarkName={item.name}
            bookmarkUrl={item.url || ''}
            refreshKey={presetRefreshKey}
          />

          {/* 图标类型选择器 */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleIconModeChange('image')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm transition-all',
                iconDisplayMode === 'image'
                  ? 'bg-primary text-white'
                  : 'bg-glass/20 text-fg/70 hover:bg-glass/30'
              )}
            >
              <Image className="w-4 h-4" />
              {t('textIcon.tabImage')}
            </button>
            <button
              type="button"
              onClick={() => handleIconModeChange('text')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm transition-all',
                iconDisplayMode === 'text'
                  ? 'bg-primary text-white'
                  : 'bg-glass/20 text-fg/70 hover:bg-glass/30'
              )}
            >
              <Type className="w-4 h-4" />
              {t('textIcon.tabText')}
            </button>
          </div>

          {/* 根据图标类型显示不同的编辑面板 */}
          {iconDisplayMode === 'image' ? (
            <>
              {/* 图标选择器 */}
              <IconSourceSelector
                bookmarkUrl={item.url || ''}
                iconUrl={iconUrl}
                onIconUrlChange={setIconUrl}
                iconPreviewError={iconPreviewError}
                onIconPreviewError={setIconPreviewError}
              />
            </>
          ) : (
            /* 文字图标编辑面板 */
            <TextIconPanel
              config={textIconConfig}
              onChange={setTextIconConfig}
              bookmarkName={item.name}
              bookmarkUrl={item.url || ''}
            />
          )}
          
          {/* 图标背景选择 */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-fg/80">{t('bookmarks.iconBackground')}</div>
            
            {/* 背景类型选择 */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIconBgType('default')}
                className={cn(
                  'flex-1 px-3 py-1.5 rounded-lg text-xs transition-all',
                  iconBgType === 'default'
                    ? 'bg-primary text-white'
                    : 'bg-glass/20 text-fg/70 hover:bg-glass/30'
                )}
              >
                {t('bookmarks.bgGlass')}
              </button>
              <button
                type="button"
                onClick={() => setIconBgType('custom')}
                className={cn(
                  'flex-1 px-3 py-1.5 rounded-lg text-xs transition-all',
                  iconBgType === 'custom'
                    ? 'bg-primary text-white'
                    : 'bg-glass/20 text-fg/70 hover:bg-glass/30'
                )}
              >
                {t('bookmarks.bgColor')}
              </button>
              <button
                type="button"
                onClick={() => setIconBgType('transparent')}
                className={cn(
                  'flex-1 px-3 py-1.5 rounded-lg text-xs transition-all',
                  iconBgType === 'transparent'
                    ? 'bg-primary text-white'
                    : 'bg-glass/20 text-fg/70 hover:bg-glass/30'
                )}
              >
                {t('bookmarks.bgTransparent')}
              </button>
            </div>
            
            {/* 原始背景选项 */}
            {iconBgType === 'default' && (
              <div className="space-y-3 pt-1 pl-1">
                {/* 主题色开关 - 自定义样式 */}
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div 
                    className={cn(
                      'w-4 h-4 rounded border-2 flex items-center justify-center transition-all',
                      usePrimaryColor 
                        ? 'bg-primary border-primary' 
                        : 'border-fg/30 hover:border-fg/50'
                    )}
                    onClick={() => setUsePrimaryColor(!usePrimaryColor)}
                  >
                    {usePrimaryColor && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-xs text-fg/70 group-hover:text-fg/90">{t('bookmarks.bgThemeColor')}</span>
                </label>
                
                {/* 毛玻璃强度滑块 */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-fg/60">
                    <span>{t('bookmarks.glassIntensity')}</span>
                    <span>{blurIntensity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={blurIntensity}
                    onChange={(e) => setBlurIntensity(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-glass/30 rounded-full appearance-none cursor-pointer accent-primary"
                  />
                </div>
              </div>
            )}
            
            {/* 自定义颜色选择器 */}
            {iconBgType === 'custom' && (
              <div className="space-y-2 pt-1">
                {/* 标准色 - 一行显示，点击展开渐变 */}
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {STANDARD_COLORS.map((item, index) => (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => {
                          setCustomBgColor(item.color)
                          setExpandedColorIndex(expandedColorIndex === index ? null : index)
                        }}
                        className={cn(
                          'flex-1 aspect-square rounded-md border transition-all relative',
                          customBgColor === item.color || item.shades.includes(customBgColor)
                            ? 'ring-2 ring-primary ring-offset-1'
                            : 'hover:scale-110',
                          item.color === '#FFFFFF'
                            ? 'border-gray-300'
                            : 'border-transparent'
                        )}
                        style={{ backgroundColor: item.color }}
                        title={item.name}
                      >
                        {(customBgColor === item.color || item.shades.includes(customBgColor)) && (
                          <Check className={cn(
                            'w-3 h-3 absolute inset-0 m-auto',
                            DARK_COLORS.includes(item.color) ? 'text-white' : 'text-primary'
                          )} />
                        )}
                        {expandedColorIndex === index && (
                          <ChevronDown className={cn(
                            'w-2 h-2 absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2',
                            DARK_COLORS.includes(item.color) ? 'text-white' : 'text-fg/60'
                          )} />
                        )}
                      </button>
                    ))}
                  </div>
                  
                  {/* 展开的渐变色 */}
                  {expandedColorIndex !== null && (
                    <div className="flex gap-1 pt-1">
                      {STANDARD_COLORS[expandedColorIndex].shades.map((shade) => (
                        <button
                          key={shade}
                          type="button"
                          onClick={() => setCustomBgColor(shade)}
                          className={cn(
                            'flex-1 aspect-square rounded-md border transition-all',
                            customBgColor === shade
                              ? 'ring-2 ring-primary ring-offset-1'
                              : 'hover:scale-110',
                            shade === '#FFFFFF' || shade === '#FAFAFA' || shade === '#F5F5F5'
                              ? 'border-gray-300'
                              : 'border-transparent'
                          )}
                          style={{ backgroundColor: shade }}
                        >
                          {customBgColor === shade && (
                            <Check className={cn(
                              'w-3 h-3 mx-auto',
                              DARK_COLORS.includes(shade) ? 'text-white' : 'text-primary'
                            )} />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* 自定义颜色输入 */}
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customBgColor}
                    onChange={(e) => setCustomBgColor(e.target.value.toUpperCase())}
                    className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                  />
                  <input
                    type="text"
                    value={customBgColor}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase()
                      if (/^#[0-9A-F]{0,6}$/.test(val)) {
                        setCustomBgColor(val)
                      }
                    }}
                    placeholder="#FFFFFF"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-glass/20 border border-glass-border/20 text-sm text-fg"
                  />
                </div>
              </div>
            )}
            
            {/* 应用背景到全部书签 */}
            <Button 
              variant="ghost" 
              onClick={handleApplyToAll} 
              disabled={saving || addingPreset}
              className="text-xs w-full mt-2"
            >
              {t('bookmarks.applyToAll')}
            </Button>
          </div>
        </div>

        {/* 底部按钮 - 固定在底部 */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-glass-border/10 flex-shrink-0">
          <Button variant="ghost" onClick={handleClose} disabled={saving || addingPreset}>
            {t('common.cancel')}
          </Button>
          <Button 
            variant="ghost" 
            onClick={handleAddToPreset} 
            disabled={saving || addingPreset}
          >
            {addingPreset ? t('common.loading') : t('preset.addToPreset')}
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving || addingPreset || iconPreviewError}>
            {saving ? t('common.loading') : t('common.save')}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}

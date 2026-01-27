import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Check, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../ui/Button'
import { IconSourceSelector } from '../IconSourceSelector'
import type { Bookmark } from '../types'
import { apiFetch } from '../../../services/api'
import { getIconUrl } from '../../../utils/iconSource'
import { useBookmarkRefreshStore } from '../../../stores/bookmarkRefresh'
import { cn } from '../../../utils/cn'

// 图标背景类型
type IconBgType = 'default' | 'custom' | 'transparent'

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

  // 打开时初始化
  useEffect(() => {
    if (open && item) {
      setIconUrl(item.iconUrl || '')
      setIconPreviewError(false)
      setClosing(false)
      setExpandedColorIndex(null)
      
      // 初始化图标背景状态
      const iconBg = item.iconBg
      if (!iconBg || iconBg.startsWith('default')) {
        setIconBgType('default')
        setCustomBgColor('#FFFFFF')
        // 解析 default:primary:blur:N 格式
        setUsePrimaryColor(iconBg?.includes('primary') || false)
        const blurMatch = iconBg?.match(/blur:(\d+)/)
        setBlurIntensity(blurMatch ? parseInt(blurMatch[1]) : 70)
      } else if (iconBg === 'transparent') {
        setIconBgType('transparent')
        setCustomBgColor('#FFFFFF')
        setUsePrimaryColor(false)
        setBlurIntensity(70)
      } else if (iconBg.startsWith('#')) {
        setIconBgType('custom')
        setCustomBgColor(iconBg)
        setUsePrimaryColor(false)
        setBlurIntensity(70)
      } else {
        setIconBgType('default')
        setCustomBgColor('#FFFFFF')
        setUsePrimaryColor(false)
        setBlurIntensity(70)
      }
    }
  }, [open, item])

  if (!open || !item) return null

  const handleClose = () => {
    setClosing(true)
    setTimeout(() => {
      onClose()
      setClosing(false)
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
      
      const resp = await apiFetch(`/api/bookmarks/${item.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ 
          iconUrl: iconUrl.trim() || null,
          iconBg: iconBgValue,
        }),
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
        throw new Error(resp.message || '批量更新失败')
      }

      toast.success('已应用到全部书签')
      useBookmarkRefreshStore.getState().triggerRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '批量更新失败')
    } finally {
      setSaving(false)
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
        className={`relative w-full max-w-sm glass-panel-strong rounded-2xl border border-glass-border/25 shadow-2xl ${
          closing ? 'animate-[menuCollapse_150ms_ease-in]' : 'animate-[menuExpand_150ms_ease-out]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-glass-border/10">
          <h3 className="text-base font-medium text-fg">更改图标</h3>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-glass/20 transition-colors"
          >
            <X className="w-5 h-5 text-fg/60" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="p-4 space-y-4">
          {/* 当前书签信息 - 带背景预览 */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-glass/10">
            <div 
              className={cn(
                'w-12 h-12 rounded-xl overflow-hidden grid place-items-center flex-shrink-0',
                // 根据当前选择的背景类型显示预览
                iconBgType === 'transparent' ? '' :
                iconBgType === 'custom' ? '' :
                usePrimaryColor ? 'bg-primary/20' : ''
              )}
              style={(() => {
                // 计算预览背景样式
                if (iconBgType === 'transparent') {
                  return {}
                }
                if (iconBgType === 'custom') {
                  return { backgroundColor: customBgColor }
                }
                // 毛玻璃预览
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
              {previewIconUrl ? (
                <img
                  src={previewIconUrl}
                  alt={item.name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              ) : (
                <span className="text-2xl text-fg/40">🔖</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-fg truncate">{item.name}</div>
              <div className="text-xs text-fg/50 truncate">{item.url}</div>
            </div>
          </div>

          {/* 图标选择器 */}
          <IconSourceSelector
            bookmarkUrl={item.url || ''}
            iconUrl={iconUrl}
            onIconUrlChange={setIconUrl}
            iconPreviewError={iconPreviewError}
            onIconPreviewError={setIconPreviewError}
          />
          
          {/* 图标背景选择 */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-fg/80">图标背景</div>
            
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
                毛玻璃
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
                自定义色
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
                透明
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
                  <span className="text-xs text-fg/70 group-hover:text-fg/90">跟随主题色</span>
                </label>
                
                {/* 毛玻璃强度滑块 */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-fg/60">
                    <span>毛玻璃强度</span>
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
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-between gap-2 px-4 py-3 border-t border-glass-border/10">
          <Button 
            variant="ghost" 
            onClick={handleApplyToAll} 
            disabled={saving}
            className="text-xs"
          >
            应用到全部
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleClose} disabled={saving}>
              取消
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving || iconPreviewError}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

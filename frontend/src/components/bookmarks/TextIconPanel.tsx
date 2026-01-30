import { useState, useEffect, useMemo, useRef } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'
import { FONT_FAMILIES } from './TextIcon'
import { getDefaultText } from '@start/shared'
import type { TextIconConfig, TextIconFont } from '@start/shared'

/**
 * TextIconPanel 组件属性
 */
export interface TextIconPanelProps {
  /** 当前文字图标配置 */
  config: TextIconConfig
  /** 配置变更回调 */
  onChange: (config: TextIconConfig) => void
  /** 书签名称（用于默认文字） */
  bookmarkName: string
  /** 书签 URL（用于 fallback） */
  bookmarkUrl: string
}

/**
 * 标准色板配置
 * 复用自 DrawerIconDialog 的颜色配置
 */
const STANDARD_COLORS = [
  { name: 'white', color: '#FFFFFF', shades: ['#FFFFFF', '#FAFAFA', '#F5F5F5', '#EEEEEE', '#E0E0E0', '#BDBDBD'] },
  { name: 'gray', color: '#9E9E9E', shades: ['#9E9E9E', '#757575', '#616161', '#424242', '#212121', '#000000'] },
  { name: 'red', color: '#F44336', shades: ['#FFEBEE', '#FFCDD2', '#EF9A9A', '#EF5350', '#F44336', '#C62828'] },
  { name: 'orange', color: '#FF9800', shades: ['#FFF3E0', '#FFE0B2', '#FFCC80', '#FFA726', '#FF9800', '#E65100'] },
  { name: 'yellow', color: '#FFEB3B', shades: ['#FFFDE7', '#FFF9C4', '#FFF59D', '#FFEE58', '#FFEB3B', '#F9A825'] },
  { name: 'green', color: '#4CAF50', shades: ['#E8F5E9', '#C8E6C9', '#A5D6A7', '#66BB6A', '#4CAF50', '#2E7D32'] },
  { name: 'cyan', color: '#00BCD4', shades: ['#E0F7FA', '#B2EBF2', '#80DEEA', '#26C6DA', '#00BCD4', '#00838F'] },
  { name: 'blue', color: '#2196F3', shades: ['#E3F2FD', '#BBDEFB', '#90CAF9', '#42A5F5', '#2196F3', '#1565C0'] },
  { name: 'purple', color: '#9C27B0', shades: ['#F3E5F5', '#E1BEE7', '#CE93D8', '#AB47BC', '#9C27B0', '#6A1B9A'] },
  { name: 'pink', color: '#E91E63', shades: ['#FCE4EC', '#F8BBD9', '#F48FB1', '#EC407A', '#E91E63', '#AD1457'] },
]

/**
 * 深色列表（用于判断勾选图标颜色）
 */
const DARK_COLORS = ['#000000', '#212121', '#424242', '#616161', '#C62828', '#E65100', '#2E7D32', '#00838F', '#1565C0', '#6A1B9A', '#AD1457']

/**
 * 字体选项配置
 */
const FONT_OPTIONS: { value: TextIconFont; labelKey: string; preview: string }[] = [
  { value: 'system', labelKey: 'textIcon.fontSystem', preview: 'Aa' },
  { value: 'serif', labelKey: 'textIcon.fontSerif', preview: 'Aa' },
  { value: 'mono', labelKey: 'textIcon.fontMono', preview: 'Aa' },
  { value: 'rounded', labelKey: 'textIcon.fontRounded', preview: 'Aa' },
  { value: 'handwriting', labelKey: 'textIcon.fontHandwriting', preview: 'Aa' },
]

/**
 * 最大文字字符数
 */
const MAX_TEXT_LENGTH = 4

/**
 * 文字图标编辑面板组件
 * 
 * 提供文字图标的完整编辑功能：
 * - 文字输入框（带字符限制验证）
 * - 颜色选择器（标准色板 + 自定义 hex）
 * - 字体选择器（5 种字体选项）
 * - 实时预览
 * 
 * @example
 * <TextIconPanel
 *   config={{ text: '', color: '', fontFamily: 'system' }}
 *   onChange={(config) => setConfig(config)}
 *   bookmarkName="Google"
 *   bookmarkUrl="https://google.com"
 * />
 */
export function TextIconPanel({
  config,
  onChange,
  bookmarkName,
  bookmarkUrl,
}: TextIconPanelProps) {
  const { t } = useTranslation()
  
  // 展开的颜色索引（用于显示渐变色）
  const [expandedColorIndex, setExpandedColorIndex] = useState<number | null>(null)
  
  // 文字输入验证状态
  const [showValidation, setShowValidation] = useState(false)
  
  // IME 输入状态（用于处理中文等输入法）
  const isComposingRef = useRef(false)
  
  // 计算默认文字
  const defaultText = useMemo(() => {
    return getDefaultText(bookmarkName, bookmarkUrl)
  }, [bookmarkName, bookmarkUrl])
  
  // 处理文字输入变更
  const handleTextChange = (value: string) => {
    // 如果正在使用输入法组合，直接更新不做限制
    if (isComposingRef.current) {
      onChange({ ...config, text: value })
      return
    }
    
    // 获取实际字符数（考虑 Unicode）
    const chars = [...value]
    
    if (chars.length > MAX_TEXT_LENGTH) {
      // 超过限制，显示验证消息
      setShowValidation(true)
      // 截取前 4 个字符
      onChange({ ...config, text: chars.slice(0, MAX_TEXT_LENGTH).join('') })
    } else {
      setShowValidation(false)
      onChange({ ...config, text: value })
    }
  }
  
  // 处理输入法组合结束
  const handleCompositionEnd = (value: string) => {
    isComposingRef.current = false
    
    // 组合结束后进行字符限制检查
    const chars = [...value]
    if (chars.length > MAX_TEXT_LENGTH) {
      setShowValidation(true)
      onChange({ ...config, text: chars.slice(0, MAX_TEXT_LENGTH).join('') })
    } else {
      setShowValidation(false)
      onChange({ ...config, text: value })
    }
  }
  
  // 处理颜色变更
  const handleColorChange = (color: string) => {
    onChange({ ...config, color })
  }
  
  // 处理字体变更
  const handleFontChange = (fontFamily: TextIconFont) => {
    onChange({ ...config, fontFamily })
  }
  
  // 处理字号变更
  const handleFontSizeChange = (fontSize: number) => {
    onChange({ ...config, fontSize })
  }
  
  // 处理自定义颜色输入
  const handleCustomColorInput = (value: string) => {
    const upperValue = value.toUpperCase()
    // 只允许有效的 hex 格式输入
    if (/^#[0-9A-F]{0,6}$/.test(upperValue)) {
      // 只有完整的 6 位 hex 才更新配置
      if (/^#[0-9A-F]{6}$/.test(upperValue)) {
        handleColorChange(upperValue)
      } else if (upperValue === '' || upperValue === '#') {
        // 清空时重置为默认
        handleColorChange('')
      }
    }
  }
  
  // 验证消息自动隐藏
  useEffect(() => {
    if (showValidation) {
      const timer = setTimeout(() => setShowValidation(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [showValidation])

  return (
    <div className="space-y-4">
      {/* 文字输入 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-fg/80">
          {t('textIcon.textLabel', '文字内容')}
        </label>
        <div className="relative">
          <input
            type="text"
            value={config.text}
            onChange={(e) => handleTextChange(e.target.value)}
            onCompositionStart={() => { isComposingRef.current = true }}
            onCompositionEnd={(e) => handleCompositionEnd(e.currentTarget.value)}
            placeholder={defaultText}
            className={cn(
              'w-full h-10 px-3 rounded-xl text-sm',
              'bg-glass/15 border border-glass-border/25 text-fg placeholder:text-fg/40',
              'backdrop-blur-xl shadow-glass',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
              showValidation && 'border-red-500/50 focus-visible:ring-red-500/60'
            )}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-fg/40">
            {[...config.text].length}/{MAX_TEXT_LENGTH}
          </div>
        </div>
        {showValidation && (
          <p className="text-xs text-red-500">
            {t('textIcon.maxLengthError', '最多输入 {{max}} 个字符', { max: MAX_TEXT_LENGTH })}
          </p>
        )}
        <p className="text-xs text-fg/50">
          {t('textIcon.textHint', '留空将使用默认文字：{{default}}', { default: defaultText })}
        </p>
      </div>
      
      {/* 字号大小滑块 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-fg/80">
            {t('textIcon.fontSizeLabel', '字号大小')}
          </label>
          <span className="text-xs text-fg/50">{config.fontSize ?? 50}%</span>
        </div>
        <input
          type="range"
          min="10"
          max="100"
          value={config.fontSize ?? 50}
          onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
          className="w-full h-1.5 bg-glass/30 rounded-full appearance-none cursor-pointer accent-primary"
        />
        <div className="flex justify-between text-xs text-fg/40">
          <span>{t('textIcon.fontSizeSmall', '小')}</span>
          <span>{t('textIcon.fontSizeLarge', '大')}</span>
        </div>
      </div>
      
      {/* 颜色选择器 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-fg/80">
          {t('textIcon.colorLabel', '文字颜色')}
        </label>
        
        {/* 标准色板 */}
        <div className="space-y-1">
          <div className="flex gap-1">
            {STANDARD_COLORS.map((item, index) => {
              const isSelected = config.color === item.color || item.shades.includes(config.color)
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => {
                    handleColorChange(item.color)
                    setExpandedColorIndex(expandedColorIndex === index ? null : index)
                  }}
                  className={cn(
                    'flex-1 aspect-square rounded-md border transition-all relative',
                    isSelected
                      ? 'ring-2 ring-primary ring-offset-1'
                      : 'hover:scale-110',
                    item.color === '#FFFFFF'
                      ? 'border-gray-300'
                      : 'border-transparent'
                  )}
                  style={{ backgroundColor: item.color }}
                  title={t(`textIcon.color${item.name.charAt(0).toUpperCase() + item.name.slice(1)}`, item.name)}
                >
                  {isSelected && (
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
              )
            })}
          </div>
          
          {/* 展开的渐变色 */}
          {expandedColorIndex !== null && (
            <div className="flex gap-1 pt-1">
              {STANDARD_COLORS[expandedColorIndex].shades.map((shade) => (
                <button
                  key={shade}
                  type="button"
                  onClick={() => handleColorChange(shade)}
                  className={cn(
                    'flex-1 aspect-square rounded-md border transition-all',
                    config.color === shade
                      ? 'ring-2 ring-primary ring-offset-1'
                      : 'hover:scale-110',
                    shade === '#FFFFFF' || shade === '#FAFAFA' || shade === '#F5F5F5'
                      ? 'border-gray-300'
                      : 'border-transparent'
                  )}
                  style={{ backgroundColor: shade }}
                >
                  {config.color === shade && (
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
            value={config.color || '#000000'}
            onChange={(e) => handleColorChange(e.target.value.toUpperCase())}
            className="w-8 h-8 rounded cursor-pointer border-0 p-0"
          />
          <input
            type="text"
            value={config.color}
            onChange={(e) => handleCustomColorInput(e.target.value)}
            placeholder={t('textIcon.colorPlaceholder', '#000000（留空使用主题色）')}
            className="flex-1 px-3 py-1.5 rounded-lg bg-glass/20 border border-glass-border/20 text-sm text-fg placeholder:text-fg/40"
          />
        </div>
        <p className="text-xs text-fg/50">
          {t('textIcon.colorHint', '留空将使用主题主色')}
        </p>
      </div>
      
      {/* 字体选择器 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-fg/80">
          {t('textIcon.fontLabel', '字体样式')}
        </label>
        <div className="grid grid-cols-5 gap-2">
          {FONT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleFontChange(option.value)}
              className={cn(
                'flex flex-col items-center gap-1 p-2 rounded-xl transition-all',
                config.fontFamily === option.value
                  ? 'bg-primary/20 ring-2 ring-primary/50'
                  : 'bg-glass/10 hover:bg-glass/20'
              )}
            >
              <span
                className="text-lg font-semibold"
                style={{ fontFamily: FONT_FAMILIES[option.value] }}
              >
                {option.preview}
              </span>
              <span className="text-[10px] text-fg/60 truncate w-full text-center">
                {t(option.labelKey, option.value)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

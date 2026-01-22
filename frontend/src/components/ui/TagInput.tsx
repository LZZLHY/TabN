import { useState, useRef, useCallback, useEffect, type KeyboardEvent, type ChangeEvent } from 'react'
import { cn } from '../../utils/cn'
import { X, Plus } from 'lucide-react'

export interface TagInputProps {
  /** Current tags */
  value: string[]
  /** Callback when tags change */
  onChange: (tags: string[]) => void
  /** Suggestions for autocomplete */
  suggestions?: string[]
  /** Placeholder text */
  placeholder?: string
  /** Maximum number of tags allowed (default: 10) */
  maxTags?: number
  /** Maximum length per tag (default: 20) */
  maxLength?: number
  /** Additional class names */
  className?: string
  /** Whether the input is disabled */
  disabled?: boolean
}

/**
 * Tag validation pattern: Chinese, English, numbers, underscore, hyphen
 */
const TAG_PATTERN = /^[\u4e00-\u9fa5a-zA-Z0-9_-]+$/

/**
 * Sanitize a tag: trim whitespace
 */
function sanitizeTag(tag: string): string {
  return tag.trim()
}

/**
 * Validate a tag
 */
function isValidTag(tag: string, maxLength: number): boolean {
  if (!tag || tag.length === 0) return false
  if (tag.length > maxLength) return false
  return TAG_PATTERN.test(tag)
}

export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = '输入标签后按回车添加',
  maxTags = 10,
  maxLength = 20,
  className,
  disabled = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter suggestions based on input
  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(inputValue.toLowerCase()) &&
      !value.includes(s) &&
      inputValue.length > 0
  )

  // Add a tag
  const addTag = useCallback(
    (tag: string) => {
      const sanitized = sanitizeTag(tag)
      
      // Validation
      if (!sanitized) {
        return
      }
      
      if (value.length >= maxTags) {
        setError(`最多只能添加 ${maxTags} 个标签`)
        return
      }
      
      if (sanitized.length > maxLength) {
        setError(`标签长度不能超过 ${maxLength} 个字符`)
        return
      }
      
      if (!isValidTag(sanitized, maxLength)) {
        setError('标签只能包含中文、英文、数字、下划线和连字符')
        return
      }
      
      if (value.includes(sanitized)) {
        setError('标签已存在')
        return
      }
      
      setError(null)
      onChange([...value, sanitized])
      setInputValue('')
      setShowSuggestions(false)
      setSelectedSuggestionIndex(-1)
    },
    [value, onChange, maxTags, maxLength]
  )

  // Remove a tag
  const removeTag = useCallback(
    (tagToRemove: string) => {
      onChange(value.filter((tag) => tag !== tagToRemove))
      setError(null)
    },
    [value, onChange]
  )

  // Handle input change
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setShowSuggestions(newValue.length > 0)
    setSelectedSuggestionIndex(-1)
    setError(null)
  }

  // Handle key down
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      
      if (selectedSuggestionIndex >= 0 && filteredSuggestions[selectedSuggestionIndex]) {
        addTag(filteredSuggestions[selectedSuggestionIndex])
      } else if (inputValue.trim()) {
        addTag(inputValue)
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last tag when backspace is pressed on empty input
      removeTag(value[value.length - 1])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (filteredSuggestions.length > 0) {
        setSelectedSuggestionIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        )
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (filteredSuggestions.length > 0) {
        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1))
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setSelectedSuggestionIndex(-1)
    }
  }

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    addTag(suggestion)
    inputRef.current?.focus()
  }

  // Check if current input is a new tag (not in suggestions and not already added)
  const isNewTag = inputValue.trim().length > 0 && 
    !value.includes(inputValue.trim()) && 
    !suggestions.includes(inputValue.trim())

  // Handle add button click
  const handleAddClick = () => {
    if (inputValue.trim()) {
      addTag(inputValue)
      inputRef.current?.focus()
    }
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
        setSelectedSuggestionIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Tags container with input */}
      <div
        className={cn(
          'min-h-10 w-full rounded-xl px-2 py-1.5',
          'bg-glass/15 border border-glass-border/25 text-fg',
          'backdrop-blur-xl shadow-glass',
          'flex flex-wrap gap-1.5 items-center',
          'focus-within:ring-2 focus-within:ring-primary/60 focus-within:ring-offset-2 focus-within:ring-offset-transparent',
          disabled && 'opacity-50 cursor-not-allowed',
          error && 'border-red-500/50'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Rendered tags */}
        {value.map((tag) => (
          <span
            key={tag}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs',
              'bg-primary/15 text-primary border border-primary/20',
              'transition-colors'
            )}
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeTag(tag)
                }}
                className="hover:bg-primary/20 rounded p-0.5 transition-colors"
                aria-label={`删除标签 ${tag}`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}

        {/* Input field */}
        {!disabled && value.length < maxTags && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => inputValue && setShowSuggestions(true)}
            placeholder={value.length === 0 ? placeholder : ''}
            className={cn(
              'flex-1 min-w-[80px] bg-transparent outline-none text-sm',
              'placeholder:text-fg/60'
            )}
            disabled={disabled}
            maxLength={maxLength}
          />
        )}

        {/* Add button for new tags */}
        {!disabled && isNewTag && value.length < maxTags && (
          <button
            type="button"
            onClick={handleAddClick}
            className={cn(
              'shrink-0 p-1 rounded-lg transition-colors',
              'bg-primary/15 text-primary hover:bg-primary/25',
              'border border-primary/20'
            )}
            title="添加标签"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}

      {/* Tag count indicator */}
      {value.length > 0 && (
        <p className="text-xs text-fg/50 mt-1">
          {value.length}/{maxTags} 个标签
        </p>
      )}

      {/* Autocomplete suggestions dropdown - pops up above input */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          className={cn(
            'absolute z-50 w-full bottom-full mb-2 py-2 rounded-2xl',
            'bg-bg backdrop-blur-xl',
            'border border-primary/20',
            'shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.08)]',
            'dark:shadow-[0_8px_32px_rgba(0,0,0,0.5),0_2px_8px_rgba(0,0,0,0.3)]',
            'max-h-40 overflow-y-auto',
            'animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200'
          )}
        >
          {filteredSuggestions.map((suggestion, index) => {
            const isSelected = index === selectedSuggestionIndex
            
            return (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className={cn(
                  'group/item w-full flex items-center gap-3 px-3 py-2.5 mx-1 rounded-xl text-sm text-left',
                  'transition-all duration-200 ease-out',
                  'relative overflow-hidden',
                  'hover:bg-glass/40',
                  isSelected && 'bg-primary/10'
                )}
                style={{ width: 'calc(100% - 8px)' }}
              >
                {/* 悬浮背景光效 */}
                <div className={cn(
                  'absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5',
                  'opacity-0 transition-opacity duration-300',
                  'group-hover/item:opacity-100',
                  isSelected && 'opacity-100'
                )} />
                
                {/* 左侧高亮条 */}
                <div className={cn(
                  'absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-0 rounded-full',
                  'bg-gradient-to-b from-primary/80 to-primary/40',
                  'transition-all duration-300 ease-out',
                  'group-hover/item:h-4',
                  isSelected && 'h-5 bg-primary'
                )} />
                
                {/* 文字 */}
                <span className={cn(
                  'relative flex-1 truncate transition-all duration-200',
                  'text-fg/70 group-hover/item:text-fg',
                  isSelected && 'text-primary font-medium'
                )}>
                  {suggestion}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

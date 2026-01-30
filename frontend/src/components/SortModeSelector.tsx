import { Lock } from 'lucide-react'
import { Select } from './ui/Select'
import { cn } from '../utils/cn'
import { useSortModeOptions } from '../hooks/useSortModeOptions'
import type { SortMode } from '../types/bookmark'

type SortModeSelectorProps = {
  value: SortMode
  onChange: (mode: SortMode) => void
  disabled?: boolean
  locked?: boolean
  className?: string
}

export function SortModeSelector({ value, onChange, disabled, locked, className }: SortModeSelectorProps) {
  const sortModeOptions = useSortModeOptions()
  
  if (disabled) {
    const currentOption = sortModeOptions.find(opt => opt.value === value) ?? sortModeOptions[0]
    return (
      <div className={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm',
        'bg-glass/20 border border-glass-border/20',
        'opacity-50 cursor-not-allowed',
        className
      )}>
        {currentOption.icon}
        <span className="text-fg/80">{currentOption.label}</span>
        {locked && <Lock className="w-3 h-3 text-fg/50 ml-0.5" />}
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      <Select
        value={value}
        onChange={onChange}
        options={sortModeOptions}
      />
      {locked && (
        <Lock className="absolute right-8 top-1/2 -translate-y-1/2 w-3 h-3 text-fg/50 pointer-events-none" />
      )}
    </div>
  )
}


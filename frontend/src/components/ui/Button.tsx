import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

type Variant = 'primary' | 'glass' | 'ghost'
type Size = 'sm' | 'md'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-primary text-primary-fg hover:opacity-90 active:opacity-85 border border-transparent',
  glass:
    'glass-panel hover:bg-glass/20 active:bg-glass/25 text-fg border border-glass-border/25',
  ghost:
    'bg-transparent hover:bg-glass/10 active:bg-glass/15 text-fg border border-transparent',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm rounded-xl',
  md: 'h-10 px-4 text-sm rounded-xl',
}

export function Button({
  className,
  variant = 'glass',
  size = 'md',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-colors select-none',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  )
}











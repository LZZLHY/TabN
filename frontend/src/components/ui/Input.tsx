import type { InputHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export type InputProps = InputHTMLAttributes<HTMLInputElement>

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-xl px-3 text-sm',
        'bg-glass/15 border border-glass-border/25 text-fg placeholder:text-fg/60',
        'backdrop-blur-xl shadow-glass',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    />
  )
}











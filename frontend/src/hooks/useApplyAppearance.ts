import { useEffect } from 'react'
import { useAppearanceStore } from '../stores/appearance'
import {
  getReadableForeground,
  hexToRgb,
  rgbToCssTriple,
} from '../utils/color'

function applyAccent(hex: string) {
  const rgb = hexToRgb(hex)
  if (!rgb) return

  const root = document.documentElement
  root.style.setProperty('--primary', rgbToCssTriple(rgb))
  root.style.setProperty(
    '--primary-fg',
    rgbToCssTriple(getReadableForeground(rgb)),
  )
}

export function useApplyAppearance() {
  const mode = useAppearanceStore((s) => s.mode)
  const accent = useAppearanceStore((s) => s.accent)
  const cornerRadius = useAppearanceStore((s) => s.cornerRadius)

  useEffect(() => {
    applyAccent(accent)
  }, [accent])

  useEffect(() => {
    const root = document.documentElement
    const px = Math.max(0, Math.min(cornerRadius, 48))
    root.style.setProperty('--start-radius', `${px}px`)
  }, [cornerRadius])

  useEffect(() => {
    const root = document.documentElement
    const mql = window.matchMedia?.('(prefers-color-scheme: dark)')

    const apply = () => {
      const isDark =
        mode === 'dark' || (mode === 'system' && (mql?.matches ?? false))
      root.classList.toggle('dark', isDark)
      root.style.colorScheme = isDark ? 'dark' : 'light'
    }

    apply()

    if (mode !== 'system' || !mql) return

    // 跟随系统切换
    const onChange = () => apply()
    mql.addEventListener?.('change', onChange)
    mql.addListener?.(onChange)

    return () => {
      mql.removeEventListener?.('change', onChange)
      mql.removeListener?.(onChange)
    }
  }, [mode])
}



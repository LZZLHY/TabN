import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppearanceStore } from '../stores/appearance'
import { cn } from '../utils/cn'
import { useBookmarkDrawerStore } from '../stores/bookmarkDrawer'

function formatTime(d: Date, opts: { hour12: boolean; showSeconds: boolean }, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    ...(opts.showSeconds ? { second: '2-digit' } : {}),
    hour12: opts.hour12,
  }).format(d)
}

function formatDate(d: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d)
}

export function Clock() {
  const { t, i18n } = useTranslation()
  const [now, setNow] = useState(() => new Date())
  const hourCycle = useAppearanceStore((s) => s.clockHourCycle)
  const showSeconds = useAppearanceStore((s) => s.clockShowSeconds)
  const showDate = useAppearanceStore((s) => s.clockShowDate)
  const followAccent = useAppearanceStore((s) => s.clockFollowAccent)
  const clockScale = useAppearanceStore((s) => s.clockScale)
  const openDrawer = useBookmarkDrawerStore((s) => s.setOpen)

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const locale = i18n.language === 'zh-CN' ? 'zh-CN' : 'en-US'
  const time = useMemo(
    () => formatTime(now, { hour12: hourCycle === '12', showSeconds }, locale),
    [hourCycle, now, showSeconds, locale],
  )
  const date = useMemo(() => (showDate ? formatDate(now, locale) : ''), [now, showDate, locale])

  return (
    <div 
      className="text-center cursor-pointer select-none transition-transform hover:scale-[1.02] active:scale-[0.98]"
      style={{ transform: `scale(${clockScale / 100})` }}
      onClick={() => openDrawer(true)}
      title={t('clock.clickToOpenBookmarks')}
    >
      <div
        className={cn(
          'text-5xl sm:text-6xl font-semibold tracking-tight',
          followAccent ? 'text-primary' : 'text-fg',
          'drop-shadow-[0_10px_30px_rgba(0,0,0,0.25)]',
        )}
      >
        {time}
      </div>
      {showDate ? <div className="mt-2 text-sm text-fg/70">{date}</div> : null}
    </div>
  )
}



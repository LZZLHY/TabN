import { useEffect, useMemo, useState } from 'react'
import { useAppearanceStore } from '../stores/appearance'
import { cn } from '../utils/cn'
import { useBookmarkDrawerStore } from '../stores/bookmarkDrawer'

function formatTime(d: Date, opts: { hour12: boolean; showSeconds: boolean }) {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    ...(opts.showSeconds ? { second: '2-digit' } : {}),
    hour12: opts.hour12,
  }).format(d)
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d)
}

export function Clock() {
  const [now, setNow] = useState(() => new Date())
  const hourCycle = useAppearanceStore((s) => s.clockHourCycle)
  const showSeconds = useAppearanceStore((s) => s.clockShowSeconds)
  const showDate = useAppearanceStore((s) => s.clockShowDate)
  const followAccent = useAppearanceStore((s) => s.clockFollowAccent)
  const openDrawer = useBookmarkDrawerStore((s) => s.setOpen)

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const time = useMemo(
    () => formatTime(now, { hour12: hourCycle === '12', showSeconds }),
    [hourCycle, now, showSeconds],
  )
  const date = useMemo(() => (showDate ? formatDate(now) : ''), [now, showDate])

  return (
    <div 
      className="text-center cursor-pointer select-none transition-transform hover:scale-[1.02] active:scale-[0.98]"
      onClick={() => openDrawer(true)}
      title="点击打开书签页"
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



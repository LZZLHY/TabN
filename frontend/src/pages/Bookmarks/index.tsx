import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { apiFetch } from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import { normalizeUrl } from '../../utils/url'

type Bookmark = {
  id: string
  name: string
  url: string
  note: string | null
  createdAt: string
  updatedAt: string
}

export function BookmarksPage() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)

  const [items, setItems] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')

  const canCreate = useMemo(() => Boolean(name.trim()) && Boolean(url.trim()), [name, url])

  const load = async () => {
    if (!token) return
    setLoading(true)
    try {
      const resp = await apiFetch<{ items: Bookmark[] }>('/api/bookmarks', { method: 'GET', token })
      if (!resp.ok) {
        toast.error(resp.message)
        return
      }
      setItems(resp.data.items)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const create = async () => {
    if (!token) {
      toast('请先登录')
      return
    }
    if (!canCreate) return
    const resp = await apiFetch<{ item: Bookmark }>('/api/bookmarks', {
      method: 'POST',
      token,
      body: JSON.stringify({
        name: name.trim(),
        url: normalizeUrl(url),
        note: note.trim() || undefined,
      }),
    })
    if (!resp.ok) {
      toast.error(resp.message)
      return
    }
    toast.success('已添加书签')
    setName('')
    setUrl('')
    setNote('')
    setItems((prev) => [resp.data.item, ...prev])
  }

  const remove = async (id: string) => {
    if (!token) return
    const resp = await apiFetch<{ id: string }>(`/api/bookmarks/${id}`, { method: 'DELETE', token })
    if (!resp.ok) {
      toast.error(resp.message)
      return
    }
    toast('已删除')
    setItems((prev) => prev.filter((x) => x.id !== id))
  }

  if (!user) {
    return (
      <div className="w-full max-w-3xl">
        <div className="glass-modal rounded-2xl p-6 sm:p-8 text-left animate-in fade-in zoom-in-95 duration-200">
          <div className="text-xl font-semibold text-fg">我的书签</div>
          <div className="mt-2 text-sm text-fg/75">登录后才能管理个人书签。</div>
          <div className="mt-5">
            <Button variant="primary" onClick={() => navigate('/login')}>
              去登录
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-3xl">
      <div className="glass-modal rounded-2xl p-6 sm:p-8 text-left animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xl font-semibold text-fg">我的书签</div>
            <div className="mt-1 text-sm text-fg/70">
              {user.nickname} · {loading ? '加载中…' : `${items.length} 条`}
            </div>
          </div>
          <Button variant="glass" onClick={load} disabled={loading}>
            刷新
          </Button>
        </div>

        <div className="mt-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="text-sm text-fg/80">网站名称</div>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：GitHub" />
            </div>
            <div className="space-y-2">
              <div className="text-sm text-fg/80">网址</div>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={() => {
                  const n = normalizeUrl(url)
                  if (n && n !== url) setUrl(n)
                }}
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-sm text-fg/80">备注（选填）</div>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例如：常用仓库 / 工作相关 / 学习资料…"
              onKeyDown={(e) => {
                if (e.key === 'Enter') create()
              }}
            />
          </div>
          <div className="flex justify-end">
            <Button variant="primary" onClick={create} disabled={!canCreate}>
              添加
            </Button>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          {items.map((b) => (
            <div
              key={b.id}
              className="glass-panel rounded-2xl p-4 flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="font-medium text-fg truncate">{b.name}</div>
                <a
                  className="text-sm text-primary hover:underline break-all"
                  href={b.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {b.url}
                </a>
                {b.note ? <div className="mt-1 text-sm text-fg/70">{b.note}</div> : null}
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => remove(b.id)}>
                  删除
                </Button>
              </div>
            </div>
          ))}

          {!loading && items.length === 0 ? (
            <div className="text-sm text-fg/70">还没有书签，先添加一个吧。</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}



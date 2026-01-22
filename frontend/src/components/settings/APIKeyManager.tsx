import { useEffect, useState } from 'react'
import { Copy, RefreshCw, Key, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import { cn } from '../../utils/cn'
import { Button } from '../ui/Button'

interface APIKeyStatus {
  hasKey: boolean
  createdAt?: string
}

interface APIKeyData {
  key: string
  createdAt: string
}

export function APIKeyManager() {
  const token = useAuthStore((s) => s.token)
  const [loading, setLoading] = useState(false)
  const [hasKey, setHasKey] = useState(false)
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)

  // Fetch API key status on mount
  useEffect(() => {
    if (!token) return
    
    const fetchStatus = async () => {
      setLoading(true)
      try {
        const resp = await apiFetch<APIKeyStatus>('/api/api-keys', {
          method: 'GET',
          token,
        })
        if (resp.ok) {
          setHasKey(resp.data.hasKey)
          setCreatedAt(resp.data.createdAt ?? null)
        }
      } finally {
        setLoading(false)
      }
    }
    
    void fetchStatus()
  }, [token])

  // Generate new API key
  const handleGenerate = async () => {
    if (!token) return
    
    setLoading(true)
    try {
      const resp = await apiFetch<APIKeyData>('/api/api-keys', {
        method: 'POST',
        token,
      })
      if (resp.ok) {
        setHasKey(true)
        setCreatedAt(resp.data.createdAt)
        setNewKey(resp.data.key)
        toast.success('API 密钥已生成')
      } else {
        toast.error(resp.message)
      }
    } finally {
      setLoading(false)
    }
  }

  // Regenerate API key (delete old, create new)
  const handleRegenerate = async () => {
    if (!token) return
    
    setLoading(true)
    setShowRegenerateConfirm(false)
    try {
      const resp = await apiFetch<APIKeyData>('/api/api-keys', {
        method: 'DELETE',
        token,
      })
      if (resp.ok) {
        setHasKey(true)
        setCreatedAt(resp.data.createdAt)
        setNewKey(resp.data.key)
        toast.success('API 密钥已重新生成，旧密钥已失效')
      } else {
        toast.error(resp.message)
      }
    } finally {
      setLoading(false)
    }
  }

  // Copy key to clipboard
  const handleCopy = async () => {
    if (!newKey) return
    
    try {
      await navigator.clipboard.writeText(newKey)
      toast.success('已复制到剪贴板')
    } catch {
      toast.error('复制失败，请手动复制')
    }
  }

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  if (!token) {
    return (
      <div className="text-sm text-fg/60">
        请先登录以管理 API 密钥
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Key Status */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Key className="w-4 h-4 text-fg/60" />
          <span className="text-fg/80">
            密钥状态：
            {loading ? (
              <span className="text-fg/50">加载中...</span>
            ) : hasKey ? (
              <span className="text-green-400">已生成</span>
            ) : (
              <span className="text-fg/50">未生成</span>
            )}
          </span>
        </div>
        
        {hasKey && createdAt && (
          <div className="text-xs text-fg/50">
            创建时间：{formatDate(createdAt)}
          </div>
        )}
      </div>

      {/* New Key Display (only shown once after generation) */}
      {newKey && (
        <div className="space-y-2">
          <div className={cn(
            'p-3 rounded-xl',
            'bg-yellow-500/10 border border-yellow-500/30',
          )}>
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-yellow-200">
                请立即保存此密钥！关闭后将无法再次查看完整密钥。
              </div>
            </div>
            <div className={cn(
              'p-2 rounded-lg font-mono text-sm break-all',
              'bg-glass/10 border border-glass-border/20',
            )}>
              {newKey}
            </div>
          </div>
          <Button
            variant="glass"
            size="sm"
            onClick={handleCopy}
            className="w-full"
          >
            <Copy className="w-4 h-4" />
            复制密钥
          </Button>
        </div>
      )}

      {/* Masked Key Display (when key exists but not newly generated) */}
      {hasKey && !newKey && (
        <div className={cn(
          'p-2 rounded-lg font-mono text-sm text-fg/60',
          'bg-glass/10 border border-glass-border/20',
        )}>
          bk_***...（密钥已隐藏）
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {!hasKey ? (
          <Button
            variant="primary"
            size="sm"
            onClick={handleGenerate}
            disabled={loading}
          >
            <Key className="w-4 h-4" />
            {loading ? '生成中...' : '生成密钥'}
          </Button>
        ) : (
          <>
            {showRegenerateConfirm ? (
              <div className="w-full space-y-2">
                <div className={cn(
                  'p-3 rounded-xl text-xs',
                  'bg-red-500/10 border border-red-500/30 text-red-200',
                )}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      重新生成将使旧密钥立即失效，所有使用旧密钥的扩展将无法继续工作。确定要继续吗？
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRegenerateConfirm(false)}
                    disabled={loading}
                  >
                    取消
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleRegenerate}
                    disabled={loading}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    {loading ? '生成中...' : '确认重新生成'}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="glass"
                size="sm"
                onClick={() => setShowRegenerateConfirm(true)}
                disabled={loading}
              >
                <RefreshCw className="w-4 h-4" />
                重新生成密钥
              </Button>
            )}
          </>
        )}
      </div>

      {/* Description */}
      <div className="text-xs text-fg/50 leading-relaxed">
        API 密钥用于第三方扩展访问图标更新接口。生成后请妥善保管，不要泄露给他人。
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t, i18n } = useTranslation()
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
        toast.success(t('settings.apiKey.generated'))
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
        toast.success(t('settings.apiKey.regenerated'))
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
      toast.success(t('toast.copied'))
    } catch {
      toast.error(t('toast.copyFailed'))
    }
  }

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleString(i18n.language === 'zh-CN' ? 'zh-CN' : 'en-US', {
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
        {t('settings.apiKey.loginRequired')}
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
            {t('settings.apiKey.status')}
            {loading ? (
              <span className="text-fg/50">{t('common.loading')}</span>
            ) : hasKey ? (
              <span className="text-green-400">{t('settings.apiKey.statusGenerated')}</span>
            ) : (
              <span className="text-fg/50">{t('settings.apiKey.statusNotGenerated')}</span>
            )}
          </span>
        </div>
        
        {hasKey && createdAt && (
          <div className="text-xs text-fg/50">
            {t('settings.apiKey.createdAt')}{formatDate(createdAt)}
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
                {t('settings.apiKey.saveWarning')}
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
            {t('settings.apiKey.copy')}
          </Button>
        </div>
      )}

      {/* Masked Key Display (when key exists but not newly generated) */}
      {hasKey && !newKey && (
        <div className={cn(
          'p-2 rounded-lg font-mono text-sm text-fg/60',
          'bg-glass/10 border border-glass-border/20',
        )}>
          {t('settings.apiKey.masked')}
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
            {loading ? t('settings.apiKey.generating') : t('settings.apiKey.generate')}
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
                      {t('settings.apiKey.regenerateWarning')}
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
                    {t('common.cancel')}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleRegenerate}
                    disabled={loading}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    {loading ? t('settings.apiKey.generating') : t('settings.apiKey.confirmRegenerate')}
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
                {t('settings.apiKey.regenerate')}
              </Button>
            )}
          </>
        )}
      </div>

      {/* Description */}
      <div className="text-xs text-fg/50 leading-relaxed">
        {t('settings.apiKey.description')}
      </div>
    </div>
  )
}

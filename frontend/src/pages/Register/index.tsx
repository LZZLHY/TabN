import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useAuthStore } from '../../stores/auth'

export function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const register = useAuthStore((s) => s.register)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)

  const identifierOk = useMemo(
    () => Boolean(username.trim()) || Boolean(email.trim()) || Boolean(phone.trim()),
    [username, email, phone],
  )
  const disabled = useMemo(
    () => loading || !password || !identifierOk,
    [loading, password, identifierOk],
  )

  const onSubmit = async () => {
    if (disabled) return
    setLoading(true)
    try {
      const resp = await register({
        username: username.trim() || 'user_' + Date.now(),
        password,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        nickname: nickname.trim() || undefined,
      })
      if (!resp.ok) {
        toast.error(resp.message)
        return
      }
      toast.success(t('auth.registerSuccess'))
      navigate('/', { replace: true })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="glass-modal rounded-2xl p-6 sm:p-8 text-left animate-in fade-in zoom-in-95 duration-200">
        <div className="text-xl font-semibold text-fg">{t('auth.register')}</div>

        <div className="mt-6 space-y-3">
          <div className="space-y-2">
            <div className="text-sm text-fg/80">{t('auth.username')}</div>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('auth.username')}
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm text-fg/80">{t('auth.password')}</div>
            <div className="relative">
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-fg/50 hover:text-fg/80 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="text-sm text-fg/80">{t('auth.email')}</div>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.email')}
                type="email"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm text-fg/80">{t('auth.phone')}</div>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('auth.phone')}
                autoComplete="tel"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-fg/80">{t('auth.nickname')}</div>
            <Input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={t('auth.nickname')}
              autoComplete="nickname"
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSubmit()
              }}
            />
            {!identifierOk && (
              <div className="text-xs text-red-200">{t('auth.identifierRequired')}</div>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="text-sm text-fg/70">
            {t('auth.hasAccount')}{' '}
            <NavLink to="/login" className="text-primary hover:underline">
              {t('auth.login')}
            </NavLink>
          </div>
          <Button variant="primary" onClick={onSubmit} disabled={disabled}>
            {loading ? t('common.loading') : t('auth.register')}
          </Button>
        </div>
      </div>
    </div>
  )
}



import { useMemo, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useAuthStore } from '../../stores/auth'

export function RegisterPage() {
  const navigate = useNavigate()
  const register = useAuthStore((s) => s.register)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)

  const contactOk = useMemo(() => Boolean(email.trim()) || Boolean(phone.trim()), [email, phone])
  const disabled = useMemo(
    () => loading || !username.trim() || !password || !contactOk,
    [contactOk, loading, password, username],
  )

  const onSubmit = async () => {
    if (disabled) return
    setLoading(true)
    try {
      const resp = await register({
        username: username.trim(),
        password,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        nickname: nickname.trim() || undefined,
      })
      if (!resp.ok) {
        toast.error(resp.message)
        return
      }
      toast.success('注册成功，已自动登录')
      navigate('/', { replace: true })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="glass-modal rounded-2xl p-6 sm:p-8 text-left animate-in fade-in zoom-in-95 duration-200">
        <div className="text-xl font-semibold text-fg">注册</div>
        <div className="mt-2 text-sm text-fg/75 leading-relaxed">
          邮箱/手机号至少填写一个。昵称可选（不填会自动生成且全局唯一）。
        </div>

        <div className="mt-6 space-y-3">
          <div className="space-y-2">
            <div className="text-sm text-fg/80">账号</div>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="自定义账号（例如：dhao1）"
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm text-fg/80">密码</div>
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位"
              type="password"
              autoComplete="new-password"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="text-sm text-fg/80">邮箱（选填）</div>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm text-fg/80">手机号（选填）</div>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="13800000000"
                autoComplete="tel"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-fg/80">昵称（选填）</div>
            <Input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="不填则随机生成（可注册后在设置中修改）"
              autoComplete="nickname"
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSubmit()
              }}
            />
            {!contactOk ? (
              <div className="text-xs text-red-200">邮箱/手机号至少填一个</div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="text-sm text-fg/70">
            已有账号？{' '}
            <NavLink to="/login" className="text-primary hover:underline">
              去登录
            </NavLink>
          </div>
          <Button variant="primary" onClick={onSubmit} disabled={disabled}>
            {loading ? '注册中…' : '注册'}
          </Button>
        </div>
      </div>
    </div>
  )
}



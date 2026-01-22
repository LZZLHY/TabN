import { useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useAuthStore } from '../../stores/auth'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const login = useAuthStore((s) => s.login)
  const user = useAuthStore((s) => s.user)

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const disabled = useMemo(
    () => loading || !identifier.trim() || !password,
    [identifier, loading, password],
  )

  const onSubmit = async () => {
    if (disabled) return
    setLoading(true)
    try {
      const resp = await login(identifier.trim(), password)
      if (!resp.ok) {
        toast.error(resp.message)
        return
      }
      toast.success('登录成功')
      
      // Redirect back to previous page or home
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/'
      navigate(from, { replace: true })
    } catch (e) {
      console.error(e)
      toast.error('登录发生错误')
    } finally {
      setLoading(false)
    }
  }

  if (user) {
    return (
      <div className="w-full max-w-md">
        <div className="glass-modal rounded-2xl p-6 sm:p-8 text-left animate-in fade-in zoom-in-95 duration-200">
          <div className="text-xl font-semibold text-fg">你已登录</div>
          <div className="mt-2 text-sm text-fg/70">
            当前用户：<span className="font-medium text-fg">{user.nickname}</span>
          </div>
          <div className="mt-6 flex gap-2">
            <Button variant="primary" onClick={() => navigate('/')}>
              回到首页
            </Button>
            <Button variant="glass" onClick={() => navigate('/bookmarks')}>
              我的书签
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <form 
        className="glass-modal rounded-2xl p-6 sm:p-8 text-left animate-in fade-in zoom-in-95 duration-200"
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit()
        }}
      >
        <div className="text-xl font-semibold text-fg">登录</div>

        <div className="mt-6 space-y-3">
          <div className="space-y-2">
            <div className="text-sm text-fg/80">账号 / 邮箱 / 手机号</div>
            <Input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="请输入账号"
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm text-fg/80">密码</div>
            <div className="relative">
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
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
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="text-sm text-fg/70">
            还没有账号？{' '}
            <NavLink to="/register" className="text-primary hover:underline">
              去注册
            </NavLink>
          </div>
          <Button type="submit" variant="primary" disabled={disabled}>
            {loading ? '登录中…' : '登录'}
          </Button>
        </div>
      </form>
    </div>
  )
}



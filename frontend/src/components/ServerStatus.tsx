import { AlertCircle, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { apiFetch } from '../services/api'
import { cn } from '../utils/cn'

export function ServerStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [checking, setChecking] = useState(false)

  const checkHealth = async () => {
    setChecking(true)
    try {
      // 检查 /health 接口
      const res = await apiFetch<{ ok: boolean }>('/health')
      if (res.ok) {
        setIsOnline(true)
      } else {
        setIsOnline(false)
      }
    } catch {
      setIsOnline(false)
    } finally {
      // 延迟一点为了视觉效果，或者不需要
      setChecking(false)
    }
  }

  useEffect(() => {
    // 初始检查
    checkHealth()
    
    // 每 10 秒轮询一次
    const interval = setInterval(checkHealth, 10000)
    return () => clearInterval(interval)
  }, [])

  // 如果在线，什么都不显示
  if (isOnline) return null

  // 使用 Portal 渲染到 body 顶层，确保不被遮挡
  return createPortal(
    <div className="fixed top-0 left-0 right-0 z-[9999] animate-in slide-in-from-top duration-300">
      <div className="bg-rose-500 text-white px-4 py-3 shadow-lg flex items-center justify-center gap-3">
        <AlertCircle className="h-5 w-5 animate-pulse" />
        <span className="font-medium text-sm">
          无法连接到服务器。数据库可能未启动，或者后端服务已停止。
        </span>
        <button
          onClick={checkHealth}
          disabled={checking}
          className={cn(
            "ml-4 px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-semibold transition-colors flex items-center gap-1.5",
            checking && "opacity-50 cursor-not-allowed"
          )}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", checking && "animate-spin")} />
          {checking ? '连接中...' : '重试'}
        </button>
      </div>
    </div>,
    document.body
  )
}

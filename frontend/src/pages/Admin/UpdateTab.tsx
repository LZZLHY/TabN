/**
 * 系统更新 Tab 组件
 * 提供版本检查和智能更新功能
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  RefreshCw,
  Download,
  Package,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Zap,
  AlertTriangle,
  Clock,
  Server,
  Database,
  Monitor,
  Loader2,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { apiFetch } from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import { useUpdateStateStore } from '../../stores/updateState'
import { cn } from '../../utils/cn'

interface VersionInfo {
  current: string
  currentPatch: number
  latest: string
  latestPatch: number
  hasUpdate: boolean
  releaseNotes: string
  releaseDate: string
  needsRestart: boolean
  needsDeps: boolean
  needsMigration: boolean
  frontendOnly: boolean
  hasGit: boolean
}

interface ServerStatus {
  startTime: string
  startupDuration: string
  uptime: string
  uptimeMs: number
  totalUptime: string
  totalUptimeMs: number
  currentVersion: string
  currentPatch: number
}

// 更新状态
type UpdateState = 
  | { phase: 'idle' }
  | { phase: 'pulling'; message: string }
  | { phase: 'installing'; message: string }
  | { phase: 'restarting'; message: string; startTime: number }
  | { phase: 'waiting'; message: string; dots: number }
  | { phase: 'success'; message: string }

export function UpdateTab() {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)
  const globalUpdating = useUpdateStateStore((s) => s.isUpdating)
  const setGlobalUpdating = useUpdateStateStore((s) => s.setUpdating)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null)
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null)
  const [displayUptime, setDisplayUptime] = useState<string>(t('admin.update.loading'))
  const [displayTotalUptime, setDisplayTotalUptime] = useState<string>(t('admin.update.loading'))
  
  // 更新状态
  const [updateState, setUpdateState] = useState<UpdateState>({ phase: 'idle' })
  const pollIntervalRef = useRef<number | null>(null)
  const dotsIntervalRef = useRef<number | null>(null)
  
  // 确认重启模态框
  const [showRestartConfirm, setShowRestartConfirm] = useState(false)

  // 清理轮询
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      if (dotsIntervalRef.current) clearInterval(dotsIntervalRef.current)
    }
  }, [])

  // 格式化运行时长
  const formatUptime = useCallback((ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return `${days}${t('admin.update.days')} ${hours % 24}${t('admin.update.hours')} ${minutes % 60}${t('admin.update.minutes')}`
    }
    if (hours > 0) {
      return `${hours}${t('admin.update.hours')} ${minutes % 60}${t('admin.update.minutes')} ${seconds % 60}${t('admin.update.seconds')}`
    }
    if (minutes > 0) {
      return `${minutes}${t('admin.update.minutes')} ${seconds % 60}${t('admin.update.seconds')}`
    }
    return `${seconds}${t('admin.update.seconds')}`
  }, [t])

  // 获取服务器状态
  const fetchServerStatus = useCallback(async () => {
    if (!token) return
    try {
      const resp = await apiFetch<ServerStatus>('/api/admin/server-status', { method: 'GET', token })
      if (resp.ok) {
        setServerStatus(resp.data)
      }
    } catch {
      // 忽略错误
    }
  }, [token])

  // 初始获取服务器状态
  useEffect(() => {
    fetchServerStatus()
  }, [fetchServerStatus])

  // 动态更新运行时长（每秒更新一次）
  // Requirement 4.4: 每秒更新显示
  useEffect(() => {
    if (!serverStatus?.startTime) return
    
    const startTime = new Date(serverStatus.startTime).getTime()
    const baseTotalUptimeMs = serverStatus.totalUptimeMs || 0
    const baseSessionUptimeMs = serverStatus.uptimeMs || 0
    
    const updateUptime = () => {
      // 计算本次会话运行时长
      const sessionUptime = Date.now() - startTime
      setDisplayUptime(formatUptime(sessionUptime))
      
      // 计算总运行时长：基础总时长 + (当前会话时长 - 基础会话时长)
      // 这样可以保持总时长与会话时长同步增长
      const totalUptime = baseTotalUptimeMs + (sessionUptime - baseSessionUptimeMs)
      setDisplayTotalUptime(formatUptime(totalUptime))
    }
    
    // 立即更新一次
    updateUptime()
    
    // 每秒更新
    const interval = setInterval(updateUptime, 1000)
    return () => clearInterval(interval)
  }, [serverStatus?.startTime, serverStatus?.totalUptimeMs, serverStatus?.uptimeMs, formatUptime])

  // 检查更新（silent 模式不显示"已是最新版本"提示）
  const checkUpdate = useCallback(async (silent = false) => {
    if (!token) return
    setChecking(true)
    try {
      const resp = await apiFetch<VersionInfo>('/api/admin/update/check', { method: 'GET', token })
      if (!resp.ok) {
        if (!silent) toast.error(resp.message)
        return
      }
      setVersionInfo(resp.data)
      if (!silent) {
        if (resp.data.hasUpdate) {
          const patchInfo = resp.data.latestPatch ? ` (${resp.data.latestPatch})` : ''
          toast.success(t('admin.update.newVersion', { version: resp.data.latest, patch: patchInfo }))
          if (!resp.data.hasGit) {
            toast.warning(t('admin.update.noGit'))
          }
        } else {
          toast.success(t('admin.update.upToDate'))
        }
      }
    } catch {
      if (!silent) toast.error(t('admin.update.checkFailed'))
    } finally {
      setChecking(false)
    }
  }, [token, t])

  // 组件挂载时自动检测更新
  useEffect(() => {
    checkUpdate(true)
  }, [checkUpdate])

  // 执行更新
  const doUpdate = useCallback(async () => {
    if (!token || !versionInfo) return
    
    // 清理之前的 interval
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    if (dotsIntervalRef.current) clearInterval(dotsIntervalRef.current)
    
    // 开始更新流程 - 根据是否需要安装依赖显示不同消息
    const initialMessage = versionInfo.needsDeps 
      ? t('admin.update.pullingWithDeps')
      : t('admin.update.pulling')
    setUpdateState({ phase: 'pulling', message: initialMessage })
    setGlobalUpdating(true, t('admin.update.updating'))
    
    // 标记是否已经发送请求成功
    let requestSucceeded = false
    
    try {
      const resp = await apiFetch<{ message: string }>('/api/admin/update/full', {
        method: 'POST',
        token,
        body: JSON.stringify({
          needsDeps: versionInfo.needsDeps,
          needsRestart: versionInfo.needsRestart,
        }),
      })
      
      if (!resp.ok) {
        setUpdateState({ phase: 'idle' })
        setGlobalUpdating(false)
        toast.error(resp.message)
        return
      }
      
      requestSucceeded = true
      
      // 如果需要重启后端
      if (versionInfo.needsRestart) {
        setUpdateState({ phase: 'restarting', message: t('admin.update.restarting'), startTime: Date.now() })
        
        // 启动等待动画
        let dots = 0
        dotsIntervalRef.current = window.setInterval(() => {
          dots = (dots + 1) % 4
          setUpdateState(prev => 
            prev.phase === 'waiting' ? { ...prev, dots } : prev
          )
        }, 500)
        
        // 等待 2 秒后开始轮询
        await new Promise(resolve => setTimeout(resolve, 2000))
        setUpdateState({ phase: 'waiting', message: t('admin.update.waiting'), dots: 0 })
        
        // 轮询检测后端是否恢复
        const maxWaitTime = 60000 // 最多等待 60 秒
        const pollInterval = 1000 // 每秒检测一次
        const startTime = Date.now()
        
        const checkServer = async (): Promise<boolean> => {
          try {
            const resp = await fetch('/api/admin/server-status', {
              method: 'GET',
              headers: { 'Authorization': `Bearer ${token}` },
            })
            return resp.ok
          } catch {
            return false
          }
        }
        
        // 开始轮询
        pollIntervalRef.current = window.setInterval(async () => {
          const elapsed = Date.now() - startTime
          
          if (elapsed > maxWaitTime) {
            // 超时
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
            if (dotsIntervalRef.current) clearInterval(dotsIntervalRef.current)
            setUpdateState({ phase: 'idle' })
            setGlobalUpdating(false)
            toast.error(t('admin.update.timeout'))
            return
          }
          
          const isUp = await checkServer()
          if (isUp) {
            // 后端恢复了
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
            if (dotsIntervalRef.current) clearInterval(dotsIntervalRef.current)
            setUpdateState({ phase: 'success', message: t('admin.update.success') })
            toast.success(t('admin.update.successSimple'))
            setTimeout(() => window.location.reload(), 1500)
          }
        }, pollInterval)
        
      } else {
        // 不需要重启，直接完成
        setUpdateState({ phase: 'success', message: t('admin.update.successSimple') })
        setGlobalUpdating(false)
        toast.success(resp.data.message)
        setTimeout(() => {
          setUpdateState({ phase: 'idle' })
          checkUpdate()
        }, 1500)
      }
    } catch {
      // 只有在请求成功后（后端开始重启）才忽略网络错误
      if (requestSucceeded && versionInfo.needsRestart) {
        return
      }
      setUpdateState({ phase: 'idle' })
      setGlobalUpdating(false)
      toast.error(t('admin.update.failed'))
    }
  }, [token, versionInfo, checkUpdate, setGlobalUpdating, t])

  // 仅拉取代码
  const pullOnly = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const resp = await apiFetch<{ message: string }>('/api/admin/update/pull', { method: 'POST', token })
      if (!resp.ok) {
        toast.error(resp.message)
        return
      }
      toast.success(resp.data.message)
      checkUpdate()
    } catch {
      toast.error(t('admin.update.failed'))
    } finally {
      setLoading(false)
    }
  }, [token, checkUpdate, t])

  // 安装依赖
  const installDeps = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const resp = await apiFetch<{ message: string }>('/api/admin/update/deps', { method: 'POST', token })
      if (!resp.ok) {
        toast.error(resp.message)
        return
      }
      toast.success(resp.data.message)
    } catch {
      toast.error(t('admin.update.failed'))
    } finally {
      setLoading(false)
    }
  }, [token, t])

  // 重启服务
  const restartService = useCallback(async () => {
    if (!token) return
    
    // 清理之前的 interval
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    if (dotsIntervalRef.current) clearInterval(dotsIntervalRef.current)
    
    setShowRestartConfirm(false)
    setUpdateState({ phase: 'restarting', message: t('admin.update.restarting'), startTime: Date.now() })
    setGlobalUpdating(true, t('admin.update.restarting'))
    
    try {
      await apiFetch<{ message: string }>('/api/admin/update/restart', { method: 'POST', token })
      // 请求成功后开始轮询
    } catch {
      // 网络错误是预期的（后端已重启）
    }
    
    // 启动等待动画
    let dots = 0
    dotsIntervalRef.current = window.setInterval(() => {
      dots = (dots + 1) % 4
      setUpdateState(prev => 
        prev.phase === 'waiting' ? { ...prev, dots } : prev
      )
    }, 500)
    
    // 等待 2 秒后开始轮询
    await new Promise(resolve => setTimeout(resolve, 2000))
    setUpdateState({ phase: 'waiting', message: t('admin.update.waiting'), dots: 0 })
    
    // 轮询检测后端是否恢复
    const maxWaitTime = 60000
    const pollInterval = 1000
    const startTime = Date.now()
    
    const checkServer = async (): Promise<boolean> => {
      try {
        const resp = await fetch('/api/admin/server-status', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` },
        })
        return resp.ok
      } catch {
        return false
      }
    }
    
    pollIntervalRef.current = window.setInterval(async () => {
      const elapsed = Date.now() - startTime
      
      if (elapsed > maxWaitTime) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
        if (dotsIntervalRef.current) clearInterval(dotsIntervalRef.current)
        setUpdateState({ phase: 'idle' })
        setGlobalUpdating(false)
        toast.error(t('admin.update.timeout'))
        return
      }
      
      const isUp = await checkServer()
      if (isUp) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
        if (dotsIntervalRef.current) clearInterval(dotsIntervalRef.current)
        setUpdateState({ phase: 'success', message: t('admin.update.success') })
        toast.success(t('admin.update.successSimple'))
        setTimeout(() => window.location.reload(), 1500)
      }
    }, pollInterval)
  }, [token, setGlobalUpdating, t])

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-fg tracking-tight">{t('admin.update.title')}</h2>
          <p className="mt-1 text-sm text-fg/60">{t('admin.update.subtitle')}</p>
        </div>
        <Button
          variant="glass"
          onClick={() => checkUpdate(false)}
          disabled={checking}
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", checking && "animate-spin")} />
          {t('admin.update.checkUpdate')}
        </Button>
      </div>

      {/* 服务器状态卡片 */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-medium text-fg">{t('admin.update.serverStatus')}</div>
            <div className="text-sm text-fg/60">{t('admin.update.serverStatusDesc')}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-glass/5 rounded-xl">
            <div className="flex items-center gap-2 text-fg/60 text-sm mb-1">
              <Clock className="w-4 h-4" />
              {t('admin.update.startupDuration')}
            </div>
            <div className="text-lg font-medium text-fg">
              {serverStatus?.startupDuration || t('admin.update.loading')}
            </div>
          </div>
          
          <div className="p-4 bg-glass/5 rounded-xl">
            <div className="flex items-center gap-2 text-fg/60 text-sm mb-1">
              <Zap className="w-4 h-4" />
              {t('admin.update.sessionUptime')}
            </div>
            <div className="text-lg font-medium text-fg">
              {displayUptime}
            </div>
          </div>
          
          <div className="p-4 bg-glass/5 rounded-xl">
            <div className="flex items-center gap-2 text-fg/60 text-sm mb-1">
              <Clock className="w-4 h-4" />
              {t('admin.update.totalUptime')}
            </div>
            <div className="text-lg font-medium text-fg">
              {displayTotalUptime}
            </div>
          </div>
          
          <div className="p-4 bg-glass/5 rounded-xl">
            <div className="flex items-center gap-2 text-fg/60 text-sm mb-1">
              <Server className="w-4 h-4" />
              {t('admin.update.startTime')}
            </div>
            <div className="text-sm font-medium text-fg">
              {serverStatus?.startTime 
                ? new Date(serverStatus.startTime).toLocaleString()
                : t('admin.update.loading')}
            </div>
          </div>
        </div>
      </div>

      {/* 版本信息卡片 */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              versionInfo?.hasUpdate 
                ? "bg-amber-500/10 text-amber-500" 
                : "bg-green-500/10 text-green-500"
            )}>
              {versionInfo?.hasUpdate ? <AlertCircle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
            </div>
            <div>
              <div className="text-lg font-medium text-fg">
                {versionInfo?.hasUpdate ? t('admin.update.hasUpdate') : t('admin.update.upToDate')}
              </div>
              <div className="text-sm text-fg/60">
                {t('admin.update.currentVersion')}: <code className="px-1.5 py-0.5 bg-glass/10 rounded">v{versionInfo?.current || serverStatus?.currentVersion || t('admin.update.unknown')}{(versionInfo?.currentPatch || serverStatus?.currentPatch) ? ` (${versionInfo?.currentPatch || serverStatus?.currentPatch})` : ''}</code>
                {versionInfo?.hasUpdate && (
                  <>
                    {' → '}
                    <code className="px-1.5 py-0.5 bg-primary/10 text-primary rounded">v{versionInfo.latest}{versionInfo.latestPatch ? ` (${versionInfo.latestPatch})` : ''}</code>
                  </>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => checkUpdate(false)}
            disabled={checking || globalUpdating}
            className="flex items-center gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", checking && "animate-spin")} />
            {checking ? t('admin.update.checking') : t('admin.logs.refresh')}
          </Button>
        </div>

        {/* 更新提示 */}
        {versionInfo?.hasUpdate && (
          <div className="space-y-4">
            {/* 更新类型提示 */}
            <div className="flex flex-wrap gap-3">
              {/* 仅前端更新 - 最快速 */}
              {versionInfo.frontendOnly && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-lg text-sm">
                  <Monitor className="w-4 h-4" />
                  {t('admin.update.frontendOnly')}
                </div>
              )}
              {/* 数据库迁移 */}
              {versionInfo.needsMigration && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg text-sm">
                  <Database className="w-4 h-4" />
                  {t('admin.update.needsMigration')}
                </div>
              )}
              {/* 安装依赖 */}
              {versionInfo.needsDeps && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg text-sm">
                  <Package className="w-4 h-4" />
                  {t('admin.update.needsDeps')}
                </div>
              )}
              {/* 重启后端 */}
              {versionInfo.needsRestart && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-sm">
                  <RotateCcw className="w-4 h-4" />
                  {t('admin.update.needsRestart')}
                </div>
              )}
              {/* 无缝更新（无需重启、无需依赖、非仅前端） */}
              {!versionInfo.needsRestart && !versionInfo.needsDeps && !versionInfo.needsMigration && !versionInfo.frontendOnly && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg text-sm">
                  <Zap className="w-4 h-4" />
                  {t('admin.update.seamless')}
                </div>
              )}
            </div>

            {/* 一键更新按钮 */}
            <Button
              variant="primary"
              onClick={doUpdate}
              disabled={updateState.phase !== 'idle'}
              className="w-full sm:w-auto"
            >
              {updateState.phase !== 'idle' ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {t('admin.update.updating')}
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  {t('admin.update.update')}
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* 无 Git 警告 */}
      {versionInfo && !versionInfo.hasGit && (
        <div className="glass-panel rounded-2xl p-6 border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-medium text-fg">{t('admin.update.noGitTitle')}</div>
              <p className="mt-1 text-sm text-fg/60">
                {t('admin.update.noGit')}
              </p>
              <a 
                href="https://github.com/LZZLHY/TabN/releases" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block mt-3 text-sm text-primary hover:underline"
              >
                {t('admin.update.goToGithub')} →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 手动操作 */}
      {versionInfo?.hasGit && (
        <div className="glass-panel rounded-2xl p-6">
          <h3 className="text-lg font-medium text-fg mb-4">{t('admin.update.manualActions')}</h3>
          <div className="flex flex-wrap gap-3">
            <Button variant="glass" onClick={pullOnly} disabled={loading || updateState.phase !== 'idle'}>
              <Download className="w-4 h-4 mr-2" />
              {t('admin.update.pullOnly')}
            </Button>
            <Button variant="glass" onClick={installDeps} disabled={loading || updateState.phase !== 'idle'}>
              <Package className="w-4 h-4 mr-2" />
              {t('admin.update.installDeps')}
            </Button>
            <Button variant="glass" onClick={() => setShowRestartConfirm(true)} disabled={loading || updateState.phase !== 'idle'} className="text-red-500 hover:bg-red-50/10">
              <RotateCcw className="w-4 h-4 mr-2" />
              {t('admin.update.restart')}
            </Button>
          </div>
          <p className="mt-3 text-xs text-fg/50">
            {t('admin.update.manualHint')}
          </p>
        </div>
      )}

      {/* 重启确认模态框 */}
      {showRestartConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/35 dark:bg-black/60 backdrop-blur-sm" onClick={() => setShowRestartConfirm(false)} />
          <div className="relative glass-panel rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
              <RotateCcw className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-fg text-center mb-2">{t('admin.update.restartConfirm')}</h3>
            <p className="text-sm text-fg/60 text-center mb-6">
              {t('admin.update.restartWarning')}
            </p>
            <div className="flex gap-3">
              <Button variant="glass" className="flex-1" onClick={() => setShowRestartConfirm(false)}>
                {t('common.cancel')}
              </Button>
              <Button variant="primary" className="flex-1 bg-red-500 hover:bg-red-600" onClick={restartService}>
                {t('admin.update.restartConfirm')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 更新进度遮罩 */}
      {updateState.phase !== 'idle' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/35 dark:bg-black/60 backdrop-blur-sm" />
          <div className="relative glass-panel rounded-2xl p-8 max-w-md w-full text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              {updateState.phase === 'success' ? (
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              ) : (
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-fg mb-2">
              {updateState.phase === 'pulling' && t('admin.update.updating')}
              {updateState.phase === 'installing' && t('admin.update.pullingWithDeps')}
              {updateState.phase === 'restarting' && t('admin.update.restarting')}
              {updateState.phase === 'waiting' && t('admin.update.waiting')}
              {updateState.phase === 'success' && t('admin.update.successSimple')}
            </h3>
            <p className="text-sm text-fg/60">
              {updateState.message}
              {updateState.phase === 'waiting' && '.'.repeat(updateState.dots)}
            </p>
            {(updateState.phase === 'restarting' || updateState.phase === 'waiting') && (
              <p className="mt-3 text-xs text-fg/40">
                {t('admin.update.restarting')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

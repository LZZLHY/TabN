/**
 * 系统更新 Tab 组件
 * 提供版本检查和智能更新功能
 */

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  RefreshCw,
  Download,
  Package,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  GitCommit,
  FileCode,
  Clock,
  User,
  Zap,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { apiFetch } from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import { cn } from '../../utils/cn'

interface CommitInfo {
  hash: string
  message: string
  date: string
  author: string
}

interface VersionInfo {
  current: string
  latest: string
  hasUpdate: boolean
  commits: CommitInfo[]
  changedFiles: string[]
  needsRestart: boolean
  needsDeps: boolean
}

export function UpdateTab() {
  const token = useAuthStore((s) => s.token)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null)

  // 检查更新
  const checkUpdate = useCallback(async () => {
    if (!token) return
    setChecking(true)
    try {
      const resp = await apiFetch<VersionInfo>('/api/admin/update/check', { method: 'GET', token })
      if (!resp.ok) {
        toast.error(resp.message)
        return
      }
      setVersionInfo(resp.data)
      if (resp.data.hasUpdate) {
        toast.success(`发现 ${resp.data.commits.length} 个新提交`)
      } else {
        toast.success('已是最新版本')
      }
    } catch (error) {
      toast.error('检查更新失败')
    } finally {
      setChecking(false)
    }
  }, [token])

  // 执行更新
  const doUpdate = useCallback(async () => {
    if (!token || !versionInfo) return
    setUpdating(true)
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
        toast.error(resp.message)
        return
      }
      toast.success(resp.data.message)
      
      // 如果需要重启，等待后刷新页面
      if (versionInfo.needsRestart) {
        toast.info('服务重启中，5秒后自动刷新...')
        setTimeout(() => {
          window.location.reload()
        }, 5000)
      } else {
        // 重新检查版本
        setTimeout(() => checkUpdate(), 1000)
      }
    } catch (error) {
      toast.error('更新失败')
    } finally {
      setUpdating(false)
    }
  }, [token, versionInfo, checkUpdate])

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
    } catch (error) {
      toast.error('拉取失败')
    } finally {
      setLoading(false)
    }
  }, [token, checkUpdate])

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
    } catch (error) {
      toast.error('安装依赖失败')
    } finally {
      setLoading(false)
    }
  }, [token])

  // 重启服务
  const restartService = useCallback(async () => {
    if (!token) return
    if (!confirm('确定要重启服务吗？页面将在几秒后自动刷新。')) return
    
    setLoading(true)
    try {
      const resp = await apiFetch<{ message: string }>('/api/admin/update/restart', { method: 'POST', token })
      if (!resp.ok) {
        toast.error(resp.message)
        return
      }
      toast.success(resp.data.message)
      toast.info('5秒后自动刷新页面...')
      setTimeout(() => window.location.reload(), 5000)
    } catch (error) {
      toast.error('重启失败')
    } finally {
      setLoading(false)
    }
  }, [token])

  // 分类变更文件
  const categorizeFiles = (files: string[]) => {
    const backend = files.filter(f => f.startsWith('backend/'))
    const frontend = files.filter(f => f.startsWith('frontend/'))
    const scripts = files.filter(f => f.startsWith('scripts/'))
    const other = files.filter(f => !f.startsWith('backend/') && !f.startsWith('frontend/') && !f.startsWith('scripts/'))
    return { backend, frontend, scripts, other }
  }

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-fg tracking-tight">系统更新</h2>
          <p className="mt-1 text-sm text-fg/60">检查并安装最新版本，支持智能更新。</p>
        </div>
        <Button
          variant="glass"
          onClick={checkUpdate}
          disabled={checking}
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", checking && "animate-spin")} />
          检查更新
        </Button>
      </div>

      {/* 版本信息卡片 */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-6">
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
              {versionInfo?.hasUpdate ? '有新版本可用' : '已是最新版本'}
            </div>
            <div className="text-sm text-fg/60">
              当前版本: <code className="px-1.5 py-0.5 bg-glass/10 rounded">{versionInfo?.current || '未知'}</code>
              {versionInfo?.hasUpdate && (
                <>
                  {' → '}
                  <code className="px-1.5 py-0.5 bg-primary/10 text-primary rounded">{versionInfo.latest}</code>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 更新提示 */}
        {versionInfo?.hasUpdate && (
          <div className="space-y-4">
            {/* 更新类型提示 */}
            <div className="flex flex-wrap gap-3">
              {versionInfo.needsDeps && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg text-sm">
                  <Package className="w-4 h-4" />
                  需要安装新依赖
                </div>
              )}
              {versionInfo.needsRestart && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-sm">
                  <RotateCcw className="w-4 h-4" />
                  需要重启后端
                </div>
              )}
              {!versionInfo.needsRestart && !versionInfo.needsDeps && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg text-sm">
                  <Zap className="w-4 h-4" />
                  无缝更新（无需重启）
                </div>
              )}
            </div>

            {/* 一键更新按钮 */}
            <Button
              variant="primary"
              onClick={doUpdate}
              disabled={updating}
              className="w-full sm:w-auto"
            >
              {updating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  更新中...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  一键更新
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* 提交列表 */}
      {versionInfo?.commits && versionInfo.commits.length > 0 && (
        <div className="glass-panel rounded-2xl p-6">
          <h3 className="text-lg font-medium text-fg mb-4 flex items-center gap-2">
            <GitCommit className="w-5 h-5" />
            待更新提交 ({versionInfo.commits.length})
          </h3>
          <div className="space-y-3">
            {versionInfo.commits.map((commit) => (
              <div key={commit.hash} className="flex items-start gap-3 p-3 bg-glass/5 rounded-xl">
                <code className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-mono shrink-0">
                  {commit.hash}
                </code>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-fg truncate">{commit.message}</div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-fg/50">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {commit.author}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(commit.date).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 变更文件 */}
      {versionInfo?.changedFiles && versionInfo.changedFiles.length > 0 && (
        <div className="glass-panel rounded-2xl p-6">
          <h3 className="text-lg font-medium text-fg mb-4 flex items-center gap-2">
            <FileCode className="w-5 h-5" />
            变更文件 ({versionInfo.changedFiles.length})
          </h3>
          <div className="space-y-4">
            {(() => {
              const { backend, frontend, scripts, other } = categorizeFiles(versionInfo.changedFiles)
              return (
                <>
                  {backend.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-fg/60 mb-2">后端 ({backend.length})</div>
                      <div className="flex flex-wrap gap-1">
                        {backend.slice(0, 10).map(f => (
                          <code key={f} className="px-2 py-0.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded text-xs">
                            {f.replace('backend/', '')}
                          </code>
                        ))}
                        {backend.length > 10 && (
                          <span className="text-xs text-fg/50">+{backend.length - 10} 更多</span>
                        )}
                      </div>
                    </div>
                  )}
                  {frontend.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-fg/60 mb-2">前端 ({frontend.length})</div>
                      <div className="flex flex-wrap gap-1">
                        {frontend.slice(0, 10).map(f => (
                          <code key={f} className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded text-xs">
                            {f.replace('frontend/', '')}
                          </code>
                        ))}
                        {frontend.length > 10 && (
                          <span className="text-xs text-fg/50">+{frontend.length - 10} 更多</span>
                        )}
                      </div>
                    </div>
                  )}
                  {scripts.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-fg/60 mb-2">脚本 ({scripts.length})</div>
                      <div className="flex flex-wrap gap-1">
                        {scripts.map(f => (
                          <code key={f} className="px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded text-xs">
                            {f.replace('scripts/', '')}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}
                  {other.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-fg/60 mb-2">其他 ({other.length})</div>
                      <div className="flex flex-wrap gap-1">
                        {other.map(f => (
                          <code key={f} className="px-2 py-0.5 bg-glass/10 text-fg/70 rounded text-xs">
                            {f}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* 手动操作 */}
      <div className="glass-panel rounded-2xl p-6">
        <h3 className="text-lg font-medium text-fg mb-4">手动操作</h3>
        <div className="flex flex-wrap gap-3">
          <Button variant="glass" onClick={pullOnly} disabled={loading}>
            <Download className="w-4 h-4 mr-2" />
            仅拉取代码
          </Button>
          <Button variant="glass" onClick={installDeps} disabled={loading}>
            <Package className="w-4 h-4 mr-2" />
            安装依赖
          </Button>
          <Button variant="glass" onClick={restartService} disabled={loading} className="text-red-500 hover:bg-red-50/10">
            <RotateCcw className="w-4 h-4 mr-2" />
            重启服务
          </Button>
        </div>
        <p className="mt-3 text-xs text-fg/50">
          提示：一键更新会自动判断是否需要安装依赖和重启服务。手动操作仅在特殊情况下使用。
        </p>
      </div>
    </div>
  )
}

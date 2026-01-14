/**
 * 版本更新控制器
 * 提供版本检查和智能更新功能
 * 
 * 版本获取策略：
 * 1. 当前版本：从 package.json 读取
 * 2. 最新版本：从 GitHub API 获取最新 tag
 * 3. 更新方式：通过 git pull 拉取代码
 */

import { Router, Response } from 'express'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { requireAuth, requireRoot } from '../middleware/auth'
import { createLogger } from '../services/logger'
import type { AuthedRequest } from '../types/auth'

const execAsync = promisify(exec)
const logger = createLogger('update')
const router = Router()

// ESM 兼容的 __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 项目根目录
const ROOT_DIR = path.resolve(__dirname, '../../..')

// GitHub 仓库信息
const GITHUB_OWNER = 'LZZLHY'
const GITHUB_REPO = 'start'

// 版本信息接口
interface VersionInfo {
  current: string
  latest: string
  hasUpdate: boolean
  releaseNotes: string
  releaseDate: string
  needsRestart: boolean
  needsDeps: boolean
  hasGit: boolean
}

/**
 * 获取当前版本（从 package.json 读取）
 */
function getCurrentVersion(): string {
  try {
    const pkgPath = path.join(ROOT_DIR, 'package.json')
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
    return pkg.version || 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * 检查是否有 git
 */
async function hasGit(): Promise<boolean> {
  try {
    await execAsync('git --version')
    // 还要检查当前目录是否是 git 仓库
    await execAsync('git rev-parse --git-dir', { cwd: ROOT_DIR })
    return true
  } catch {
    return false
  }
}

/**
 * 从 GitHub API 获取最新版本信息
 */
async function getLatestRelease(): Promise<{ version: string; notes: string; date: string } | null> {
  try {
    // 使用 GitHub API 获取最新 tag
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/tags`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Start-App'
        }
      }
    )
    
    if (!response.ok) {
      logger.warn('GitHub API 请求失败', { status: response.status })
      return null
    }
    
    const tags = await response.json() as Array<{ name: string }>
    if (!tags || tags.length === 0) {
      return null
    }
    
    // 获取最新 tag（按版本号排序）
    const latestTag = tags[0].name
    const version = latestTag.replace(/^v/, '') // 移除 v 前缀
    
    // 尝试获取 release notes
    let notes = ''
    let date = ''
    try {
      const releaseResp = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/tags/${latestTag}`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Start-App'
          }
        }
      )
      if (releaseResp.ok) {
        const release = await releaseResp.json() as { body?: string; published_at?: string }
        notes = release.body || ''
        date = release.published_at || ''
      }
    } catch {
      // 忽略 release notes 获取失败
    }
    
    return { version, notes, date }
  } catch (error) {
    logger.error('获取最新版本失败', { error })
    return null
  }
}

/**
 * 比较版本号
 * @returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number)
  const parts2 = v2.split('.').map(Number)
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0
    const p2 = parts2[i] || 0
    if (p1 > p2) return 1
    if (p1 < p2) return -1
  }
  return 0
}

/**
 * GET /api/admin/update/check - 检查更新
 */
router.get('/check', requireAuth, requireRoot, async (_req: AuthedRequest, res: Response) => {
  try {
    const current = getCurrentVersion()
    const gitAvailable = await hasGit()
    const latestInfo = await getLatestRelease()
    
    const latest = latestInfo?.version || current
    const hasUpdate = compareVersions(latest, current) > 0
    
    const info: VersionInfo = {
      current,
      latest,
      hasUpdate,
      releaseNotes: latestInfo?.notes || '',
      releaseDate: latestInfo?.date || '',
      needsRestart: true, // 保守起见，总是建议重启
      needsDeps: hasUpdate, // 有更新时建议安装依赖
      hasGit: gitAvailable,
    }
    
    res.json({ ok: true, data: info })
  } catch (error) {
    logger.error('检查更新失败', { error })
    res.status(500).json({ ok: false, message: '检查更新失败' })
  }
})

/**
 * POST /api/admin/update/pull - 拉取更新
 */
router.post('/pull', requireAuth, requireRoot, async (_req: AuthedRequest, res: Response) => {
  try {
    const gitAvailable = await hasGit()
    if (!gitAvailable) {
      return res.status(400).json({ ok: false, message: '当前环境没有 Git，无法拉取更新' })
    }
    
    logger.info('开始拉取更新')
    
    // 拉取代码
    const { stdout, stderr } = await execAsync('git pull origin main', { cwd: ROOT_DIR })
    logger.info('Git pull 完成', { stdout, stderr })
    
    res.json({ ok: true, data: { message: '代码更新成功', output: stdout } })
  } catch (error) {
    logger.error('拉取更新失败', { error })
    res.status(500).json({ ok: false, message: '拉取更新失败' })
  }
})

/**
 * POST /api/admin/update/deps - 安装依赖
 */
router.post('/deps', requireAuth, requireRoot, async (_req: AuthedRequest, res: Response) => {
  try {
    logger.info('开始安装依赖')
    
    // 安装后端依赖
    await execAsync('npm install', { cwd: path.join(ROOT_DIR, 'backend'), timeout: 300000 })
    logger.info('后端依赖安装完成')
    
    // 安装前端依赖
    await execAsync('npm install', { cwd: path.join(ROOT_DIR, 'frontend'), timeout: 300000 })
    logger.info('前端依赖安装完成')
    
    res.json({ ok: true, data: { message: '依赖安装成功' } })
  } catch (error) {
    logger.error('安装依赖失败', { error })
    res.status(500).json({ ok: false, message: '安装依赖失败' })
  }
})

/**
 * POST /api/admin/update/restart - 重启服务
 * 
 * Linux 服务器重启策略：
 * 1. 使用 spawn 启动新的后端进程（detached）
 * 2. 新进程启动后，当前进程退出
 * 3. 这样可以实现无缝重启
 */
router.post('/restart', requireAuth, requireRoot, async (_req: AuthedRequest, res: Response) => {
  try {
    logger.info('准备重启服务')
    
    // 先返回响应
    res.json({ ok: true, data: { message: '服务即将重启，请稍后刷新页面' } })
    
    // 延迟执行重启
    setTimeout(async () => {
      logger.info('执行重启')
      
      // 在 Linux 上，使用 spawn 启动新进程
      if (process.platform !== 'win32') {
        const backendDir = path.join(ROOT_DIR, 'backend')
        
        // 启动新的后端进程
        const child = spawn('npm', ['run', 'dev'], {
          cwd: backendDir,
          detached: true,
          stdio: 'ignore',
          env: { ...process.env }
        })
        
        // 让子进程独立运行
        child.unref()
        
        logger.info('新进程已启动，当前进程即将退出')
      }
      
      // 退出当前进程
      process.exit(0)
    }, 1000)
  } catch (error) {
    logger.error('重启失败', { error })
    res.status(500).json({ ok: false, message: '重启失败' })
  }
})

/**
 * POST /api/admin/update/full - 完整更新（拉取 + 依赖 + 重启）
 */
router.post('/full', requireAuth, requireRoot, async (req: AuthedRequest, res: Response) => {
  try {
    const { needsDeps, needsRestart } = req.body as { needsDeps?: boolean; needsRestart?: boolean }
    
    const gitAvailable = await hasGit()
    if (!gitAvailable) {
      return res.status(400).json({ ok: false, message: '当前环境没有 Git，无法更新。请手动下载最新版本。' })
    }
    
    logger.info('开始完整更新', { needsDeps, needsRestart })
    
    // 1. 拉取代码
    await execAsync('git pull origin main', { cwd: ROOT_DIR })
    logger.info('代码拉取完成')
    
    // 2. 安装依赖（如果需要）
    if (needsDeps) {
      await execAsync('npm install', { cwd: path.join(ROOT_DIR, 'backend'), timeout: 300000 })
      await execAsync('npm install', { cwd: path.join(ROOT_DIR, 'frontend'), timeout: 300000 })
      logger.info('依赖安装完成')
    }
    
    // 3. 重启（如果需要）
    if (needsRestart) {
      res.json({ ok: true, data: { message: '更新完成，服务即将重启' } })
      
      setTimeout(() => {
        // 在 Linux 上，使用 spawn 启动新进程
        if (process.platform !== 'win32') {
          const backendDir = path.join(ROOT_DIR, 'backend')
          const child = spawn('npm', ['run', 'dev'], {
            cwd: backendDir,
            detached: true,
            stdio: 'ignore',
            env: { ...process.env }
          })
          child.unref()
        }
        process.exit(0)
      }, 1000)
      return
    }
    
    res.json({ ok: true, data: { message: '更新完成，无需重启' } })
  } catch (error) {
    logger.error('完整更新失败', { error })
    res.status(500).json({ ok: false, message: '更新失败' })
  }
})

export const updateRouter = router

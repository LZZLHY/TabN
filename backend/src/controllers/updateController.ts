/**
 * 版本更新控制器
 * 提供版本检查和智能更新功能
 */

import { Router, Request, Response } from 'express'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
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

// 版本信息接口
interface VersionInfo {
  current: string
  latest: string
  hasUpdate: boolean
  commits: CommitInfo[]
  changedFiles: string[]
  needsRestart: boolean
  needsDeps: boolean
}

interface CommitInfo {
  hash: string
  message: string
  date: string
  author: string
}

/**
 * 获取当前版本（最新提交）
 */
async function getCurrentVersion(): Promise<string> {
  try {
    const { stdout } = await execAsync('git rev-parse --short HEAD', { cwd: ROOT_DIR })
    return stdout.trim()
  } catch {
    return 'unknown'
  }
}

/**
 * 获取远程最新版本
 */
async function getLatestVersion(): Promise<string> {
  try {
    await execAsync('git fetch origin main', { cwd: ROOT_DIR })
    const { stdout } = await execAsync('git rev-parse --short origin/main', { cwd: ROOT_DIR })
    return stdout.trim()
  } catch {
    return 'unknown'
  }
}

/**
 * 获取待更新的提交列表
 */
async function getPendingCommits(): Promise<CommitInfo[]> {
  try {
    const { stdout } = await execAsync(
      'git log HEAD..origin/main --pretty=format:"%h|%s|%ci|%an" --no-merges',
      { cwd: ROOT_DIR }
    )
    if (!stdout.trim()) return []
    
    return stdout.trim().split('\n').map(line => {
      const [hash, message, date, author] = line.split('|')
      return { hash, message, date, author }
    })
  } catch {
    return []
  }
}

/**
 * 获取变更的文件列表
 */
async function getChangedFiles(): Promise<string[]> {
  try {
    const { stdout } = await execAsync(
      'git diff --name-only HEAD..origin/main',
      { cwd: ROOT_DIR }
    )
    return stdout.trim().split('\n').filter(Boolean)
  } catch {
    return []
  }
}

/**
 * 判断是否需要重启后端
 */
function needsBackendRestart(files: string[]): boolean {
  return files.some(f => 
    f.startsWith('backend/') && 
    (f.endsWith('.ts') || f.endsWith('.js') || f === 'backend/package.json')
  )
}

/**
 * 判断是否需要安装依赖
 */
function needsDependencies(files: string[]): boolean {
  return files.some(f => 
    f === 'backend/package.json' || 
    f === 'frontend/package.json' ||
    f === 'package.json'
  )
}

/**
 * GET /api/admin/update/check - 检查更新
 */
router.get('/check', requireAuth, requireRoot, async (_req: AuthedRequest, res: Response) => {
  try {
    const current = await getCurrentVersion()
    const latest = await getLatestVersion()
    const commits = await getPendingCommits()
    const changedFiles = await getChangedFiles()
    
    const info: VersionInfo = {
      current,
      latest,
      hasUpdate: current !== latest && commits.length > 0,
      commits,
      changedFiles,
      needsRestart: needsBackendRestart(changedFiles),
      needsDeps: needsDependencies(changedFiles),
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
    await execAsync('npm install', { cwd: path.join(ROOT_DIR, 'backend') })
    logger.info('后端依赖安装完成')
    
    // 安装前端依赖
    await execAsync('npm install', { cwd: path.join(ROOT_DIR, 'frontend') })
    logger.info('前端依赖安装完成')
    
    res.json({ ok: true, data: { message: '依赖安装成功' } })
  } catch (error) {
    logger.error('安装依赖失败', { error })
    res.status(500).json({ ok: false, message: '安装依赖失败' })
  }
})

/**
 * POST /api/admin/update/restart - 重启服务
 */
router.post('/restart', requireAuth, requireRoot, async (_req: AuthedRequest, res: Response) => {
  try {
    logger.info('准备重启服务')
    
    // 先返回响应
    res.json({ ok: true, data: { message: '服务即将重启，请稍后刷新页面' } })
    
    // 延迟执行重启
    setTimeout(() => {
      logger.info('执行重启')
      // 退出当前进程，依赖外部进程管理器（如 PM2）或启动脚本重启
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
    
    logger.info('开始完整更新', { needsDeps, needsRestart })
    
    // 1. 拉取代码
    await execAsync('git pull origin main', { cwd: ROOT_DIR })
    logger.info('代码拉取完成')
    
    // 2. 安装依赖（如果需要）
    if (needsDeps) {
      await execAsync('npm install', { cwd: path.join(ROOT_DIR, 'backend') })
      await execAsync('npm install', { cwd: path.join(ROOT_DIR, 'frontend') })
      logger.info('依赖安装完成')
    }
    
    // 3. 重启（如果需要）
    if (needsRestart) {
      res.json({ ok: true, data: { message: '更新完成，服务即将重启' } })
      setTimeout(() => process.exit(0), 1000)
      return
    }
    
    res.json({ ok: true, data: { message: '更新完成，无需重启' } })
  } catch (error) {
    logger.error('完整更新失败', { error })
    res.status(500).json({ ok: false, message: '更新失败' })
  }
})

export const updateRouter = router

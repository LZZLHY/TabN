import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import dotenv from 'dotenv'
import { z } from 'zod'

// 允许本地使用 backend/env.local 或 backend/env（不强依赖 .env）
const candidates = ['.env', 'env.local', 'env']
for (const name of candidates) {
  const p = path.resolve(process.cwd(), name)
  if (fs.existsSync(p)) {
    dotenv.config({ path: p })
    break
  }
}

/**
 * 智能选择默认 HOST 地址
 * - Windows 开发环境：使用 127.0.0.1 避免 Hyper-V 端口保留冲突
 * - Linux/生产环境：使用 0.0.0.0 允许外部访问
 * - 如果设置了 NODE_ENV=production，始终使用 0.0.0.0
 */
function getDefaultHost(): string {
  // 如果是生产环境，使用 0.0.0.0
  if (process.env.NODE_ENV === 'production') {
    return '0.0.0.0'
  }
  
  // Windows 开发环境使用 127.0.0.1 避免 Hyper-V 端口冲突
  if (os.platform() === 'win32') {
    return '127.0.0.1'
  }
  
  // Linux/Mac 等其他系统使用 0.0.0.0
  return '0.0.0.0'
}

// 不安全的默认 JWT_SECRET 列表
const INSECURE_JWT_SECRETS = [
  'please-change-me',
  'please-change-me-to-random-string',
  'dev-secret-please-change-1234',
]

/**
 * 检查 JWT_SECRET 是否安全
 */
function checkJwtSecretSecurity(): void {
  const secret = process.env.JWT_SECRET || ''
  
  if (INSECURE_JWT_SECRETS.includes(secret)) {
    console.log('')
    console.log('\x1b[43m\x1b[30m ⚠️  安全警告 \x1b[0m')
    console.log('\x1b[33m════════════════════════════════════════════════════\x1b[0m')
    console.log('\x1b[33m  JWT_SECRET 使用了不安全的默认值！\x1b[0m')
    console.log('')
    console.log('  这意味着任何人都可以伪造登录 token，')
    console.log('  以任意用户身份（包括管理员）登录你的系统。')
    console.log('')
    console.log('\x1b[36m  解决方法：\x1b[0m')
    console.log('  编辑 backend/env.local 文件，')
    console.log('  将 JWT_SECRET 修改为一个随机字符串（至少 32 字符）')
    console.log('')
    console.log('\x1b[36m  生成随机密钥：\x1b[0m')
    console.log('  - Linux/Mac: openssl rand -base64 32')
    console.log('  - PowerShell: [Convert]::ToBase64String((1..32|%{Get-Random -Max 256})-as[byte[]])')
    console.log('\x1b[33m════════════════════════════════════════════════════\x1b[0m')
    console.log('')
    
    // 生产环境直接拒绝启动
    if (process.env.NODE_ENV === 'production') {
      console.log('\x1b[31m  生产环境禁止使用默认 JWT_SECRET，服务器拒绝启动。\x1b[0m')
      console.log('')
      process.exit(1)
    }
  }
}

// 启动时检查 JWT_SECRET 安全性
checkJwtSecretSecurity()

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL 是必需的'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET 长度必须至少 16 字符'),
  PORT: z.coerce.number().int().positive().default(3100),
  HOST: z.string().default(getDefaultHost()),
  // 日志配置
  LOG_LEVEL: z.string().default('info'),
  LOG_DIR: z.string().default('./logs'),
  LOG_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
  LOG_CONSOLE: z.string().transform(v => v !== 'false').default('true'),
  LOG_FILE: z.string().transform(v => v !== 'false').default('true'),
  // 错误去重配置
  ERROR_DEDUPE_WINDOW_MS: z.coerce.number().int().positive().default(60000), // 1 分钟
  ERROR_DEDUPE_CLEANUP_INTERVAL_MS: z.coerce.number().int().positive().default(300000), // 5 分钟
  ERROR_BATCH_SIZE: z.coerce.number().int().positive().default(10), // 每批写入条数
  ERROR_BATCH_INTERVAL_MS: z.coerce.number().int().positive().default(1000), // 批量写入间隔
  // 前端 API 基础 URL（可选，用于健康检查显示）
  API_BASE_URL: z.string().optional(),
})

/**
 * 验证环境变量并快速失败
 * 启动时校验关键 env，缺失时快速失败并提示
 */
function validateEnvWithFastFail(): z.infer<typeof EnvSchema> {
  const result = EnvSchema.safeParse(process.env)
  
  if (!result.success) {
    console.log('')
    console.log('\x1b[41m\x1b[37m ✖ 环境变量配置错误 \x1b[0m')
    console.log('\x1b[31m════════════════════════════════════════════════════\x1b[0m')
    console.log('')
    
    const errors = result.error.issues
    const criticalEnvVars = ['DATABASE_URL', 'JWT_SECRET']
    
    for (const err of errors) {
      const envName = err.path.join('.')
      const isCritical = criticalEnvVars.includes(envName)
      const color = isCritical ? '\x1b[31m' : '\x1b[33m'
      const icon = isCritical ? '✖' : '⚠'
      
      console.log(`${color}  ${icon} ${envName}: ${err.message}\x1b[0m`)
    }
    
    console.log('')
    console.log('\x1b[36m  解决方法：\x1b[0m')
    console.log('  1. 复制 backend/env.example 为 backend/env.local')
    console.log('  2. 编辑 env.local 并填写必需的配置项')
    console.log('')
    console.log('\x1b[36m  必需的环境变量：\x1b[0m')
    console.log('  - DATABASE_URL: 数据库连接字符串')
    console.log('    例如: file:./dev.db (SQLite) 或 postgresql://user:pass@host/db')
    console.log('  - JWT_SECRET: JWT 签名密钥（至少 16 字符）')
    console.log('    生成方法: openssl rand -base64 32')
    console.log('')
    console.log('\x1b[31m════════════════════════════════════════════════════\x1b[0m')
    console.log('')
    
    // 快速失败，立即退出
    process.exit(1)
  }
  
  return result.data
}

export const env = validateEnvWithFastFail()



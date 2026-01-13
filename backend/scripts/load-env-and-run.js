import { config } from 'dotenv'
import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { resolve } from 'path'

// 加载 env.local
const envLocalPath = resolve(process.cwd(), 'env.local')
if (existsSync(envLocalPath)) {
  config({ path: envLocalPath })
}

const command = process.argv[2]

if (command === 'migrate') {
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env })
} else if (command === 'generate') {
  execSync('npx prisma generate', { stdio: 'inherit', env: process.env })
} else if (command === 'seed') {
  execSync('npx prisma db seed', { stdio: 'inherit', env: process.env })
} else {
  console.error('Usage: node load-env-and-run.js [migrate|generate|seed]')
  process.exit(1)
}


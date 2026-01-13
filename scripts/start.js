/**
 * Start 启动页 - Windows 一键启动脚本
 */

const { execSync, exec } = require('child_process')
const fs = require('fs')
const path = require('path')
const net = require('net')
const readline = require('readline')

// 项目目录
const ROOT_DIR = path.resolve(__dirname, '..')
const BACKEND_DIR = path.join(ROOT_DIR, 'backend')
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend')

// 端口
const BACKEND_PORT = 3100
const FRONTEND_PORT = 5173

// 颜色
const c = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
}

// 清屏
const clear = () => console.clear()

// 输出函数
const log = (msg = '') => console.log(msg)
const ok = (msg) => console.log(`  ${c.green}✓${c.reset} ${msg}`)
const fail = (msg) => console.log(`  ${c.red}✗${c.reset} ${msg}`)
const warn = (msg) => console.log(`  ${c.yellow}⚠${c.reset} ${msg}`)
const info = (msg) => console.log(`  ${c.dim}${msg}${c.reset}`)

// 显示标题
function showHeader() {
  log()
  log(`${c.blue}╔════════════════════════════════════════════════════╗${c.reset}`)
  log(`${c.blue}║         Start 启动页 - 控制面板                    ║${c.reset}`)
  log(`${c.blue}╚════════════════════════════════════════════════════╝${c.reset}`)
  log()
}

// 检查命令是否存在
function hasCommand(cmd) {
  try {
    execSync(`where ${cmd}`, { stdio: 'pipe' })
    return true
  } catch { return false }
}

// 执行命令
function run(cmd, cwd = ROOT_DIR) {
  try {
    execSync(cmd, { cwd, stdio: 'pipe' })
    return true
  } catch { return false }
}

// 检查端口是否被占用（返回 true 表示有服务在监听）
function checkPort(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    socket.setTimeout(1000)
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)  // 端口有服务在监听
    })
    socket.once('error', () => {
      socket.destroy()
      resolve(false)  // 端口没有服务
    })
    socket.once('timeout', () => {
      socket.destroy()
      resolve(false)
    })
    socket.connect(port, '127.0.0.1')
  })
}

// 等待端口就绪
function waitForPort(port, timeout = 60000) {
  return new Promise((resolve) => {
    const start = Date.now()
    const check = () => {
      const socket = new net.Socket()
      socket.setTimeout(1000)
      socket.once('connect', () => {
        socket.destroy()
        resolve(true)
      })
      socket.once('error', () => {
        socket.destroy()
        if (Date.now() - start < timeout) {
          setTimeout(check, 1000)
        } else {
          resolve(false)
        }
      })
      socket.connect(port, '127.0.0.1')
    }
    check()
  })
}

// 延时
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// 后台启动进程（完全隐藏窗口）
function startBackground(cwd, script) {
  // 使用 PowerShell 的 Start-Process 完全隐藏窗口
  const psCmd = `Start-Process -WindowStyle Hidden -FilePath 'npm.cmd' -ArgumentList 'run','${script}' -WorkingDirectory '${cwd.replace(/'/g, "''")}'`
  exec(`powershell -Command "${psCmd}"`, { windowsHide: true })
}

// 杀死占用端口的进程
async function killPort(port) {
  try {
    const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: 'pipe' })
    const lines = result.trim().split('\n')
    const pids = new Set()
    for (const line of lines) {
      const parts = line.trim().split(/\s+/)
      const pid = parts[parts.length - 1]
      if (pid && pid !== '0') pids.add(pid)
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'pipe' })
      } catch {}
    }
    return true
  } catch {
    return false
  }
}

// 读取用户输入
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

// 启动 Docker Desktop
async function startDocker() {
  // 尝试常见的 Docker Desktop 路径
  const dockerPaths = [
    'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe',
    'C:\\Program Files (x86)\\Docker\\Docker\\Docker Desktop.exe',
    `${process.env.LOCALAPPDATA}\\Docker\\Docker Desktop.exe`,
  ]
  
  for (const p of dockerPaths) {
    if (fs.existsSync(p)) {
      exec(`"${p}"`)
      return true
    }
  }
  
  // 尝试通过开始菜单启动
  try {
    exec('start "" "Docker Desktop"')
    return true
  } catch {}
  
  return false
}

// 等待 Docker 就绪
async function waitForDocker(timeout = 120000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (run('docker info')) {
      return true
    }
    await sleep(3000)
  }
  return false
}

// 检查环境
async function checkEnvironment() {
  log(`${c.yellow}[环境检测]${c.reset}`)
  log('────────────────────────────────────────')
  
  // Node.js
  const nodeVer = execSync('node -v', { encoding: 'utf8' }).trim()
  ok(`Node.js ${nodeVer}`)

  // Docker
  if (!hasCommand('docker')) {
    fail('未找到 Docker')
    info('请安装 Docker Desktop: https://www.docker.com/products/docker-desktop/')
    exec('start https://www.docker.com/products/docker-desktop/')
    return false
  }
  ok('Docker 已安装')
  
  // 检查 Docker 是否运行
  if (!run('docker info')) {
    warn('Docker 未运行，正在启动...')
    
    if (!startDocker()) {
      fail('无法启动 Docker Desktop')
      info('请手动启动 Docker Desktop')
      return false
    }
    
    info('等待 Docker 启动 (最多 2 分钟)...')
    if (await waitForDocker(120000)) {
      ok('Docker 已启动')
    } else {
      fail('Docker 启动超时')
      info('请确保 Docker Desktop 已完全启动后重试')
      return false
    }
  } else {
    ok('Docker 已运行')
  }
  
  log()
  return true
}

// 启动数据库
async function startDatabase() {
  log(`${c.yellow}[1/4] 启动数据库${c.reset}`)
  log('────────────────────────────────────────')
  
  if (await checkPort(5432)) {
    ok('PostgreSQL 已在运行')
    log()
    return true
  }
  
  info('启动 PostgreSQL...')
  
  // 尝试 docker compose (新版) 或 docker-compose (旧版)
  try {
    execSync('docker compose up -d', { cwd: ROOT_DIR, stdio: 'inherit' })
  } catch {
    try {
      execSync('docker-compose up -d', { cwd: ROOT_DIR, stdio: 'inherit' })
    } catch (e) {
      fail('Docker Compose 命令执行失败')
      return false
    }
  }
  
  info('等待数据库就绪...')
  // 等待数据库端口可用
  for (let i = 0; i < 30; i++) {
    await sleep(1000)
    if (await checkPort(5432)) {
      ok('PostgreSQL 启动成功')
      log()
      return true
    }
  }
  
  fail('PostgreSQL 启动超时')
  info('请检查 Docker 日志: docker compose logs')
  log()
  return false
}

// 配置后端
async function configureBackend() {
  log(`${c.yellow}[2/4] 配置后端${c.reset}`)
  log('────────────────────────────────────────')
  
  const envLocal = path.join(BACKEND_DIR, 'env.local')
  const envExample = path.join(BACKEND_DIR, 'env.example')
  if (!fs.existsSync(envLocal) && fs.existsSync(envExample)) {
    fs.copyFileSync(envExample, envLocal)
    ok('创建配置文件 env.local')
  } else {
    ok('配置文件已存在')
  }
  log()
  return true
}

// 安装依赖
async function installDeps() {
  log(`${c.yellow}[3/4] 检查依赖${c.reset}`)
  log('────────────────────────────────────────')
  
  const backendModules = path.join(BACKEND_DIR, 'node_modules')
  const frontendModules = path.join(FRONTEND_DIR, 'node_modules')
  
  if (!fs.existsSync(backendModules)) {
    info('安装后端依赖 (首次需要较长时间)...')
    try {
      execSync('npm install', { cwd: BACKEND_DIR, stdio: 'inherit' })
      ok('后端依赖安装完成')
    } catch {
      fail('后端依赖安装失败')
      return false
    }
  } else {
    ok('后端依赖已就绪')
  }
  
  if (!fs.existsSync(frontendModules)) {
    info('安装前端依赖 (首次需要较长时间)...')
    try {
      execSync('npm install', { cwd: FRONTEND_DIR, stdio: 'inherit' })
      ok('前端依赖安装完成')
    } catch {
      fail('前端依赖安装失败')
      return false
    }
  } else {
    ok('前端依赖已就绪')
  }
  
  log()
  return true
}

// 启动服务
async function startServices() {
  log(`${c.yellow}[4/4] 启动服务${c.reset}`)
  log('────────────────────────────────────────')
  
  // 启动后端
  if (await checkPort(BACKEND_PORT)) {
    ok('后端已在运行')
  } else {
    info('启动后端服务...')
    startBackground(BACKEND_DIR, 'dev')
    
    if (await waitForPort(BACKEND_PORT, 60000)) {
      ok('后端启动成功 (端口 3100)')
    } else {
      fail('后端启动超时')
      return false
    }
  }

  // 启动前端
  if (await checkPort(FRONTEND_PORT)) {
    ok('前端已在运行')
  } else {
    info('启动前端服务...')
    startBackground(FRONTEND_DIR, 'dev')
    
    if (await waitForPort(FRONTEND_PORT, 60000)) {
      ok('前端启动成功 (端口 5173)')
    } else {
      fail('前端启动超时')
      return false
    }
  }
  
  log()
  return true
}

// 显示成功信息
function showSuccess() {
  log('════════════════════════════════════════════════════')
  log(`${c.green}🎉 所有服务已启动！${c.reset}`)
  log('════════════════════════════════════════════════════')
  log()
  log(`  访问地址: ${c.cyan}http://localhost:5173${c.reset}`)
  log(`  管理后台: ${c.cyan}http://localhost:5173/admin${c.reset}`)
  log(`  默认账号: ${c.yellow}admin${c.reset} / ${c.yellow}admin123456${c.reset}`)
  log()
}

// 显示菜单
async function showMenu() {
  const backendRunning = await checkPort(BACKEND_PORT)
  const frontendRunning = await checkPort(FRONTEND_PORT)
  
  log('────────────────────────────────────────')
  log(`${c.yellow}请选择操作:${c.reset}`)
  log()
  log(`  ${c.cyan}1${c.reset} - 打开浏览器`)
  log(`  ${c.cyan}2${c.reset} - 重启所有服务`)
  if (backendRunning || frontendRunning) {
    log(`  ${c.cyan}3${c.reset} - 停止前后端服务`)
  }
  log(`  ${c.cyan}4${c.reset} - 停止所有服务 (包括数据库)`)
  log(`  ${c.cyan}5${c.reset} - 查看服务状态`)
  log(`  ${c.cyan}0${c.reset} - 退出控制面板`)
  log()
  
  const choice = await prompt(`请输入选项 [0-5]: `)
  return choice
}

// 停止前后端
async function stopFrontendBackend() {
  log()
  log(`${c.yellow}停止前后端服务...${c.reset}`)
  
  await killPort(BACKEND_PORT)
  await killPort(FRONTEND_PORT)
  await sleep(1000)
  
  if (!(await checkPort(BACKEND_PORT)) && !(await checkPort(FRONTEND_PORT))) {
    ok('前后端服务已停止')
  } else {
    // 强制杀死所有 node 进程
    try {
      execSync('taskkill /IM node.exe /F', { stdio: 'pipe' })
    } catch {}
    ok('服务已停止')
  }
  log()
}

// 停止所有服务
async function stopAll() {
  log()
  log(`${c.yellow}停止所有服务...${c.reset}`)
  
  await killPort(BACKEND_PORT)
  await killPort(FRONTEND_PORT)
  run('docker compose down')
  
  ok('所有服务已停止')
  log()
}

// 查看状态
async function showStatus() {
  log()
  log(`${c.yellow}服务状态:${c.reset}`)
  log('────────────────────────────────────────')
  
  const dbRunning = await checkPort(5432)
  const backendRunning = await checkPort(BACKEND_PORT)
  const frontendRunning = await checkPort(FRONTEND_PORT)
  
  if (dbRunning) ok('数据库: 运行中 (端口 5432)')
  else fail('数据库: 未运行')
  
  if (backendRunning) ok('后端: 运行中 (端口 3100)')
  else fail('后端: 未运行')
  
  if (frontendRunning) ok('前端: 运行中 (端口 5173)')
  else fail('前端: 未运行')
  
  log()
}

// 主函数
async function main() {
  clear()
  showHeader()
  
  // 检查环境
  if (!await checkEnvironment()) {
    await prompt('按回车键退出...')
    process.exit(1)
  }
  
  // 启动流程
  if (!await startDatabase()) {
    await prompt('按回车键退出...')
    process.exit(1)
  }
  
  if (!await configureBackend()) {
    await prompt('按回车键退出...')
    process.exit(1)
  }
  
  if (!await installDeps()) {
    await prompt('按回车键退出...')
    process.exit(1)
  }
  
  if (!await startServices()) {
    await prompt('按回车键退出...')
    process.exit(1)
  }
  
  showSuccess()
  
  // 打开浏览器
  exec('start http://localhost:5173')
  
  // 交互式菜单循环
  while (true) {
    const choice = await showMenu()
    
    switch (choice) {
      case '1':
        exec('start http://localhost:5173')
        log()
        ok('已打开浏览器')
        log()
        break
        
      case '2':
        log()
        log(`${c.yellow}重启服务...${c.reset}`)
        await stopFrontendBackend()
        await startServices()
        showSuccess()
        break
        
      case '3':
        await stopFrontendBackend()
        log(`${c.yellow}是否重新启动服务?${c.reset}`)
        const restart = await prompt('输入 y 重启，其他键返回菜单: ')
        if (restart.toLowerCase() === 'y') {
          await startServices()
          showSuccess()
        }
        break
        
      case '4':
        await stopAll()
        log('感谢使用，再见！')
        process.exit(0)
        break
        
      case '5':
        await showStatus()
        break
        
      case '0':
      case 'q':
      case 'exit':
        log()
        log('服务将继续在后台运行。')
        log('感谢使用，再见！')
        log()
        process.exit(0)
        break
        
      default:
        log()
        warn('无效选项，请重新选择')
        log()
    }
  }
}

main().catch(e => {
  console.error('错误:', e.message)
  process.exit(1)
})

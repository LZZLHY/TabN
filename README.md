# TabN - 浏览器起始页

[English](./README_EN.md) | 简体中文

一个现代化的浏览器起始页应用，支持书签管理、快捷搜索、个性化设置。

## 🌐 在线体验

**体验地址**: [http://tabn.lovedhy.cn/](http://tabn.lovedhy.cn/)

## 📖 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [Linux 部署](#-linux-部署)
  - [一键安装](#一键安装推荐)
  - [手动安装](#手动安装)
- [Windows 部署](#-windows-部署)
  - [一键安装](#一键安装)
  - [手动安装](#手动安装-1)
- [生产部署](#-生产部署)
- [常用命令](#-常用命令)
- [环境变量](#-环境变量)
- [项目结构](#-项目结构)
- [卸载](#-卸载)

---

## 功能特性

- 📚 书签管理（支持文件夹、拖拽排序）
- 🔍 快捷搜索（支持拼音、多搜索引擎）
- 🎨 个性化设置（主题、背景、布局）
- 👥 多用户支持
- 📊 管理后台
- 🌐 国际化支持（中文/英文）

## 技术栈

- **前端**: React 18 + TypeScript + Vite + Tailwind CSS
- **后端**: Node.js + Express + Prisma
- **数据库**: PostgreSQL

---

## 🐧 Linux 部署

### 一键安装（推荐）

一条命令打开管理面板，交互式安装：

```bash
curl -fsSL https://raw.githubusercontent.com/LZZLHY/TabN/main/scripts/tabn.sh | bash
```

支持系统：Ubuntu/Debian、CentOS/RHEL/Fedora

运行后会显示交互式管理面板：

```
╔════════════════════════════════════════════════════╗
║            欢迎使用 TabN 管理脚本                  ║
╚════════════════════════════════════════════════════╝

检测到 TabN 尚未安装

请选择安装方式：
  1. 普通安装 (开发模式，适合测试)
  2. PM2 安装 (生产模式，进程守护+开机自启)

────────────────────────────────────────
  0. 退出脚本
```

- **普通安装**：使用 npm run dev 启动，适合开发测试
- **PM2 安装**：自动配置进程守护和开机自启，适合生产环境

安装完成后，可在任意位置运行 `tabn` 命令打开管理面板：

```bash
tabn              # 打开交互式管理面板
tabn status       # 查看服务状态
tabn password     # 查看数据库账号密码
tabn restart      # 重启服务
```

已安装后的管理面板：

```
╔════════════════════════════════════════════════════╗
║            欢迎使用 TabN 管理脚本                  ║
╚════════════════════════════════════════════════════╝

TabN 已安装 - 安装目录: /root/TabN

基础功能：
  1. 重装 TabN (删除数据库重新安装)
  2. 更新 TabN (保留数据库，仅更新代码)
  3. 卸载 TabN

服务管理：
  4. 查看状态
  5. 启动 TabN
  6. 停止 TabN
  7. 重启 TabN

配置管理：
  8. 查看数据库账号密码
  9. 修改数据库密码
  10. 重置 JWT 密钥

高级选项：
  11. 查看日志
  12. 系统信息
  13. PM2 进程守护

────────────────────────────────────────
  0. 退出脚本
```

### PM2 进程守护

选择 `13. PM2 进程守护` 可以启用生产模式，实现进程崩溃自动重启和开机自启：

```
═══ PM2 进程守护 ═══

PM2 已安装
当前状态: PM2 守护未启用

请选择操作：
  1. 启用 PM2 守护 (生产模式)
  2. 停止 PM2 守护
  3. 查看 PM2 状态
  4. 设置开机自启
  0. 返回
```

安装完成后访问：`http://服务器IP:5173`

> ⚠️ **端口放行提示**：如果无法访问，请检查云服务器安全组是否放行端口 `5173` 和 `3100`

---

### 手动安装

#### 1. 安装依赖

```bash
# 安装 Git
sudo yum install -y git          # CentOS/RHEL
sudo apt install -y git          # Ubuntu/Debian

# 安装 Docker
curl -fsSL https://get.docker.com | sh
sudo systemctl start docker
sudo systemctl enable docker

# 安装 Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -   # CentOS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - # Ubuntu
sudo yum install -y nodejs       # CentOS
sudo apt install -y nodejs       # Ubuntu
```

#### 2. 克隆并启动

```bash
git clone https://github.com/LZZLHY/TabN.git
cd TabN
chmod +x scripts/start.sh
./scripts/start.sh
```

#### 3. 放行端口

```bash
# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-port=5173/tcp
sudo firewall-cmd --permanent --add-port=3100/tcp
sudo firewall-cmd --reload

# Ubuntu/Debian (ufw)
sudo ufw allow 5173
sudo ufw allow 3100
```

#### 4. 访问

- 前端: `http://服务器IP:5173`
- 后端: `http://服务器IP:3100`
- 管理后台: `http://服务器IP:5173/admin`
- 默认账号: `admin` / `admin123456`

---

## 🪟 Windows 部署

### 一键安装

1. 下载并安装依赖（如果没有会自动打开下载页面）：
   - [Node.js](https://nodejs.org/) - 选择 LTS 版本
   - [Docker Desktop](https://www.docker.com/products/docker-desktop/)
   - [Git](https://git-scm.com/download/win)

2. 打开 PowerShell，运行：

```powershell
# 下载并运行安装脚本
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/LZZLHY/TabN/main/scripts/install.bat" -OutFile "$env:TEMP\install.bat"; & "$env:TEMP\install.bat"
```

或者手动下载 `scripts/install.bat` 双击运行。

---

### 手动安装

```powershell
# 1. 克隆项目
git clone https://github.com/LZZLHY/TabN.git
cd TabN

# 2. 启动数据库
docker compose up -d

# 3. 启动后端（新终端）
cd backend
copy env.example env.local
npm install
npm run dev

# 4. 启动前端（新终端）
cd frontend
npm install
npm run dev
```

访问 http://localhost:5173

---

## 🚀 生产部署

### 使用 PM2

```bash
npm install -g pm2

# 构建前端
cd frontend && npm run build

# 启动后端
cd ../backend && npm run build
pm2 start dist/server.js --name start-backend
```

### Nginx 配置

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /path/to/start/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 📋 常用命令

### Linux 管理命令

安装完成后，可在任意位置运行 `tabn` 命令打开管理面板：

```bash
tabn              # 打开交互式管理面板
tabn status       # 查看服务状态
tabn password     # 查看数据库账号密码
tabn start        # 启动服务
tabn stop         # 停止服务
tabn restart      # 重启服务
tabn update       # 更新代码（保留数据）
tabn logs         # 查看日志
tabn info         # 查看系统信息
```

### 快捷操作对照表

| 操作 | Linux | Windows |
|------|-------|---------|
| 管理面板 | `tabn` | - |
| 启动服务 | `tabn start` 或 `./scripts/start.sh` | 双击 `scripts/start.bat` |
| 停止服务 | `tabn stop` | 关闭终端窗口 |
| 查看状态 | `tabn status` | - |
| 查看密码 | `tabn password` | 查看 `backend/env.local` |
| 停止数据库 | `docker compose down` | `docker compose down` |

---

## ⚙️ 环境变量

后端配置文件: `backend/env.local`

| 变量 | 说明 | 默认值 |
|------|------|--------|
| DATABASE_URL | PostgreSQL 连接串 | postgresql://start:start@localhost:5432/start |
| JWT_SECRET | JWT 签名密钥 | 自动生成 |
| PORT | 后端端口 | 3100 |
| HOST | 绑定地址 | 自动检测 |

### 🔐 安全配置

#### JWT_SECRET

JWT_SECRET 用于用户登录 token 的签名和验证，是系统安全的关键。

- **新安装**：安装脚本会自动生成 64 字符的随机密钥
- **已有安装**：启动时会检测是否使用默认值，并提示更新
- **生产环境**：如果使用默认值，服务器会拒绝启动

**手动生成密钥：**

```bash
# Linux/Mac
openssl rand -base64 32

# PowerShell
[Convert]::ToBase64String((1..32|%{Get-Random -Max 256})-as[byte[]])
```

> ⚠️ 修改 JWT_SECRET 后，所有已登录用户需要重新登录

---

## 📁 项目结构

```
start/
├── frontend/          # React 前端
├── backend/           # Node.js 后端
├── scripts/           # 启动脚本
│   ├── install.sh     # Linux 一键安装
│   ├── install.bat    # Windows 一键安装
│   ├── start.sh       # Linux 启动脚本
│   ├── start.bat      # Windows 启动脚本
│   └── uninstall.sh   # Linux 卸载脚本
├── shared/            # 共享类型定义
└── docker-compose.yml # 数据库配置
```

---

## 🗑️ 卸载

### Linux 一键卸载

```bash
curl -fsSL https://raw.githubusercontent.com/LZZLHY/TabN/main/scripts/uninstall.sh | bash
```

### 手动卸载

```bash
# 停止服务
pkill -f 'npm run dev'

# 删除数据库
cd ~/TabN && docker compose down -v

# 删除项目
rm -rf ~/TabN
```

### 删除 Docker（可选）

```bash
# Ubuntu/Debian
sudo apt remove -y docker-ce docker-ce-cli containerd.io
sudo rm -rf /var/lib/docker

# CentOS/RHEL
sudo yum remove -y docker-ce docker-ce-cli containerd.io
sudo rm -rf /var/lib/docker
```

### 删除 Node.js（可选）

```bash
# Ubuntu/Debian
sudo apt remove -y nodejs

# CentOS/RHEL
sudo yum remove -y nodejs
```

---

## 📄 许可证

MIT

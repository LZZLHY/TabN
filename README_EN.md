# TabN - Browser Start Page

English | [简体中文](./README.md)

A modern browser start page application with bookmark management, quick search, and personalization settings.

## 🌐 Live Demo

**Demo URL**: [http://tabn.lovedhy.cn/](http://tabn.lovedhy.cn/)

## 📖 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Linux Deployment](#-linux-deployment)
  - [One-Click Install](#one-click-install-recommended)
  - [Manual Install](#manual-install)
- [Windows Deployment](#-windows-deployment)
  - [One-Click Install](#one-click-install)
  - [Manual Install](#manual-install-1)
- [Production Deployment](#-production-deployment)
- [Common Commands](#-common-commands)
- [Environment Variables](#-environment-variables)
- [Project Structure](#-project-structure)
- [Uninstall](#-uninstall)

---

## Features

- 📚 Bookmark Management (folders, drag & drop sorting)
- 🔍 Quick Search (pinyin support, multiple search engines)
- 🎨 Personalization (themes, backgrounds, layouts)
- 👥 Multi-user Support
- 📊 Admin Dashboard
- 🌐 Internationalization (Chinese/English)

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + Prisma
- **Database**: PostgreSQL

---

## 🐧 Linux Deployment

### One-Click Install (Recommended)

Run one command to open the interactive management panel:

```bash
curl -fsSL https://raw.githubusercontent.com/LZZLHY/TabN/main/scripts/tabn.sh | bash
```

Supported systems: Ubuntu/Debian, CentOS/RHEL/Fedora

After running, you'll see an interactive management panel:

```
╔════════════════════════════════════════════════════╗
║            Welcome to TabN Management              ║
╚════════════════════════════════════════════════════╝

TabN is not installed

Please select installation method:
  1. Normal Install (dev mode, for testing)
  2. PM2 Install (production mode, process daemon + auto-start)

────────────────────────────────────────
  0. Exit
```

- **Normal Install**: Uses npm run dev, suitable for development/testing
- **PM2 Install**: Auto-configures process daemon and auto-start, suitable for production

After installation, run `tabn` command anywhere to open the management panel:

```bash
tabn              # Open interactive management panel
tabn status       # Check service status
tabn password     # View database credentials
tabn restart      # Restart services
```

Management panel after installation:

```
╔════════════════════════════════════════════════════╗
║            Welcome to TabN Management              ║
╚════════════════════════════════════════════════════╝

TabN installed - Directory: /root/TabN

Basic Functions:
  1. Reinstall TabN (delete database and reinstall)
  2. Update TabN (keep database, update code only)
  3. Uninstall TabN

Service Management:
  4. View Status
  5. Start TabN
  6. Stop TabN
  7. Restart TabN

Configuration:
  8. View Database Credentials
  9. Change Database Password
  10. Reset JWT Secret

Advanced Options:
  11. View Logs
  12. System Info
  13. PM2 Process Daemon

────────────────────────────────────────
  0. Exit
```

### PM2 Process Daemon

Select `13. PM2 Process Daemon` to enable production mode with auto-restart on crash and auto-start on boot:

```
═══ PM2 Process Daemon ═══

PM2 installed
Current status: PM2 daemon not enabled

Select operation:
  1. Enable PM2 Daemon (production mode)
  2. Stop PM2 Daemon
  3. View PM2 Status
  4. Set Auto-start on Boot
  0. Back
```

After installation, access: `http://SERVER_IP:5173`

> ⚠️ **Port Notice**: If you can't access, check if your cloud server security group allows ports `5173` and `3100`

---

### Manual Install

#### 1. Install Dependencies

```bash
# Install Git
sudo yum install -y git          # CentOS/RHEL
sudo apt install -y git          # Ubuntu/Debian

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo systemctl start docker
sudo systemctl enable docker

# Install Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -   # CentOS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - # Ubuntu
sudo yum install -y nodejs       # CentOS
sudo apt install -y nodejs       # Ubuntu
```

#### 2. Clone and Start

```bash
git clone https://github.com/LZZLHY/TabN.git
cd TabN
chmod +x scripts/start.sh
./scripts/start.sh
```

#### 3. Open Ports

```bash
# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-port=5173/tcp
sudo firewall-cmd --permanent --add-port=3100/tcp
sudo firewall-cmd --reload

# Ubuntu/Debian (ufw)
sudo ufw allow 5173
sudo ufw allow 3100
```

#### 4. Access

- Frontend: `http://SERVER_IP:5173`
- Backend: `http://SERVER_IP:3100`
- Admin Panel: `http://SERVER_IP:5173/admin`
- Default Account: `admin` / `admin123456`

---

## 🪟 Windows Deployment

### One-Click Install

1. Download and install dependencies (will auto-open download pages if missing):
   - [Node.js](https://nodejs.org/) - Choose LTS version
   - [Docker Desktop](https://www.docker.com/products/docker-desktop/)
   - [Git](https://git-scm.com/download/win)

2. Open PowerShell and run:

```powershell
# Download and run install script
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/LZZLHY/TabN/main/scripts/install.bat" -OutFile "$env:TEMP\install.bat"; & "$env:TEMP\install.bat"
```

Or manually download `scripts/install.bat` and double-click to run.

---

### Manual Install

```powershell
# 1. Clone project
git clone https://github.com/LZZLHY/TabN.git
cd TabN

# 2. Start database
docker compose up -d

# 3. Start backend (new terminal)
cd backend
copy env.example env.local
npm install
npm run dev

# 4. Start frontend (new terminal)
cd frontend
npm install
npm run dev
```

Access http://localhost:5173

---

## 🚀 Production Deployment

### Using PM2

```bash
npm install -g pm2

# Build frontend
cd frontend && npm run build

# Start backend
cd ../backend && npm run build
pm2 start dist/server.js --name start-backend
```

### Nginx Configuration

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

## 📋 Common Commands

### Linux Management Commands

After installation, run `tabn` command anywhere to open the management panel:

```bash
tabn              # Open interactive management panel
tabn status       # Check service status
tabn password     # View database credentials
tabn start        # Start services
tabn stop         # Stop services
tabn restart      # Restart services
tabn update       # Update code (keep data)
tabn logs         # View logs
tabn info         # View system info
```

### Quick Reference

| Operation | Linux | Windows |
|-----------|-------|---------|
| Management Panel | `tabn` | - |
| Start Services | `tabn start` or `./scripts/start.sh` | Double-click `scripts/start.bat` |
| Stop Services | `tabn stop` | Close terminal window |
| Check Status | `tabn status` | - |
| View Password | `tabn password` | Check `backend/env.local` |
| Stop Database | `docker compose down` | `docker compose down` |

---

## ⚙️ Environment Variables

Backend config file: `backend/env.local`

| Variable | Description | Default |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | postgresql://start:start@localhost:5432/start |
| JWT_SECRET | JWT signing key | Auto-generated |
| PORT | Backend port | 3100 |
| HOST | Bind address | Auto-detected |

### 🔐 Security Configuration

#### JWT_SECRET

JWT_SECRET is used for signing and verifying user login tokens, critical for system security.

- **New Install**: Install script auto-generates a 64-character random key
- **Existing Install**: Startup checks for default value and prompts to update
- **Production**: Server refuses to start if using default value

**Manually generate key:**

```bash
# Linux/Mac
openssl rand -base64 32

# PowerShell
[Convert]::ToBase64String((1..32|%{Get-Random -Max 256})-as[byte[]])
```

> ⚠️ After changing JWT_SECRET, all logged-in users need to re-login

---

## 📁 Project Structure

```
start/
├── frontend/          # React frontend
├── backend/           # Node.js backend
├── scripts/           # Startup scripts
│   ├── install.sh     # Linux one-click install
│   ├── install.bat    # Windows one-click install
│   ├── start.sh       # Linux startup script
│   ├── start.bat      # Windows startup script
│   └── uninstall.sh   # Linux uninstall script
├── shared/            # Shared type definitions
└── docker-compose.yml # Database configuration
```

---

## 🗑️ Uninstall

### Linux One-Click Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/LZZLHY/TabN/main/scripts/uninstall.sh | bash
```

### Manual Uninstall

```bash
# Stop services
pkill -f 'npm run dev'

# Remove database
cd ~/TabN && docker compose down -v

# Remove project
rm -rf ~/TabN
```

### Remove Docker (Optional)

```bash
# Ubuntu/Debian
sudo apt remove -y docker-ce docker-ce-cli containerd.io
sudo rm -rf /var/lib/docker

# CentOS/RHEL
sudo yum remove -y docker-ce docker-ce-cli containerd.io
sudo rm -rf /var/lib/docker
```

### Remove Node.js (Optional)

```bash
# Ubuntu/Debian
sudo apt remove -y nodejs

# CentOS/RHEL
sudo yum remove -y nodejs
```

---

## 📄 License

MIT

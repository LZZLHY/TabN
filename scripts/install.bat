@echo off
chcp 65001 >nul 2>&1
title TabN 起始页 - Windows 一键安装
setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════╗
echo ║        TabN 起始页 - Windows 一键安装脚本          ║
echo ╚════════════════════════════════════════════════════╝
echo.

:: ============================================
:: 检查依赖
:: ============================================

:: 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] 未检测到 Node.js
    echo [*] 正在打开 Node.js 下载页面...
    start https://nodejs.org/
    echo.
    echo 请安装 Node.js 后重新运行此脚本
    pause
    exit /b 1
)
echo [√] Node.js 已安装

:: 检查 Docker
where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] 未检测到 Docker
    echo [*] 正在打开 Docker Desktop 下载页面...
    start https://www.docker.com/products/docker-desktop/
    echo.
    echo 请安装 Docker Desktop 后重新运行此脚本
    pause
    exit /b 1
)
echo [√] Docker 已安装

:: 检查 Docker 是否运行
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Docker 未运行，请启动 Docker Desktop
    echo [*] 正在尝试启动 Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo.
    echo 请等待 Docker 启动后重新运行此脚本
    pause
    exit /b 1
)
echo [√] Docker 已运行

:: 检查 Git
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] 未检测到 Git
    echo [*] 正在打开 Git 下载页面...
    start https://git-scm.com/download/win
    echo.
    echo 请安装 Git 后重新运行此脚本
    pause
    exit /b 1
)
echo [√] Git 已安装

:: ============================================
:: 交互式配置数据库
:: ============================================
echo.
echo ────────────────────────────────────────
echo   数据库配置
echo ────────────────────────────────────────
echo.

:: 数据库名称
set /p "DB_NAME=数据库名称 (默认: tabn): "
if "!DB_NAME!"=="" set "DB_NAME=tabn"

:: 数据库用户名
set /p "DB_USER=数据库用户名 (默认: tabn): "
if "!DB_USER!"=="" set "DB_USER=tabn"

:: 数据库密码
:input_password
set /p "DB_PASSWORD=数据库密码 (至少8位): "
if "!DB_PASSWORD!"=="" (
    echo [!] 密码不能为空
    goto input_password
)
:: 检查密码长度（使用 PowerShell）
for /f %%i in ('powershell -Command "('!DB_PASSWORD!').Length"') do set PWD_LEN=%%i
if !PWD_LEN! LSS 8 (
    echo [!] 密码长度至少8位，请重新输入
    goto input_password
)

:: 确认密码
set /p "DB_PASSWORD_CONFIRM=确认密码: "
if "!DB_PASSWORD!" neq "!DB_PASSWORD_CONFIRM!" (
    echo [!] 两次密码不一致，请重新输入
    goto input_password
)

echo.
echo ────────────────────────────────────────
echo   安全配置
echo ────────────────────────────────────────
echo.
echo JWT 密钥用于用户登录 token 签名，建议留空自动生成。
set /p "JWT_SECRET=JWT 密钥 (留空自动生成): "

if "!JWT_SECRET!"=="" (
    :: 自动生成 JWT_SECRET
    for /f "delims=" %%i in ('powershell -Command "[Convert]::ToBase64String((1..48|%%{Get-Random -Max 256})-as[byte[]]) -replace '[^A-Za-z0-9]',''"') do set "JWT_SECRET=%%i"
    echo [√] 已自动生成 JWT 密钥
)

echo.
echo ────────────────────────────────────────
echo   配置确认
echo ────────────────────────────────────────
echo   数据库名称: !DB_NAME!
echo   数据库用户: !DB_USER!
echo   数据库密码: ********
echo   JWT 密钥:   !JWT_SECRET:~0,8!...
echo.

set /p "CONFIRM=确认以上配置？(Y/n): "
if /i "!CONFIRM!"=="n" (
    echo 已取消安装，请重新运行脚本。
    pause
    exit /b 0
)

:: ============================================
:: 开始安装
:: ============================================

echo.
echo [1/7] 克隆项目...
cd /d "%USERPROFILE%"
if exist "TabN" (
    echo [*] 项目已存在，更新代码...
    cd TabN
    git pull
) else (
    git clone https://github.com/LZZLHY/TabN.git
    cd TabN
)

echo.
echo [2/7] 生成数据库配置...
:: 生成 docker-compose.yml
(
echo # TabN 数据库配置 ^(由安装脚本自动生成^)
echo # 请勿手动修改密码，如需修改请重新运行安装脚本
echo.
echo name: TabN
echo.
echo services:
echo   postgres:
echo     container_name: TabN-postgres
echo     image: postgres:15
echo     restart: unless-stopped
echo     environment:
echo       POSTGRES_DB: !DB_NAME!
echo       POSTGRES_USER: !DB_USER!
echo       POSTGRES_PASSWORD: !DB_PASSWORD!
echo     ports:
echo       - "127.0.0.1:5432:5432"
echo     volumes:
echo       - TabN-postgres-data:/var/lib/postgresql/data
echo.
echo volumes:
echo   TabN-postgres-data:
) > docker-compose.yml
echo [√] 已生成 docker-compose.yml

echo.
echo [3/7] 启动数据库...
docker compose up -d
timeout /t 5 >nul

echo.
echo [4/7] 配置后端...
cd backend
:: 生成 env.local
(
echo # TabN 后端配置 ^(由安装脚本自动生成^)
echo.
echo DATABASE_URL="postgresql://!DB_USER!:!DB_PASSWORD!@localhost:5432/!DB_NAME!?schema=public"
echo PORT=3100
echo JWT_SECRET="!JWT_SECRET!"
echo.
echo # HOST 配置：生产环境自动使用 0.0.0.0
echo # HOST=0.0.0.0
) > env.local
echo [√] 已生成 backend/env.local
call npm install

echo.
echo [5/7] 构建共享模块...
cd ..
call npm install
call npm run build:shared

echo.
echo [6/7] 配置前端...
cd frontend
call npm install

echo.
echo [7/7] 启动服务...
cd ..
start "后端服务" cmd /k "cd backend && npm run dev"
timeout /t 5 >nul
start "前端服务" cmd /k "cd frontend && npm run dev"

echo.
echo ════════════════════════════════════════════════════
echo 🎉 安装完成！
echo.
echo   前端地址: http://localhost:5173
echo   后端地址: http://localhost:3100
echo   管理后台: http://localhost:5173/admin
echo.
echo   默认账号: admin / admin123456
echo.
echo   项目目录: %USERPROFILE%\TabN
echo ════════════════════════════════════════════════════
echo.

:: 等待后端启动后打开浏览器
echo 等待服务启动...
timeout /t 30 >nul
start http://localhost:5173

pause

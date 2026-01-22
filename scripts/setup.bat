@echo off
chcp 65001 >nul 2>&1
title TabN - 本地开发配置
setlocal enabledelayedexpansion

:: 获取脚本所在目录的父目录（项目根目录）
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%.."
set "ROOT_DIR=%CD%"

echo.
echo ╔════════════════════════════════════════════════════╗
echo ║      TabN - 本地开发配置脚本                       ║
echo ║      (不克隆仓库，仅生成配置文件)                  ║
echo ╚════════════════════════════════════════════════════╝
echo.
echo 项目目录: %ROOT_DIR%
echo.

:: ============================================
:: 检查依赖
:: ============================================

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
    echo [!] Docker 未运行，正在尝试启动 Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo.
    echo 等待 Docker 启动中...
    
    :: 等待 Docker 启动，最多等待 60 秒
    set /a "WAIT_COUNT=0"
    :wait_docker
    timeout /t 3 >nul
    docker info >nul 2>&1
    if %errorlevel% equ 0 goto docker_ready
    set /a "WAIT_COUNT+=1"
    if !WAIT_COUNT! lss 20 (
        echo   等待中... ^(!WAIT_COUNT!/20^)
        goto wait_docker
    )
    echo [!] Docker 启动超时，请手动启动 Docker Desktop 后重新运行此脚本
    pause
    exit /b 1
)
:docker_ready
echo [√] Docker 已运行

:: ============================================
:: 检查是否已有配置
:: ============================================
if exist "%ROOT_DIR%\docker-compose.yml" (
    echo.
    echo [!] 检测到已有配置文件
    echo.
    echo 请选择操作:
    echo   1. 覆盖配置（保留数据库）
    echo   2. 完全重置（删除数据库、设置文件、重新配置）
    echo   3. 使用现有配置直接启动
    echo   0. 退出
    echo.
    set /p "RESET_CHOICE=请选择 [0-3]: "
    
    if "!RESET_CHOICE!"=="0" (
        echo 已退出。
        pause
        exit /b 0
    )
    if "!RESET_CHOICE!"=="3" (
        echo 使用现有配置...
        goto start_services
    )
    if "!RESET_CHOICE!"=="1" (
        echo 覆盖配置（保留数据库）...
        echo.
        goto config_database
    )
    if "!RESET_CHOICE!"=="2" (
        echo.
        echo [!] 警告: 这将删除数据库和所有用户设置！
        set /p "CONFIRM_RESET=确认完全重置？(输入 YES 确认): "
        if "!CONFIRM_RESET!"=="YES" (
            echo.
            echo 正在清理...
            
            :: 停止并删除 Docker 容器和数据卷
            echo [1/3] 停止并删除数据库容器...
            docker compose down -v 2>nul
            
            :: 删除用户设置文件
            echo [2/3] 删除用户设置文件...
            if exist "%ROOT_DIR%\backend\storage\user-settings" (
                rmdir /s /q "%ROOT_DIR%\backend\storage\user-settings"
            )
            
            :: 删除配置文件
            echo [3/3] 删除配置文件...
            if exist "%ROOT_DIR%\docker-compose.yml" del /q "%ROOT_DIR%\docker-compose.yml"
            if exist "%ROOT_DIR%\backend\env.local" del /q "%ROOT_DIR%\backend\env.local"
            
            echo [√] 清理完成，开始重新配置...
            echo.
            goto config_database
        ) else (
            echo 已取消重置。
            pause
            exit /b 0
        )
    )
    :: 无效选项
    echo [!] 无效选项，请重新运行脚本。
    pause
    exit /b 1
)

:: ============================================
:: 交互式配置数据库
:: ============================================
:config_database
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
    echo 已取消配置，请重新运行脚本。
    pause
    exit /b 0
)

:: ============================================
:: 生成配置文件
:: ============================================

echo.
echo [1/2] 生成 docker-compose.yml...
(
echo # TabN 数据库配置 ^(由 setup.bat 自动生成^)
echo # 请勿手动修改密码，如需修改请重新运行 setup.bat
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
) > "%ROOT_DIR%\docker-compose.yml"
echo [√] 已生成 docker-compose.yml

echo.
echo [2/2] 生成 backend/env.local...
(
echo # TabN 后端配置 ^(由 setup.bat 自动生成^)
echo.
echo DATABASE_URL="postgresql://!DB_USER!:!DB_PASSWORD!@localhost:5432/!DB_NAME!?schema=public"
echo PORT=3100
echo JWT_SECRET="!JWT_SECRET!"
echo.
echo # HOST 配置：生产环境自动使用 0.0.0.0
echo # HOST=0.0.0.0
) > "%ROOT_DIR%\backend\env.local"
echo [√] 已生成 backend/env.local

:start_services
echo.
echo ════════════════════════════════════════════════════
echo [√] 配置完成！
echo.
echo 后续步骤:
echo   1. 启动数据库: docker compose up -d
echo   2. 启动服务:   双击运行 scripts\start.bat
echo.
echo 或者现在自动启动？
set /p "START_NOW=是否立即启动服务？(Y/n): "
if /i not "!START_NOW!"=="n" (
    echo.
    echo 启动数据库...
    docker compose up -d
    timeout /t 3 >nul
    echo.
    echo 启动服务...
    call "%SCRIPT_DIR%start.bat"
    echo.
    echo 服务已启动，按任意键退出...
    pause >nul
) else (
    echo.
    echo 稍后可运行 scripts\start.bat 启动服务。
    pause
)

endlocal

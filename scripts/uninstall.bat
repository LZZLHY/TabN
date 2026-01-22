@echo off
chcp 65001 >nul 2>&1
title TabN - 卸载程序
setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════╗
echo ║           TabN - 卸载程序                          ║
echo ╚════════════════════════════════════════════════════╝
echo.

:: 默认安装目录
set "INSTALL_DIR=%USERPROFILE%\TabN"

:: 检查项目是否存在
if not exist "%INSTALL_DIR%" (
    echo [!] 未找到 TabN 安装目录: %INSTALL_DIR%
    echo.
    echo 如果项目安装在其他位置，请手动删除。
    pause
    exit /b 1
)

echo 即将卸载以下内容:
echo.
echo   项目目录: %INSTALL_DIR%
echo   Docker 容器和数据卷
echo.
echo ════════════════════════════════════════════════════
echo [!] 警告: 此操作将删除所有数据，包括数据库内容！
echo ════════════════════════════════════════════════════
echo.

set /p "CONFIRM=确认要完全卸载 TabN？(输入 YES 确认): "
if /i not "!CONFIRM!"=="YES" (
    echo 已取消卸载。
    pause
    exit /b 0
)

echo.
echo [1/4] 停止运行中的服务...
:: 杀死 Node.js 进程（可能是前后端服务）
taskkill /F /IM node.exe /FI "WINDOWTITLE eq 后端服务*" >nul 2>&1
taskkill /F /IM node.exe /FI "WINDOWTITLE eq 前端服务*" >nul 2>&1
:: 杀死占用 3100 和 5173 端口的进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3100 ^| findstr LISTENING 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo [√] 服务已停止

echo.
echo [2/4] 停止并删除 Docker 容器...
cd /d "%INSTALL_DIR%" 2>nul
if exist "docker-compose.yml" (
    docker compose down -v >nul 2>&1
    echo [√] Docker 容器和数据卷已删除
) else (
    echo [*] 未找到 docker-compose.yml，跳过
)

echo.
echo [3/4] 删除项目目录...
cd /d "%USERPROFILE%"
rmdir /s /q "%INSTALL_DIR%" 2>nul
if exist "%INSTALL_DIR%" (
    echo [!] 无法完全删除目录，可能有文件被占用
    echo     请手动删除: %INSTALL_DIR%
) else (
    echo [√] 项目目录已删除
)

echo.
echo [4/4] 清理完成
echo.
echo ════════════════════════════════════════════════════
echo [√] TabN 已成功卸载！
echo.
echo 以下内容未被删除（如需清理请手动处理）:
echo   - Docker Desktop 应用程序
echo   - Node.js 运行环境
echo   - Git 版本控制工具
echo ════════════════════════════════════════════════════
echo.

pause

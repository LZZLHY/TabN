@echo off
chcp 65001 >nul 2>&1
title Start 启动页 - 控制面板

:: 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo   错误：未找到 Node.js
    echo   请先安装 Node.js: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 运行启动脚本
node "%~dp0start.js"

:: 如果脚本异常退出
if %errorlevel% neq 0 (
    echo.
    echo   启动脚本异常退出
    pause
)

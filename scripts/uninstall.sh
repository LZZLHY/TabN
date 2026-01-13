#!/bin/bash
#
# Start Project - 一键卸载脚本
# 用法: curl -fsSL https://raw.githubusercontent.com/LZZLHY/start/main/scripts/uninstall.sh | bash
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

INSTALL_DIR="$HOME/start"

echo ""
echo -e "${RED}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║   Start Project - 一键卸载脚本                     ║${NC}"
echo -e "${RED}╚════════════════════════════════════════════════════╝${NC}"
echo ""

check_sudo() {
    if [ "$EUID" -eq 0 ]; then
        SUDO=""
    elif command -v sudo &> /dev/null; then
        SUDO="sudo"
    else
        SUDO=""
    fi
}

stop_services() {
    echo -e "${YELLOW}[1/3] 停止服务...${NC}"
    pkill -f 'npm run dev' 2>/dev/null || true
    pkill -f 'node.*backend' 2>/dev/null || true
    pkill -f 'vite' 2>/dev/null || true
    sleep 2
    echo -e "${GREEN}✓ 服务已停止${NC}"
}

remove_database() {
    echo -e "${YELLOW}[2/3] 删除数据库...${NC}"
    
    if [ -d "$INSTALL_DIR" ] && command -v docker &> /dev/null; then
        cd "$INSTALL_DIR" 2>/dev/null || true
        if docker info &> /dev/null; then
            docker compose down -v 2>/dev/null || true
        else
            $SUDO docker compose down -v 2>/dev/null || true
        fi
        echo -e "${GREEN}✓ 数据库已删除${NC}"
    else
        echo -e "${YELLOW}⚠ 跳过数据库删除${NC}"
    fi
}

remove_project() {
    echo -e "${YELLOW}[3/3] 删除项目文件...${NC}"
    
    if [ -d "$INSTALL_DIR" ]; then
        rm -rf "$INSTALL_DIR"
        echo -e "${GREEN}✓ 项目已删除: $INSTALL_DIR${NC}"
    else
        echo -e "${YELLOW}⚠ 项目目录不存在${NC}"
    fi
}

show_result() {
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}🗑️  卸载完成！${NC}"
    echo ""
    echo "已删除: 服务进程、数据库、项目目录"
    echo "未删除: Docker、Node.js、Git (如需删除请手动操作)"
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
}

main() {
    check_sudo
    stop_services
    remove_database
    remove_project
    show_result
}

main

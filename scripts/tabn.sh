#!/bin/bash
#
# TabN 管理脚本
# 用法: 
#   首次安装: curl -fsSL https://raw.githubusercontent.com/LZZLHY/TabN/main/scripts/tabn.sh | bash
#   已安装后: tabn
#

set -e

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 配置
INSTALL_DIR="$HOME/TabN"
BACKEND_PORT=3100
FRONTEND_PORT=5173

# 如果从项目目录运行，使用当前目录
SCRIPT_DIR="$(cd "$(dirname "$0")" 2>/dev/null && pwd)" || SCRIPT_DIR=""
if [ -n "$SCRIPT_DIR" ] && [ -f "$SCRIPT_DIR/../package.json" ]; then
    INSTALL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
fi

# 检查项目是否已安装
is_installed() {
    [ -d "$INSTALL_DIR" ] && [ -f "$INSTALL_DIR/package.json" ]
}

# 检查项目是否已安装（带错误提示）
check_installed() {
    if ! is_installed; then
        echo -e "${RED}TabN 未安装${NC}"
        echo "请先选择安装选项"
        return 1
    fi
}

# 显示标题
show_header() {
    clear
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║            欢迎使用 TabN 管理脚本                  ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# 显示未安装时的菜单
show_menu_not_installed() {
    echo -e "${YELLOW}检测到 TabN 尚未安装${NC}"
    echo ""
    echo -e "${CYAN}请选择安装方式：${NC}"
    echo -e "  ${GREEN}1.${NC} 普通安装 (开发模式，适合测试)"
    echo -e "  ${GREEN}2.${NC} PM2 安装 (生产模式，进程守护+开机自启)"
    echo ""
    echo "────────────────────────────────────────"
    echo -e "  ${GREEN}0.${NC} 退出脚本"
    echo ""
}

# 显示已安装时的菜单
show_menu_installed() {
    echo -e "${GREEN}TabN 已安装${NC} - 安装目录: $INSTALL_DIR"
    echo ""
    echo -e "${CYAN}基础功能：${NC}"
    echo -e "  ${GREEN}1.${NC} 重装 TabN (删除数据库重新安装)"
    echo -e "  ${GREEN}2.${NC} 更新 TabN (保留数据库，仅更新代码)"
    echo -e "  ${GREEN}3.${NC} 卸载 TabN"
    echo ""
    echo -e "${CYAN}服务管理：${NC}"
    echo -e "  ${GREEN}4.${NC} 查看状态"
    echo -e "  ${GREEN}5.${NC} 启动 TabN"
    echo -e "  ${GREEN}6.${NC} 停止 TabN"
    echo -e "  ${GREEN}7.${NC} 重启 TabN"
    echo ""
    echo -e "${CYAN}配置管理：${NC}"
    echo -e "  ${GREEN}8.${NC} 查看数据库账号密码"
    echo -e "  ${GREEN}9.${NC} 修改数据库密码"
    echo -e "  ${GREEN}10.${NC} 重置 JWT 密钥"
    echo ""
    echo -e "${CYAN}高级选项：${NC}"
    echo -e "  ${GREEN}11.${NC} 查看日志"
    echo -e "  ${GREEN}12.${NC} 系统信息"
    echo -e "  ${GREEN}13.${NC} PM2 进程守护"
    echo ""
    echo "────────────────────────────────────────"
    echo -e "  ${GREEN}0.${NC} 退出脚本"
    echo ""
}

# 普通安装 TabN
install_tabn() {
    echo -e "${YELLOW}正在普通安装 TabN (开发模式)...${NC}"
    curl -fsSL https://raw.githubusercontent.com/LZZLHY/TabN/main/scripts/install.sh | bash
}

# PM2 安装 TabN
install_tabn_pm2() {
    echo -e "${YELLOW}正在 PM2 安装 TabN (生产模式)...${NC}"
    echo ""
    
    # 先执行普通安装
    curl -fsSL https://raw.githubusercontent.com/LZZLHY/TabN/main/scripts/install.sh | bash
    
    # 检查安装是否成功
    if ! is_installed; then
        echo -e "${RED}安装失败，无法启用 PM2${NC}"
        return 1
    fi
    
    echo ""
    echo -e "${YELLOW}安装完成，正在配置 PM2 进程守护...${NC}"
    echo ""
    
    # 安装 PM2
    if ! command -v pm2 &> /dev/null; then
        echo -e "${YELLOW}安装 PM2...${NC}"
        npm install -g pm2
    fi
    
    # 停止开发模式进程
    pkill -f 'npm run dev' 2>/dev/null || true
    sleep 2
    
    # 启动数据库
    cd "$INSTALL_DIR"
    docker compose up -d
    sleep 3
    
    # 构建后端
    echo -e "${YELLOW}构建后端...${NC}"
    cd "$INSTALL_DIR/backend"
    npm run build 2>/dev/null || echo "后端无需构建或已构建"
    
    # 使用 PM2 启动后端
    echo -e "${YELLOW}启动后端服务...${NC}"
    pm2 delete tabn-backend 2>/dev/null || true
    pm2 start npm --name "tabn-backend" -- run dev
    
    # 构建前端
    echo -e "${YELLOW}构建前端...${NC}"
    cd "$INSTALL_DIR/frontend"
    npm run build
    
    # 使用 PM2 启动前端
    echo -e "${YELLOW}启动前端服务...${NC}"
    pm2 delete tabn-frontend 2>/dev/null || true
    pm2 start npm --name "tabn-frontend" -- run preview
    
    # 保存 PM2 配置
    pm2 save
    
    # 设置开机自启
    echo ""
    echo -e "${YELLOW}设置开机自启...${NC}"
    pm2 startup 2>/dev/null || true
    
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}🎉 PM2 安装完成！${NC}"
    echo ""
    pm2 list | grep -E "tabn|Name"
    echo ""
    echo -e "${YELLOW}提示: 如需完成开机自启配置，请执行上面显示的 sudo 命令${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
}

# 重装 TabN（删除数据库重新安装）
reinstall_tabn() {
    check_installed || return
    echo ""
    echo -e "${RED}════════════════════════════════════════════════════${NC}"
    echo -e "${RED}警告: 重装将删除所有数据，包括数据库和用户设置！${NC}"
    echo -e "${RED}════════════════════════════════════════════════════${NC}"
    echo ""
    read -p "确认要重装 TabN？(输入 YES 确认): " confirm
    
    if [ "$confirm" != "YES" ]; then
        echo "已取消重装。"
        return
    fi
    
    echo -e "${YELLOW}正在重装...${NC}"
    
    # 停止服务
    stop_tabn_silent
    
    # 停止并删除 Docker 容器和数据卷
    cd "$INSTALL_DIR"
    docker compose down -v 2>/dev/null || true
    
    # 删除用户设置文件（因为数据库删除后用户ID会变）
    echo -e "${YELLOW}删除用户设置文件...${NC}"
    rm -rf "$INSTALL_DIR/backend/storage/user-settings" 2>/dev/null || true
    
    # 删除项目目录
    cd "$HOME"
    rm -rf "$INSTALL_DIR"
    
    # 重新安装
    install_tabn
}

# 更新 TabN（保留数据库和用户设置）
update_tabn() {
    check_installed
    echo -e "${YELLOW}正在更新 TabN（保留数据库和用户设置）...${NC}"
    cd "$INSTALL_DIR"
    
    # 停止服务
    stop_tabn_silent
    
    # 更新代码（不影响数据库和设置文件）
    git pull
    
    # 重新安装依赖
    npm install
    npm run build:shared
    
    # 重启服务
    start_tabn
    
    echo -e "${GREEN}更新完成！数据库和用户设置已保留。${NC}"
}

# 3. 卸载 TabN
uninstall_tabn() {
    check_installed
    echo ""
    echo -e "${RED}════════════════════════════════════════════════════${NC}"
    echo -e "${RED}警告: 此操作将删除所有数据，包括数据库和用户设置！${NC}"
    echo -e "${RED}════════════════════════════════════════════════════${NC}"
    echo ""
    read -p "确认要完全卸载 TabN？(输入 YES 确认): " confirm
    
    if [ "$confirm" != "YES" ]; then
        echo "已取消卸载。"
        return
    fi
    
    echo -e "${YELLOW}正在卸载...${NC}"
    
    # 停止服务
    stop_tabn_silent
    
    # 停止并删除 Docker 容器和数据卷
    cd "$INSTALL_DIR"
    docker compose down -v 2>/dev/null || true
    
    # 删除用户设置文件
    echo -e "${YELLOW}删除用户设置文件...${NC}"
    rm -rf "$INSTALL_DIR/backend/storage/user-settings" 2>/dev/null || true
    
    # 删除项目目录
    cd "$HOME"
    rm -rf "$INSTALL_DIR"
    
    # 删除 tabn 命令
    rm -f /usr/local/bin/tabn 2>/dev/null || sudo rm -f /usr/local/bin/tabn 2>/dev/null || true
    
    echo -e "${GREEN}TabN 已成功卸载！${NC}"
}

# 4. 查看状态
show_status() {
    check_installed
    echo ""
    echo -e "${CYAN}═══ TabN 服务状态 ═══${NC}"
    echo ""
    
    # 检查数据库
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'postgres'; then
        echo -e "  数据库:   ${GREEN}● 运行中${NC}"
    else
        echo -e "  数据库:   ${RED}○ 已停止${NC}"
    fi
    
    # 检查后端
    if curl -s "http://localhost:$BACKEND_PORT/health" > /dev/null 2>&1; then
        echo -e "  后端:     ${GREEN}● 运行中${NC} (端口 $BACKEND_PORT)"
    else
        echo -e "  后端:     ${RED}○ 已停止${NC}"
    fi
    
    # 检查前端
    if curl -s "http://localhost:$FRONTEND_PORT" > /dev/null 2>&1; then
        echo -e "  前端:     ${GREEN}● 运行中${NC} (端口 $FRONTEND_PORT)"
    else
        echo -e "  前端:     ${RED}○ 已停止${NC}"
    fi
    
    echo ""
    
    # 获取 IP
    PUBLIC_IP=$(curl -s --connect-timeout 3 ifconfig.me 2>/dev/null || echo "")
    LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "")
    
    if curl -s "http://localhost:$FRONTEND_PORT" > /dev/null 2>&1; then
        echo -e "${CYAN}═══ 访问地址 ═══${NC}"
        echo ""
        echo -e "  本地访问: ${BLUE}http://localhost:$FRONTEND_PORT${NC}"
        [ -n "$LOCAL_IP" ] && echo -e "  内网访问: ${BLUE}http://$LOCAL_IP:$FRONTEND_PORT${NC}"
        [ -n "$PUBLIC_IP" ] && echo -e "  公网访问: ${BLUE}http://$PUBLIC_IP:$FRONTEND_PORT${NC}"
        echo ""
    fi
}

# 5. 启动 TabN
start_tabn() {
    check_installed
    echo -e "${YELLOW}正在启动 TabN...${NC}"
    cd "$INSTALL_DIR"
    
    # 启动数据库
    docker compose up -d
    sleep 3
    
    # 启动后端
    cd backend
    nohup npm run dev > /dev/null 2>&1 &
    
    # 等待后端启动
    echo "等待后端启动..."
    for i in {1..60}; do
        if curl -s "http://localhost:$BACKEND_PORT/health" > /dev/null 2>&1; then
            break
        fi
        sleep 1
    done
    
    # 启动前端
    cd ../frontend
    nohup npm run dev > /dev/null 2>&1 &
    sleep 3
    
    echo -e "${GREEN}TabN 已启动！${NC}"
    show_status
}

# 6. 停止 TabN
stop_tabn() {
    check_installed
    echo -e "${YELLOW}正在停止 TabN...${NC}"
    stop_tabn_silent
    echo -e "${GREEN}TabN 已停止！${NC}"
}

# 静默停止（内部使用）
stop_tabn_silent() {
    # 停止前后端进程
    pkill -f 'npm run dev' 2>/dev/null || true
    pkill -f 'vite' 2>/dev/null || true
    sleep 2
    
    # 停止数据库
    cd "$INSTALL_DIR" 2>/dev/null || return
    docker compose down 2>/dev/null || true
}

# 7. 重启 TabN
restart_tabn() {
    check_installed
    echo -e "${YELLOW}正在重启 TabN...${NC}"
    stop_tabn_silent
    sleep 2
    start_tabn
}

# 8. 查看数据库账号密码
show_db_credentials() {
    check_installed
    echo ""
    echo -e "${CYAN}═══ 数据库配置信息 ═══${NC}"
    echo ""
    
    ENV_FILE="$INSTALL_DIR/backend/env.local"
    COMPOSE_FILE="$INSTALL_DIR/docker-compose.yml"
    
    if [ -f "$ENV_FILE" ]; then
        # 从 env.local 提取信息
        DB_URL=$(grep -oP 'DATABASE_URL="\K[^"]+' "$ENV_FILE" 2>/dev/null || echo "")
        
        if [ -n "$DB_URL" ]; then
            # 解析 DATABASE_URL: postgresql://user:password@host:port/database
            DB_USER=$(echo "$DB_URL" | sed -n 's|postgresql://\([^:]*\):.*|\1|p')
            DB_PASS=$(echo "$DB_URL" | sed -n 's|postgresql://[^:]*:\([^@]*\)@.*|\1|p')
            DB_HOST=$(echo "$DB_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
            DB_PORT=$(echo "$DB_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
            DB_NAME=$(echo "$DB_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
            
            echo -e "  数据库名称:   ${GREEN}$DB_NAME${NC}"
            echo -e "  用户名:       ${GREEN}$DB_USER${NC}"
            echo -e "  密码:         ${GREEN}$DB_PASS${NC}"
            echo -e "  主机:         ${GREEN}$DB_HOST${NC}"
            echo -e "  端口:         ${GREEN}$DB_PORT${NC}"
            echo ""
            echo -e "  连接字符串:"
            echo -e "  ${BLUE}$DB_URL${NC}"
        else
            echo -e "${RED}无法解析数据库配置${NC}"
        fi
    else
        echo -e "${RED}未找到配置文件: $ENV_FILE${NC}"
    fi
    
    echo ""
    
    # 显示 JWT 密钥（部分）
    if [ -f "$ENV_FILE" ]; then
        JWT=$(grep -oP 'JWT_SECRET="\K[^"]+' "$ENV_FILE" 2>/dev/null || echo "")
        if [ -n "$JWT" ]; then
            echo -e "  JWT 密钥:     ${GREEN}${JWT:0:16}...${NC} (已隐藏)"
        fi
    fi
    
    echo ""
}

# 9. 修改数据库密码
change_db_password() {
    check_installed
    echo ""
    echo -e "${YELLOW}修改数据库密码${NC}"
    echo ""
    echo -e "${RED}警告: 修改密码后需要重启服务，且需要重新创建数据库容器！${NC}"
    echo ""
    
    read -p "是否继续？(y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "已取消。"
        return
    fi
    
    # 输入新密码
    while true; do
        read -s -p "请输入新密码 (至少8位): " new_pass
        echo ""
        if [ ${#new_pass} -lt 8 ]; then
            echo -e "${RED}密码长度至少8位${NC}"
            continue
        fi
        read -s -p "确认新密码: " new_pass_confirm
        echo ""
        if [ "$new_pass" != "$new_pass_confirm" ]; then
            echo -e "${RED}两次密码不一致${NC}"
            continue
        fi
        break
    done
    
    # 停止服务
    stop_tabn_silent
    
    # 获取当前配置
    ENV_FILE="$INSTALL_DIR/backend/env.local"
    DB_URL=$(grep -oP 'DATABASE_URL="\K[^"]+' "$ENV_FILE" 2>/dev/null || echo "")
    DB_USER=$(echo "$DB_URL" | sed -n 's|postgresql://\([^:]*\):.*|\1|p')
    DB_NAME=$(echo "$DB_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
    
    # 更新 env.local
    NEW_URL="postgresql://$DB_USER:$new_pass@localhost:5432/$DB_NAME?schema=public"
    sed -i "s|DATABASE_URL=\"[^\"]*\"|DATABASE_URL=\"$NEW_URL\"|" "$ENV_FILE"
    
    # 更新 docker-compose.yml
    COMPOSE_FILE="$INSTALL_DIR/docker-compose.yml"
    sed -i "s|POSTGRES_PASSWORD:.*|POSTGRES_PASSWORD: $new_pass|" "$COMPOSE_FILE"
    
    # 删除旧容器和数据卷，重新创建
    cd "$INSTALL_DIR"
    docker compose down -v
    docker compose up -d
    sleep 5
    
    # 重新运行数据库迁移
    cd backend
    npx prisma migrate deploy 2>/dev/null || true
    
    echo ""
    echo -e "${GREEN}密码已修改！正在重启服务...${NC}"
    
    # 重启服务
    start_tabn
}

# 10. 重置 JWT 密钥
reset_jwt_secret() {
    check_installed
    echo ""
    echo -e "${YELLOW}重置 JWT 密钥${NC}"
    echo ""
    echo -e "${RED}警告: 重置后所有已登录用户需要重新登录！${NC}"
    echo ""
    
    read -p "是否继续？(y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "已取消。"
        return
    fi
    
    # 生成新密钥
    NEW_SECRET=$(openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c 64)
    
    # 更新 env.local
    ENV_FILE="$INSTALL_DIR/backend/env.local"
    sed -i "s|JWT_SECRET=\"[^\"]*\"|JWT_SECRET=\"$NEW_SECRET\"|" "$ENV_FILE"
    
    echo -e "${GREEN}JWT 密钥已重置！${NC}"
    echo ""
    echo "新密钥: ${NEW_SECRET:0:16}... (已隐藏)"
    echo ""
    
    read -p "是否重启服务使其生效？(Y/n): " restart
    if [ "$restart" != "n" ] && [ "$restart" != "N" ]; then
        restart_tabn
    fi
}

# 11. 查看日志
show_logs() {
    check_installed
    echo ""
    echo -e "${CYAN}选择要查看的日志：${NC}"
    echo "  1. 数据库日志"
    echo "  2. 后端日志 (最近)"
    echo "  0. 返回"
    echo ""
    read -p "请选择: " choice
    
    case $choice in
        1)
            cd "$INSTALL_DIR"
            docker compose logs --tail=50 postgres
            ;;
        2)
            LOG_FILE="$INSTALL_DIR/.start/backend.log"
            if [ -f "$LOG_FILE" ]; then
                tail -50 "$LOG_FILE"
            else
                echo "未找到后端日志文件"
            fi
            ;;
        *)
            return
            ;;
    esac
}

# 12. 系统信息
show_system_info() {
    check_installed
    echo ""
    echo -e "${CYAN}═══ 系统信息 ═══${NC}"
    echo ""
    
    # 项目版本
    if [ -f "$INSTALL_DIR/package.json" ]; then
        VERSION=$(grep -oP '"version":\s*"\K[^"]+' "$INSTALL_DIR/package.json" 2>/dev/null || echo "未知")
        echo -e "  TabN 版本:    ${GREEN}v$VERSION${NC}"
    fi
    
    # Node.js 版本
    if command -v node &> /dev/null; then
        NODE_VER=$(node -v)
        echo -e "  Node.js:      ${GREEN}$NODE_VER${NC}"
    fi
    
    # Docker 版本
    if command -v docker &> /dev/null; then
        DOCKER_VER=$(docker --version | awk '{print $3}' | tr -d ',')
        echo -e "  Docker:       ${GREEN}$DOCKER_VER${NC}"
    fi
    
    # 安装目录
    echo -e "  安装目录:     ${GREEN}$INSTALL_DIR${NC}"
    
    # 磁盘使用
    if [ -d "$INSTALL_DIR" ]; then
        DISK_USAGE=$(du -sh "$INSTALL_DIR" 2>/dev/null | awk '{print $1}')
        echo -e "  磁盘占用:     ${GREEN}$DISK_USAGE${NC}"
    fi
    
    echo ""
}

# 13. PM2 进程守护
pm2_management() {
    check_installed || return
    echo ""
    echo -e "${CYAN}═══ PM2 进程守护 ═══${NC}"
    echo ""
    
    # 检查 PM2 是否安装
    if ! command -v pm2 &> /dev/null; then
        echo -e "${YELLOW}PM2 未安装${NC}"
        echo ""
        read -p "是否安装 PM2？(Y/n): " install_pm2
        if [ "$install_pm2" != "n" ] && [ "$install_pm2" != "N" ]; then
            echo -e "${YELLOW}正在安装 PM2...${NC}"
            npm install -g pm2
            echo -e "${GREEN}✓ PM2 安装完成${NC}"
        else
            echo "已取消。"
            return
        fi
    fi
    
    echo -e "${GREEN}PM2 已安装${NC}"
    echo ""
    
    # 检查当前 PM2 状态
    PM2_BACKEND=$(pm2 list 2>/dev/null | grep -c "tabn-backend" || echo "0")
    PM2_FRONTEND=$(pm2 list 2>/dev/null | grep -c "tabn-frontend" || echo "0")
    
    if [ "$PM2_BACKEND" -gt 0 ] || [ "$PM2_FRONTEND" -gt 0 ]; then
        echo -e "当前状态: ${GREEN}PM2 守护已启用${NC}"
        echo ""
        pm2 list | grep -E "tabn|Name"
    else
        echo -e "当前状态: ${YELLOW}PM2 守护未启用${NC}"
    fi
    
    echo ""
    echo -e "${CYAN}请选择操作：${NC}"
    echo -e "  ${GREEN}1.${NC} 启用 PM2 守护 (生产模式)"
    echo -e "  ${GREEN}2.${NC} 停止 PM2 守护"
    echo -e "  ${GREEN}3.${NC} 查看 PM2 状态"
    echo -e "  ${GREEN}4.${NC} 设置开机自启"
    echo -e "  ${GREEN}0.${NC} 返回"
    echo ""
    
    read -p "请选择: " pm2_choice
    
    case $pm2_choice in
        1) enable_pm2 ;;
        2) disable_pm2 ;;
        3) pm2 list ;;
        4) setup_pm2_startup ;;
        *) return ;;
    esac
}

# 启用 PM2 守护
enable_pm2() {
    echo ""
    echo -e "${YELLOW}正在启用 PM2 守护...${NC}"
    
    # 先停止现有的开发模式进程
    stop_tabn_silent
    
    # 启动数据库
    cd "$INSTALL_DIR"
    docker compose up -d
    sleep 3
    
    # 构建后端
    echo -e "${YELLOW}构建后端...${NC}"
    cd "$INSTALL_DIR/backend"
    npm run build 2>/dev/null || echo "后端无需构建或已构建"
    
    # 使用 PM2 启动后端
    echo -e "${YELLOW}启动后端服务...${NC}"
    pm2 delete tabn-backend 2>/dev/null || true
    pm2 start npm --name "tabn-backend" -- run dev
    
    # 构建前端
    echo -e "${YELLOW}构建前端...${NC}"
    cd "$INSTALL_DIR/frontend"
    npm run build
    
    # 使用 PM2 启动前端（预览模式）
    echo -e "${YELLOW}启动前端服务...${NC}"
    pm2 delete tabn-frontend 2>/dev/null || true
    pm2 start npm --name "tabn-frontend" -- run preview
    
    # 保存 PM2 配置
    pm2 save
    
    echo ""
    echo -e "${GREEN}✓ PM2 守护已启用！${NC}"
    echo ""
    pm2 list | grep -E "tabn|Name"
    echo ""
    echo -e "${YELLOW}提示: 运行 'tabn' 选择 '设置开机自启' 可实现服务器重启后自动恢复${NC}"
}

# 停止 PM2 守护
disable_pm2() {
    echo ""
    echo -e "${YELLOW}正在停止 PM2 守护...${NC}"
    
    pm2 delete tabn-backend 2>/dev/null || true
    pm2 delete tabn-frontend 2>/dev/null || true
    pm2 save
    
    echo -e "${GREEN}✓ PM2 守护已停止${NC}"
}

# 设置 PM2 开机自启
setup_pm2_startup() {
    echo ""
    echo -e "${YELLOW}设置 PM2 开机自启...${NC}"
    echo ""
    echo "请按照以下提示操作："
    echo ""
    
    pm2 startup
    
    echo ""
    echo -e "${GREEN}执行上面显示的 sudo 命令后，PM2 将在系统重启后自动恢复服务${NC}"
}

# 未安装时的主循环
main_not_installed() {
    while true; do
        show_header
        show_menu_not_installed
        read -p "请输入选项 [0-2]: " choice
        echo ""
        
        case $choice in
            1) 
                install_tabn
                # 安装完成后切换到已安装模式
                if is_installed; then
                    echo ""
                    read -p "按回车键进入管理面板..."
                    main_installed
                    return
                fi
                ;;
            2)
                install_tabn_pm2
                # 安装完成后切换到已安装模式
                if is_installed; then
                    echo ""
                    read -p "按回车键进入管理面板..."
                    main_installed
                    return
                fi
                ;;
            0)
                echo "感谢使用，再见！"
                exit 0
                ;;
            *)
                echo -e "${RED}无效选项，请重新选择${NC}"
                ;;
        esac
        
        echo ""
        read -p "按回车键继续..."
    done
}

# 已安装时的主循环
main_installed() {
    while true; do
        show_header
        show_menu_installed
        read -p "请输入选项 [0-13]: " choice
        echo ""
        
        case $choice in
            1) reinstall_tabn ;;
            2) update_tabn ;;
            3) uninstall_tabn ;;
            4) show_status ;;
            5) start_tabn ;;
            6) stop_tabn ;;
            7) restart_tabn ;;
            8) show_db_credentials ;;
            9) change_db_password ;;
            10) reset_jwt_secret ;;
            11) show_logs ;;
            12) show_system_info ;;
            13) pm2_management ;;
            0)
                echo "感谢使用，再见！"
                exit 0
                ;;
            *)
                echo -e "${RED}无效选项，请重新选择${NC}"
                ;;
        esac
        
        echo ""
        read -p "按回车键继续..."
    done
}

# 主入口
main() {
    if is_installed; then
        main_installed
    else
        main_not_installed
    fi
}

# 如果有参数，直接执行对应功能
if [ $# -gt 0 ]; then
    case $1 in
        install) install_tabn ;;
        update) update_tabn ;;
        uninstall) uninstall_tabn ;;
        status) show_status ;;
        start) start_tabn ;;
        stop) stop_tabn ;;
        restart) restart_tabn ;;
        password|passwd|pw) show_db_credentials ;;
        logs) show_logs ;;
        info) show_system_info ;;
        *)
            echo "用法: tabn [命令]"
            echo ""
            echo "命令:"
            echo "  install    安装 TabN"
            echo "  update     更新 TabN"
            echo "  uninstall  卸载 TabN"
            echo "  status     查看状态"
            echo "  start      启动服务"
            echo "  stop       停止服务"
            echo "  restart    重启服务"
            echo "  password   查看数据库密码"
            echo "  logs       查看日志"
            echo "  info       系统信息"
            echo ""
            echo "不带参数运行将进入交互式菜单"
            ;;
    esac
    exit 0
fi

# 进入交互式菜单
main

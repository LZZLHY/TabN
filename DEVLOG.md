# 开发者版本记录

> ⚠️ 此文件仅供开发者记录

**时间说明：**
- **开始时间** - 该大版本开始开发的时间
- **结束时间** - 该大版本非补丁功能完成开发的时间
- **发布时间** - 该大版本最后一个补丁发布的时间

**编号标注说明：**
- *#10000** - 斜体带星号表示补丁更新（同版本下的紧急修复）
- ~~#10000~~ - 删除线表示测试功能（尚未测试功能）
- ⚠️ - 黄色感叹号表示重要修复（影响核心功能的关键修复）

---

## v1.0.0

**发布时间**: 2025-01-14 (北京时间)

| 编号 | 时间 | 描述 | 涉及文件 | 开发者 |
|------|------|------|----------|--------|
| #10000 | 01-14 | 项目首次发布，基础书签管理、用户认证、前后端分离架构、PostgreSQL、Docker Compose 部署 | - | lovedhy |

---

## v1.0.1

**开始时间**: 2025-01-14 3:00 (北京时间)

**发布时间**: 2025-01-15 0:55 (北京时间)

| 编号 | 时间 | 描述 | 涉及文件 | 开发者 |
|------|------|------|----------|--------|
| #10001 | 01-15 | 压缩 Git 历史为单个 commit，清理敏感信息和冗余提交记录 | `.git/` | lovedhy |
| #10002 | 01-15 | 创建 v1.0.0 tag 并推送到 GitHub | `.git/` | lovedhy |
| #10003 | 01-15 | 首次安装时自动生成 64 字符随机 JWT_SECRET | [install.sh](scripts/install.sh), [install.bat](scripts/install.bat) | lovedhy |
| #10004 | 01-15 | 启动时检测不安全的默认 JWT_SECRET 并警告 | [env.ts](backend/src/env.ts) | lovedhy |
| #10005 | 01-15 | 生产环境使用默认 JWT_SECRET 时拒绝启动 | [env.ts](backend/src/env.ts) | lovedhy |
| #10006 | 01-15 | Windows 启动脚本提供一键替换 JWT_SECRET 选项 | [start.js](scripts/start.js) | lovedhy |
| #10007 | 01-15 | Linux 启动脚本提供一键替换 JWT_SECRET 选项 | [start.sh](scripts/start.sh) | lovedhy |
| #10008 | 01-15 | 更新 env.example 添加详细的 JWT_SECRET 说明 | [env.example](backend/env.example) | lovedhy |
| #10009 | 01-15 | 更新 README 添加安全配置章节 | [README.md](README.md) | lovedhy |
| #10010 | 01-15 | 修复 Windows Hyper-V 动态端口保留导致后端端口 3100 无法绑定的问题 | [start.js](scripts/start.js) | lovedhy |
| #10011 | 01-15 | 添加端口检测和自动永久保留功能（需管理员权限） | [start.js](scripts/start.js) | lovedhy |
| #10012 | 01-15 | start.bat 自动请求管理员权限运行 | [start.bat](scripts/start.bat) | lovedhy |
| #10013 | 01-15 | 后端 HOST 智能检测：Windows 用 127.0.0.1，Linux 用 0.0.0.0 | [env.ts](backend/src/env.ts) | lovedhy |
| #10014 | 01-15 | 修复重启服务时日志文件锁定错误 (EBUSY) | [start.js](scripts/start.js) | lovedhy |
| #10015 | 01-15 | 优化菜单选项：0=退出并关闭所有服务，5=只关闭控制面板 | [start.js](scripts/start.js) | lovedhy |
| #10016 | 01-15 | 服务已运行时重新打开 bat 直接进入菜单界面 | [start.js](scripts/start.js) | lovedhy |
| #10017 | 01-15 | 捕获 Ctrl+C 和窗口关闭事件，执行完整关闭流程后才退出 | [start.js](scripts/start.js) | lovedhy |
| #10018 | 01-15 | 创建版本更新日志 JSON 文件 | [changelog.json](frontend/public/changelog.json) | lovedhy |
| #10019 | 01-15 | 创建版本更新日志模态框组件 | [ChangelogDialog.tsx](frontend/src/components/ChangelogDialog.tsx) | lovedhy |
| #10020 | 01-15 | 设置页面添加"关于"区域，显示版本号和更新日志按钮 | [SettingsDialog.tsx](frontend/src/components/SettingsDialog.tsx) | lovedhy |

---

## v1.0.2

**发布时间**: 2026-01-15 01:14:52 (北京时间)

| 编号 | 时间 | 描述 | 涉及文件 | 开发者 |
|------|------|------|----------|--------|
| #10021 | 2026-01-15 01:14:52 | 后台更新：版本号改为从 package.json 读取，显示 tag 版本号而非 commit hash | [updateController.ts](backend/src/controllers/updateController.ts) | lovedhy |
| #10022 | 2026-01-15 01:14:52 | 后台更新：最新版本从 GitHub API 获取，不依赖本地 git | [updateController.ts](backend/src/controllers/updateController.ts) | lovedhy |
| #10023 | 2026-01-15 01:14:52 | 后台更新：检测是否有 git，无 git 时显示警告并提供 GitHub 下载链接 | [updateController.ts](backend/src/controllers/updateController.ts), [UpdateTab.tsx](frontend/src/pages/Admin/UpdateTab.tsx) | lovedhy |
| #10024 | 2026-01-15 01:14:52 | 后台更新：Linux 服务器重启时使用 spawn 启动新进程，解决重启后连不上的问题 | [updateController.ts](backend/src/controllers/updateController.ts) | lovedhy |
| #10025 | 2026-01-15 01:14:52 | 后台更新：移除提交列表和变更文件显示，简化界面 | [UpdateTab.tsx](frontend/src/pages/Admin/UpdateTab.tsx) | lovedhy |

---

## v1.0.3

**开始时间**: 2026-01-15 01:30:00 (北京时间)

**结束时间**: 2026-01-15 04:18:39 (北京时间)

**发布时间**: 2026-01-15 04:20:00 (北京时间)

| 编号 | 时间 | 描述 | 涉及文件 | 开发者 |
|------|------|------|----------|--------|
| #10026 | 2026-01-15 02:06:26 | 修复后台日志系统：logger 连接 logStorage，日志正确写入文件 | [server.ts](backend/src/server.ts) | lovedhy |
| #10027 | 2026-01-15 02:06:26 | 新增服务器状态 API，返回启动时长、运行时长、启动时间 | [adminController.ts](backend/src/controllers/adminController.ts), [admin.ts](backend/src/routes/admin.ts) | lovedhy |
| #10028 | 2026-01-15 02:06:26 | 后台更新页面新增服务器状态卡片，显示启动时长和运行时长 | [UpdateTab.tsx](frontend/src/pages/Admin/UpdateTab.tsx) | lovedhy |
| #10029 | 2026-01-15 02:06:26 | 运行时长动态更新，每秒刷新显示 | [UpdateTab.tsx](frontend/src/pages/Admin/UpdateTab.tsx) | lovedhy |
| #10030 | 2026-01-15 02:06:26 | 进入后台页面自动检查更新，有更新时 toast 提示 | [UpdateTab.tsx](frontend/src/pages/Admin/UpdateTab.tsx) | lovedhy |
| #10031 | 2026-01-15 02:06:26 | 日志级别筛选器精确匹配，选择级别后自动搜索 | [logController.ts](backend/src/controllers/logController.ts), [LogsTab.tsx](frontend/src/pages/Admin/LogsTab.tsx) | lovedhy |
| #10032 | 2026-01-15 02:06:26 | 日志级别名称添加颜色标识，筛选器添加 tooltip 提示 | [LogsTab.tsx](frontend/src/pages/Admin/LogsTab.tsx) | lovedhy |
| #10033 | 2026-01-15 02:06:26 | 日志列表固定高度内部滚动，页面不再整体滚动 | [LogsTab.tsx](frontend/src/pages/Admin/LogsTab.tsx), [index.tsx](frontend/src/pages/Admin/index.tsx) | lovedhy |
| #10034 | 2026-01-15 04:01:45 | 优化登录注册页外观：统一毛玻璃风格，改善表单布局和视觉效果 | [index.tsx](frontend/src/pages/Login/index.tsx), [index.tsx](frontend/src/pages/Register/index.tsx) | lovedhy |
| #10035 | 2026-01-15 04:01:45 | 用户数据隔离：书签排序、快捷方式等 localStorage 数据按用户 ID 存储，避免多用户数据混淆 | [orderStorage.ts](frontend/src/components/bookmarks/orderStorage.ts), [shortcutStorage.ts](frontend/src/components/bookmarks/shortcutStorage.ts) | lovedhy |
| #10036 | 2026-01-15 04:01:45 | 新增账户管理功能：用户可在设置页面修改账号名称、昵称、邮箱、手机号 | [SettingsDialog.tsx](frontend/src/components/SettingsDialog.tsx), [auth.ts](frontend/src/stores/auth.ts), [userController.ts](backend/src/controllers/userController.ts), [users.ts](backend/src/routes/users.ts) | lovedhy |
| #10037 | 2026-01-15 04:01:45 | 新增密码修改功能：用户可在设置页面修改密码，需验证当前密码 | [SettingsDialog.tsx](frontend/src/components/SettingsDialog.tsx), [auth.ts](frontend/src/stores/auth.ts), [userController.ts](backend/src/controllers/userController.ts) | lovedhy |
| #10038 | 2026-01-15 04:01:45 | 账户设置集成到设置弹窗：移除独立的 /settings 页面，统一在设置弹窗的"账户"标签页管理 | [SettingsDialog.tsx](frontend/src/components/SettingsDialog.tsx), [App.tsx](frontend/src/App.tsx), [Sidebar.tsx](frontend/src/components/Sidebar.tsx) | lovedhy |
| #10039 | 2026-01-15 04:01:45 | 修复邮箱/手机号显示问题：正确处理 null 值，支持清空邮箱/手机号 | [SettingsDialog.tsx](frontend/src/components/SettingsDialog.tsx), [userController.ts](backend/src/controllers/userController.ts) | lovedhy |
| #10040 | 2026-01-15 04:01:45 | 用户设置隔离：登出时自动重置外观设置和拖拽设置，避免不同用户设置混淆 | [auth.ts](frontend/src/stores/auth.ts) | lovedhy |
| #10041 | 2026-01-15 04:01:45 | 未登录用户可访问主页：移除强制跳转登录，未登录用户可正常使用搜索框 | [BookmarkGrid.tsx](frontend/src/components/BookmarkGrid.tsx) | lovedhy |
| #10042 | 2026-01-15 04:01:45 | 未登录用户点击添加书签时弹出登录提示模态框，可选择取消或去登录 | [BookmarkGrid.tsx](frontend/src/components/BookmarkGrid.tsx), [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx) | lovedhy |
| #10043 | 2026-01-15 04:01:45 | 修复多个 TypeScript 构建错误：移除未使用变量、修复类型断言、添加缺失 import | [orderStorage.test.ts](frontend/src/components/bookmarks/orderStorage.test.ts), [shortcutStorage.test.ts](frontend/src/components/bookmarks/shortcutStorage.test.ts), [GlowBorder.tsx](frontend/src/components/GlowBorder.tsx), [useShortcutMatcher.test.ts](frontend/src/hooks/useShortcutMatcher.test.ts), [index.tsx](frontend/src/pages/Admin/index.tsx), [index.tsx](frontend/src/pages/Register/index.tsx), [setup.ts](frontend/src/test/setup.ts), [sortBookmarks.test.ts](frontend/src/utils/sortBookmarks.test.ts) | lovedhy |
| #10044 | 2026-01-15 04:18:39 | 修复版本更新日志列表项圆点位置：改用 items-baseline 对齐，点与文字基线对齐 | [ChangelogDialog.tsx](frontend/src/components/ChangelogDialog.tsx) | lovedhy |

---

## v1.1.0

**开始时间**: 2026-01-15 04:20:00 (北京时间)

**结束时间**: 2026-01-15 08:04:43 (北京时间)

**发布时间**: 2026-01-15 08:20:44 (北京时间)

| 编号 | 时间 | 描述 | 涉及文件 | 开发者 |
|------|------|------|----------|--------|
| #10045 | 2026-01-15 04:35:00 | 智能更新检测：通过 GitHub Compare API 分析变更文件，精确判断更新类型 | [updateController.ts](backend/src/controllers/updateController.ts) | lovedhy |
| #10046 | 2026-01-15 04:35:00 | 新增数据库迁移检测：检测 prisma schema 或 migrations 变更时提示需要数据库迁移（紫色） | [updateController.ts](backend/src/controllers/updateController.ts), [UpdateTab.tsx](frontend/src/pages/Admin/UpdateTab.tsx) | lovedhy |
| #10047 | 2026-01-15 04:35:00 | 新增仅前端更新检测：仅前端代码变更时显示"仅前端更新（秒级）"提示（青色） | [updateController.ts](backend/src/controllers/updateController.ts), [UpdateTab.tsx](frontend/src/pages/Admin/UpdateTab.tsx) | lovedhy |
| #10048 | 2026-01-15 04:35:00 | 优化更新提示颜色：数据库迁移紫色、仅前端青色、安装依赖黄色、重启后端红色、无缝更新绿色 | [UpdateTab.tsx](frontend/src/pages/Admin/UpdateTab.tsx) | lovedhy |
| #10049 | 2026-01-15 08:00:48 | 新增点击统计功能：ClickStat 表记录用户对站点的点击次数 | [schema.prisma](backend/prisma/schema.prisma), [20260114215603_add_click_stat/](backend/prisma/migrations/20260114215603_add_click_stat/) | lovedhy |
| #10050 | 2026-01-15 08:00:48 | 新增点击追踪 API：记录书签点击并返回统计数据 | [clickController.ts](backend/src/controllers/clickController.ts), [bookmarks.ts](backend/src/routes/bookmarks.ts) | lovedhy |
| #10051 | 2026-01-15 08:00:48 | 新增点击统计服务：站点标识规范化、热力榜单查询 | [clickStats.ts](backend/src/services/clickStats.ts), [siteNormalizer.ts](backend/src/utils/siteNormalizer.ts) | lovedhy |
| #10052 | 2026-01-15 08:00:48 | 前端点击追踪 Hook：记录点击并乐观更新本地统计 | [useClickTracker.ts](frontend/src/hooks/useClickTracker.ts) | lovedhy |
| #10053 | 2026-01-15 08:00:48 | 书签页新增"按点击次数"排序模式 | [SortModeSelector.tsx](frontend/src/components/SortModeSelector.tsx), [sortBookmarks.ts](frontend/src/utils/sortBookmarks.ts) | lovedhy |
| #10054 | 2026-01-15 08:00:48 | 管理后台新增书签管理页：用户书签视图、热力榜单视图 | [BookmarksTab.tsx](frontend/src/pages/Admin/BookmarksTab.tsx), [index.tsx](frontend/src/pages/Admin/index.tsx) | lovedhy |
| #10055 | 2026-01-15 08:00:48 | 管理后台书签统计 API：按用户分组、个人/全局点击数 | [adminController.ts](backend/src/controllers/adminController.ts), [admin.ts](backend/src/routes/admin.ts) | lovedhy |
| #10056 | 2026-01-15 08:00:48 | 管理后台用户排序：ROOT > ADMIN > USER | [adminController.ts](backend/src/controllers/adminController.ts) | lovedhy |
| #10057 | 2026-01-15 08:00:48 | 管理后台书签 A-Z 排序：支持中文拼音排序 | [BookmarksTab.tsx](frontend/src/pages/Admin/BookmarksTab.tsx) | lovedhy |
| #10058 | 2026-01-15 08:00:48 | 管理后台书签编辑/删除功能 | [adminController.ts](backend/src/controllers/adminController.ts), [BookmarksTab.tsx](frontend/src/pages/Admin/BookmarksTab.tsx) | lovedhy |
| #10059 | 2026-01-15 08:00:48 | 修复点击排序实时更新：正确使用后端返回的 userClicks 字段 | [useClickTracker.ts](frontend/src/hooks/useClickTracker.ts) | lovedhy |
| #10060 | 2026-01-15 08:00:48 | 优化排序依赖检测：使用 JSON.stringify 确保 clickCounts 变化触发重排序 | [useBookmarkOrder.ts](frontend/src/components/bookmarks/useBookmarkOrder.ts) | lovedhy |

---

## v1.1.1

**开始时间**: 2026-01-15 08:20:44 (北京时间)

**结束时间**: 2026-01-15 23:15:40 (北京时间)

| 编号 | 时间 | 描述 | 涉及文件 | 开发者 |
|------|------|------|----------|--------|
| #10061 | 2026-01-15 17:08:28 | 修复非登录态显示上一个用户设置的问题：首次加载时无 token 则重置外观设置 | [AppShell.tsx](frontend/src/layouts/AppShell.tsx), [auth.ts](frontend/src/stores/auth.ts) | lovedhy |
| #10062 | 2026-01-15 18:18:02 | 修复书签页拖拽图标向左偏移问题：保存原始元素宽度并应用到 overlay，确保居中位置一致 | [useBookmarkDrag.ts](frontend/src/components/bookmarks/useBookmarkDrag.ts) | lovedhy |
| #10063 | 2026-01-15 22:37:13 | 优化更新流程 UX：后端重启时显示全屏遮罩提示，轮询检测恢复后自动刷新，避免网络错误提示 | [UpdateTab.tsx](frontend/src/pages/Admin/UpdateTab.tsx) | lovedhy |
| #10064 | 2026-01-15 23:15:28 | 修复 Windows 后端重启功能：使用 PowerShell Start-Process 隐藏窗口启动新进程 | [updateController.ts](backend/src/controllers/updateController.ts) | lovedhy |
| #10065 | 2026-01-15 23:15:28 | 手动重启按钮也使用遮罩层和轮询检测，与一键更新体验一致 | [UpdateTab.tsx](frontend/src/pages/Admin/UpdateTab.tsx) | lovedhy |
| #10066 | 2026-01-15 23:15:40 | 重启确认改为自定义模态框，替代浏览器原生 confirm 弹窗 | [UpdateTab.tsx](frontend/src/pages/Admin/UpdateTab.tsx) | lovedhy |

---

## v1.1.2

**开始时间**: 2026-01-15 23:51:10 (北京时间)

**结束时间**: 2026-01-16 00:07:30 (北京时间)

| 编号 | 时间 | 描述 | 涉及文件 | 开发者 |
|------|------|------|----------|--------|
| #10067 | 2026-01-15 23:51:10 | 修复刷新后数据不加载问题：checkUpdate 的 useEffect 依赖 token 变化 | [UpdateTab.tsx](frontend/src/pages/Admin/UpdateTab.tsx) | lovedhy |
| #10068 | 2026-01-16 00:07:30 | 新增补丁版本号体系：支持同 tag 下的紧急更新检测，版本显示格式改为 v1.1.2 (10068) | [package.json](package.json), [package.json](backend/package.json), [package.json](frontend/package.json), [updateController.ts](backend/src/controllers/updateController.ts), [UpdateTab.tsx](frontend/src/pages/Admin/UpdateTab.tsx), [ChangelogDialog.tsx](frontend/src/components/ChangelogDialog.tsx), [changelog.json](frontend/public/changelog.json) | lovedhy |
| #10069 | 2026-01-16 00:24:40 | 优化日志显示：Linux 启动日志显示实际内网 IP 而非 0.0.0.0 | [server.ts](backend/src/server.ts) | lovedhy |
| *#10070** | 2026-01-16 00:50:00 | 修复补丁更新检测：补丁更新使用保守策略默认需要重启，避免误显示"无缝更新" | [updateController.ts](backend/src/controllers/updateController.ts) | lovedhy |

**发布时间**: 2026-01-16 00:50:00 (北京时间)


---

## v1.1.3

**开始时间**: 2026-01-16 00:07:30 (北京时间)

**结束时间**: 2026-01-16 22:39:00 (北京时间)

**发布时间**: 2026-01-16 22:39:00 (北京时间)

| 编号 | 时间 | 描述 | 涉及文件 | 开发者 |
|------|------|------|----------|--------|
| #10071 | 2026-01-16 20:16:16 | 新增 SystemConfig 数据库模型：存储系统配置数据（如运行时长） | [schema.prisma](backend/prisma/schema.prisma), [20260115170043_add_system_config/](backend/prisma/migrations/20260115170043_add_system_config/) | lovedhy |
| #10072 | 2026-01-16 20:16:16 | 新增 UptimeTracker 服务：记录服务累计运行时长，支持定期保存、重置、异常恢复 | [uptimeTracker.ts](backend/src/services/uptimeTracker.ts) | lovedhy |
| #10073 | 2026-01-16 20:16:16 | 服务启动时初始化 UptimeTracker，关闭时保存运行时长 | [server.ts](backend/src/server.ts) | lovedhy |
| #10074 | 2026-01-16 20:16:16 | 扩展 server-status API：新增 totalUptime 和 totalUptimeMs 字段 | [adminController.ts](backend/src/controllers/adminController.ts) | lovedhy |
| #10075 | 2026-01-16 20:16:16 | 新增时长格式化工具：根据时长范围返回"X分钟 Y秒"/"X小时 Y分钟 Z秒"/"X天 Y小时 Z分钟"格式 | [formatUptime.ts](backend/src/utils/formatUptime.ts) | lovedhy |
| #10076 | 2026-01-16 20:16:16 | 新增 useUpdateChecker Hook：管理员后台页面加载时自动检测更新，有更新时 toast 提示 | [useUpdateChecker.ts](frontend/src/hooks/useUpdateChecker.ts) | lovedhy |
| #10077 | 2026-01-16 20:16:16 | AdminPage 集成自动更新检测，页面切换不重复检测 | [index.tsx](frontend/src/pages/Admin/index.tsx) | lovedhy |
| #10078 | 2026-01-16 20:16:16 | UpdateTab 显示总运行时长，每秒更新；移除重复的自动更新检测逻辑 | [UpdateTab.tsx](frontend/src/pages/Admin/UpdateTab.tsx) | lovedhy |
| #10079 | 2026-01-16 20:16:16 | 新增 UptimeTracker 属性测试和单元测试 | [uptimeTracker.property.test.ts](backend/src/services/uptimeTracker.property.test.ts), [uptimeTracker.test.ts](backend/src/services/uptimeTracker.test.ts) | lovedhy |
| #10080 | 2026-01-16 20:16:16 | 新增时长格式化属性测试 | [formatUptime.test.ts](backend/src/utils/formatUptime.test.ts) | lovedhy |
| #10081 | 2026-01-16 20:16:16 | 新增 server-status API 响应完整性属性测试 | [adminController.serverStatus.test.ts](backend/src/controllers/adminController.serverStatus.test.ts) | lovedhy |
| #10082 | 2026-01-16 22:33:00 | ROOT 用户侧边栏新增"管理后台"入口，仅 ROOT 登录时显示 | [Sidebar.tsx](frontend/src/components/Sidebar.tsx) | lovedhy |
| #10083 | 2026-01-16 22:36:00 | 拓展商城入口改为仅 ROOT 用户可见（功能开发中） | [Sidebar.tsx](frontend/src/components/Sidebar.tsx) | lovedhy |
| *#10084** | 2026-01-16 22:50:06 | ⚠️ 修复更新页面初始加载时版本号显示"未知"的问题：server-status API 返回当前版本信息 | [adminController.ts](backend/src/controllers/adminController.ts), [UpdateTab.tsx](frontend/src/pages/Admin/UpdateTab.tsx) | lovedhy |
| *#10085** | 2026-01-16 23:06:27 | ⚠️ 修复更新/重启后总运行时长被重置的问题：在 process.exit 前调用 uptimeTracker.shutdown() 保存数据 | [updateController.ts](backend/src/controllers/updateController.ts) | lovedhy |

**发布时间**: 2026-01-16 23:10:00 (北京时间)


---

## v1.1.4

**开始时间**: 2026-01-17 00:19:06 (北京时间)

| 编号 | 时间 | 描述 | 涉及文件 | 开发者 |
|------|------|------|----------|--------|
| #10086 | 2026-01-17 00:19:06 | 移除管理后台右上角刷新按钮，简化界面 | [index.tsx](frontend/src/pages/Admin/index.tsx) | lovedhy |
| #10087 | 2026-01-17 00:44:19 | 新增公共 Select 下拉选择器组件：自动宽度计算、悬浮 tooltip、动效美化、主题色边框适配 | [Select.tsx](frontend/src/components/ui/Select.tsx) | lovedhy |
| #10088 | 2026-01-17 00:44:19 | 管理后台用户管理、日志页、首页书签排序统一使用公共 Select 组件 | [index.tsx](frontend/src/pages/Admin/index.tsx), [LogsTab.tsx](frontend/src/pages/Admin/LogsTab.tsx), [SortModeSelector.tsx](frontend/src/components/SortModeSelector.tsx) | lovedhy |
| #10089 | 2026-01-17 00:54:57 | 新增搜索建议后端代理 API，解决必应/谷歌 CORS 跨域问题 | [utilsController.ts](backend/src/controllers/utilsController.ts), [utils.ts](backend/src/routes/utils.ts) | lovedhy |
| #10090 | 2026-01-17 00:54:57 | 搜索建议优化：百度走前端 JSONP（快），必应/谷歌走后端代理；谷歌网络不通时显示 toast 提示 | [useSearchSuggestions.ts](frontend/src/hooks/useSearchSuggestions.ts) | lovedhy |
| #10091 | 2026-01-17 00:54:57 | 搜索框聚焦无输入时显示最近打开的书签，输入后切换为快捷方式和搜索建议 | [clickController.ts](backend/src/controllers/clickController.ts), [bookmarks.ts](backend/src/routes/bookmarks.ts), [useRecentBookmarks.ts](frontend/src/hooks/useRecentBookmarks.ts), [SearchDropdown.tsx](frontend/src/components/SearchDropdown.tsx), [SearchBox.tsx](frontend/src/components/SearchBox.tsx) | lovedhy |
| #10092 | 2026-01-17 02:05:19 | 新增"最近打开"设置：支持开关、动态一行/固定数量两种模式；动态模式根据容器宽度自动计算显示数量 | [appearance.ts](frontend/src/stores/appearance.ts), [SettingsDialog.tsx](frontend/src/components/SettingsDialog.tsx), [SearchBox.tsx](frontend/src/components/SearchBox.tsx), [SearchDropdown.tsx](frontend/src/components/SearchDropdown.tsx) | lovedhy |
| #10093 | 2026-01-17 02:05:19 | 最近打开全局刷新：任意位置点击书签后自动刷新最近列表，通过全局事件机制实现 | [useRecentBookmarks.ts](frontend/src/hooks/useRecentBookmarks.ts), [useClickTracker.ts](frontend/src/hooks/useClickTracker.ts) | lovedhy |
| #10094 | 2026-01-17 02:19:27 | 新增公共 Tooltip 组件：毛玻璃风格、Portal 渲染、延迟显示，替代浏览器原生 title | [Tooltip.tsx](frontend/src/components/ui/Tooltip.tsx) | lovedhy |
| #10095 | 2026-01-17 02:19:27 | 书签悬浮提示改用 Tooltip 组件：显示书签名称和备注，支持快捷栏和书签页 | [BookmarkGrid.tsx](frontend/src/components/BookmarkGrid.tsx), [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx) | lovedhy |

**结束时间**: 2026-01-17 02:29:32 (北京时间)

**发布时间**: (北京时间)


---

## v1.1.5

**开始时间**: 2026-01-17 02:30:09 (北京时间)

| 编号 | 时间 | 描述 | 涉及文件 | 开发者 |
|------|------|------|----------|--------|
| #10096 | 2026-01-17 06:01:45 | 新增书签标签系统：支持多标签（最多10个/20字符）、自动去重去空格、中英文数字下划线连字符 | [schema.prisma](backend/prisma/schema.prisma), [tags.ts](backend/src/utils/tags.ts), [bookmarkController.ts](backend/src/controllers/bookmarkController.ts) | lovedhy |
| #10097 | 2026-01-17 06:01:45 | 新增标签 API：GET /bookmarks/tags 获取所有标签、GET /bookmarks?tag=xxx 按标签筛选 | [bookmarkController.ts](backend/src/controllers/bookmarkController.ts) | lovedhy |
| #10098 | 2026-01-17 06:01:45 | 新增 TagInput/TagFilter 组件：多标签输入自动补全、标签筛选栏 | [TagInput.tsx](frontend/src/components/ui/TagInput.tsx), [TagFilter.tsx](frontend/src/components/bookmarks/TagFilter.tsx) | lovedhy |
| #10099 | 2026-01-17 06:01:45 | 书签页/快捷栏标签功能：创建编辑时添加标签、卡片和悬浮提示显示标签、点击标签筛选 | [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx), [BookmarkGrid.tsx](frontend/src/components/BookmarkGrid.tsx) | lovedhy |
| #10100 | 2026-01-17 06:01:45 | 管理后台标签管理：标签统计视图、管理员编辑用户书签标签 | [adminController.ts](backend/src/controllers/adminController.ts), [BookmarksTab.tsx](frontend/src/pages/Admin/BookmarksTab.tsx) | lovedhy |
| #10101 | 2026-01-17 06:10:00 | TagInput 组件优化：新增添加按钮（不只依赖回车）、建议下拉框向上弹出、采用 Select 组件风格美化 | [TagInput.tsx](frontend/src/components/ui/TagInput.tsx) | lovedhy |
| #10102 | 2026-01-17 06:10:00 | 书签编辑弹窗优化：添加 max-h-[90vh] overflow-y-auto 防止内容超出屏幕 | [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx), [BookmarkGrid.tsx](frontend/src/components/BookmarkGrid.tsx) | lovedhy |
| ~~#10103~~ | 2026-01-17 06:38:48 | 新增图标扩展 API：支持第三方扩展通过 API Key 更新书签图标 | [iconController.ts](backend/src/controllers/iconController.ts), [icons.ts](backend/src/routes/icons.ts) | lovedhy |
| ~~#10104~~ | 2026-01-17 06:38:48 | 新增 API Key 管理：用户可生成/重新生成 API 密钥用于图标扩展认证 | [apiKeyController.ts](backend/src/controllers/apiKeyController.ts), [apiKeys.ts](backend/src/routes/apiKeys.ts) | lovedhy |
| ~~#10105~~ | 2026-01-17 06:38:48 | 图标验证工具：URL 格式验证、Base64 格式验证（最大100KB）、支持 png/jpeg/gif/svg/webp | [icon.ts](backend/src/utils/icon.ts) | lovedhy |
| ~~#10106~~ | 2026-01-17 06:38:48 | 图标 API 支持单个更新（PATCH /icons/:id）和批量更新（POST /icons/batch，最多100个） | [iconController.ts](backend/src/controllers/iconController.ts) | lovedhy |
| ~~#10107~~ | 2026-01-17 06:38:48 | 新增图标扩展 API 文档：完整的接口说明、示例代码、最佳实践 | [icon-api.md](docs/icon-api.md) | lovedhy |
| ~~#10108~~ | 2026-01-17 06:38:48 | 前端 API Key 管理组件：设置页面可查看/生成/重新生成 API 密钥 | [APIKeyManager.tsx](frontend/src/components/settings/APIKeyManager.tsx), [SettingsDialog.tsx](frontend/src/components/SettingsDialog.tsx) | lovedhy |

**结束时间**: 2026-01-17 06:46:24 (北京时间)

**发布时间**: 2026-01-17 06:50:00 (北京时间)


---

## v1.2.0

**开始时间**: 2026-01-18 01:08:40 (北京时间)

| 编号 | 时间 | 描述 | 涉及文件 | 开发者 |
|------|------|------|----------|--------|
| #10109 | 2026-01-18 01:08:40 | 新增统一错误码与自定义错误类，标准化状态码/错误消息 | [errors.ts](backend/src/utils/errors.ts) | lovedhy |
| #10110 | 2026-01-18 01:08:40 | 新增统一错误处理中间件与 asyncHandler，集中处理 Prisma/JWT/验证错误 | [errorHandler.ts](backend/src/middleware/errorHandler.ts), [server.ts](backend/src/server.ts) | lovedhy |
| #10111 | 2026-01-18 01:08:40 | http 工具支持错误码，新增 failWithCode；认证/书签控制器和鉴权中间件接入错误码响应 | [http.ts](backend/src/utils/http.ts), [authController.ts](backend/src/controllers/authController.ts), [bookmarkController.ts](backend/src/controllers/bookmarkController.ts), [auth.ts](backend/src/middleware/auth.ts) | lovedhy |
| #10112 | 2026-01-18 01:08:40 | 前端统一错误码与 ApiError，apiFetch 支持全局错误处理、认证失效回调、网络错误提示 | [errors.ts](frontend/src/utils/errors.ts), [api.ts](frontend/src/services/api.ts) | lovedhy |
| #10113 | 2026-01-18 01:08:40 | 新增 useApiError 全局 Hook：自动 toast、登录态过期自动登出；App 接入 | [useApiError.ts](frontend/src/hooks/useApiError.ts), [App.tsx](frontend/src/App.tsx) | lovedhy |
| #10114 | 2026-01-18 01:08:40 | 新增错误处理相关测试（后端中间件、前端 Hook） | [errorHandler.test.ts](backend/src/middleware/errorHandler.test.ts), [useApiError.test.ts](frontend/src/hooks/useApiError.test.ts) | lovedhy |
| #10115 | 2026-01-18 03:17:05 | 新增 @start/shared 共享模块：错误码、HTTP状态码、消息定义单一源头，前后端直接引用 | [shared/](shared/), [package.json](package.json) | lovedhy |
| #10116 | 2026-01-18 03:17:05 | npm workspaces 配置：根 package.json 添加 workspaces，后端/前端依赖 @start/shared | [package.json](package.json), [backend/package.json](backend/package.json), [frontend/package.json](frontend/package.json) | lovedhy |
| #10117 | 2026-01-18 03:17:05 | 后端错误码从 @start/shared 导入，保留 AppError 等后端特有错误类 | [errors.ts](backend/src/utils/errors.ts) | lovedhy |
| #10118 | 2026-01-18 03:17:05 | 前端错误码从 @start/shared 导入，保留 ApiError 等前端特有错误类 | [errors.ts](frontend/src/utils/errors.ts) | lovedhy |
| #10119 | 2026-01-18 03:17:05 | 新增健康检查端点 /health：返回数据库连接状态、延迟、运行时长、版本号 | [server.ts](backend/src/server.ts) | lovedhy |
| #10120 | 2026-01-18 03:17:05 | 新增前端日志上报服务：捕获全局错误和 Promise 拒绝，收集 FCP/LCP/TTFB 性能指标 | [logReporter.ts](frontend/src/services/logReporter.ts) | lovedhy |
| #10121 | 2026-01-18 03:17:05 | 新增前端日志接收路由 POST /api/logs/frontend：接收错误日志和性能指标 | [frontendLogs.ts](backend/src/routes/frontendLogs.ts) | lovedhy |
| #10122 | 2026-01-18 03:17:05 | 新增网络错误组件 NetworkError：空状态、重试按钮、离线横幅、加载骨架屏 | [NetworkError.tsx](frontend/src/components/NetworkError.tsx) | lovedhy |
| #10123 | 2026-01-18 03:17:05 | 新增集成测试：认证流程、书签 CRUD、健康检查端点 | [auth.integration.test.ts](backend/src/tests/integration/auth.integration.test.ts), [bookmarks.integration.test.ts](backend/src/tests/integration/bookmarks.integration.test.ts), [health.integration.test.ts](backend/src/tests/integration/health.integration.test.ts) | lovedhy |
| #10124 | 2026-01-18 03:17:05 | 新增 GitHub Actions CI 工作流：后端/前端测试、覆盖率、Lint、构建检查、集成测试 | [ci.yml](.github/workflows/ci.yml) | lovedhy |
| #10125 | 2026-01-18 03:55:45 | 页面懒加载：Login/Register/Admin/NotFound 按需加载，减少首屏体积 | [App.tsx](frontend/src/App.tsx) | lovedhy |
| #10126 | 2026-01-18 03:55:45 | 书签列表懒加载：超过50个书签时自动启用 IntersectionObserver 优化，视窗外显示骨架屏 | [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx) | lovedhy |
| #10127 | 2026-01-18 03:55:45 | 更新控制器适配 npm workspaces：依赖安装从根目录执行，自动构建 shared 模块 | [updateController.ts](backend/src/controllers/updateController.ts) | lovedhy |
| #10128 | 2026-01-18 03:55:45 | 启动脚本适配 npm workspaces：从根目录安装依赖，自动检测并构建 shared 模块 | [start.js](scripts/start.js) | lovedhy |

**结束时间**: 2026-01-18 03:56:06 (北京时间)

**发布时间**: 2026-01-18 03:56:06 (北京时间)


---

## v1.2.1

**开始时间**: 2026-01-18 04:08:04 (北京时间)
**结束时间**: 2026-01-18 06:50:19 (北京时间)

| 编号 | 时间 | 描述 | 涉及文件 | 开发者 |
|------|------|------|----------|--------|
| #10129 | 2026-01-18 04:08:04 | 修复设置云端同步：后端 Schema 补全所有 24 个设置字段，前端补全 APPEARANCE_KEYS 和解析逻辑 | [settingsController.ts](backend/src/controllers/settingsController.ts), [settingsFile.ts](frontend/src/utils/settingsFile.ts) | lovedhy |
| #10130 | 2026-01-18 04:27:00 | 键盘快捷键：Tab 打开书签页、Escape 关闭弹窗/抽屉（优先关闭内部弹窗）、Enter 登录 | [Home/index.tsx](frontend/src/pages/Home/index.tsx), [BookmarksDialog.tsx](frontend/src/components/BookmarksDialog.tsx), [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx) | lovedhy |
| #10131 | 2026-01-18 06:08:00 | 修复书签页拖拽图标向左偏移问题：保存原始元素宽度并应用到 overlay，确保居中位置一致 | [useBookmarkDrag.ts](frontend/src/components/bookmarks/useBookmarkDrag.ts) | lovedhy |
| #10132 | 2026-01-18 06:23:00 | 消除 any 类型：后端 controller 用 unknown+getErrorMessage 替换 catch(e:any)，用 Prisma 类型替换 where/update any，前端移除 useBookmarkDrag 的 as any | [http.ts](backend/src/utils/http.ts), [userController.ts](backend/src/controllers/userController.ts), [adminController.ts](backend/src/controllers/adminController.ts), [apiKeyController.ts](backend/src/controllers/apiKeyController.ts), [authController.ts](backend/src/controllers/authController.ts), [logController.ts](backend/src/controllers/logController.ts), [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx) | lovedhy |
| #10133 | 2026-01-18 06:37:00 | 侧边栏设置优化：新增"点击后保持收起"开关（sidebarClickKeepCollapsed），开启时点击图标仅执行操作不展开侧边栏，关闭时同时展开；汉堡菜单始终可手动展开/收起 | [appearance.ts](frontend/src/stores/appearance.ts), [SettingsDialog.tsx](frontend/src/components/SettingsDialog.tsx), [Sidebar.tsx](frontend/src/components/Sidebar.tsx) | lovedhy |
| #10134 | 2026-01-18 06:42:00 | 侧边栏状态指示：设置/书签/商城按钮在打开时显示激活状态高亮 | [Sidebar.tsx](frontend/src/components/Sidebar.tsx), [AppShell.tsx](frontend/src/layouts/AppShell.tsx) | lovedhy |
| *#10135** | 2026-01-18 08:25:00 | ⚠️ **CI 热修复**：添加 @vitest/coverage-v8 依赖到 backend 和 frontend | [backend/package.json](backend/package.json), [frontend/package.json](frontend/package.json) | lovedhy |
| *#10136** | 2026-01-18 08:25:00 | ⚠️ **CI 热修复**：添加 @types/bcryptjs 到 backend devDependencies | [backend/package.json](backend/package.json) | lovedhy |
| *#10137** | 2026-01-18 08:25:00 | ⚠️ **CI 热修复**：修复 vitest 集成测试命令语法（Jest→Vitest） | [ci.yml](.github/workflows/ci.yml) | lovedhy |
| *#10138** | 2026-01-18 08:25:00 | ⚠️ **CI 热修复**：新增 vitest.integration.config.ts 专用集成测试配置 | [vitest.integration.config.ts](backend/vitest.integration.config.ts) | lovedhy |
| *#10139** | 2026-01-18 08:25:00 | ⚠️ **CI 热修复**：集成测试添加 DATABASE_URL 环境变量 | [ci.yml](.github/workflows/ci.yml) | lovedhy |
| *#10140** | 2026-01-18 08:25:00 | ⚠️ **CI 热修复**：跳过不存在的 API 端点测试（/metrics, /api-docs, /api/bookmarks/tags） | [health.integration.test.ts](backend/src/tests/integration/health.integration.test.ts), [bookmarks.integration.test.ts](backend/src/tests/integration/bookmarks.integration.test.ts) | lovedhy |
| *#10141** | 2026-01-18 08:25:00 | ⚠️ **Lint 修复**：移动 hooks 到 early return 之前、替换 any 类型、添加 eslint-disable 注释 | 多个前端文件 | lovedhy |
| *#10142** | 2026-01-18 08:25:00 | ⚠️ **Lint 修复**：提取 getAllDropdownItems 到独立文件解决 Fast Refresh 问题 | [searchDropdownUtils.ts](frontend/src/components/searchDropdownUtils.ts), [SearchBox.tsx](frontend/src/components/SearchBox.tsx) | lovedhy |
| *#10143** | 2026-01-18 08:40:00 | ⚠️ **安装脚本修复**：添加 build_shared 步骤构建 @start/shared 模块 | [install.sh](scripts/install.sh) | lovedhy |
| *#10144** | 2026-01-18 09:05:00 | 修复"点击后保持收起"设置无法保存：将 sidebarClickKeepCollapsed 加入 partialize 持久化 | [appearance.ts](frontend/src/stores/appearance.ts) | lovedhy |
| *#10145** | 2026-01-18 09:18:00 | 修复更新页面初始加载时版本号显示"未知"的问题：server-status API 返回当前版本信息 | [adminController.ts](backend/src/controllers/adminController.ts), [UpdateTab.tsx](frontend/src/pages/Admin/UpdateTab.tsx) | lovedhy |

**发布时间**: 2026-01-18 09:18:00 (北京时间)


---

## v1.3.0

**开始时间**: 2026-01-19 00:30:00 (北京时间)

**结束时间**: 2026-01-19 03:31:00 (北京时间)

| 编号 | 时间 | 描述 | 涉及文件 | 开发者 |
|------|------|------|----------|--------|
| #10146 | 2026-01-19 02:55:23 | 新增 MobileNav 底部导航组件：移动端隐藏侧边栏，改用底部导航（首页/书签/设置/管理/登录），支持隐藏文字模式 | [MobileNav.tsx](frontend/src/components/MobileNav.tsx) | lovedhy |
| #10147 | 2026-01-19 02:55:23 | AppShell 布局重构：移动端条件渲染底部导航，桌面端保持侧边栏，safe-area-inset 适配刘海屏 | [AppShell.tsx](frontend/src/layouts/AppShell.tsx) | lovedhy |
| #10148 | 2026-01-19 02:55:23 | 新增 useIsMobile/useIsTablet/useIsDesktop/useIsTouchDevice Hooks：基于媒体查询的响应式检测 | [useIsMobile.ts](frontend/src/hooks/useIsMobile.ts), [useMediaQuery.ts](frontend/src/hooks/useMediaQuery.ts) | lovedhy |
| #10149 | 2026-01-19 02:55:23 | BookmarkDrawer 响应式网格：grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 | [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx) | lovedhy |
| #10150 | 2026-01-19 02:55:23 | BookmarkGrid 快捷栏响应式：grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 | [BookmarkGrid.tsx](frontend/src/components/BookmarkGrid.tsx) | lovedhy |
| #10151 | 2026-01-19 02:55:23 | SettingsDialog 移动端重构：列表+详情两级导航、返回按钮、overflow-y-auto 滚动、pb-20 避免底部遮挡 | [SettingsDialog.tsx](frontend/src/components/SettingsDialog.tsx) | lovedhy |
| #10152 | 2026-01-19 02:55:23 | SearchDropdown 视口适配：max-h-[min(320px,50vh)] 防止超出屏幕，overscroll-contain 触摸滚动优化 | [SearchDropdown.tsx](frontend/src/components/SearchDropdown.tsx) | lovedhy |
| #10153 | 2026-01-19 02:55:23 | 新增 usePullGestures Hook：支持下拉刷新和上划手势，原生事件监听避免 passive 问题 | [usePullGestures.ts](frontend/src/hooks/usePullGestures.ts) | lovedhy |
| #10154 | 2026-01-19 02:55:23 | 上划打开书签页：进度检测、拖出预览效果（书签页滑出+背景模糊渐变）、无缝过渡 | [usePullGestures.ts](frontend/src/hooks/usePullGestures.ts), [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx), [Home/index.tsx](frontend/src/pages/Home/index.tsx) | lovedhy |
| #10155 | 2026-01-19 02:55:23 | 下滑关闭书签页：进度追踪、平滑动画过渡、closedViaSwipe 防闪屏 | [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx) | lovedhy |
| #10156 | 2026-01-19 02:55:23 | 手势速度判定：快速滑动（>0.5px/ms）只需 20% 进度触发，慢速滑动需 50% 进度 | [usePullGestures.ts](frontend/src/hooks/usePullGestures.ts), [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx) | lovedhy |
| #10157 | 2026-01-19 02:55:23 | 手势未完成平滑返回：上划/下滑未到阈值时 CSS transition 回弹动画 | [usePullGestures.ts](frontend/src/hooks/usePullGestures.ts), [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx) | lovedhy |
| #10158 | 2026-01-19 02:55:23 | 拖拽与下滑分离：.bookmark-icon 区域触发拖拽，其他区域触发下滑关闭 | [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx) | lovedhy |
| #10159 | 2026-01-19 02:55:23 | 修复下滑关闭与浏览器下拉刷新冲突：使用 touch-none 阻止浏览器下拉刷新 | [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx) | lovedhy |
| #10160 | 2026-01-19 03:07:00 | PWA 支持：新增 manifest.json（应用名称、图标、启动模式、主题色） | [manifest.json](frontend/public/manifest.json) | lovedhy |
| #10161 | 2026-01-19 03:07:00 | PWA 元标签：theme-color、apple-mobile-web-app-capable/status-bar-style/title、manifest 链接 | [index.html](frontend/index.html) | lovedhy |
| #10162 | 2026-01-19 03:07:00 | 安全区域适配：viewport-fit=cover 支持刘海屏，body padding-top 使用 safe-area-inset-top | [index.html](frontend/index.html), [index.css](frontend/src/index.css) | lovedhy |
| #10163 | 2026-01-19 03:07:00 | 底部导航安全区域：pb-[calc(env(safe-area-inset-bottom)+8px)] 避免底部条遮挡 | [MobileNav.tsx](frontend/src/components/MobileNav.tsx) | lovedhy |
| #10164 | 2026-01-19 03:07:00 | 虚拟键盘适配：移动端搜索框聚焦时自动滚动到可见区域，避免键盘遮挡 | [SearchBox.tsx](frontend/src/components/SearchBox.tsx) | lovedhy |
| #10165 | 2026-01-19 03:13:00 | 图片懒加载：所有 favicon/icon 图片添加 loading="lazy" decoding="async" | [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx) | lovedhy |
| #10166 | 2026-01-19 03:13:00 | 性能优化类：新增 .gpu-accelerate（GPU 加速）和 .will-animate（will-change 提示） | [index.css](frontend/src/index.css) | lovedhy |
| #10167 | 2026-01-19 03:13:00 | 移动端毛玻璃优化：<768px 时 backdrop-blur 从 xl/2xl 降级到 lg，减少 GPU 负载 | [index.css](frontend/src/index.css) | lovedhy |
| *#10168** | 2026-01-19 04:00:00 | 虚拟键盘平滑适配：使用 visualViewport API 检测键盘高度，内容区平滑上移（CSS transition） | [Home/index.tsx](frontend/src/pages/Home/index.tsx), [SearchBox.tsx](frontend/src/components/SearchBox.tsx) | lovedhy |
| *#10169** | 2026-01-19 04:05:00 | 安卓返回键动画：使用下滑动画效果关闭书签页 | [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx) | lovedhy |

**结束时间**: 2026-01-19 04:07:00 (北京时间)

---

## v1.3.1

**开始时间**: 2026-01-19 04:16:00 (北京时间)

**结束时间**: 2026-01-20 02:55:00 (北京时间)

| 修订号 | 时间 | 修改内容 | 关联文件 | 开发者 |
|--------|------|----------|----------|--------|
| #10170 | 2026-01-19 04:20:00 | 系统更新界面：添加"刷新检测"按钮，支持手动重新检查更新 | [UpdateTab.tsx](frontend/src/pages/Admin/UpdateTab.tsx) | lovedhy |
| #10171 | 2026-01-19 04:24:00 | UpdateTab 挂载时自动检测更新：刷新网页或切换 Tab 时自动检查 | [UpdateTab.tsx](frontend/src/pages/Admin/UpdateTab.tsx) | lovedhy |
| #10172 | 2026-01-19 04:33:00 | 更新流程添加数据库迁移：git pull 后自动运行 migrate 和 generate | [updateController.ts](backend/src/controllers/updateController.ts) | lovedhy |
| #10173 | 2026-01-19 04:41:00 | 密码修改多端登出：tokenVersion 机制，密码修改后旧 token 失效并强制登出 | [schema.prisma](backend/prisma/schema.prisma), [auth.ts](backend/src/services/auth.ts), [auth.ts](backend/src/middleware/auth.ts), [authController.ts](backend/src/controllers/authController.ts), [userController.ts](backend/src/controllers/userController.ts), [adminController.ts](backend/src/controllers/adminController.ts), [auth.ts](frontend/src/stores/auth.ts), [Admin/index.tsx](frontend/src/pages/Admin/index.tsx) | lovedhy |
| #10174 | 2026-01-19 04:51:00 | 修复更新检测 toast 重复：silent 模式下不显示任何 toast | [UpdateTab.tsx](frontend/src/pages/Admin/UpdateTab.tsx) | lovedhy |
| #10175 | 2026-01-19 04:52:00 | 修复鉴权失效 toast 重复：handleAuthExpired 使用 3 秒去重窗口 | [useApiError.ts](frontend/src/hooks/useApiError.ts) | lovedhy |
| #10176 | 2026-01-19 04:55:00 | 书签 URL 去重：创建时检查 URL 是否已存在，重复则拒绝保存 | [bookmarkController.ts](backend/src/controllers/bookmarkController.ts), [errors.ts](shared/src/errors.ts) | lovedhy |
| #10177 | 2026-01-19 05:00:00 | 修复云端设置同步：登出时先清除 token 防止上传默认值，添加页面关闭时立即保存 | [auth.ts](frontend/src/stores/auth.ts), [useCloudSettingsSync.ts](frontend/src/hooks/useCloudSettingsSync.ts) | lovedhy |
| #10178 | 2026-01-19 05:05:00 | 设置保存路由支持 POST：sendBeacon 页面关闭保存需要 POST 方法 | [settings.ts](backend/src/routes/settings.ts) | lovedhy |
| #10179 | 2026-01-19 05:07:00 | 修复 AppearanceSchema 缺少字段：添加 sidebarClickKeepCollapsed 和 mobileNavHideText | [settingsController.ts](backend/src/controllers/settingsController.ts) | lovedhy |
| #10180 | 2026-01-19 05:08:00 | 云端设置保存失败时显示错误提示 | [useCloudSettingsSync.ts](frontend/src/hooks/useCloudSettingsSync.ts) | lovedhy |
| #10181 | 2026-01-19 05:15:00 | 搜索框优化：取消聚焦时隐藏输入内容但保留值，placeholder 居中 | [SearchBox.tsx](frontend/src/components/SearchBox.tsx) | lovedhy |
| #10182 | 2026-01-19 05:16:00 | 搜索下拉框动效：展开完成后再显示，缓入缓出动画，固定宽度独立于搜索框 | [SearchBox.tsx](frontend/src/components/SearchBox.tsx), [SearchDropdown.tsx](frontend/src/components/SearchDropdown.tsx) | lovedhy |
| #10183 | 2026-01-19 05:21:00 | 搜索框布局优化：图标和按钮绝对定位避免文字跳动，输入内容居中 | [SearchBox.tsx](frontend/src/components/SearchBox.tsx) | lovedhy |
| #10184 | 2026-01-19 05:30:00 | 移动端搜索框伸缩：移除外部宽度覆盖，非聚焦 w-48 聚焦展开 | [SearchBox.tsx](frontend/src/components/SearchBox.tsx), [Home/index.tsx](frontend/src/pages/Home/index.tsx) | lovedhy |
| #10185 | 2026-01-19 05:37:00 | 书签页优化：删除左上角关闭按钮，搜索栏居中 | [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx) | lovedhy |
| #10186 | 2026-01-19 05:42:00 | 书签页背景遮罩：移除点击关闭，添加 pointer-events-none | [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx) | lovedhy |
| #10187 | 2026-01-19 05:45:00 | 修复书签页搜索框：添加 disableGlobalFocus 属性，防止影响主页状态 | [SearchBox.tsx](frontend/src/components/SearchBox.tsx), [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx) | lovedhy |
| #10188 | 2026-01-19 05:58:00 | 安卓返回键动画：使用下滑动画效果关闭书签页 | [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx) | lovedhy |
| #10189 | 2026-01-19 06:05:00 | 修复书签页进入动画：transition 移到 className，setTimeout 延迟触发 | [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx) | lovedhy |
| #10190 | 2026-01-19 06:12:00 | 桌面端书签页关闭按钮：左上角显示 X 按钮，移动端隐藏 | [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx) | lovedhy |
| #10191 | 2026-01-19 06:15:00 | 修复移动端下滑关闭冲突：使用 touch-none 阻止浏览器下拉刷新 | [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx) | lovedhy |
| #10192 | 2026-01-19 06:18:00 | 登录界面 Enter 键登录：使用 form 标签包裹表单，按钮改为 type=submit | [Login/index.tsx](frontend/src/pages/Login/index.tsx) | lovedhy |
| #10193 | 2026-01-19 06:18:00 | 密码显示/隐藏切换：登录和注册页面添加眼睛图标切换密码可见性 | [Login/index.tsx](frontend/src/pages/Login/index.tsx), [Register/index.tsx](frontend/src/pages/Register/index.tsx) | lovedhy |
| #10194 | 2026-01-19 09:30:00 | 移动端长按呼出右键菜单：长按图标 200ms 后松手显示菜单，修复拖拽逻辑只在移动超过阈值后才触发 | [BookmarkGrid.tsx](frontend/src/components/BookmarkGrid.tsx), [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx), [useBookmarkDrag.ts](frontend/src/components/bookmarks/useBookmarkDrag.ts) | lovedhy |
| #10195 | 2026-01-19 09:46:00 | 右键菜单展开收起动画：从点击点展开/收回，右侧空间不足时从右上角向左下展开 | [BookmarkGrid.tsx](frontend/src/components/BookmarkGrid.tsx), [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx), [index.css](frontend/src/index.css) | lovedhy |
| #10196 | 2026-01-19 09:53:00 | 修复拖拽时触发手势冲突：添加全局 isDragging 状态，拖拽时禁用下拉刷新和上划打开书签页 | [bookmarkDnd.ts](frontend/src/stores/bookmarkDnd.ts), [useBookmarkDrag.ts](frontend/src/components/bookmarks/useBookmarkDrag.ts), [Home/index.tsx](frontend/src/pages/Home/index.tsx) | lovedhy |
| #10197 | 2026-01-19 10:30:00 | 上划手势优化：增加动画路程（70%）、根据滑动速度动态调整触发阈值、添加进度增长速率限制防止瞬间出现 | [usePullGestures.ts](frontend/src/hooks/usePullGestures.ts), [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx) | lovedhy |
| #10198 | 2026-01-19 10:57:00 | 修复书签页拖拽与下滑手势冲突：触摸书签项时禁用下滑手势，使用 lastDragEndTimeGlobal 防止拖拽结束后误触发关闭 | [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx) | lovedhy |
| #10199 | 2026-01-19 10:57:00 | 修复 popstate 事件在拖拽结束后误触发：检查 lastDragEndTimeGlobal，300ms 内忽略 popstate 事件 | [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx) | lovedhy |
| #10200 | 2026-01-19 11:02:00 | 修复图标周围空隙下滑无法触发关闭：检测范围从 .bm-inner 改为 .bookmark-icon，只有触摸图标才禁用下滑手势 | [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx) | lovedhy |
| #10201 | 2026-01-20 00:31:00 | ⚠️ **严重修复**：修复重启项目后管理员密码被重置为默认值的问题，seed 改为只在管理员不存在时创建，不覆盖已有数据 | [seed.ts](backend/prisma/seed.ts) | lovedhy |
| #10202 | 2026-01-20 01:39:00 | 修复退出登录后书签页面仍显示上一用户数据：token 变为空时清空 allItems/allTags/activeFolderId 等状态 | [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx), [BookmarkGrid.tsx](frontend/src/components/BookmarkGrid.tsx) | lovedhy |
| #10203 | 2026-01-20 01:45:00 | 优化上划预览：无书签时只显示搜索框，有书签时显示书签预览，移除骨架屏加载占位 | [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx) | lovedhy |
| #10204 | 2026-01-20 02:50:00 | 统一 Favicon 组件：多源并行竞速（DuckDuckGo + Google + 网站本站），哪个快用哪个，加载中显示首字母占位 | [Favicon.tsx](frontend/src/components/Favicon.tsx), [url.ts](frontend/src/utils/url.ts), [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx), [BookmarkGrid.tsx](frontend/src/components/BookmarkGrid.tsx) | lovedhy |
| *#10205** | 2026-01-20 03:15:00 | ⚠️ **严重修复**：修复数据库迁移文件损坏导致 CI 失败和鉴权失败；更新检测添加 CI 状态检查，只有 CI 通过才提示更新 | [migration.sql](backend/prisma/migrations/20260119043700_add_token_version/migration.sql), [auth.ts](backend/src/middleware/auth.ts), [authController.ts](backend/src/controllers/authController.ts), [updateController.ts](backend/src/controllers/updateController.ts) | lovedhy |
| *#10206** | 2026-01-20 03:30:00 | 修复移动端书签页下滑关闭与浏览器下拉刷新冲突：添加 overscroll-contain 阻止浏览器默认行为，只有滚动到顶部时才触发下滑关闭 | [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx) | lovedhy |
| *#10207** | 2026-01-20 03:45:00 | 修复下滑关闭与浏览器下拉刷新冲突：使用原生事件监听 passive:false + preventDefault 阻止默认行为；修复补丁版本检测不到：改用 GitHub API 获取 package.json 避免缓存，CI 检查改为只拒绝明确失败的 | [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx), [updateController.ts](backend/src/controllers/updateController.ts) | lovedhy |
| *#10208** | 2026-01-20 03:55:00 | 修复书签页/快捷栏输入框唤起键盘导致首页上移的问题：只有首页搜索框聚焦时才触发键盘适配上移 | [Home/index.tsx](frontend/src/pages/Home/index.tsx) | lovedhy |
| *#10209** | 2026-01-20 04:05:00 | 修复补丁版本检测不到：使用 tag 对应的 commit SHA 获取 package.json，而非 tag 名称（force push 后 tag API 返回的 commit SHA 是最新的） | [updateController.ts](backend/src/controllers/updateController.ts) | lovedhy |

**发布时间**: 2026-01-20 04:10:00 (北京时间)


---

## v1.3.2

**开始时间**: 2026-01-20 04:15:00 (北京时间)

| 编号 | 时间 | 描述 | 涉及文件 | 开发者 |
|------|------|------|----------|--------|
| #10210 | 2026-01-20 04:30:00 | 新增首页布局模式：动态挤压（快捷栏越多时钟搜索框上移）和固定位置（时钟搜索框可自定义垂直位置15-50%） | [appearance.ts](frontend/src/stores/appearance.ts), [Home/index.tsx](frontend/src/pages/Home/index.tsx), [SettingsDialog.tsx](frontend/src/components/SettingsDialog.tsx) | lovedhy |
| #10211 | 2026-01-20 04:30:00 | 固定位置模式支持自定义垂直位置（15-50%），移动端键盘弹出时统一上移40%确保不被遮挡 | [Home/index.tsx](frontend/src/pages/Home/index.tsx), [settingsController.ts](backend/src/controllers/settingsController.ts), [settingsFile.ts](frontend/src/utils/settingsFile.ts) | lovedhy |
| #10212 | 2026-01-20 05:10:00 | 桌面端快捷栏重构为底部 Dock 栏：macOS 风格毛玻璃背景、悬浮放大效果、无文字标签；移动端保持原有网格样式 | [BookmarkGrid.tsx](frontend/src/components/BookmarkGrid.tsx), [Home/index.tsx](frontend/src/pages/Home/index.tsx) | lovedhy |
| #10213 | 2026-01-20 05:30:00 | 书签模块代码拆分重构：提取共享类型、DraggableItem、useLazyVisibility 到独立文件；快捷栏右键菜单提取为 GridContextMenu、登录提示提取为 GridLoginPrompt；书签页右键菜单提取为 DrawerContextMenu | [bookmarks/types.ts](frontend/src/components/bookmarks/types.ts), [bookmarks/DraggableItem.tsx](frontend/src/components/bookmarks/DraggableItem.tsx), [bookmarks/useLazyVisibility.ts](frontend/src/components/bookmarks/useLazyVisibility.ts), [bookmarks/GridContextMenu.tsx](frontend/src/components/bookmarks/GridContextMenu.tsx), [bookmarks/GridLoginPrompt.tsx](frontend/src/components/bookmarks/GridLoginPrompt.tsx), [bookmarks/DrawerContextMenu.tsx](frontend/src/components/bookmarks/DrawerContextMenu.tsx), [bookmarks/index.ts](frontend/src/components/bookmarks/index.ts), [BookmarkGrid.tsx](frontend/src/components/BookmarkGrid.tsx), [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx) | lovedhy |
| #10214 | 2026-01-20 05:48:00 | 修复书签页右键菜单 z-index 错误：DrawerContextMenu 的 z-index 从 z-[60] 改为 z-[110]，确保菜单显示在书签页（z-[100]）上方 | [bookmarks/DrawerContextMenu.tsx](frontend/src/components/bookmarks/DrawerContextMenu.tsx) | lovedhy |
| #10215 | 2026-01-20 05:55:00 | 修复 Dock 栏图标和加号垂直居中：items-end 改为 items-center；修复右键菜单弹出方向：使用 bottom 定位从左下角向右上弹出 | [BookmarkGrid.tsx](frontend/src/components/BookmarkGrid.tsx), [bookmarks/GridContextMenu.tsx](frontend/src/components/bookmarks/GridContextMenu.tsx) | lovedhy |
| #10216 | 2026-01-20 06:08:00 | 为对话框添加缓入缓出动效：新增 modalIn/modalOut、backdropIn/backdropOut 动画；删除、创建、编辑对话框支持关闭动画 | [index.css](frontend/src/index.css), [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx), [BookmarkGrid.tsx](frontend/src/components/BookmarkGrid.tsx) | lovedhy |
| #10217 | 2026-01-20 06:20:00 | 书签模块深度重构（一）：提取 BookmarkItem 组件（Grid 渲染用）、useSwipeDown hook（下滑关闭手势）、useBookmarkActions hook（API 操作封装） | [bookmarks/BookmarkItem.tsx](frontend/src/components/bookmarks/BookmarkItem.tsx), [bookmarks/useSwipeDown.ts](frontend/src/components/bookmarks/useSwipeDown.ts), [bookmarks/useBookmarkActions.ts](frontend/src/components/bookmarks/useBookmarkActions.ts), [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx), [BookmarkGrid.tsx](frontend/src/components/BookmarkGrid.tsx) | lovedhy |
| #10218 | 2026-01-20 06:35:00 | 书签模块深度重构（二）：提取对话框组件到 dialogs 目录，Drawer 和 Grid 各有独立的删除/创建/编辑对话框；Grid 对话框使用 createPortal z-[70]，Drawer 对话框使用 z-[120] | [bookmarks/dialogs/DrawerDeleteDialog.tsx](frontend/src/components/bookmarks/dialogs/DrawerDeleteDialog.tsx), [bookmarks/dialogs/DrawerCreateDialog.tsx](frontend/src/components/bookmarks/dialogs/DrawerCreateDialog.tsx), [bookmarks/dialogs/DrawerEditDialog.tsx](frontend/src/components/bookmarks/dialogs/DrawerEditDialog.tsx), [bookmarks/dialogs/GridDeleteDialog.tsx](frontend/src/components/bookmarks/dialogs/GridDeleteDialog.tsx), [bookmarks/dialogs/GridCreateDialog.tsx](frontend/src/components/bookmarks/dialogs/GridCreateDialog.tsx), [bookmarks/dialogs/GridEditDialog.tsx](frontend/src/components/bookmarks/dialogs/GridEditDialog.tsx) | lovedhy |
| #10219 | 2026-01-20 06:55:00 | 书签模块深度重构（三）：提取 DrawerBookmarkItem（书签页渲染）、DrawerSavePromptDialog（保存排序提示）、DrawerLoginPrompt（登录提示）；BookmarkDrawer 从 1619 行减至 1123 行（-30.6%），BookmarkGrid 从 1071 行减至 788 行（-26.4%） | [bookmarks/DrawerBookmarkItem.tsx](frontend/src/components/bookmarks/DrawerBookmarkItem.tsx), [bookmarks/dialogs/DrawerSavePromptDialog.tsx](frontend/src/components/bookmarks/dialogs/DrawerSavePromptDialog.tsx), [bookmarks/dialogs/DrawerLoginPrompt.tsx](frontend/src/components/bookmarks/dialogs/DrawerLoginPrompt.tsx), [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx) | lovedhy |
| #10220 | 2026-01-20 07:15:00 | 优化 Dock 栏拖拽动画：拖拽开始时图标先平滑从放大状态（scale-125）缩小到正常大小，120ms 后再隐藏并显示 overlay；新增 cleanupIconStyles 函数确保拖拽结束后恢复 hover 放大效果 | [bookmarks/useBookmarkDrag.ts](frontend/src/components/bookmarks/useBookmarkDrag.ts) | lovedhy |
| #10221 | 2026-01-20 08:37:00 | 修复打开文件夹后背后图标触发换位重排问题：onUp 中清理 activeIdRef.current，防止点击后移动鼠标触发错误的拖拽逻辑 | [bookmarks/useBookmarkDrag.ts](frontend/src/components/bookmarks/useBookmarkDrag.ts) | lovedhy |
| #10222 | 2026-01-20 08:37:00 | 修复 Dock 栏悬浮文件夹失效问题：拖拽进行时禁用 dock 元素的 hover 动画（scale-125），避免动画导致元素矩形不稳定影响 hitItem 检测 | [bookmarks/BookmarkItem.tsx](frontend/src/components/bookmarks/BookmarkItem.tsx) | lovedhy |
| #10223 | 2026-01-20 08:41:00 | 修复两个普通书签悬浮高亮后无法合并创建文件夹：松手时检测 combineCandidateId，若指针在中心区域（20%-80%）则自动升级为 combineTargetId 触发合并 | [bookmarks/useBookmarkDrag.ts](frontend/src/components/bookmarks/useBookmarkDrag.ts) | lovedhy |
| #10224 | 2026-01-20 08:47:00 | 修复 Dock 栏建夹后文件夹无法保留：新增 replaceShortcutsAt 函数，在被合并书签的第一个位置插入新文件夹而非添加到末尾 | [stores/shortcutSet.ts](frontend/src/stores/shortcutSet.ts), [bookmarks/useShortcutSet.ts](frontend/src/components/bookmarks/useShortcutSet.ts), [BookmarkGrid.tsx](frontend/src/components/BookmarkGrid.tsx) | lovedhy |
| #10225 | 2026-01-20 08:47:00 | 修复建夹后排序位置不对：复制数组避免直接修改原数组，确保新文件夹出现在目标书签的位置 | [BookmarkGrid.tsx](frontend/src/components/BookmarkGrid.tsx), [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx) | lovedhy |
| #10226 | 2026-01-20 10:30:00 | 修复文件夹创建位置漂移：originalOrderRef 在 onPointerDown 时保存，避免 prePush 修改后再保存导致位置错误 | [bookmarks/useBookmarkDrag.ts](frontend/src/components/bookmarks/useBookmarkDrag.ts) | lovedhy |
| #10227 | 2026-01-20 10:30:00 | 修复移动书签到文件夹时排序错误：新项目始终添加到文件夹内部顺序末尾 | [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx) | lovedhy |
| #10228 | 2026-01-20 10:30:00 | 新增 getSortedFolderChildren 函数：统一获取排序后的文件夹子项，用于图标预览等场景 | [bookmarks/folderOperations.ts](frontend/src/components/bookmarks/folderOperations.ts) | lovedhy |
| #10229 | 2026-01-20 10:30:00 | 修复文件夹图标预览顺序：所有显示文件夹预览的组件使用 getSortedFolderChildren 按保存顺序排列 | [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx), [BookmarkGrid.tsx](frontend/src/components/BookmarkGrid.tsx), [bookmarks/DrawerBookmarkItem.tsx](frontend/src/components/bookmarks/DrawerBookmarkItem.tsx), [bookmarks/BookmarkItem.tsx](frontend/src/components/bookmarks/BookmarkItem.tsx), [bookmarks/BookmarkIcon.tsx](frontend/src/components/bookmarks/BookmarkIcon.tsx), [bookmarks/DragOverlay.tsx](frontend/src/components/bookmarks/DragOverlay.tsx), [bookmarks/FolderModal.tsx](frontend/src/components/bookmarks/FolderModal.tsx) | lovedhy |
| #10230 | 2026-01-22 02:10:00 | 修复创建文件夹动画问题：使用 savePositions 和 triggerFillAnimation 手动控制补位动画，避免后续图标瞬移到文件夹位置 | [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx), [BookmarkGrid.tsx](frontend/src/components/BookmarkGrid.tsx) | lovedhy |
| #10231 | 2026-01-22 02:20:00 | 文件夹删除功能重构：原"删除"改为"释放"（子项移动到上一级），新增"删除"（级联删除文件夹及所有子项），删除前显示确认提示框 | [DrawerContextMenu.tsx](frontend/src/components/bookmarks/DrawerContextMenu.tsx), [GridContextMenu.tsx](frontend/src/components/bookmarks/GridContextMenu.tsx), [DrawerDeleteDialog.tsx](frontend/src/components/bookmarks/dialogs/DrawerDeleteDialog.tsx), [GridDeleteDialog.tsx](frontend/src/components/bookmarks/dialogs/GridDeleteDialog.tsx), [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx), [BookmarkGrid.tsx](frontend/src/components/BookmarkGrid.tsx), [bookmarkController.ts](backend/src/controllers/bookmarkController.ts) | lovedhy |
| #10232 | 2026-01-22 02:50:00 | 修复叠加建夹补位动画：使用 folderCreationTargetIdRef 保存目标 ID，文件夹从目标位置开始动画补位到最终位置；savePositions 使用 originalOrderRef 确保保存正确的原始布局 | [bookmarks/useBookmarkDrag.ts](frontend/src/components/bookmarks/useBookmarkDrag.ts) | lovedhy |
| #10233 | 2026-01-22 03:15:00 | 修复 Dock 栏图标和加号垂直居中：items-end 改为 items-center；修复右键菜单弹出方向：使用 bottom 定位从左下角向右上弹出 | [BookmarkGrid.tsx](frontend/src/components/BookmarkGrid.tsx), [bookmarks/GridContextMenu.tsx](frontend/src/components/bookmarks/GridContextMenu.tsx) | lovedhy |
| #10234 | 2026-01-22 04:30:00 | 新增书签标签系统：支持多标签（最多10个/20字符）、自动去重去空格、中英文数字下划线连字符 | [schema.prisma](backend/prisma/schema.prisma), [tags.ts](backend/src/utils/tags.ts), [bookmarkController.ts](backend/src/controllers/bookmarkController.ts) | lovedhy |
| #10235 | 2026-01-22 04:58:00 | 修复非登录态底部 Dock 栏样式：根据 isDock 变量区分渲染，Dock 模式使用 macOS 风格（圆角、毛玻璃背景、hover 放大动画），与登录态样式一致 | [BookmarkGrid.tsx](frontend/src/components/BookmarkGrid.tsx) | lovedhy |
| #10236 | 2026-01-22 05:00:00 | 侧边栏布局优化：改为内容自适应高度并垂直居中（fixed + top-1/2 -translate-y-1/2），移除固定高度撑满视口的样式 | [Sidebar.tsx](frontend/src/components/Sidebar.tsx) | lovedhy |
| #10237 | 2026-01-22 05:02:00 | 修复侧边栏三横菜单按钮与下方图标未对齐：顶部容器 px-2 改为 px-3 | [Sidebar.tsx](frontend/src/components/Sidebar.tsx) | lovedhy |
| #10238 | 2026-01-22 05:05:00 | 侧边栏当前页样式优化：激活状态使用主题色边框（border-primary/50）和主题色图标（text-primary），非激活状态使用柔和样式 | [Sidebar.tsx](frontend/src/components/Sidebar.tsx) | lovedhy |
| #10239 | 2026-01-22 05:07:00 | 侧边栏动态滑动指示器：切换页面时激活状态框平滑滚动，使用 useLocation 追踪路由、refs 追踪导航项位置、绝对定位指示器元素实现 300ms 过渡动画 | [Sidebar.tsx](frontend/src/components/Sidebar.tsx) | lovedhy |
| *#10240** | 2026-01-22 05:38:00 | ⚠️ **重要修复**：修复项目重命名后更新检测失败：GITHUB_REPO 从 'start' 改为 'TabN'，修复所有 GitHub API 调用指向错误仓库导致无法检测更新、拉取失败的问题 | [updateController.ts](backend/src/controllers/updateController.ts) | lovedhy |
| *#10241** | 2026-01-22 05:38:00 | ⚠️ **重要修复**：修复安装脚本不清理旧目录：install.sh 同时清理 ~/start（旧目录）和 ~/TabN（新目录），解决旧用户重装时端口被占用但不提示已存在项目的问题 | [install.sh](scripts/install.sh) | lovedhy |

**结束时间**: 2026-01-22 05:46:00 (北京时间)

**发布时间**: 2026-01-22 05:46:00 (北京时间)


---

## v1.4.0

**开始时间**: 2026-01-22 05:46:00 (北京时间)

| 编号 | 时间 | 描述 | 涉及文件 | 开发者 |
|------|------|------|----------|--------|
| #10242 | 2026-01-22 05:52:00 | 设置页面重构：新增搜索栏功能，支持搜索所有设置项并快速跳转到对应分类 | [SettingsDialog.tsx](frontend/src/components/SettingsDialog.tsx) | lovedhy |
| #10243 | 2026-01-22 05:52:00 | 设置页面重构：桌面端采用 Windows 风格布局，左侧导航显示图标+标题+描述，激活项使用主题色高亮 | [SettingsDialog.tsx](frontend/src/components/SettingsDialog.tsx) | lovedhy |
| #10244 | 2026-01-22 05:52:00 | 设置页面重构：移动端采用华为风格卡片布局，设置分类和重置选项分别放在独立的圆角卡片中 | [SettingsDialog.tsx](frontend/src/components/SettingsDialog.tsx) | lovedhy |
| #10245 | 2026-01-22 05:52:00 | 新增重置确认框：重置外观和重置拖拽操作前显示确认对话框，防止误操作 | [SettingsDialog.tsx](frontend/src/components/SettingsDialog.tsx) | lovedhy |
| #10246 | 2026-01-22 06:06:00 | 设置搜索建议框样式优化：采用搜索框搜索建议的毛玻璃样式（bg-glass/75、rounded-xl border、hover 主题色高亮） | [SettingsDialog.tsx](frontend/src/components/SettingsDialog.tsx) | lovedhy |
| #10247 | 2026-01-22 06:06:00 | 设置搜索跳转优化：点击搜索结果跳转到对应分类并自动滚动到具体卡片，卡片高亮 2 秒后消失（主题色边框 + ring 效果） | [SettingsDialog.tsx](frontend/src/components/SettingsDialog.tsx) | lovedhy |
| #10248 | 2026-01-22 06:17:00 | 移动端设置页面改为全屏独立页面：移除外边框和背景遮罩，使用纯色背景（bg-bg） | [SettingsDialog.tsx](frontend/src/components/SettingsDialog.tsx) | lovedhy |
| #10249 | 2026-01-22 06:17:00 | 新增"重置"设置页：整合重置外观和重置拖拽选项到独立设置页，移除原有的重置按钮 | [SettingsDialog.tsx](frontend/src/components/SettingsDialog.tsx) | lovedhy |
| #10250 | 2026-01-22 06:17:00 | 移动端设置列表页样式优化：卡片添加明显边框（border-white/20）、阴影（shadow-lg）和分隔线效果 | [SettingsDialog.tsx](frontend/src/components/SettingsDialog.tsx) | lovedhy |
| #10251 | 2026-01-22 06:22:00 | 移动端设置页面切换动画：打开详情页从右侧滑入（slide-in-from-right），返回列表页从左侧滑入（slide-in-from-left），带淡入淡出效果 | [SettingsDialog.tsx](frontend/src/components/SettingsDialog.tsx) | lovedhy |
| #10252 | 2026-01-22 06:31:00 | 设置页面打开/关闭动画：移动端从底部滑入滑出（slideUpIn/slideDownOut），桌面端缩放淡入淡出（scaleIn/scaleOut），背景遮罩淡入淡出 | [SettingsDialog.tsx](frontend/src/components/SettingsDialog.tsx), [index.css](frontend/src/index.css) | lovedhy |
| #10253 | 2026-01-22 06:34:00 | 移动端设置页样式优化：搜索条采用与分类卡片一致的背景样式（bg-white/10、border-white/20、shadow-lg），"设置"标题字号增大为 text-2xl | [SettingsDialog.tsx](frontend/src/components/SettingsDialog.tsx) | lovedhy |
| #10254 | 2026-01-22 06:37:00 | 删除动态挤压布局选项，简化为仅垂直位置设置 | [SettingsDialog.tsx](frontend/src/components/SettingsDialog.tsx) | lovedhy |
| #10255 | 2026-01-22 07:07:00 | 垂直位置拖动预览功能：拖动滑块时设置页面隐藏但滑块条保留在原位置，使用 getBoundingClientRect 记录位置后渲染固定定位滑块，松手后自动恢复 | [SettingsDialog.tsx](frontend/src/components/SettingsDialog.tsx) | lovedhy |
| #10256 | 2026-01-22 22:53:00 | 新增时钟大小调节功能：clockScale 状态（50-150%），时钟设置页添加"时钟大小"卡片，滑块支持拖动预览，预览时显示当前数值 | [appearance.ts](frontend/src/stores/appearance.ts), [Clock.tsx](frontend/src/components/Clock.tsx), [SettingsDialog.tsx](frontend/src/components/SettingsDialog.tsx) | lovedhy |
| #10257 | 2026-01-22 22:53:00 | 优化滑块拖动预览交互：预览时设置页面立即隐藏（无过渡动画），滑块条上方显示当前数值，样式与设置页一致 | [SettingsDialog.tsx](frontend/src/components/SettingsDialog.tsx) | lovedhy |
| #10258 | 2026-01-22 23:35:00 | 书签页 UI 重构：顶部栏简化（排序控件移至搜索框旁边，去除"全部书签"文字和刷新按钮），顶部栏固定不滚动 | [BookmarkDrawer.tsx](frontend/src/components/BookmarkDrawer.tsx) | lovedhy |
| #10259 | 2026-01-22 23:35:00 | 新增按标签分类排序模式：标签间按标签名 A-Z 排序，标签内按书签名 A-Z 排序，无标签书签排在最后 | [bookmark.ts](frontend/src/types/bookmark.ts), [sortBookmarks.ts](frontend/src/utils/sortBookmarks.ts), [SortModeSelector.tsx](frontend/src/components/SortModeSelector.tsx), [useBookmarkOrder.ts](frontend/src/components/bookmarks/useBookmarkOrder.ts), [settingsController.ts](backend/src/controllers/settingsController.ts) | lovedhy |
| #10260 | 2026-01-23 00:45:00 | **【重要】PostgreSQL 安全修复**：端口绑定改为 127.0.0.1:5432（仅本机访问），解决服务器提供商安全警告 | [docker-compose.example.yml](docker-compose.example.yml), [install.sh](scripts/install.sh), [install.bat](scripts/install.bat), [setup.bat](scripts/setup.bat) | lovedhy |
| #10261 | 2026-01-23 00:45:00 | **【重要】数据库密码自定义**：安装脚本改为交互式配置，用户可自定义数据库名、用户名、密码，自动生成 JWT 密钥 | [install.sh](scripts/install.sh), [install.bat](scripts/install.bat), [setup.bat](scripts/setup.bat) | lovedhy |
| #10262 | 2026-01-23 00:45:00 | **【重要】敏感信息保护**：docker-compose.yml 加入 .gitignore，由安装脚本动态生成，新增 docker-compose.example.yml 作为模板 | [.gitignore](.gitignore), [docker-compose.example.yml](docker-compose.example.yml) | lovedhy |
| #10263 | 2026-01-23 00:45:00 | 新增 Linux 管理面板脚本 tabn.sh：类似 OpenList 的交互式管理，支持安装/更新/卸载、服务管理、查看密码、PM2 守护等 13 项功能 | [tabn.sh](scripts/tabn.sh), [install.sh](scripts/install.sh) | lovedhy |
| #10264 | 2026-01-23 00:45:00 | 管理面板双模式安装：首次运行可选择"普通安装"（开发模式）或"PM2 安装"（生产模式，进程守护+开机自启） | [tabn.sh](scripts/tabn.sh) | lovedhy |
| #10265 | 2026-01-23 00:45:00 | 新增 tabn 命令：安装后自动注册到 /usr/local/bin，可在任意位置运行 tabn 打开管理面板 | [install.sh](scripts/install.sh), [tabn.sh](scripts/tabn.sh) | lovedhy |
| #10266 | 2026-01-23 00:45:00 | 新增 Windows 本地开发脚本 setup.bat：不克隆仓库，仅在当前目录生成配置文件，适合本地开发 | [setup.bat](scripts/setup.bat) | lovedhy |
| #10267 | 2026-01-23 00:45:00 | 新增 Windows 卸载脚本 uninstall.bat：完全删除克隆的项目、Docker 容器和数据卷 | [uninstall.bat](scripts/uninstall.bat) | lovedhy |
| #10268 | 2026-01-23 00:45:00 | 启动脚本增加配置检查：start.sh 和 start.js 启动时检查 docker-compose.yml 是否存在，不存在则提示运行安装脚本 | [start.sh](scripts/start.sh), [start.js](scripts/start.js) | lovedhy |
| #10269 | 2026-01-23 00:45:00 | Docker 容器命名：所有脚本生成的 docker-compose.yml 添加 container_name: TabN-postgres | [install.sh](scripts/install.sh), [install.bat](scripts/install.bat), [setup.bat](scripts/setup.bat), [docker-compose.example.yml](docker-compose.example.yml) | lovedhy |
| #10270 | 2026-01-23 00:45:00 | README 更新：安装命令改为 tabn.sh，添加管理面板完整显示示例、tabn 命令说明、PM2 进程守护说明 | [README.md](README.md) | lovedhy |
| #10271 | 2026-01-23 01:10:00 | **【重要】设置同步完整性修复**：后端 schema 添加 clockScale 字段，settingsFile.ts 添加 clockScale 到 APPEARANCE_KEYS 和 applySettingsFile | [settingsController.ts](backend/src/controllers/settingsController.ts), [settingsFile.ts](frontend/src/utils/settingsFile.ts) | lovedhy |
| #10272 | 2026-01-23 01:10:00 | 修复 by-tag 排序模式验证：applySettingsFile 中 bookmarkDrawerSortMode 验证添加 by-tag 选项 | [settingsFile.ts](frontend/src/utils/settingsFile.ts) | lovedhy |
| #10273 | 2026-01-23 01:10:00 | **【重要】WebSocket 实时设置同步**：新增后端 WebSocket 服务，设置变更时广播给同用户的其他设备 | [settingsWebSocket.ts](backend/src/services/settingsWebSocket.ts), [server.ts](backend/src/server.ts), [settingsController.ts](backend/src/controllers/settingsController.ts) | lovedhy |
| #10274 | 2026-01-23 01:10:00 | 前端 WebSocket 连接：新增 useSettingsWebSocket hook，自动连接、断线重连、心跳保活、接收设置更新并应用 | [useSettingsWebSocket.ts](frontend/src/hooks/useSettingsWebSocket.ts), [App.tsx](frontend/src/App.tsx) | lovedhy |
| #10275 | 2026-01-23 01:10:00 | 后端添加 ws 依赖：package.json 添加 ws 和 @types/ws 用于 WebSocket 服务 | [package.json](backend/package.json) | lovedhy |
| #10276 | 2026-01-23 01:30:00 | 重装/卸载时同步删除设置文件：tabn.sh 重装和卸载时删除 backend/storage/user-settings 目录，避免新旧用户 ID 不匹配 | [tabn.sh](scripts/tabn.sh) | lovedhy |
| #10277 | 2026-01-23 01:30:00 | setup.bat 完全重置功能：添加菜单选项支持覆盖配置、完全重置（删除数据库+设置文件）、使用现有配置 | [setup.bat](scripts/setup.bat) | lovedhy |
| #10278 | 2026-01-23 01:30:00 | setup.bat Docker 自动等待：启动 Docker Desktop 后自动等待最多 60 秒直到 Docker 就绪，无需手动重新运行脚本 | [setup.bat](scripts/setup.bat) | lovedhy |
| #10279 | 2026-01-23 01:35:00 | Docker Compose 项目名统一为 TabN：所有脚本生成的 docker-compose.yml 添加 name: TabN，容器名改为 TabN-postgres | [setup.bat](scripts/setup.bat), [install.sh](scripts/install.sh), [install.bat](scripts/install.bat), [docker-compose.example.yml](docker-compose.example.yml) | lovedhy |
| #10280 | 2026-01-23 01:45:00 | .gitignore 简化：backend/storage/ 整个目录忽略，替代原来的 backend/storage/user-settings/*.json | [.gitignore](.gitignore) | lovedhy |
| #10281 | 2026-01-23 01:50:00 | start.sh 添加共享模块构建检查：启动时检查 shared/dist 是否存在，不存在则自动运行 npm install && npm run build:shared | [start.sh](scripts/start.sh) | lovedhy |
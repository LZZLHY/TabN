# 开发者备忘录

## 新增设置项时的维护清单

当在 `frontend/src/stores/appearance.ts` 或 `frontend/src/stores/bookmarkDnd.ts` 中添加新的设置项时，需要同步更新以下位置：

### 1. 设置导出/导入 (`frontend/src/utils/settingsFile.ts`)

#### 对于 Appearance 设置项：
1. **在 `APPEARANCE_KEYS` 数组中添加新的 key 名称**
   - 位置：文件顶部的 `APPEARANCE_KEYS` 常量数组
   - 这样 `createSettingsFile()` 会自动包含该字段到导出文件中

2. **在 `applySettingsFile()` 函数中添加解析逻辑**
   - 需要手动添加验证和应用逻辑
   - 参考现有字段的处理方式（如 `searchGlowBorder`）

#### 对于 BookmarkDnd 设置项：
1. 在 `createSettingsFile()` 的 `bookmarkDnd` 对象中添加字段
2. 在 `applySettingsFile()` 的 bookmarkDnd 处理部分添加解析逻辑

### 2. Store 本身 (`frontend/src/stores/appearance.ts`)

确保新字段已添加到：
- `AppearanceState` 类型定义
- `DEFAULTS` 常量
- `persist` 的 `partialize` 函数中

---

## 设计说明

当前的设置保存机制：
- **导出**：点击保存按钮时，`createSettingsFile()` 会从 store 读取所有 `APPEARANCE_KEYS` 中定义的字段，生成完整的设置文件覆盖旧文件
- **导入**：`applySettingsFile()` 会解析文件中的每个字段，验证后应用到 store

这种设计确保：
1. 导出的文件总是包含所有当前设置项
2. 导入时可以兼容旧版本文件（缺少的字段会保留当前值）
3. 新增设置项只需在 `APPEARANCE_KEYS` 添加 key，导出会自动包含

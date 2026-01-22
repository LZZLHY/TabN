# 图标扩展 API 文档

## 概述

图标扩展 API 允许第三方扩展开发者为用户的书签自定义图标。通过此 API，您可以：

- 获取用户的书签列表
- 更新单个书签的图标
- 批量更新多个书签的图标

这使得开发图标主题包、自动图标获取工具等扩展成为可能。

## 认证

### 获取 API 密钥

图标扩展 API 使用 API 密钥进行认证。用户需要先登录系统，然后在设置页面生成 API 密钥。

#### 生成 API 密钥

**请求**

```http
POST /api-keys
Authorization: Bearer <JWT_TOKEN>
```

**响应**

```json
{
  "ok": true,
  "data": {
    "key": "bk_clx123abc_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### 获取 API 密钥状态

**请求**

```http
GET /api-keys
Authorization: Bearer <JWT_TOKEN>
```

**响应（已有密钥）**

```json
{
  "ok": true,
  "data": {
    "hasKey": true,
    "key": "bk_clx123abc_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**响应（无密钥）**

```json
{
  "ok": true,
  "data": {
    "hasKey": false,
    "key": null,
    "createdAt": null
  }
}
```

#### 重新生成 API 密钥

重新生成密钥会使旧密钥立即失效。

**请求**

```http
DELETE /api-keys
Authorization: Bearer <JWT_TOKEN>
```

**响应**

```json
{
  "ok": true,
  "data": {
    "key": "bk_clx123abc_new1key2here3abcd4efgh5ijkl6",
    "createdAt": "2024-01-15T11:00:00.000Z"
  }
}
```

### 使用 API 密钥

在调用图标扩展 API 时，需要在请求头中包含 API 密钥：

```http
X-API-Key: bk_clx123abc_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

## API 端点

### 获取书签列表

获取用户的所有书签，用于查看可以更新图标的书签。

**请求**

```http
GET /icons/bookmarks
X-API-Key: <API_KEY>
```

**响应**

```json
{
  "ok": true,
  "data": {
    "bookmarks": [
      {
        "id": "clx123abc",
        "name": "GitHub",
        "url": "https://github.com",
        "type": "LINK",
        "iconType": "URL",
        "iconUrl": "https://github.com/favicon.ico",
        "iconData": null,
        "createdAt": "2024-01-10T08:00:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      },
      {
        "id": "clx456def",
        "name": "Google",
        "url": "https://google.com",
        "type": "LINK",
        "iconType": null,
        "iconUrl": null,
        "iconData": null,
        "createdAt": "2024-01-11T09:00:00.000Z",
        "updatedAt": "2024-01-11T09:00:00.000Z"
      }
    ]
  }
}
```

### 更新单个书签图标

更新指定书签的图标。

**请求**

```http
PATCH /icons/:bookmarkId
X-API-Key: <API_KEY>
Content-Type: application/json
```

**请求体**

```json
{
  "iconType": "URL",
  "iconData": "https://example.com/icon.png"
}
```

或使用 Base64 格式：

```json
{
  "iconType": "BASE64",
  "iconData": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
}
```

**响应**

```json
{
  "ok": true,
  "data": {
    "bookmarkId": "clx123abc",
    "iconType": "URL",
    "iconUrl": "https://example.com/icon.png",
    "iconData": null
  }
}
```

### 批量更新书签图标

一次更新多个书签的图标，最多支持 100 个书签。

**请求**

```http
POST /icons/batch
X-API-Key: <API_KEY>
Content-Type: application/json
```

**请求体**

```json
{
  "updates": [
    {
      "bookmarkId": "clx123abc",
      "iconType": "URL",
      "iconData": "https://example.com/icon1.png"
    },
    {
      "bookmarkId": "clx456def",
      "iconType": "BASE64",
      "iconData": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    }
  ]
}
```

**响应**

```json
{
  "ok": true,
  "data": {
    "results": [
      {
        "bookmarkId": "clx123abc",
        "success": true
      },
      {
        "bookmarkId": "clx456def",
        "success": true
      }
    ],
    "successCount": 2,
    "failureCount": 0
  }
}
```

**部分失败响应**

```json
{
  "ok": true,
  "data": {
    "results": [
      {
        "bookmarkId": "clx123abc",
        "success": true
      },
      {
        "bookmarkId": "invalid_id",
        "success": false,
        "error": "书签不存在"
      }
    ],
    "successCount": 1,
    "failureCount": 1
  }
}
```

## 图标数据格式

### URL 类型

使用 HTTP 或 HTTPS URL 指向图标文件。

```json
{
  "iconType": "URL",
  "iconData": "https://example.com/icon.png"
}
```

**要求：**
- 必须是有效的 HTTP 或 HTTPS URL
- URL 应指向可访问的图片资源

### Base64 类型

使用 Data URI 格式的 Base64 编码图片数据。

```json
{
  "iconType": "BASE64",
  "iconData": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
}
```

**要求：**
- 必须使用 Data URI 格式：`data:<mime-type>;base64,<data>`
- 最大大小：100KB（解码后）
- 支持的图片格式：
  - `image/png`
  - `image/jpeg`
  - `image/gif`
  - `image/svg+xml`
  - `image/webp`

## 错误处理

### 错误响应格式

```json
{
  "ok": false,
  "error": "错误消息"
}
```

### 错误码说明

| HTTP 状态码 | 错误场景 | 错误消息 |
|------------|---------|---------|
| 400 | 请求参数无效 | 参数错误 |
| 400 | 图标 URL 格式无效 | 图标 URL 格式无效 |
| 400 | Base64 数据超过 100KB | 图标数据不能超过 100KB |
| 400 | Base64 格式无效 | 图标数据格式无效 |
| 400 | 不支持的图片类型 | 不支持的图片格式 |
| 400 | 批量更新超过 100 个 | 单次批量更新最多 100 个书签 |
| 401 | 缺少 API 密钥 | 缺少 API 密钥 |
| 401 | API 密钥无效 | API 密钥无效 |
| 404 | 书签不存在 | 书签不存在 |
| 404 | 书签不属于该用户 | 书签不存在 |

## 示例代码

### JavaScript/TypeScript

#### 初始化

```typescript
const API_BASE_URL = 'https://your-app.com'
const API_KEY = 'bk_clx123abc_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'

// 通用请求函数
async function apiRequest(
  method: string,
  endpoint: string,
  body?: object
): Promise<any> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await response.json()

  if (!data.ok) {
    throw new Error(data.error || '请求失败')
  }

  return data.data
}
```

#### 获取书签列表

```typescript
async function getBookmarks() {
  const result = await apiRequest('GET', '/icons/bookmarks')
  console.log('书签列表:', result.bookmarks)
  return result.bookmarks
}
```

#### 更新单个书签图标（URL 类型）

```typescript
async function updateIconWithUrl(bookmarkId: string, iconUrl: string) {
  const result = await apiRequest('PATCH', `/icons/${bookmarkId}`, {
    iconType: 'URL',
    iconData: iconUrl,
  })
  console.log('更新成功:', result)
  return result
}

// 使用示例
await updateIconWithUrl('clx123abc', 'https://example.com/icon.png')
```

#### 更新单个书签图标（Base64 类型）

```typescript
async function updateIconWithBase64(bookmarkId: string, base64Data: string) {
  const result = await apiRequest('PATCH', `/icons/${bookmarkId}`, {
    iconType: 'BASE64',
    iconData: base64Data,
  })
  console.log('更新成功:', result)
  return result
}

// 从文件读取并转换为 Base64
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// 使用示例
const file = document.querySelector('input[type="file"]').files[0]
const base64Data = await fileToBase64(file)
await updateIconWithBase64('clx123abc', base64Data)
```

#### 批量更新书签图标

```typescript
interface IconUpdate {
  bookmarkId: string
  iconType: 'URL' | 'BASE64'
  iconData: string
}

async function batchUpdateIcons(updates: IconUpdate[]) {
  const result = await apiRequest('POST', '/icons/batch', { updates })
  
  console.log(`成功: ${result.successCount}, 失败: ${result.failureCount}`)
  
  // 处理失败的更新
  const failures = result.results.filter((r: any) => !r.success)
  if (failures.length > 0) {
    console.warn('以下书签更新失败:')
    failures.forEach((f: any) => {
      console.warn(`  - ${f.bookmarkId}: ${f.error}`)
    })
  }
  
  return result
}

// 使用示例：应用图标主题包
const iconTheme: IconUpdate[] = [
  {
    bookmarkId: 'clx123abc',
    iconType: 'URL',
    iconData: 'https://theme.example.com/github.png',
  },
  {
    bookmarkId: 'clx456def',
    iconType: 'URL',
    iconData: 'https://theme.example.com/google.png',
  },
  {
    bookmarkId: 'clx789ghi',
    iconType: 'URL',
    iconData: 'https://theme.example.com/twitter.png',
  },
]

await batchUpdateIcons(iconTheme)
```

### 完整示例：图标主题包应用器

```typescript
/**
 * 图标主题包应用器
 * 
 * 这个示例展示了如何创建一个简单的图标主题包应用工具
 */

interface ThemeIcon {
  /** 匹配书签 URL 的正则表达式 */
  urlPattern: RegExp
  /** 主题图标 URL */
  iconUrl: string
}

interface IconTheme {
  name: string
  icons: ThemeIcon[]
}

// 定义一个示例主题
const darkTheme: IconTheme = {
  name: 'Dark Mode Icons',
  icons: [
    { urlPattern: /github\.com/i, iconUrl: 'https://theme.example.com/dark/github.png' },
    { urlPattern: /google\.com/i, iconUrl: 'https://theme.example.com/dark/google.png' },
    { urlPattern: /twitter\.com|x\.com/i, iconUrl: 'https://theme.example.com/dark/twitter.png' },
    { urlPattern: /youtube\.com/i, iconUrl: 'https://theme.example.com/dark/youtube.png' },
  ],
}

async function applyTheme(theme: IconTheme) {
  console.log(`正在应用主题: ${theme.name}`)
  
  // 1. 获取所有书签
  const bookmarks = await getBookmarks()
  
  // 2. 匹配书签并准备更新
  const updates: IconUpdate[] = []
  
  for (const bookmark of bookmarks) {
    if (!bookmark.url) continue
    
    for (const themeIcon of theme.icons) {
      if (themeIcon.urlPattern.test(bookmark.url)) {
        updates.push({
          bookmarkId: bookmark.id,
          iconType: 'URL',
          iconData: themeIcon.iconUrl,
        })
        break // 每个书签只匹配一个图标
      }
    }
  }
  
  if (updates.length === 0) {
    console.log('没有找到匹配的书签')
    return
  }
  
  console.log(`找到 ${updates.length} 个匹配的书签`)
  
  // 3. 批量更新（如果超过 100 个，需要分批）
  const batchSize = 100
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize)
    const result = await batchUpdateIcons(batch)
    console.log(`批次 ${Math.floor(i / batchSize) + 1}: 成功 ${result.successCount}, 失败 ${result.failureCount}`)
  }
  
  console.log('主题应用完成!')
}

// 应用主题
applyTheme(darkTheme)
```

## 最佳实践

### 1. 安全存储 API 密钥

- 不要在客户端代码中硬编码 API 密钥
- 使用环境变量或安全的密钥管理服务
- 定期轮换 API 密钥

### 2. 处理错误

- 始终检查响应中的 `ok` 字段
- 对于批量更新，检查每个结果的 `success` 字段
- 实现适当的重试逻辑

### 3. 优化批量更新

- 尽量使用批量更新而不是多次单个更新
- 单次批量更新最多 100 个书签
- 如果需要更新更多书签，分批处理

### 4. 图标数据优化

- 优先使用 URL 类型，减少请求体大小
- 如果使用 Base64，确保图片已压缩
- 保持图标文件小于 100KB

### 5. 缓存书签列表

- 获取书签列表后可以缓存一段时间
- 避免频繁调用获取书签列表接口

## 限制

| 限制项 | 值 |
|-------|-----|
| 单次批量更新最大书签数 | 100 |
| Base64 图标最大大小 | 100KB |
| API 密钥格式 | `bk_{userId}_{32位随机字符}` |

## 更新日志

### v1.0.0

- 初始版本
- 支持单个和批量图标更新
- 支持 URL 和 Base64 两种图标格式
- API 密钥认证

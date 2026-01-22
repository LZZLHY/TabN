/**
 * 书签 CRUD 集成测试
 * 
 * 覆盖：创建、读取、更新、删除书签
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'

const API_BASE = process.env.TEST_API_BASE || 'http://127.0.0.1:3100'
const prisma = new PrismaClient()

// 测试用户
const testUser = {
  username: `bookmark_test_${Date.now()}`,
  password: 'TestPassword123!',
}

let authToken: string
let testBookmarkId: string
let testFolderId: string

async function registerAndLogin() {
  // 注册
  await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser),
  })

  // 登录
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: testUser.username,
      password: testUser.password,
    }),
  })

  const json = await res.json() as { data: { token: string } }
  return json.data.token
}

describe('Bookmarks CRUD Integration Tests', () => {
  beforeAll(async () => {
    await prisma.$connect()
    authToken = await registerAndLogin()
  })

  afterAll(async () => {
    // 清理测试数据
    try {
      const user = await prisma.user.findFirst({
        where: { username: testUser.username },
      })
      if (user) {
        await prisma.bookmark.deleteMany({ where: { userId: user.id } })
        await prisma.user.delete({ where: { id: user.id } })
      }
    } catch {
      // 忽略
    }
    await prisma.$disconnect()
  })

  describe('POST /api/bookmarks (创建)', () => {
    it('应该成功创建书签', async () => {
      const res = await fetch(`${API_BASE}/api/bookmarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: '测试书签',
          url: 'https://example.com',
          note: '这是一个测试书签',
          tags: ['测试', '示例'],
        }),
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { ok: boolean; data: { item: { id: string; name: string; url: string; tags: string[] } } }
      expect(json.ok).toBe(true)
      expect(json.data.item.name).toBe('测试书签')
      expect(json.data.item.url).toBe('https://example.com')
      expect(json.data.item.tags).toContain('测试')
      
      testBookmarkId = json.data.item.id
    })

    it('应该成功创建文件夹', async () => {
      const res = await fetch(`${API_BASE}/api/bookmarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: '测试文件夹',
          type: 'FOLDER',
        }),
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { ok: boolean; data: { item: { id: string; type: string } } }
      expect(json.ok).toBe(true)
      expect(json.data.item.type).toBe('FOLDER')
      
      testFolderId = json.data.item.id
    })

    it('应该拒绝没有 URL 的 LINK 类型书签', async () => {
      const res = await fetch(`${API_BASE}/api/bookmarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: '无效书签',
          type: 'LINK',
        }),
      })

      expect(res.status).toBe(400)
    })

    it('应该拒绝没有名称的 FOLDER 类型', async () => {
      const res = await fetch(`${API_BASE}/api/bookmarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          type: 'FOLDER',
        }),
      })

      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/bookmarks (读取)', () => {
    it('应该返回书签列表', async () => {
      const res = await fetch(`${API_BASE}/api/bookmarks`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { ok: boolean; data: { items: unknown[] } }
      expect(json.ok).toBe(true)
      expect(Array.isArray(json.data.items)).toBe(true)
      expect(json.data.items.length).toBeGreaterThan(0)
    })

    it('应该支持标签筛选', async () => {
      const res = await fetch(`${API_BASE}/api/bookmarks?tag=测试`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { ok: boolean; data: { items: Array<{ tags: string[] }> } }
      expect(json.ok).toBe(true)
      expect(json.data.items.every((item) => item.tags.includes('测试'))).toBe(true)
    })

    it('应该返回空列表（不存在的标签）', async () => {
      const res = await fetch(`${API_BASE}/api/bookmarks?tag=不存在的标签`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { ok: boolean; data: { items: unknown[] } }
      expect(json.ok).toBe(true)
      expect(json.data.items.length).toBe(0)
    })
  })

  describe('PATCH /api/bookmarks/:id (更新)', () => {
    it('应该成功更新书签', async () => {
      const res = await fetch(`${API_BASE}/api/bookmarks/${testBookmarkId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: '更新后的书签',
          note: '更新后的备注',
          tags: ['更新', '测试'],
        }),
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { ok: boolean; data: { item: { name: string; tags: string[] } } }
      expect(json.ok).toBe(true)
      expect(json.data.item.name).toBe('更新后的书签')
      expect(json.data.item.tags).toContain('更新')
    })

    it('应该支持移动到文件夹', async () => {
      const res = await fetch(`${API_BASE}/api/bookmarks/${testBookmarkId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          parentId: testFolderId,
        }),
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { ok: boolean; data: { item: { parentId: string } } }
      expect(json.ok).toBe(true)
      expect(json.data.item.parentId).toBe(testFolderId)
    })

    it('应该拒绝不存在的书签 ID', async () => {
      const res = await fetch(`${API_BASE}/api/bookmarks/nonexistent-id`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ name: 'test' }),
      })

      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/bookmarks/:id (删除)', () => {
    it('应该成功删除书签', async () => {
      // 先创建一个临时书签
      const createRes = await fetch(`${API_BASE}/api/bookmarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: '待删除',
          url: 'https://delete.example.com',
        }),
      })
      const createJson = await createRes.json() as { data: { item: { id: string } } }
      const tempId = createJson.data.item.id

      // 删除
      const res = await fetch(`${API_BASE}/api/bookmarks/${tempId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { ok: boolean }
      expect(json.ok).toBe(true)
    })

    it('应该拒绝删除不存在的书签', async () => {
      const res = await fetch(`${API_BASE}/api/bookmarks/nonexistent-id`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      })

      expect(res.status).toBe(404)
    })
  })

  describe.skip('GET /api/bookmarks/tags (标签列表)', () => {
    it('应该返回标签统计', async () => {
      const res = await fetch(`${API_BASE}/api/bookmarks/tags`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { ok: boolean; data: { items: unknown[] } }
      expect(json.ok).toBe(true)
      expect(Array.isArray(json.data.items)).toBe(true)
    })
  })
})

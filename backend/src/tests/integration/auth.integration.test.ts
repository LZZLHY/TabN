/**
 * 认证流程集成测试
 * 
 * 覆盖：注册、登录、Token 验证
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'

const API_BASE = process.env.TEST_API_BASE || 'http://127.0.0.1:3100'
const prisma = new PrismaClient()

// 测试用户数据
const testUser = {
  username: `test_user_${Date.now()}`,
  password: 'TestPassword123!',
  email: `test_${Date.now()}@example.com`,
}

let authToken: string

describe('Auth Integration Tests', () => {
  beforeAll(async () => {
    // 确保数据库连接
    await prisma.$connect()
  })

  afterAll(async () => {
    // 清理测试用户
    try {
      await prisma.user.deleteMany({
        where: { username: { startsWith: 'test_user_' } },
      })
    } catch {
      // 忽略清理错误
    }
    await prisma.$disconnect()
  })

  describe('POST /api/auth/register', () => {
    it('应该成功注册新用户', async () => {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser),
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { ok: boolean; data: { token: string; user: { username: string; email: string } } }
      expect(json.ok).toBe(true)
      expect(json.data.token).toBeDefined()
      expect(json.data.user.username).toBe(testUser.username)
      expect(json.data.user.email).toBe(testUser.email)
      
      authToken = json.data.token
    })

    it('应该拒绝重复注册', async () => {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser),
      })

      expect(res.status).toBe(409)
      const json = await res.json() as { ok: boolean }
      expect(json.ok).toBe(false)
    })

    it('应该拒绝无效的密码', async () => {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'another_user',
          password: '123', // 太短
        }),
      })

      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/auth/login', () => {
    it('应该成功登录', async () => {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: testUser.username,
          password: testUser.password,
        }),
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { ok: boolean; data: { token: string; user: { username: string } } }
      expect(json.ok).toBe(true)
      expect(json.data.token).toBeDefined()
      expect(json.data.user.username).toBe(testUser.username)
    })

    it('应该支持使用邮箱登录', async () => {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: testUser.email,
          password: testUser.password,
        }),
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { ok: boolean }
      expect(json.ok).toBe(true)
    })

    it('应该拒绝错误的密码', async () => {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: testUser.username,
          password: 'WrongPassword',
        }),
      })

      expect(res.status).toBe(401)
      const json = await res.json() as { ok: boolean }
      expect(json.ok).toBe(false)
    })

    it('应该拒绝不存在的用户', async () => {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: 'nonexistent_user',
          password: 'SomePassword',
        }),
      })

      expect(res.status).toBe(401)
    })
  })

  describe('Token 验证', () => {
    it('应该接受有效的 Token', async () => {
      const res = await fetch(`${API_BASE}/api/bookmarks`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      })

      expect(res.status).toBe(200)
    })

    it('应该拒绝无效的 Token', async () => {
      const res = await fetch(`${API_BASE}/api/bookmarks`, {
        headers: {
          'Authorization': 'Bearer invalid_token',
        },
      })

      expect(res.status).toBe(401)
    })

    it('应该拒绝没有 Token 的请求', async () => {
      const res = await fetch(`${API_BASE}/api/bookmarks`)
      expect(res.status).toBe(401)
    })
  })
})

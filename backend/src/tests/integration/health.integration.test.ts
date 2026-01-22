/**
 * 健康检查和指标端点集成测试
 */

import { describe, it, expect } from 'vitest'

const API_BASE = process.env.TEST_API_BASE || 'http://127.0.0.1:3100'

describe('Health & Metrics Integration Tests', () => {
  describe('GET /health', () => {
    it('应该返回健康状态', async () => {
      const res = await fetch(`${API_BASE}/health`)
      
      expect(res.status).toBe(200)
      const json = await res.json() as { ok: boolean; timestamp: string; uptime: number; version: string }
      expect(json.ok).toBe(true)
      expect(json.timestamp).toBeDefined()
      expect(json.uptime).toBeGreaterThanOrEqual(0)
      expect(json.version).toBeDefined()
    })

    it('应该包含数据库连接状态', async () => {
      const res = await fetch(`${API_BASE}/health`)
      
      const json = await res.json() as { database: { connected: boolean; latency: number } }
      expect(json.database).toBeDefined()
      expect(json.database.connected).toBe(true)
      expect(json.database.latency).toBeGreaterThanOrEqual(0)
    })
  })

  describe.skip('GET /metrics', () => {
    it('应该返回系统指标', async () => {
      const res = await fetch(`${API_BASE}/metrics`)
      
      expect(res.status).toBe(200)
      const json = await res.json() as { timestamp: string; uptime: number; memory: { heapUsed: number }; cpu: unknown; system: unknown; requests: unknown; database: unknown }
      
      expect(json.timestamp).toBeDefined()
      expect(json.uptime).toBeGreaterThanOrEqual(0)
      expect(json.memory).toBeDefined()
      expect(json.memory.heapUsed).toBeGreaterThan(0)
      expect(json.cpu).toBeDefined()
      expect(json.system).toBeDefined()
      expect(json.requests).toBeDefined()
      expect(json.database).toBeDefined()
    })
  })

  describe.skip('API 文档', () => {
    it('GET /api-docs 应该返回 Swagger UI', async () => {
      const res = await fetch(`${API_BASE}/api-docs/`)
      
      expect(res.status).toBe(200)
      const html = await res.text()
      expect(html).toContain('swagger')
    })
  })
})

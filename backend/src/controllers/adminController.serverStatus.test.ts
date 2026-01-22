/**
 * Server Status API 属性测试
 * Property 7: API 响应完整性
 * 
 * **Validates: Requirements 2.8, 4.5**
 * 
 * 对于任意 server-status API 调用，响应应同时包含：
 * - uptime, uptimeMs (本次启动运行时长)
 * - totalUptime, totalUptimeMs (总运行时长)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Response } from 'express'
import type { AuthedRequest } from '../types/auth'

// Mock uptimeTracker
vi.mock('../services/uptimeTracker', () => ({
  uptimeTracker: {
    getTotalUptime: vi.fn(() => 3600000), // 1 hour
  },
}))

// Import after mocking
import { getServerStatus } from './adminController'
import { uptimeTracker } from '../services/uptimeTracker'

describe('Server Status API - Property 7: API 响应完整性', () => {
  let mockReq: Partial<AuthedRequest>
  let mockRes: Partial<Response>
  let responseData: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup global server start time
    ;(global as any).__SERVER_START_TIME__ = Date.now() - 60000 // 1 minute ago
    ;(global as any).__SERVER_STARTUP_DURATION__ = 500

    mockReq = {
      auth: {
        userId: 'test-user',
        role: 'ROOT',
      },
    }

    responseData = null
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn((data) => {
        responseData = data
        return mockRes as Response
      }),
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Test: API response should contain all required fields
   * **Validates: Requirements 2.8, 4.5**
   */
  it('should return response with all required uptime fields', async () => {
    await getServerStatus(mockReq as AuthedRequest, mockRes as Response)

    expect(responseData).toBeDefined()
    expect(responseData.ok).toBe(true)
    expect(responseData.data).toBeDefined()

    const data = responseData.data

    // Check session uptime fields exist
    expect(data).toHaveProperty('uptime')
    expect(data).toHaveProperty('uptimeMs')
    
    // Check total uptime fields exist
    expect(data).toHaveProperty('totalUptime')
    expect(data).toHaveProperty('totalUptimeMs')

    // Check other required fields
    expect(data).toHaveProperty('startTime')
    expect(data).toHaveProperty('startupDuration')
  })

  /**
   * Test: uptime and uptimeMs should be consistent
   * **Validates: Requirement 4.5**
   */
  it('should have consistent uptime values', async () => {
    await getServerStatus(mockReq as AuthedRequest, mockRes as Response)

    const data = responseData.data

    // uptimeMs should be a number
    expect(typeof data.uptimeMs).toBe('number')
    expect(data.uptimeMs).toBeGreaterThanOrEqual(0)

    // uptime should be a formatted string
    expect(typeof data.uptime).toBe('string')
    expect(data.uptime.length).toBeGreaterThan(0)
  })

  /**
   * Test: totalUptime and totalUptimeMs should be consistent
   * **Validates: Requirements 2.8, 4.5**
   */
  it('should have consistent totalUptime values', async () => {
    await getServerStatus(mockReq as AuthedRequest, mockRes as Response)

    const data = responseData.data

    // totalUptimeMs should be a number
    expect(typeof data.totalUptimeMs).toBe('number')
    expect(data.totalUptimeMs).toBeGreaterThanOrEqual(0)

    // totalUptime should be a formatted string
    expect(typeof data.totalUptime).toBe('string')
    expect(data.totalUptime.length).toBeGreaterThan(0)

    // Verify uptimeTracker was called
    expect(uptimeTracker.getTotalUptime).toHaveBeenCalled()
  })

  /**
   * Test: totalUptimeMs should be >= uptimeMs
   * **Validates: Requirement 2.8**
   */
  it('should have totalUptimeMs >= uptimeMs', async () => {
    // Set totalUptime to be greater than session uptime
    vi.mocked(uptimeTracker.getTotalUptime).mockReturnValue(7200000) // 2 hours

    await getServerStatus(mockReq as AuthedRequest, mockRes as Response)

    const data = responseData.data

    // Total uptime should always be >= session uptime
    expect(data.totalUptimeMs).toBeGreaterThanOrEqual(data.uptimeMs)
  })

  /**
   * Test: Should reject unauthorized requests
   */
  it('should reject requests without auth', async () => {
    mockReq.auth = undefined

    await getServerStatus(mockReq as AuthedRequest, mockRes as Response)

    expect(responseData.ok).toBe(false)
    expect(responseData.message).toBe('未登录')
  })

  /**
   * Test: Should reject non-admin requests
   */
  it('should reject requests from non-admin users', async () => {
    mockReq.auth = { userId: 'test-user', role: 'USER' }

    await getServerStatus(mockReq as AuthedRequest, mockRes as Response)

    expect(responseData.ok).toBe(false)
    expect(responseData.message).toBe('无权限')
  })

  /**
   * Test: Should allow ADMIN role
   */
  it('should allow ADMIN role to access', async () => {
    mockReq.auth = { userId: 'test-user', role: 'ADMIN' }

    await getServerStatus(mockReq as AuthedRequest, mockRes as Response)

    expect(responseData.ok).toBe(true)
    expect(responseData.data).toHaveProperty('totalUptime')
    expect(responseData.data).toHaveProperty('totalUptimeMs')
  })
})

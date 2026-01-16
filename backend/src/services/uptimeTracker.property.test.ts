/**
 * UptimeTracker 属性测试
 * Property 3: 运行时长累加 Round-Trip
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.6**
 * 
 * 对于任意初始运行时长 T 和运行时间 D，执行以下操作序列后：
 * 1. 初始化 UptimeTracker（加载 T）
 * 2. 运行 D 毫秒
 * 3. 保存并关闭
 * 4. 重新初始化
 * 
 * 最终的总运行时长应等于 T + D（允许小误差）。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'

// Mock prisma before importing UptimeTracker
vi.mock('../prisma', () => {
  return {
    prisma: {
      systemConfig: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
    },
  }
})

// Import after mocking
import { UptimeTracker } from './uptimeTracker'
import { prisma } from '../prisma'

describe('UptimeTracker Property Tests', () => {
  // Store for simulating database
  let mockDatabase: Map<string, string>
  
  beforeEach(() => {
    vi.clearAllMocks()
    mockDatabase = new Map()
    
    // Setup mock implementations
    vi.mocked(prisma.systemConfig.findUnique).mockImplementation(async (args) => {
      const key = args.where.key
      const value = mockDatabase.get(key)
      if (value) {
        return {
          id: 'system',
          key,
          value,
          updatedAt: new Date(),
        }
      }
      return null
    })
    
    vi.mocked(prisma.systemConfig.upsert).mockImplementation(async (args) => {
      const key = args.where.key
      const value = args.create.value as string
      mockDatabase.set(key, value)
      return {
        id: 'system',
        key,
        value,
        updatedAt: new Date(),
      }
    })
  })
  
  afterEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Property 3: 运行时长累加 Round-Trip
   * 
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.6**
   * 
   * For any initial uptime T and session duration D:
   * - Initialize UptimeTracker (loads T from database)
   * - Run for D milliseconds
   * - Save and shutdown
   * - Re-initialize
   * 
   * The final total uptime should equal T + D (with small tolerance for timing)
   */
  describe('Property 3: 运行时长累加 Round-Trip', () => {
    it('should correctly accumulate uptime across save/reload cycles', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random initial uptime T (0 to 30 days in milliseconds)
          fc.integer({ min: 0, max: 30 * 24 * 60 * 60 * 1000 }),
          // Generate random session duration D (0 to 1 hour in milliseconds)
          // Using smaller values to keep test fast
          fc.integer({ min: 0, max: 60 * 60 * 1000 }),
          async (initialUptimeT, sessionDurationD) => {
            // Reset mock database
            mockDatabase.clear()
            
            // Pre-populate database with initial uptime T
            if (initialUptimeT > 0) {
              const initialData = {
                totalMs: initialUptimeT,
                lastSaveTime: new Date().toISOString(),
              }
              mockDatabase.set('total_uptime', JSON.stringify(initialData))
            }
            
            // Step 1: Create and initialize first UptimeTracker instance
            const tracker1 = new UptimeTracker()
            
            // Mock Date.now to control time
            const startTime = Date.now()
            let currentTime = startTime
            
            const originalDateNow = Date.now
            vi.spyOn(Date, 'now').mockImplementation(() => currentTime)
            
            await tracker1.initialize()
            
            // Verify initial state: should have loaded T from database
            // At this point, session uptime is 0, so total should be T
            const initialTotal = tracker1.getTotalUptime()
            expect(initialTotal).toBe(initialUptimeT)
            
            // Step 2: Simulate running for D milliseconds
            currentTime = startTime + sessionDurationD
            
            // Verify session uptime is D
            const sessionUptime = tracker1.getSessionUptime()
            expect(sessionUptime).toBe(sessionDurationD)
            
            // Verify total uptime is T + D
            const totalBeforeSave = tracker1.getTotalUptime()
            expect(totalBeforeSave).toBe(initialUptimeT + sessionDurationD)
            
            // Step 3: Save and shutdown
            await tracker1.shutdown()
            
            // Verify data was saved to database
            const savedData = mockDatabase.get('total_uptime')
            expect(savedData).toBeDefined()
            const parsedSavedData = JSON.parse(savedData!)
            expect(parsedSavedData.totalMs).toBe(initialUptimeT + sessionDurationD)
            
            // Step 4: Create new instance and re-initialize
            const tracker2 = new UptimeTracker()
            
            // Reset time for new session
            const newStartTime = currentTime + 1000 // 1 second later
            currentTime = newStartTime
            
            await tracker2.initialize()
            
            // Verify the new instance loaded the correct total
            // At initialization, session uptime is 0
            const reloadedTotal = tracker2.getTotalUptime()
            
            // Allow small tolerance (0ms since we control time precisely)
            expect(reloadedTotal).toBe(initialUptimeT + sessionDurationD)
            
            // Cleanup
            await tracker2.shutdown()
            
            // Restore Date.now
            vi.mocked(Date.now).mockRestore()
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should handle zero initial uptime correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random session duration D
          fc.integer({ min: 100, max: 10000 }),
          async (sessionDurationD) => {
            mockDatabase.clear()
            
            const tracker = new UptimeTracker()
            
            const startTime = Date.now()
            let currentTime = startTime
            vi.spyOn(Date, 'now').mockImplementation(() => currentTime)
            
            await tracker.initialize()
            
            // Initial total should be 0
            expect(tracker.getTotalUptime()).toBe(0)
            
            // Simulate running for D milliseconds
            currentTime = startTime + sessionDurationD
            
            // Total should now be D
            expect(tracker.getTotalUptime()).toBe(sessionDurationD)
            
            await tracker.shutdown()
            
            // Verify saved value
            const savedData = JSON.parse(mockDatabase.get('total_uptime')!)
            expect(savedData.totalMs).toBe(sessionDurationD)
            
            vi.mocked(Date.now).mockRestore()
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should accumulate correctly across multiple sessions', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate array of session durations (2-5 sessions)
          fc.array(
            fc.integer({ min: 100, max: 5000 }),
            { minLength: 2, maxLength: 5 }
          ),
          async (sessionDurations) => {
            mockDatabase.clear()
            
            let expectedTotal = 0
            let currentTime = Date.now()
            
            vi.spyOn(Date, 'now').mockImplementation(() => currentTime)
            
            for (const duration of sessionDurations) {
              const tracker = new UptimeTracker()
              const sessionStart = currentTime
              
              await tracker.initialize()
              
              // Verify loaded total matches expected
              expect(tracker.getTotalUptime()).toBe(expectedTotal)
              
              // Simulate running for this session's duration
              currentTime = sessionStart + duration
              
              // Verify total is now expected + duration
              expect(tracker.getTotalUptime()).toBe(expectedTotal + duration)
              
              await tracker.shutdown()
              
              // Update expected total for next iteration
              expectedTotal += duration
              
              // Simulate some time passing between sessions (not counted)
              currentTime += 1000
            }
            
            // Final verification: database should have accumulated total
            const savedData = JSON.parse(mockDatabase.get('total_uptime')!)
            expect(savedData.totalMs).toBe(expectedTotal)
            
            vi.mocked(Date.now).mockRestore()
          }
        ),
        { numRuns: 20 }
      )
    })
  })
})

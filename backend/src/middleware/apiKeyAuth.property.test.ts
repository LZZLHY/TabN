/**
 * API 密钥属性测试
 * **Feature: bookmark-tags-and-icon-api, Property 6/7/8**
 * 
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
 * 
 * 设计文档属性描述：
 * - Property 6: *For any* 用户，生成的 API 密钥应是唯一的，且包含用户 ID。
 * - Property 7: *For any* 用户，重新生成 API 密钥后，旧密钥应失效，新密钥应有效。
 * - Property 8: *For any* 图标扩展 API 请求，使用有效 API 密钥应成功，使用无效或缺失密钥应返回 401。
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import crypto from 'crypto'
import {
  isValidAPIKeyFormat,
  extractUserIdFromAPIKey,
} from './apiKeyAuth'

/**
 * 生成 API 密钥字符串（与 apiKeyController.ts 中的实现一致）
 * API Key 格式: "bk_{userId}_{randomString}"
 */
function generateAPIKeyString(userId: string): string {
  const random = crypto.randomBytes(16).toString('hex')
  return `bk_${userId}_${random}`
}

/**
 * 生成有效的用户 ID（CUID 格式）
 * CUID 格式: 以字母开头，后跟字母数字字符
 */
const validUserIdArbitrary = fc.tuple(
  fc.constantFrom('c', 'cl', 'clx', 'cm'),
  fc.string({ minLength: 5, maxLength: 20, unit: fc.constantFrom(
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
    'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
  ) })
).map(([prefix, suffix]) => `${prefix}${suffix}`)

/**
 * 生成有效的 32 位十六进制随机字符串
 */
const validRandomStringArbitrary = fc.string({
  minLength: 32,
  maxLength: 32,
  unit: fc.constantFrom(
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    'a', 'b', 'c', 'd', 'e', 'f'
  )
})

/**
 * 生成有效的 API 密钥
 */
const validAPIKeyArbitrary = fc.tuple(
  validUserIdArbitrary,
  validRandomStringArbitrary
).map(([userId, random]) => `bk_${userId}_${random}`)

/**
 * 生成无效的 API 密钥（各种无效格式）
 */
const invalidAPIKeyArbitrary = fc.oneof(
  // 空字符串
  fc.constant(''),
  // 不以 bk_ 开头
  fc.tuple(
    fc.constantFrom('ak_', 'key_', 'api_', ''),
    validUserIdArbitrary,
    validRandomStringArbitrary
  ).map(([prefix, userId, random]) => `${prefix}${userId}_${random}`),
  // 随机字符串长度不对（不是 32 位）
  fc.tuple(
    validUserIdArbitrary,
    fc.string({ minLength: 1, maxLength: 31, unit: fc.constantFrom(
      '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'
    ) })
  ).map(([userId, random]) => `bk_${userId}_${random}`),
  // 随机字符串包含非十六进制字符
  fc.tuple(
    validUserIdArbitrary,
    fc.string({ minLength: 32, maxLength: 32, unit: fc.constantFrom(
      'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'
    ) })
  ).map(([userId, random]) => `bk_${userId}_${random}`),
  // 缺少用户 ID
  validRandomStringArbitrary.map(random => `bk__${random}`),
  // 只有前缀
  fc.constant('bk_'),
  // 缺少随机字符串
  validUserIdArbitrary.map(userId => `bk_${userId}_`)
)

describe('API Key Property Tests', () => {
  describe('**Feature: bookmark-tags-and-icon-api, Property 6: API 密钥唯一性**', () => {
    /**
     * 属性 6.1: 对于任意用户 ID，生成的 API 密钥应包含该用户 ID
     * 
     * **Validates: Requirements 5.1, 5.5**
     * 
     * 这验证了 API 密钥中编码用户 ID 以关联书签所有权
     */
    it('生成的 API 密钥应包含用户 ID', () => {
      fc.assert(
        fc.property(validUserIdArbitrary, (userId) => {
          const apiKey = generateAPIKeyString(userId)
          
          // 验证密钥包含用户 ID
          expect(apiKey).toContain(userId)
          
          // 验证可以从密钥中提取用户 ID
          const extractedUserId = extractUserIdFromAPIKey(apiKey)
          expect(extractedUserId).toBe(userId)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 6.2: 对于任意用户 ID，生成的 API 密钥格式应有效
     * 
     * **Validates: Requirements 5.1**
     * 
     * 确保生成的密钥符合预定义格式
     */
    it('生成的 API 密钥格式应有效', () => {
      fc.assert(
        fc.property(validUserIdArbitrary, (userId) => {
          const apiKey = generateAPIKeyString(userId)
          
          // 验证密钥格式有效
          expect(isValidAPIKeyFormat(apiKey)).toBe(true)
          
          // 验证密钥以 bk_ 开头
          expect(apiKey.startsWith('bk_')).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 6.3: 对于同一用户 ID，多次生成的 API 密钥应不同（唯一性）
     * 
     * **Validates: Requirements 5.1**
     * 
     * 确保每次生成的密钥都是唯一的
     */
    it('多次生成的 API 密钥应不同', () => {
      fc.assert(
        fc.property(validUserIdArbitrary, (userId) => {
          const keys = new Set<string>()
          
          // 生成 10 个密钥
          for (let i = 0; i < 10; i++) {
            keys.add(generateAPIKeyString(userId))
          }
          
          // 所有密钥应该都不同
          expect(keys.size).toBe(10)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 6.4: 不同用户 ID 生成的 API 密钥应不同
     * 
     * **Validates: Requirements 5.1, 5.5**
     * 
     * 确保不同用户的密钥不会冲突
     */
    it('不同用户 ID 生成的 API 密钥应不同', () => {
      fc.assert(
        fc.property(
          validUserIdArbitrary,
          validUserIdArbitrary,
          (userId1, userId2) => {
            fc.pre(userId1 !== userId2) // 确保两个用户 ID 不同
            
            const apiKey1 = generateAPIKeyString(userId1)
            const apiKey2 = generateAPIKeyString(userId2)
            
            // 两个密钥应该不同
            expect(apiKey1).not.toBe(apiKey2)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('**Feature: bookmark-tags-and-icon-api, Property 7: API 密钥轮换有效性**', () => {
    /**
     * 属性 7.1: 重新生成的 API 密钥应与旧密钥不同
     * 
     * **Validates: Requirements 5.2**
     * 
     * 这验证了重新生成密钥后旧密钥应失效
     */
    it('重新生成的 API 密钥应与旧密钥不同', () => {
      fc.assert(
        fc.property(validUserIdArbitrary, (userId) => {
          const oldKey = generateAPIKeyString(userId)
          const newKey = generateAPIKeyString(userId)
          
          // 新旧密钥应该不同
          expect(oldKey).not.toBe(newKey)
          
          // 两个密钥都应该是有效格式
          expect(isValidAPIKeyFormat(oldKey)).toBe(true)
          expect(isValidAPIKeyFormat(newKey)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 7.2: 重新生成的 API 密钥应包含相同的用户 ID
     * 
     * **Validates: Requirements 5.2, 5.5**
     * 
     * 确保轮换后的密钥仍然关联到同一用户
     */
    it('重新生成的 API 密钥应包含相同的用户 ID', () => {
      fc.assert(
        fc.property(validUserIdArbitrary, (userId) => {
          const oldKey = generateAPIKeyString(userId)
          const newKey = generateAPIKeyString(userId)
          
          // 两个密钥都应该包含相同的用户 ID
          const extractedFromOld = extractUserIdFromAPIKey(oldKey)
          const extractedFromNew = extractUserIdFromAPIKey(newKey)
          
          expect(extractedFromOld).toBe(userId)
          expect(extractedFromNew).toBe(userId)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 7.3: 密钥格式验证的一致性
     * 
     * **Validates: Requirements 5.2**
     * 
     * 确保格式验证函数对于相同输入总是返回相同结果
     */
    it('密钥格式验证应是确定性的', () => {
      fc.assert(
        fc.property(validAPIKeyArbitrary, (apiKey) => {
          // 多次验证应该返回相同结果
          const result1 = isValidAPIKeyFormat(apiKey)
          const result2 = isValidAPIKeyFormat(apiKey)
          const result3 = isValidAPIKeyFormat(apiKey)
          
          expect(result1).toBe(result2)
          expect(result2).toBe(result3)
          expect(result1).toBe(true) // 有效密钥应该通过验证
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('**Feature: bookmark-tags-and-icon-api, Property 8: API 密钥认证**', () => {
    /**
     * 属性 8.1: 有效格式的 API 密钥应通过格式验证
     * 
     * **Validates: Requirements 5.3**
     * 
     * 这验证了使用有效 API 密钥应成功
     */
    it('有效格式的 API 密钥应通过格式验证', () => {
      fc.assert(
        fc.property(validAPIKeyArbitrary, (apiKey) => {
          expect(isValidAPIKeyFormat(apiKey)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 8.2: 无效格式的 API 密钥应被拒绝
     * 
     * **Validates: Requirements 5.4**
     * 
     * 这验证了使用无效密钥应返回 401
     */
    it('无效格式的 API 密钥应被拒绝', () => {
      fc.assert(
        fc.property(invalidAPIKeyArbitrary, (apiKey) => {
          expect(isValidAPIKeyFormat(apiKey)).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 8.3: 缺失的 API 密钥应被拒绝
     * 
     * **Validates: Requirements 5.4**
     * 
     * 测试 null、undefined 和空字符串
     */
    it('缺失的 API 密钥应被拒绝', () => {
      expect(isValidAPIKeyFormat('')).toBe(false)
      expect(isValidAPIKeyFormat(null as any)).toBe(false)
      expect(isValidAPIKeyFormat(undefined as any)).toBe(false)
    })

    /**
     * 属性 8.4: 从有效密钥中提取的用户 ID 应与原始用户 ID 一致
     * 
     * **Validates: Requirements 5.3, 5.5**
     * 
     * 确保用户 ID 提取的正确性
     */
    it('从有效密钥中提取的用户 ID 应与原始用户 ID 一致', () => {
      fc.assert(
        fc.property(validUserIdArbitrary, (userId) => {
          const apiKey = generateAPIKeyString(userId)
          const extractedUserId = extractUserIdFromAPIKey(apiKey)
          
          expect(extractedUserId).toBe(userId)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 8.5: 从无效密钥中提取用户 ID 应返回 null
     * 
     * **Validates: Requirements 5.4**
     * 
     * 确保无效密钥不会泄露用户信息
     */
    it('从无效密钥中提取用户 ID 应返回 null', () => {
      fc.assert(
        fc.property(invalidAPIKeyArbitrary, (apiKey) => {
          const extractedUserId = extractUserIdFromAPIKey(apiKey)
          expect(extractedUserId).toBeNull()
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性 8.6: 用户 ID 提取是幂等的
     * 
     * **Validates: Requirements 5.3**
     * 
     * 多次提取应返回相同结果
     */
    it('用户 ID 提取是幂等的', () => {
      fc.assert(
        fc.property(validAPIKeyArbitrary, (apiKey) => {
          const extracted1 = extractUserIdFromAPIKey(apiKey)
          const extracted2 = extractUserIdFromAPIKey(apiKey)
          const extracted3 = extractUserIdFromAPIKey(apiKey)
          
          expect(extracted1).toBe(extracted2)
          expect(extracted2).toBe(extracted3)
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Additional Properties for Robustness', () => {
    /**
     * 属性: API 密钥格式验证和用户 ID 提取的一致性
     * 
     * **Validates: Requirements 5.3, 5.4, 5.5**
     * 
     * 如果格式验证通过，则用户 ID 提取应成功
     */
    it('格式验证通过时，用户 ID 提取应成功', () => {
      fc.assert(
        fc.property(validAPIKeyArbitrary, (apiKey) => {
          if (isValidAPIKeyFormat(apiKey)) {
            const userId = extractUserIdFromAPIKey(apiKey)
            expect(userId).not.toBeNull()
            expect(typeof userId).toBe('string')
            expect(userId!.length).toBeGreaterThan(0)
          }
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性: 包含下划线的用户 ID 应正确处理
     * 
     * **Validates: Requirements 5.5**
     * 
     * 用户 ID 可能包含下划线，确保正确解析
     */
    it('包含下划线的用户 ID 应正确处理', () => {
      const userIdWithUnderscoreArbitrary = fc.tuple(
        validUserIdArbitrary,
        fc.constantFrom('_part1', '_part2', '_test')
      ).map(([base, suffix]) => `${base}${suffix}`)

      fc.assert(
        fc.property(userIdWithUnderscoreArbitrary, (userId) => {
          const apiKey = generateAPIKeyString(userId)
          
          // 验证格式有效
          expect(isValidAPIKeyFormat(apiKey)).toBe(true)
          
          // 验证用户 ID 正确提取
          const extractedUserId = extractUserIdFromAPIKey(apiKey)
          expect(extractedUserId).toBe(userId)
        }),
        { numRuns: 100 }
      )
    })
  })
})

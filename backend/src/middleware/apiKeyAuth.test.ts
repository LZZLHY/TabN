import { describe, it, expect } from 'vitest'
import { isValidAPIKeyFormat, extractUserIdFromAPIKey } from './apiKeyAuth'

describe('apiKeyAuth', () => {
  describe('isValidAPIKeyFormat', () => {
    it('应该接受有效的 API 密钥格式', () => {
      // 标准格式: bk_{userId}_{32位十六进制}
      // crypto.randomBytes(16).toString('hex') 生成 32 个十六进制字符
      expect(isValidAPIKeyFormat('bk_clx123abc_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4')).toBe(true)
      expect(isValidAPIKeyFormat('bk_user123_0123456789abcdef0123456789abcdef')).toBe(true)
    })

    it('应该接受包含下划线的用户 ID', () => {
      // userId 可能包含下划线
      expect(isValidAPIKeyFormat('bk_user_with_underscore_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4')).toBe(true)
    })

    it('应该拒绝缺少前缀的密钥', () => {
      expect(isValidAPIKeyFormat('clx123abc_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4')).toBe(false)
      expect(isValidAPIKeyFormat('pk_clx123abc_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4')).toBe(false)
    })

    it('应该拒绝随机字符串长度不正确的密钥', () => {
      // 随机字符串太短 (28 字符)
      expect(isValidAPIKeyFormat('bk_clx123abc_a1b2c3d4e5f6a1b2c3d4e5f6a1b2')).toBe(false)
      // 随机字符串太长 (36 字符)
      expect(isValidAPIKeyFormat('bk_clx123abc_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4extra')).toBe(false)
    })

    it('应该拒绝随机字符串包含非十六进制字符的密钥', () => {
      expect(isValidAPIKeyFormat('bk_clx123abc_g1b2c3d4e5f6a1b2c3d4e5f6a1b2')).toBe(false)
      expect(isValidAPIKeyFormat('bk_clx123abc_a1b2c3d4e5f6a1b2c3d4e5f6a1b!')).toBe(false)
    })

    it('应该拒绝空或无效输入', () => {
      expect(isValidAPIKeyFormat('')).toBe(false)
      expect(isValidAPIKeyFormat(null as any)).toBe(false)
      expect(isValidAPIKeyFormat(undefined as any)).toBe(false)
      expect(isValidAPIKeyFormat(123 as any)).toBe(false)
    })

    it('应该拒绝缺少用户 ID 的密钥', () => {
      expect(isValidAPIKeyFormat('bk__a1b2c3d4e5f6a1b2c3d4e5f6a1b2')).toBe(false)
    })

    it('应该拒绝格式不完整的密钥', () => {
      expect(isValidAPIKeyFormat('bk_')).toBe(false)
      expect(isValidAPIKeyFormat('bk_userId')).toBe(false)
    })
  })

  describe('extractUserIdFromAPIKey', () => {
    it('应该从有效密钥中提取用户 ID', () => {
      expect(extractUserIdFromAPIKey('bk_clx123abc_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4')).toBe('clx123abc')
      expect(extractUserIdFromAPIKey('bk_user123_0123456789abcdef0123456789abcdef')).toBe('user123')
    })

    it('应该正确处理包含下划线的用户 ID', () => {
      expect(extractUserIdFromAPIKey('bk_user_with_underscore_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4')).toBe('user_with_underscore')
    })

    it('应该对无效密钥返回 null', () => {
      expect(extractUserIdFromAPIKey('')).toBe(null)
      expect(extractUserIdFromAPIKey('invalid')).toBe(null)
      expect(extractUserIdFromAPIKey('bk_userId')).toBe(null)
    })
  })
})

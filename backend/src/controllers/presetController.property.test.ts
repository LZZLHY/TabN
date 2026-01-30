/**
 * 预设控制器属性测试
 * **Feature: icon-preset-library**
 * **Property 1: Preset Creation Round Trip**
 * **Property 2: Maximum Preset Limit**
 * **Property 5: Preset Deletion**
 * **Property 7: Authorization**
 * 
 * **Validates: Requirements 1.1, 1.2, 1.4, 1.5, 5.2, 7.4, 7.5**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  validatePresetName,
  validateIconType,
  validateIconBg,
  sanitizePresetName,
  MAX_PRESETS_PER_USER,
  PRESET_NAME_MAX_LENGTH,
} from '../utils/preset'

/**
 * 预设数据结构
 */
interface IconPreset {
  id: string
  userId: string
  bookmarkId: string
  name: string
  iconType: 'URL' | 'BASE64' | 'TEXT' | null
  iconData: string | null
  iconUrl: string | null
  iconBg: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * 模拟预设存储
 */
class MockPresetStore {
  private presets: Map<string, IconPreset> = new Map()
  private idCounter = 0
  private timeCounter = 0

  getByUserAndBookmark(userId: string, bookmarkId: string): IconPreset[] {
    return Array.from(this.presets.values())
      .filter(p => p.userId === userId && p.bookmarkId === bookmarkId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  countByUserAndBookmark(userId: string, bookmarkId: string): number {
    return this.getByUserAndBookmark(userId, bookmarkId).length
  }

  create(data: Omit<IconPreset, 'id' | 'createdAt' | 'updatedAt'>): IconPreset {
    const id = `preset-${++this.idCounter}`
    const now = new Date(Date.now() + (++this.timeCounter))
    const preset: IconPreset = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    }
    this.presets.set(id, preset)
    return preset
  }

  getById(id: string): IconPreset | undefined {
    return this.presets.get(id)
  }

  delete(id: string): boolean {
    return this.presets.delete(id)
  }

  clear(): void {
    this.presets.clear()
    this.idCounter = 0
    this.timeCounter = 0
  }
}

/**
 * 模拟创建预设的控制器逻辑
 */
function createPreset(
  store: MockPresetStore,
  userId: string,
  bookmarkId: string,
  data: { name: string; iconType?: string | null; iconData?: string | null; iconUrl?: string | null; iconBg?: string | null }
): { success: true; preset: IconPreset } | { success: false; error: string; code: string } {
  const nameError = validatePresetName(data.name)
  if (nameError) {
    return { success: false, error: nameError, code: 'INVALID_PRESET_NAME' }
  }

  const iconTypeError = validateIconType(data.iconType)
  if (iconTypeError) {
    return { success: false, error: iconTypeError, code: 'INVALID_ICON_TYPE' }
  }

  const iconBgError = validateIconBg(data.iconBg)
  if (iconBgError) {
    return { success: false, error: iconBgError, code: 'INVALID_ICON_BG' }
  }

  const count = store.countByUserAndBookmark(userId, bookmarkId)
  if (count >= MAX_PRESETS_PER_USER) {
    return { success: false, error: `已达到预设数量上限（${MAX_PRESETS_PER_USER}个）`, code: 'PRESET_LIMIT_EXCEEDED' }
  }

  const preset = store.create({
    userId,
    bookmarkId,
    name: sanitizePresetName(data.name),
    iconType: (data.iconType as IconPreset['iconType']) || null,
    iconData: data.iconData || null,
    iconUrl: data.iconUrl || null,
    iconBg: data.iconBg || null,
  })

  return { success: true, preset }
}

/**
 * 模拟删除预设的控制器逻辑
 */
function deletePreset(
  store: MockPresetStore,
  userId: string,
  presetId: string
): { success: true; id: string } | { success: false; error: string; code: string } {
  const preset = store.getById(presetId)
  
  if (!preset) {
    return { success: false, error: '预设不存在', code: 'PRESET_NOT_FOUND' }
  }

  if (preset.userId !== userId) {
    return { success: false, error: '无权删除此预设', code: 'FORBIDDEN' }
  }

  store.delete(presetId)
  return { success: true, id: presetId }
}

const validPresetNameArbitrary = fc.string({ minLength: 1, maxLength: PRESET_NAME_MAX_LENGTH })
  .filter(s => s.trim().length > 0 && s.trim().length <= PRESET_NAME_MAX_LENGTH)

const validIconTypeArbitrary = fc.constantFrom('URL', 'BASE64', 'TEXT', null)

const validIconBgArbitrary = fc.oneof(
  fc.constant(null),
  fc.constant('transparent'),
  fc.constant('default'),
  fc.constant('default:primary'),
  fc.array(fc.constantFrom('0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f'), { minLength: 6, maxLength: 6 })
    .map(arr => '#' + arr.join(''))
)

const validPresetConfigArbitrary = fc.record({
  name: validPresetNameArbitrary,
  iconType: validIconTypeArbitrary,
  iconData: fc.option(fc.string(), { nil: null }),
  iconUrl: fc.option(fc.webUrl(), { nil: null }),
  iconBg: validIconBgArbitrary,
})

const userIdArbitrary = fc.uuid()
const bookmarkIdArbitrary = fc.uuid()

describe('Preset Controller Property Tests', () => {
  describe('Property 1: Preset Creation Round Trip', () => {
    it('创建预设后应能检索到相同的数据', () => {
      fc.assert(
        fc.property(
          userIdArbitrary,
          bookmarkIdArbitrary,
          validPresetConfigArbitrary,
          (userId, bookmarkId, config) => {
            const store = new MockPresetStore()
            
            const result = createPreset(store, userId, bookmarkId, config)
            
            expect(result.success).toBe(true)
            if (!result.success) return
            
            const preset = result.preset
            
            expect(preset.id).toBeTruthy()
            expect(preset.id.length).toBeGreaterThan(0)
            expect(preset.userId).toBe(userId)
            expect(preset.bookmarkId).toBe(bookmarkId)
            expect(preset.name).toBe(sanitizePresetName(config.name))
            expect(preset.iconType).toBe(config.iconType || null)
            expect(preset.iconBg).toBe(config.iconBg || null)
            
            const retrieved = store.getByUserAndBookmark(userId, bookmarkId)
            expect(retrieved.length).toBe(1)
            expect(retrieved[0].id).toBe(preset.id)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('每个创建的预设应有唯一 ID', () => {
      fc.assert(
        fc.property(
          userIdArbitrary,
          bookmarkIdArbitrary,
          fc.array(validPresetConfigArbitrary, { minLength: 2, maxLength: MAX_PRESETS_PER_USER }),
          (userId, bookmarkId, configs) => {
            const store = new MockPresetStore()
            const ids = new Set<string>()
            
            for (const config of configs) {
              const result = createPreset(store, userId, bookmarkId, config)
              if (result.success) {
                expect(ids.has(result.preset.id)).toBe(false)
                ids.add(result.preset.id)
              }
            }
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  describe('Property 2: Maximum Preset Limit', () => {
    it('达到上限后应拒绝创建新预设', () => {
      fc.assert(
        fc.property(
          userIdArbitrary,
          bookmarkIdArbitrary,
          fc.array(validPresetConfigArbitrary, { minLength: MAX_PRESETS_PER_USER, maxLength: MAX_PRESETS_PER_USER }),
          validPresetConfigArbitrary,
          (userId, bookmarkId, initialConfigs, extraConfig) => {
            const store = new MockPresetStore()
            
            for (const config of initialConfigs) {
              const result = createPreset(store, userId, bookmarkId, config)
              expect(result.success).toBe(true)
            }
            
            expect(store.countByUserAndBookmark(userId, bookmarkId)).toBe(MAX_PRESETS_PER_USER)
            
            const result = createPreset(store, userId, bookmarkId, extraConfig)
            
            expect(result.success).toBe(false)
            if (!result.success) {
              expect(result.code).toBe('PRESET_LIMIT_EXCEEDED')
            }
            
            expect(store.countByUserAndBookmark(userId, bookmarkId)).toBe(MAX_PRESETS_PER_USER)
          }
        ),
        { numRuns: 20 }
      )
    })

    it('不同书签的预设数量应独立计算', () => {
      fc.assert(
        fc.property(
          userIdArbitrary,
          bookmarkIdArbitrary,
          bookmarkIdArbitrary,
          fc.array(validPresetConfigArbitrary, { minLength: MAX_PRESETS_PER_USER, maxLength: MAX_PRESETS_PER_USER }),
          validPresetConfigArbitrary,
          (userId, bookmarkId1, bookmarkId2, configs, extraConfig) => {
            fc.pre(bookmarkId1 !== bookmarkId2)
            
            const store = new MockPresetStore()
            
            for (const config of configs) {
              createPreset(store, userId, bookmarkId1, config)
            }
            
            const result = createPreset(store, userId, bookmarkId2, extraConfig)
            expect(result.success).toBe(true)
            
            expect(store.countByUserAndBookmark(userId, bookmarkId1)).toBe(MAX_PRESETS_PER_USER)
            expect(store.countByUserAndBookmark(userId, bookmarkId2)).toBe(1)
          }
        ),
        { numRuns: 20 }
      )
    })
  })

  describe('Property 5: Preset Deletion', () => {
    it('删除预设后应无法检索', () => {
      fc.assert(
        fc.property(
          userIdArbitrary,
          bookmarkIdArbitrary,
          validPresetConfigArbitrary,
          (userId, bookmarkId, config) => {
            const store = new MockPresetStore()
            
            const createResult = createPreset(store, userId, bookmarkId, config)
            expect(createResult.success).toBe(true)
            if (!createResult.success) return
            
            const presetId = createResult.preset.id
            
            expect(store.getById(presetId)).toBeDefined()
            expect(store.countByUserAndBookmark(userId, bookmarkId)).toBe(1)
            
            const deleteResult = deletePreset(store, userId, presetId)
            expect(deleteResult.success).toBe(true)
            
            expect(store.getById(presetId)).toBeUndefined()
            expect(store.countByUserAndBookmark(userId, bookmarkId)).toBe(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('删除不存在的预设应返回错误', () => {
      fc.assert(
        fc.property(
          userIdArbitrary,
          fc.uuid(),
          (userId, fakePresetId) => {
            const store = new MockPresetStore()
            
            const result = deletePreset(store, userId, fakePresetId)
            
            expect(result.success).toBe(false)
            if (!result.success) {
              expect(result.code).toBe('PRESET_NOT_FOUND')
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 7: Authorization', () => {
    it('用户不能删除其他用户的预设', () => {
      fc.assert(
        fc.property(
          userIdArbitrary,
          userIdArbitrary,
          bookmarkIdArbitrary,
          validPresetConfigArbitrary,
          (userId1, userId2, bookmarkId, config) => {
            fc.pre(userId1 !== userId2)
            
            const store = new MockPresetStore()
            
            const createResult = createPreset(store, userId1, bookmarkId, config)
            expect(createResult.success).toBe(true)
            if (!createResult.success) return
            
            const presetId = createResult.preset.id
            
            const deleteResult = deletePreset(store, userId2, presetId)
            
            expect(deleteResult.success).toBe(false)
            if (!deleteResult.success) {
              expect(deleteResult.code).toBe('FORBIDDEN')
            }
            
            expect(store.getById(presetId)).toBeDefined()
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 6: Preset Ordering', () => {
    it('预设列表应按创建时间倒序排列', () => {
      fc.assert(
        fc.property(
          userIdArbitrary,
          bookmarkIdArbitrary,
          fc.array(validPresetConfigArbitrary, { minLength: 2, maxLength: MAX_PRESETS_PER_USER }),
          (userId, bookmarkId, configs) => {
            const store = new MockPresetStore()
            const creationOrder: string[] = []
            
            for (const config of configs) {
              const result = createPreset(store, userId, bookmarkId, config)
              if (result.success) {
                creationOrder.push(result.preset.id)
              }
            }
            
            const presets = store.getByUserAndBookmark(userId, bookmarkId)
            
            const retrievedOrder = presets.map(p => p.id)
            expect(retrievedOrder).toEqual([...creationOrder].reverse())
          }
        ),
        { numRuns: 50 }
      )
    })
  })
})

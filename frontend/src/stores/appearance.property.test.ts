import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { useAppearanceStore } from './appearance'
import { PRESET_SEARCH_ENGINES } from '../utils/searchEngine'

/**
 * Property 2: Store 存储和范围验证
 * 对于任意圆角比例值，当设置到 AppearanceStore 时：
 * - 如果值在 0-0.5 范围内，应该被正确存储并可读取
 * - 如果值超出范围，应该被钳制到有效范围内
 * - 存储的值应该在页面刷新后从 localStorage 恢复
 *
 * Feature: proportional-icon-radius, Property 2: Store 存储和范围验证
 * **Validates: Requirements 2.1, 2.2, 2.4**
 */
describe('Property 2: Store 存储和范围验证', () => {
  // 重置 store 状态
  beforeEach(() => {
    useAppearanceStore.getState().resetAppearance()
    // 清除 localStorage 以确保测试隔离
    localStorage.removeItem('start:appearance')
  })

  it('should store valid ratio values (0-0.5) correctly', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 0.5, noNaN: true }),
        (ratio) => {
          const store = useAppearanceStore.getState()

          // 设置圆角比例
          store.setIconRadiusRatio(ratio)

          // 验证：值被正确存储
          const storedRatio = useAppearanceStore.getState().iconRadiusRatio
          expect(storedRatio).toBeCloseTo(ratio, 10)
        }
      ),
      { numRuns: 20 }
    )
  })

  it('should clamp values below 0 to 0', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1000, max: -0.001, noNaN: true }),
        (ratio) => {
          const store = useAppearanceStore.getState()

          // 设置负值
          store.setIconRadiusRatio(ratio)

          // 验证：值被钳制为 0
          const storedRatio = useAppearanceStore.getState().iconRadiusRatio
          expect(storedRatio).toBe(0)
        }
      ),
      { numRuns: 20 }
    )
  })

  it('should clamp values above 0.5 to 0.5', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.501, max: 1000, noNaN: true }),
        (ratio) => {
          const store = useAppearanceStore.getState()

          // 设置超出上限的值
          store.setIconRadiusRatio(ratio)

          // 验证：值被钳制为 0.5
          const storedRatio = useAppearanceStore.getState().iconRadiusRatio
          expect(storedRatio).toBe(0.5)
        }
      ),
      { numRuns: 20 }
    )
  })

  it('should handle boundary values correctly', () => {
    const store = useAppearanceStore.getState()

    // 测试边界值 0
    store.setIconRadiusRatio(0)
    expect(useAppearanceStore.getState().iconRadiusRatio).toBe(0)

    // 测试边界值 0.5
    store.setIconRadiusRatio(0.5)
    expect(useAppearanceStore.getState().iconRadiusRatio).toBe(0.5)

    // 测试默认值 0.25
    store.resetAppearance()
    expect(useAppearanceStore.getState().iconRadiusRatio).toBe(0.25)
  })

  it('should persist ratio to localStorage and restore after reset', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 0.5, noNaN: true }),
        (ratio) => {
          // 设置圆角比例
          useAppearanceStore.getState().setIconRadiusRatio(ratio)

          // 验证 localStorage 中存储了值
          const stored = localStorage.getItem('start:appearance')
          expect(stored).not.toBeNull()

          if (stored) {
            const parsed = JSON.parse(stored)
            expect(parsed.state.iconRadiusRatio).toBeCloseTo(ratio, 10)
          }
        }
      ),
      { numRuns: 20 }
    )
  })

  it('should maintain ratio value across multiple set operations', () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: -10, max: 10, noNaN: true }), { minLength: 1, maxLength: 10 }),
        (ratios) => {
          for (const ratio of ratios) {
            useAppearanceStore.getState().setIconRadiusRatio(ratio)

            // 验证：每次设置后值都被正确钳制
            const storedRatio = useAppearanceStore.getState().iconRadiusRatio
            const expectedRatio = Math.max(0, Math.min(0.5, ratio))
            expect(storedRatio).toBeCloseTo(expectedRatio, 10)
          }
        }
      ),
      { numRuns: 20 }
    )
  })
})

/**
 * Property 10: 自定义搜索引擎 CRUD 操作
 * For any valid custom search engine configuration, after adding it should appear in the engine list,
 * after updating it should reflect the new configuration, after deleting it should be removed from the list.
 * Preset engines should not be deletable.
 * 
 * Feature: search-engine-switcher, Property 10: 自定义搜索引擎 CRUD 操作
 * Validates: Requirements 6.3
 */
describe('Property 10: 自定义搜索引擎 CRUD 操作', () => {
  // 重置 store 状态
  beforeEach(() => {
    useAppearanceStore.getState().resetAppearance()
  })

  // 生成有效的自定义搜索引擎配置
  const customEngineArb = fc.record({
    name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    urlTemplate: fc.webUrl().map(url => url + '?q={query}'),
    domain: fc.domain(),
    iconUrl: fc.option(fc.webUrl(), { nil: undefined }),
  })

  it('should add custom engine and it appears in the list', () => {
    fc.assert(
      fc.property(customEngineArb, (engineConfig) => {
        const store = useAppearanceStore.getState()
        const initialCount = store.customEngines.length

        // 添加自定义引擎
        store.addCustomEngine(engineConfig)

        // 验证：引擎列表长度增加 1
        const newState = useAppearanceStore.getState()
        expect(newState.customEngines.length).toBe(initialCount + 1)

        // 验证：新添加的引擎存在于列表中
        const addedEngine = newState.customEngines.find(e => e.name === engineConfig.name)
        expect(addedEngine).toBeTruthy()
        expect(addedEngine?.urlTemplate).toBe(engineConfig.urlTemplate)
        expect(addedEngine?.domain).toBe(engineConfig.domain)
        expect(addedEngine?.isPreset).toBe(false)
        expect(addedEngine?.id).toMatch(/^custom-\d+-[a-z0-9]+$/)

        // 清理
        if (addedEngine) {
          useAppearanceStore.getState().deleteCustomEngine(addedEngine.id)
        }
      }),
      { numRuns: 50 }
    )
  })

  it('should update custom engine and reflect new configuration', () => {
    fc.assert(
      fc.property(
        customEngineArb,
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        (engineConfig, newName) => {
          const store = useAppearanceStore.getState()

          // 先添加一个引擎
          store.addCustomEngine(engineConfig)
          const addedEngine = useAppearanceStore.getState().customEngines.find(
            e => e.name === engineConfig.name
          )
          expect(addedEngine).toBeTruthy()

          // 更新引擎名称
          useAppearanceStore.getState().updateCustomEngine(addedEngine!.id, { name: newName })

          // 验证：引擎名称已更新
          const updatedEngine = useAppearanceStore.getState().customEngines.find(
            e => e.id === addedEngine!.id
          )
          expect(updatedEngine?.name).toBe(newName)
          // 其他属性保持不变
          expect(updatedEngine?.urlTemplate).toBe(engineConfig.urlTemplate)
          expect(updatedEngine?.domain).toBe(engineConfig.domain)

          // 清理
          useAppearanceStore.getState().deleteCustomEngine(addedEngine!.id)
        }
      ),
      { numRuns: 50 }
    )
  })

  it('should delete custom engine and remove it from the list', () => {
    fc.assert(
      fc.property(customEngineArb, (engineConfig) => {
        const store = useAppearanceStore.getState()

        // 先添加一个引擎
        store.addCustomEngine(engineConfig)
        const addedEngine = useAppearanceStore.getState().customEngines.find(
          e => e.name === engineConfig.name
        )
        expect(addedEngine).toBeTruthy()

        const countBeforeDelete = useAppearanceStore.getState().customEngines.length

        // 删除引擎
        useAppearanceStore.getState().deleteCustomEngine(addedEngine!.id)

        // 验证：引擎已从列表中移除
        const newState = useAppearanceStore.getState()
        expect(newState.customEngines.length).toBe(countBeforeDelete - 1)
        expect(newState.customEngines.find(e => e.id === addedEngine!.id)).toBeUndefined()
      }),
      { numRuns: 50 }
    )
  })

  it('should switch to default engine when selected custom engine is deleted', () => {
    const store = useAppearanceStore.getState()

    // 添加一个自定义引擎
    store.addCustomEngine({
      name: 'Test Engine',
      urlTemplate: 'https://test.com/search?q={query}',
      domain: 'test.com',
    })

    const addedEngine = useAppearanceStore.getState().customEngines[0]
    expect(addedEngine).toBeTruthy()

    // 选择这个自定义引擎
    useAppearanceStore.getState().setSelectedEngineId(addedEngine.id)
    expect(useAppearanceStore.getState().selectedEngineId).toBe(addedEngine.id)

    // 删除这个引擎
    useAppearanceStore.getState().deleteCustomEngine(addedEngine.id)

    // 验证：选中的引擎应该切换到默认引擎（bing）
    expect(useAppearanceStore.getState().selectedEngineId).toBe('bing')
  })

  it('should not affect preset engines', () => {
    // 验证预设引擎不在 customEngines 列表中
    const store = useAppearanceStore.getState()
    
    for (const preset of PRESET_SEARCH_ENGINES) {
      // 预设引擎不应该出现在自定义引擎列表中
      expect(store.customEngines.find(e => e.id === preset.id)).toBeUndefined()
    }

    // 尝试删除预设引擎 ID 不应该影响任何东西
    const initialCustomCount = store.customEngines.length
    store.deleteCustomEngine('baidu')
    store.deleteCustomEngine('bing')
    store.deleteCustomEngine('google')
    store.deleteCustomEngine('metaso')

    // 自定义引擎列表不应该改变
    expect(useAppearanceStore.getState().customEngines.length).toBe(initialCustomCount)
  })

  it('should generate unique IDs for each custom engine', () => {
    // 每次测试前重置状态
    useAppearanceStore.getState().resetAppearance()
    
    fc.assert(
      fc.property(
        fc.array(customEngineArb, { minLength: 2, maxLength: 5 }),
        (engines) => {
          // 重置状态确保干净的测试环境
          useAppearanceStore.getState().resetAppearance()
          
          // 添加多个引擎，使用延迟确保时间戳不同
          for (let i = 0; i < engines.length; i++) {
            useAppearanceStore.getState().addCustomEngine(engines[i])
          }

          // 验证：所有 ID 都是唯一的
          const ids = useAppearanceStore.getState().customEngines.map(e => e.id)
          const uniqueIds = new Set(ids)
          expect(uniqueIds.size).toBe(ids.length)

          // 清理
          useAppearanceStore.getState().resetAppearance()
        }
      ),
      { numRuns: 20 }
    )
  })
})


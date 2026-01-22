import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useShortcutSetStore, getMaxShortcuts } from './shortcutSet'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('shortcutSetStore', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    // Reset store state
    useShortcutSetStore.setState({ userId: null, shortcutIds: [] })
  })

  describe('init', () => {
    it('should initialize with empty array for null userId', () => {
      const store = useShortcutSetStore.getState()
      store.init(null)
      expect(store.shortcutIds).toEqual([])
      expect(store.userId).toBeNull()
    })

    it('should load data from localStorage for valid userId', () => {
      const userId = 'user-123'
      localStorageMock.setItem(`start:shortcutSet:${userId}`, JSON.stringify(['a', 'b', 'c']))
      
      const store = useShortcutSetStore.getState()
      store.init(userId)
      
      const state = useShortcutSetStore.getState()
      expect(state.userId).toBe(userId)
      expect(state.shortcutIds).toEqual(['a', 'b', 'c'])
    })
  })

  describe('addShortcut', () => {
    it('should add a new shortcut', () => {
      const userId = 'user-123'
      useShortcutSetStore.getState().init(userId)
      useShortcutSetStore.getState().addShortcut('item-1')
      
      expect(useShortcutSetStore.getState().shortcutIds).toContain('item-1')
    })

    it('should not add duplicate shortcuts', () => {
      const userId = 'user-123'
      useShortcutSetStore.getState().init(userId)
      useShortcutSetStore.getState().addShortcut('item-1')
      useShortcutSetStore.getState().addShortcut('item-1')
      
      const ids = useShortcutSetStore.getState().shortcutIds
      expect(ids.filter(id => id === 'item-1').length).toBe(1)
    })

    it('should not add when userId is null', () => {
      useShortcutSetStore.getState().init(null)
      useShortcutSetStore.getState().addShortcut('item-1')
      
      expect(useShortcutSetStore.getState().shortcutIds).toEqual([])
    })
  })

  describe('removeShortcut', () => {
    it('should remove an existing shortcut', () => {
      const userId = 'user-123'
      localStorageMock.setItem(`start:shortcutSet:${userId}`, JSON.stringify(['a', 'b', 'c']))
      useShortcutSetStore.getState().init(userId)
      useShortcutSetStore.getState().removeShortcut('b')
      
      expect(useShortcutSetStore.getState().shortcutIds).toEqual(['a', 'c'])
    })

    it('should handle removing non-existent shortcut', () => {
      const userId = 'user-123'
      localStorageMock.setItem(`start:shortcutSet:${userId}`, JSON.stringify(['a', 'b']))
      useShortcutSetStore.getState().init(userId)
      useShortcutSetStore.getState().removeShortcut('x')
      
      expect(useShortcutSetStore.getState().shortcutIds).toEqual(['a', 'b'])
    })
  })

  describe('isShortcut', () => {
    it('should return true for existing shortcut', () => {
      const userId = 'user-123'
      localStorageMock.setItem(`start:shortcutSet:${userId}`, JSON.stringify(['a', 'b']))
      useShortcutSetStore.getState().init(userId)
      
      expect(useShortcutSetStore.getState().isShortcut('a')).toBe(true)
    })

    it('should return false for non-existing shortcut', () => {
      const userId = 'user-123'
      localStorageMock.setItem(`start:shortcutSet:${userId}`, JSON.stringify(['a', 'b']))
      useShortcutSetStore.getState().init(userId)
      
      expect(useShortcutSetStore.getState().isShortcut('x')).toBe(false)
    })
  })

  describe('isFull', () => {
    it('should return false when not full', () => {
      const userId = 'user-123'
      useShortcutSetStore.getState().init(userId)
      
      expect(useShortcutSetStore.getState().isFull()).toBe(false)
    })

    it('should return true when at max capacity', () => {
      const userId = 'user-123'
      const maxItems = getMaxShortcuts()
      const ids = Array.from({ length: maxItems }, (_, i) => `item-${i}`)
      localStorageMock.setItem(`start:shortcutSet:${userId}`, JSON.stringify(ids))
      useShortcutSetStore.getState().init(userId)
      
      expect(useShortcutSetStore.getState().isFull()).toBe(true)
    })
  })

  describe('count', () => {
    it('should return correct count', () => {
      const userId = 'user-123'
      localStorageMock.setItem(`start:shortcutSet:${userId}`, JSON.stringify(['a', 'b', 'c']))
      useShortcutSetStore.getState().init(userId)
      
      expect(useShortcutSetStore.getState().count()).toBe(3)
    })
  })

  describe('cleanupInvalidIds', () => {
    it('should remove invalid ids', () => {
      const userId = 'user-123'
      localStorageMock.setItem(`start:shortcutSet:${userId}`, JSON.stringify(['a', 'b', 'c', 'd']))
      useShortcutSetStore.getState().init(userId)
      useShortcutSetStore.getState().cleanupInvalidIds(['a', 'c', 'e'])
      
      expect(useShortcutSetStore.getState().shortcutIds).toEqual(['a', 'c'])
    })
  })

  describe('getMaxShortcuts', () => {
    it('should return a positive number', () => {
      expect(getMaxShortcuts()).toBeGreaterThan(0)
    })

    it('should be 3 rows minus 1 for the more button', () => {
      // At lg breakpoint (1024+), itemsPerRow = 8
      // maxShortcuts = 3 * 8 - 1 = 23
      // But window.innerWidth might vary in test environment
      const max = getMaxShortcuts()
      expect(max).toBeGreaterThanOrEqual(11) // 3 * 4 - 1 (smallest)
      expect(max).toBeLessThanOrEqual(23) // 3 * 8 - 1 (largest)
    })
  })

  describe('cross-component sync', () => {
    it('should share state across multiple getState calls', () => {
      const userId = 'user-123'
      useShortcutSetStore.getState().init(userId)
      useShortcutSetStore.getState().addShortcut('item-1')
      
      // Simulate another component reading the state
      const state = useShortcutSetStore.getState()
      expect(state.shortcutIds).toContain('item-1')
      expect(state.isShortcut('item-1')).toBe(true)
    })
  })
})

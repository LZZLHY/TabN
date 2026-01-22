import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fc from 'fast-check'
import { createSettingsFile, applySettingsFile } from './settingsFile'
import { useAppearanceStore } from '../stores/appearance'
import { useBookmarkDndStore } from '../stores/bookmarkDnd'
import type { SortMode } from '../types/bookmark'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('settingsFile', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    // Reset stores to defaults
    useAppearanceStore.getState().resetAppearance()
    useBookmarkDndStore.getState().resetBookmarkDnd()
  })

  /**
   * Property 7: Settings Export Completeness
   * The exported settings file SHALL contain all bookmark sorting related fields.
   * 
   * Feature: bookmark-sorting, Property 7: Settings Export Completeness
   * Validates: Requirements 7.1, 7.2
   */
  describe('Property 7: Settings Export Completeness', () => {
    it('should export bookmarkDrawerSortMode', () => {
      const sortModes: SortMode[] = ['custom', 'folders-first', 'links-first', 'alphabetical']
      
      for (const mode of sortModes) {
        useAppearanceStore.getState().setBookmarkDrawerSortMode(mode)
        const exported = createSettingsFile()
        expect(exported.appearance.bookmarkDrawerSortMode).toBe(mode)
      }
    })

    it('should export bookmarkSortLocked', () => {
      // Test false
      useAppearanceStore.getState().setBookmarkSortLocked(false)
      let exported = createSettingsFile()
      expect(exported.appearance.bookmarkSortLocked).toBe(false)

      // Test true
      useAppearanceStore.getState().setBookmarkSortLocked(true)
      exported = createSettingsFile()
      expect(exported.appearance.bookmarkSortLocked).toBe(true)
    })

    it('should include all required appearance fields', () => {
      const exported = createSettingsFile()
      
      // Check bookmark sorting fields exist
      expect('bookmarkDrawerSortMode' in exported.appearance).toBe(true)
      expect('bookmarkSortLocked' in exported.appearance).toBe(true)
      
      // Check other required fields
      expect('mode' in exported.appearance).toBe(true)
      expect('accent' in exported.appearance).toBe(true)
      expect('searchEngine' in exported.appearance).toBe(true)
    })
  })

  /**
   * Property 8: Settings Import Applies Present Fields
   * When importing settings, all present and valid fields SHALL be applied.
   * 
   * Feature: bookmark-sorting, Property 8: Settings Import Applies Present Fields
   * Validates: Requirements 7.3, 7.4
   */
  describe('Property 8: Settings Import Applies Present Fields', () => {
    it('should apply valid bookmarkDrawerSortMode', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('custom', 'folders-first', 'links-first', 'alphabetical'),
          (sortMode) => {
            // Reset to default
            useAppearanceStore.getState().resetAppearance()
            
            const settings = {
              version: 1,
              exportedAt: new Date().toISOString(),
              appearance: {
                bookmarkDrawerSortMode: sortMode as SortMode,
              },
            }

            const result = applySettingsFile(settings)
            expect(result.ok).toBe(true)
            expect(useAppearanceStore.getState().bookmarkDrawerSortMode).toBe(sortMode)
          }
        ),
        { numRuns: 10 }
      )
    })

    it('should apply valid bookmarkSortLocked', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (locked) => {
            // Reset to default
            useAppearanceStore.getState().resetAppearance()
            
            const settings = {
              version: 1,
              exportedAt: new Date().toISOString(),
              appearance: {
                bookmarkSortLocked: locked,
              },
            }

            const result = applySettingsFile(settings)
            expect(result.ok).toBe(true)
            expect(useAppearanceStore.getState().bookmarkSortLocked).toBe(locked)
          }
        ),
        { numRuns: 10 }
      )
    })

    it('should reject invalid bookmarkDrawerSortMode values', () => {
      const invalidValues = ['invalid', 'CUSTOM', 'folder-first', 123, null, undefined]
      
      for (const value of invalidValues) {
        useAppearanceStore.getState().resetAppearance()
        const originalMode = useAppearanceStore.getState().bookmarkDrawerSortMode
        
        const settings = {
          version: 1,
          exportedAt: new Date().toISOString(),
          appearance: {
            bookmarkDrawerSortMode: value,
            mode: 'light', // Need at least one valid field
          },
        }

        applySettingsFile(settings)
        // Invalid value should be skipped, original value preserved
        expect(useAppearanceStore.getState().bookmarkDrawerSortMode).toBe(originalMode)
      }
    })
  })

  /**
   * Property 9: Settings Import Preserves Missing Fields
   * When importing settings, missing fields SHALL preserve their current values.
   * 
   * Feature: bookmark-sorting, Property 9: Settings Import Preserves Missing Fields
   * Validates: Requirements 7.5, 7.6
   */
  describe('Property 9: Settings Import Preserves Missing Fields', () => {
    it('should preserve bookmarkDrawerSortMode when not in import', () => {
      // Set a non-default value
      useAppearanceStore.getState().setBookmarkDrawerSortMode('alphabetical')
      const originalMode = useAppearanceStore.getState().bookmarkDrawerSortMode
      
      // Import settings without bookmarkDrawerSortMode
      const settings = {
        version: 1,
        exportedAt: new Date().toISOString(),
        appearance: {
          mode: 'dark',
        },
      }

      const result = applySettingsFile(settings)
      expect(result.ok).toBe(true)
      expect(useAppearanceStore.getState().bookmarkDrawerSortMode).toBe(originalMode)
    })

    it('should preserve bookmarkSortLocked when not in import', () => {
      // Set a non-default value
      useAppearanceStore.getState().setBookmarkSortLocked(true)
      const originalLocked = useAppearanceStore.getState().bookmarkSortLocked
      
      // Import settings without bookmarkSortLocked
      const settings = {
        version: 1,
        exportedAt: new Date().toISOString(),
        appearance: {
          mode: 'dark',
        },
      }

      const result = applySettingsFile(settings)
      expect(result.ok).toBe(true)
      expect(useAppearanceStore.getState().bookmarkSortLocked).toBe(originalLocked)
    })

    it('should preserve all bookmark sorting fields when importing unrelated settings', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('custom', 'folders-first', 'links-first', 'alphabetical'),
          fc.boolean(),
          (sortMode, locked) => {
            // Set specific values
            useAppearanceStore.getState().setBookmarkDrawerSortMode(sortMode as SortMode)
            useAppearanceStore.getState().setBookmarkSortLocked(locked)
            
            // Import settings without bookmark sorting fields
            const settings = {
              version: 1,
              exportedAt: new Date().toISOString(),
              appearance: {
                mode: 'light',
                accent: '#ff0000',
              },
            }

            applySettingsFile(settings)
            
            // Verify bookmark sorting fields are preserved
            expect(useAppearanceStore.getState().bookmarkDrawerSortMode).toBe(sortMode)
            expect(useAppearanceStore.getState().bookmarkSortLocked).toBe(locked)
          }
        ),
        { numRuns: 20 }
      )
    })
  })

  describe('Round-trip export/import', () => {
    it('should preserve bookmark sorting settings through export/import cycle', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('custom', 'folders-first', 'links-first', 'alphabetical'),
          fc.boolean(),
          (sortMode, locked) => {
            // Set values
            useAppearanceStore.getState().setBookmarkDrawerSortMode(sortMode as SortMode)
            useAppearanceStore.getState().setBookmarkSortLocked(locked)
            
            // Export
            const exported = createSettingsFile()
            
            // Reset to defaults
            useAppearanceStore.getState().resetAppearance()
            
            // Import
            const result = applySettingsFile(exported)
            expect(result.ok).toBe(true)
            
            // Verify values are restored
            expect(useAppearanceStore.getState().bookmarkDrawerSortMode).toBe(sortMode)
            expect(useAppearanceStore.getState().bookmarkSortLocked).toBe(locked)
          }
        ),
        { numRuns: 20 }
      )
    })
  })
})

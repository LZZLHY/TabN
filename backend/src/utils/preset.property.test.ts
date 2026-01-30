/**
 * 预设验证属性测试
 * **Feature: icon-preset-library, Property 3: Name Validation**
 * **Feature: icon-preset-library, Property 8: Data Validation**
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  validatePresetName,
  validateIconType,
  validateIconBg,
  sanitizePresetName,
  PRESET_NAME_MAX_LENGTH,
} from './preset'

describe('Preset Validation Property Tests', () => {
  /**
   * **Feature: icon-preset-library, Property 3: Name Validation**
   * For any string that is empty, whitespace-only, or longer than 50 characters,
   * attempting to create a preset with that name should be rejected.
   */
  describe('Property 3: Name Validation', () => {
    it('should reject empty strings', () => {
      fc.assert(
        fc.property(fc.constant(''), (name) => {
          const error = validatePresetName(name)
          expect(error).not.toBeNull()
        }),
        { numRuns: 10 }
      )
    })

    it('should reject whitespace-only strings', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 20 })
            .map(arr => arr.join('')),
          (name) => {
            const error = validatePresetName(name)
            expect(error).not.toBeNull()
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should reject strings with trimmed length longer than 50 characters', () => {
      fc.assert(
        fc.property(
          // 生成 trim 后长度超过 50 的字符串
          fc.string({ minLength: PRESET_NAME_MAX_LENGTH + 1, maxLength: 200 })
            .filter(s => s.trim().length > PRESET_NAME_MAX_LENGTH),
          (name) => {
            const error = validatePresetName(name)
            expect(error).not.toBeNull()
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should accept valid names (1-50 non-whitespace characters)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: PRESET_NAME_MAX_LENGTH })
            .filter(s => s.trim().length > 0 && s.trim().length <= PRESET_NAME_MAX_LENGTH),
          (name) => {
            const error = validatePresetName(name)
            expect(error).toBeNull()
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should reject non-string values', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.integer(), fc.boolean(), fc.object(), fc.array(fc.anything())),
          (value) => {
            const error = validatePresetName(value)
            expect(error).not.toBeNull()
          }
        ),
        { numRuns: 20 }
      )
    })
  })

  /**
   * **Feature: icon-preset-library, Property 8: Data Validation**
   * For any preset creation request with invalid iconType or invalid iconBg format,
   * the request should be rejected with a descriptive error message.
   */
  describe('Property 8: Data Validation', () => {
    describe('iconType validation', () => {
      it('should accept valid iconType values', () => {
        fc.assert(
          fc.property(
            fc.constantFrom('URL', 'BASE64', 'TEXT', null, undefined),
            (iconType) => {
              const error = validateIconType(iconType)
              expect(error).toBeNull()
            }
          ),
          { numRuns: 50 }
        )
      })

      it('should reject invalid iconType strings', () => {
        fc.assert(
          fc.property(
            fc.string().filter(s => !['URL', 'BASE64', 'TEXT'].includes(s)),
            (iconType) => {
              const error = validateIconType(iconType)
              expect(error).not.toBeNull()
            }
          ),
          { numRuns: 20 }
        )
      })

      it('should reject non-string non-null iconType values', () => {
        fc.assert(
          fc.property(
            fc.oneof(fc.integer(), fc.boolean(), fc.object(), fc.array(fc.anything())),
            (iconType) => {
              const error = validateIconType(iconType)
              expect(error).not.toBeNull()
            }
          ),
          { numRuns: 20 }
        )
      })
    })

    describe('iconBg validation', () => {
      it('should accept null and undefined', () => {
        expect(validateIconBg(null)).toBeNull()
        expect(validateIconBg(undefined)).toBeNull()
      })

      it('should accept transparent', () => {
        expect(validateIconBg('transparent')).toBeNull()
      })

      it('should accept default and default variants', () => {
        fc.assert(
          fc.property(
            fc.constantFrom(
              'default',
              'default:primary',
              'default:blur:70',
              'default:primary:blur:50',
              'default:blur:100'
            ),
            (iconBg) => {
              const error = validateIconBg(iconBg)
              expect(error).toBeNull()
            }
          ),
          { numRuns: 50 }
        )
      })

      it('should accept valid hex colors', () => {
        fc.assert(
          fc.property(
            fc.array(fc.constantFrom('0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f','A','B','C','D','E','F'), { minLength: 6, maxLength: 6 })
              .map(arr => '#' + arr.join('')),
            (iconBg) => {
              const error = validateIconBg(iconBg)
              expect(error).toBeNull()
            }
          ),
          { numRuns: 20 }
        )
      })

      it('should reject invalid hex colors', () => {
        fc.assert(
          fc.property(
            fc.oneof(
              fc.array(fc.constantFrom('0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f'), { minLength: 1, maxLength: 5 })
                .map(arr => '#' + arr.join('')),
              fc.array(fc.constantFrom('0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f'), { minLength: 7, maxLength: 10 })
                .map(arr => '#' + arr.join('')),
              fc.string().filter(s => !s.startsWith('#') && s !== 'transparent' && !s.startsWith('default') && s.length > 0)
            ),
            (iconBg) => {
              const error = validateIconBg(iconBg)
              expect(error).not.toBeNull()
            }
          ),
          { numRuns: 20 }
        )
      })

      it('should reject non-string non-null iconBg values', () => {
        fc.assert(
          fc.property(
            fc.oneof(fc.integer(), fc.boolean(), fc.object(), fc.array(fc.anything())),
            (iconBg) => {
              const error = validateIconBg(iconBg)
              expect(error).not.toBeNull()
            }
          ),
          { numRuns: 20 }
        )
      })
    })
  })

  describe('sanitizePresetName', () => {
    it('should escape HTML special characters', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (name) => {
            const sanitized = sanitizePresetName(name)
            expect(sanitized).not.toContain('<')
            expect(sanitized).not.toContain('>')
            expect(sanitized).not.toContain('"')
            expect(sanitized).not.toContain("'")
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should trim whitespace', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (name) => {
            const sanitized = sanitizePresetName(name)
            expect(sanitized).toBe(sanitized.trim())
          }
        ),
        { numRuns: 20 }
      )
    })
  })
})


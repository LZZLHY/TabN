/**
 * DragOverlay 属性测试
 * 
 * **Feature: unified-icon-system**
 * 
 * 本测试文件验证 DragOverlay 组件的核心属性：
 * - Property 6: 拖拽覆盖层正确传递自定义样式属性
 * 
 * **Validates: Requirements 8.7**
 */

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import * as fc from 'fast-check'
import { DragOverlay } from './DragOverlay'
import type { Bookmark } from './types'
import { createRef, type RefObject } from 'react'

/**
 * 生成有效的数字 borderRadius（像素值）
 */
const numericBorderRadiusArbitrary: fc.Arbitrary<number> = fc.integer({
  min: 0,
  max: 100,
})

/**
 * 生成有效的字符串 borderRadius（百分比或像素）
 */
const stringBorderRadiusArbitrary: fc.Arbitrary<string> = fc.oneof(
  // 百分比格式
  fc.integer({ min: 0, max: 100 }).map((n) => `${n}%`),
  // 像素格式
  fc.integer({ min: 0, max: 100 }).map((n) => `${n}px`),
  // 特殊值
  fc.constantFrom('50%', '0', '8px', '16px')
)

/**
 * 生成有效的 borderRadius（数字或字符串）
 */
const borderRadiusArbitrary: fc.Arbitrary<number | string> = fc.oneof(
  numericBorderRadiusArbitrary,
  stringBorderRadiusArbitrary
)

/**
 * 生成有效的 size（正整数像素值）
 */
const sizeArbitrary: fc.Arbitrary<number> = fc.integer({ min: 24, max: 256 })

/**
 * 生成有效的书签名称
 */
const nameArbitrary: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 20 })

/**
 * 生成有效的 URL
 */
const urlArbitrary: fc.Arbitrary<string> = fc.webUrl()

/**
 * 生成有效的 hex 颜色
 */
const hexColorArbitrary: fc.Arbitrary<string> = fc
  .tuple(
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 })
  )
  .map(([r, g, b]) => {
    const toHex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase()
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  })

/**
 * 生成有效的文字内容（1-4 个字符）
 */
const textArbitrary: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 4 })

/**
 * 生成 TEXT 类型图标的 iconData JSON
 */
const textIconDataArbitrary: fc.Arbitrary<string> = fc
  .record({
    t: textArbitrary,
    c: fc.oneof(hexColorArbitrary, fc.constant('')),
    f: fc.constantFrom('system', 'serif', 'mono', 'rounded', 'handwriting'),
  })
  .map((config) => JSON.stringify(config))

/**
 * 生成 IconType
 */
const iconTypeArbitrary: fc.Arbitrary<'TEXT' | 'URL' | 'BASE64' | null> = fc.constantFrom(
  'TEXT',
  'URL',
  'BASE64',
  null
)

/**
 * 生成普通书签
 */
const bookmarkArbitrary: fc.Arbitrary<Bookmark> = fc
  .record({
    id: fc.uuid(),
    name: nameArbitrary,
    url: urlArbitrary,
    iconType: iconTypeArbitrary,
    iconData: fc.option(textIconDataArbitrary, { nil: undefined }),
    iconBg: fc.option(fc.oneof(hexColorArbitrary, fc.constant('transparent'), fc.constant('default')), { nil: undefined }),
    parentId: fc.option(fc.uuid(), { nil: null }),
  })
  .map((data) => ({
    id: data.id,
    name: data.name,
    url: data.url,
    note: null,
    type: 'LINK' as const,
    parentId: data.parentId,
    iconType: data.iconType,
    iconData: data.iconType === 'TEXT' ? (data.iconData ?? JSON.stringify({ t: 'A', c: '', f: 'system' })) : data.iconData,
    iconUrl: undefined,
    iconBg: data.iconBg,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }))

/**
 * 创建测试用的 refs 和样式
 */
function createTestRefs() {
  return {
    overlayRef: createRef<HTMLDivElement>() as RefObject<HTMLDivElement>,
    overlayBoxRef: createRef<HTMLDivElement>() as RefObject<HTMLDivElement>,
    overlayStyle: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      zIndex: 9999,
    },
  }
}

describe('**Feature: unified-icon-system, Property 6: 拖拽覆盖层正确传递自定义样式属性**', () => {
  // 每个测试后清理 DOM
  afterEach(() => {
    cleanup()
    // 清理 portal 渲染的内容
    document.body.innerHTML = ''
  })

  /**
   * 属性 6.1: 数字 borderRadius 正确应用到拖拽覆盖层容器
   * 
   * **Validates: Requirements 8.7**
   * 
   * 对于任意数字 borderRadius 值，当传入 DragOverlay 组件时，
   * 拖拽覆盖层容器应应用该圆角值
   */
  it('数字 borderRadius 正确应用到拖拽覆盖层容器', () => {
    fc.assert(
      fc.property(
        numericBorderRadiusArbitrary,
        bookmarkArbitrary,
        (borderRadius, bookmark) => {
          const refs = createTestRefs()
          const allItems = [bookmark]

          render(
            <DragOverlay
              activeId={bookmark.id}
              allItems={allItems}
              overlayRef={refs.overlayRef}
              overlayBoxRef={refs.overlayBoxRef}
              overlayStyle={refs.overlayStyle}
              borderRadius={borderRadius}
            />
          )

          // DragOverlay 使用 portal 渲染到 document.body
          const dragOverlay = document.querySelector('[data-testid="drag-overlay"]')
          expect(dragOverlay).not.toBeNull()

          // 验证容器的 borderRadius 样式
          const style = dragOverlay?.getAttribute('style') || ''
          expect(style).toContain(`border-radius: ${borderRadius}px`)

          // 清理
          cleanup()
          document.body.innerHTML = ''
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 6.2: 字符串 borderRadius 正确应用到拖拽覆盖层容器
   * 
   * **Validates: Requirements 8.7**
   * 
   * 对于任意字符串 borderRadius 值（如 '50%'），当传入 DragOverlay 组件时，
   * 拖拽覆盖层容器应直接应用该圆角值
   */
  it('字符串 borderRadius 正确应用到拖拽覆盖层容器', () => {
    fc.assert(
      fc.property(
        stringBorderRadiusArbitrary,
        bookmarkArbitrary,
        (borderRadius, bookmark) => {
          const refs = createTestRefs()
          const allItems = [bookmark]

          render(
            <DragOverlay
              activeId={bookmark.id}
              allItems={allItems}
              overlayRef={refs.overlayRef}
              overlayBoxRef={refs.overlayBoxRef}
              overlayStyle={refs.overlayStyle}
              borderRadius={borderRadius}
            />
          )

          const dragOverlay = document.querySelector('[data-testid="drag-overlay"]')
          expect(dragOverlay).not.toBeNull()

          // 验证容器的 borderRadius 样式
          const style = dragOverlay?.getAttribute('style') || ''
          expect(style).toContain(`border-radius: ${borderRadius}`)

          cleanup()
          document.body.innerHTML = ''
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 6.3: 自定义 size 正确应用到拖拽覆盖层容器宽度
   * 
   * **Validates: Requirements 8.7**
   * 
   * 对于任意 size 值，当传入 DragOverlay 组件时，
   * 拖拽覆盖层容器的宽度应使用该值
   */
  it('自定义 size 正确应用到拖拽覆盖层容器宽度', () => {
    fc.assert(
      fc.property(
        sizeArbitrary,
        bookmarkArbitrary,
        (size, bookmark) => {
          const refs = createTestRefs()
          const allItems = [bookmark]

          render(
            <DragOverlay
              activeId={bookmark.id}
              allItems={allItems}
              overlayRef={refs.overlayRef}
              overlayBoxRef={refs.overlayBoxRef}
              overlayStyle={refs.overlayStyle}
              size={size}
            />
          )

          const dragOverlay = document.querySelector('[data-testid="drag-overlay"]')
          expect(dragOverlay).not.toBeNull()

          // 验证容器的 width 样式
          const style = dragOverlay?.getAttribute('style') || ''
          expect(style).toContain(`width: ${size}px`)

          cleanup()
          document.body.innerHTML = ''
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 6.4: 自定义 size 正确应用到拖拽覆盖层容器高度
   * 
   * **Validates: Requirements 8.7**
   * 
   * 对于任意 size 值，当传入 DragOverlay 组件时，
   * 拖拽覆盖层容器的高度应使用该值
   */
  it('自定义 size 正确应用到拖拽覆盖层容器高度', () => {
    fc.assert(
      fc.property(
        sizeArbitrary,
        bookmarkArbitrary,
        (size, bookmark) => {
          const refs = createTestRefs()
          const allItems = [bookmark]

          render(
            <DragOverlay
              activeId={bookmark.id}
              allItems={allItems}
              overlayRef={refs.overlayRef}
              overlayBoxRef={refs.overlayBoxRef}
              overlayStyle={refs.overlayStyle}
              size={size}
            />
          )

          const dragOverlay = document.querySelector('[data-testid="drag-overlay"]')
          expect(dragOverlay).not.toBeNull()

          // 验证容器的 height 样式
          const style = dragOverlay?.getAttribute('style') || ''
          expect(style).toContain(`height: ${size}px`)

          cleanup()
          document.body.innerHTML = ''
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 6.5: 拖拽覆盖层容器保持正方形
   * 
   * **Validates: Requirements 8.7**
   * 
   * 拖拽覆盖层容器应始终保持正方形（宽度等于高度）
   */
  it('拖拽覆盖层容器保持正方形', () => {
    fc.assert(
      fc.property(
        sizeArbitrary,
        bookmarkArbitrary,
        (size, bookmark) => {
          const refs = createTestRefs()
          const allItems = [bookmark]

          render(
            <DragOverlay
              activeId={bookmark.id}
              allItems={allItems}
              overlayRef={refs.overlayRef}
              overlayBoxRef={refs.overlayBoxRef}
              overlayStyle={refs.overlayStyle}
              size={size}
            />
          )

          const dragOverlay = document.querySelector('[data-testid="drag-overlay"]')
          expect(dragOverlay).not.toBeNull()

          const style = dragOverlay?.getAttribute('style') || ''
          // 验证宽度和高度都使用相同的 size 值
          expect(style).toContain(`width: ${size}px`)
          expect(style).toContain(`height: ${size}px`)

          cleanup()
          document.body.innerHTML = ''
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 6.6: 同时传入 size 和 borderRadius 时都正确应用
   * 
   * **Validates: Requirements 8.7**
   * 
   * 当同时传入 size 和 borderRadius 时，两个属性都应正确应用
   */
  it('同时传入 size 和 borderRadius 时都正确应用', () => {
    fc.assert(
      fc.property(
        sizeArbitrary,
        borderRadiusArbitrary,
        bookmarkArbitrary,
        (size, borderRadius, bookmark) => {
          const expectedRadius =
            typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius

          const refs = createTestRefs()
          const allItems = [bookmark]

          render(
            <DragOverlay
              activeId={bookmark.id}
              allItems={allItems}
              overlayRef={refs.overlayRef}
              overlayBoxRef={refs.overlayBoxRef}
              overlayStyle={refs.overlayStyle}
              size={size}
              borderRadius={borderRadius}
            />
          )

          const dragOverlay = document.querySelector('[data-testid="drag-overlay"]')
          expect(dragOverlay).not.toBeNull()

          const style = dragOverlay?.getAttribute('style') || ''
          expect(style).toContain(`width: ${size}px`)
          expect(style).toContain(`height: ${size}px`)
          expect(style).toContain(`border-radius: ${expectedRadius}`)

          cleanup()
          document.body.innerHTML = ''
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 6.7: 内部 UnifiedIcon 组件正确渲染（非文件夹）
   * 
   * **Validates: Requirements 8.7**
   * 
   * 对于非文件夹书签，拖拽覆盖层内部应包含 UnifiedIcon 组件
   */
  it('内部 UnifiedIcon 组件正确渲染（非文件夹）', () => {
    fc.assert(
      fc.property(
        sizeArbitrary,
        bookmarkArbitrary,
        (size, bookmark) => {
          const refs = createTestRefs()
          const allItems = [bookmark]

          render(
            <DragOverlay
              activeId={bookmark.id}
              allItems={allItems}
              overlayRef={refs.overlayRef}
              overlayBoxRef={refs.overlayBoxRef}
              overlayStyle={refs.overlayStyle}
              size={size}
            />
          )

          const dragOverlay = document.querySelector('[data-testid="drag-overlay"]')
          expect(dragOverlay).not.toBeNull()
          expect(dragOverlay?.getAttribute('data-is-folder')).toBe('false')

          // 验证内部包含 UnifiedIcon 组件
          const unifiedIcon = document.querySelector('[data-testid="unified-icon"]')
          expect(unifiedIcon).not.toBeNull()

          cleanup()
          document.body.innerHTML = ''
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 6.8: TEXT 类型图标在拖拽覆盖层中正确显示
   * 
   * **Validates: Requirements 8.7**
   * 
   * 当拖拽 TEXT 类型图标的书签时，应正确显示文字图标
   */
  it('TEXT 类型图标在拖拽覆盖层中正确显示', () => {
    // 生成 TEXT 类型书签
    const textBookmarkArbitrary: fc.Arbitrary<Bookmark> = fc
      .record({
        id: fc.uuid(),
        name: nameArbitrary,
        url: urlArbitrary,
        iconData: textIconDataArbitrary,
        iconBg: fc.option(hexColorArbitrary, { nil: undefined }),
        parentId: fc.option(fc.uuid(), { nil: null }),
      })
      .map((data) => ({
        id: data.id,
        name: data.name,
        url: data.url,
        note: null,
        type: 'LINK' as const,
        parentId: data.parentId,
        iconType: 'TEXT' as const,
        iconData: data.iconData,
        iconUrl: undefined,
        iconBg: data.iconBg,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))

    fc.assert(
      fc.property(
        sizeArbitrary,
        textBookmarkArbitrary,
        (size, bookmark) => {
          const refs = createTestRefs()
          const allItems = [bookmark]

          render(
            <DragOverlay
              activeId={bookmark.id}
              allItems={allItems}
              overlayRef={refs.overlayRef}
              overlayBoxRef={refs.overlayBoxRef}
              overlayStyle={refs.overlayStyle}
              size={size}
            />
          )

          // 验证 TEXT 类型图标正确渲染
          const textIcon = document.querySelector('[data-icon-type="TEXT"]')
          expect(textIcon).not.toBeNull()

          cleanup()
          document.body.innerHTML = ''
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 6.9: 文件夹拖拽覆盖层正确应用自定义样式
   * 
   * **Validates: Requirements 8.7**
   * 
   * 当拖拽文件夹时，自定义样式属性应正确应用到文件夹预览
   */
  it('文件夹拖拽覆盖层正确应用自定义样式', () => {
    // 生成文件夹和子书签
    const folderWithChildrenArbitrary = fc
      .record({
        folderId: fc.uuid(),
        folderName: nameArbitrary,
        childBookmark: bookmarkArbitrary,
      })
      .map(({ folderId, folderName, childBookmark }) => {
        const folder: Bookmark = {
          id: folderId,
          name: folderName,
          type: 'FOLDER',
          parentId: null,
          url: null,
          note: null,
          iconType: undefined,
          iconData: undefined,
          iconUrl: undefined,
          iconBg: undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        const child: Bookmark = {
          ...childBookmark,
          parentId: folderId,
        }

        return {
          folder,
          allItems: [folder, child],
        }
      })

    fc.assert(
      fc.property(
        sizeArbitrary,
        borderRadiusArbitrary,
        folderWithChildrenArbitrary,
        (size, borderRadius, { folder, allItems }) => {
          const expectedRadius =
            typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius

          const refs = createTestRefs()

          render(
            <DragOverlay
              activeId={folder.id}
              allItems={allItems}
              overlayRef={refs.overlayRef}
              overlayBoxRef={refs.overlayBoxRef}
              overlayStyle={refs.overlayStyle}
              size={size}
              borderRadius={borderRadius}
            />
          )

          const dragOverlay = document.querySelector('[data-testid="drag-overlay"]')
          expect(dragOverlay).not.toBeNull()
          expect(dragOverlay?.getAttribute('data-is-folder')).toBe('true')

          // 验证容器样式
          const style = dragOverlay?.getAttribute('style') || ''
          expect(style).toContain(`width: ${size}px`)
          expect(style).toContain(`height: ${size}px`)
          expect(style).toContain(`border-radius: ${expectedRadius}`)

          cleanup()
          document.body.innerHTML = ''
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 6.10: 未传入自定义样式时使用默认值
   * 
   * **Validates: Requirements 8.7**
   * 
   * 当未传入 size 和 borderRadius 时，应使用默认值
   */
  it('未传入自定义样式时使用默认值', () => {
    fc.assert(
      fc.property(
        bookmarkArbitrary,
        (bookmark) => {
          const refs = createTestRefs()
          const allItems = [bookmark]

          render(
            <DragOverlay
              activeId={bookmark.id}
              allItems={allItems}
              overlayRef={refs.overlayRef}
              overlayBoxRef={refs.overlayBoxRef}
              overlayStyle={refs.overlayStyle}
            />
          )

          const dragOverlay = document.querySelector('[data-testid="drag-overlay"]')
          expect(dragOverlay).not.toBeNull()

          // 验证使用默认尺寸 48px
          const style = dragOverlay?.getAttribute('style') || ''
          expect(style).toContain('width: 48px')
          expect(style).toContain('height: 48px')
          // 验证使用默认圆角
          expect(style).toContain('border-radius: var(--start-radius)')

          cleanup()
          document.body.innerHTML = ''
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 6.11: activeId 为 null 时不渲染任何内容
   * 
   * **Validates: Requirements 8.7**
   * 
   * 当 activeId 为 null 时，DragOverlay 不应渲染任何内容
   */
  it('activeId 为 null 时不渲染任何内容', () => {
    fc.assert(
      fc.property(
        bookmarkArbitrary,
        (bookmark) => {
          const refs = createTestRefs()
          const allItems = [bookmark]

          render(
            <DragOverlay
              activeId={null}
              allItems={allItems}
              overlayRef={refs.overlayRef}
              overlayBoxRef={refs.overlayBoxRef}
              overlayStyle={refs.overlayStyle}
            />
          )

          // 不应渲染任何拖拽覆盖层
          const dragOverlay = document.querySelector('[data-testid="drag-overlay"]')
          expect(dragOverlay).toBeNull()

          cleanup()
          document.body.innerHTML = ''
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 属性 6.12: 找不到对应书签时不渲染任何内容
   * 
   * **Validates: Requirements 8.7**
   * 
   * 当 activeId 对应的书签不存在时，DragOverlay 不应渲染任何内容
   */
  it('找不到对应书签时不渲染任何内容', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        bookmarkArbitrary,
        (nonExistentId, bookmark) => {
          // 确保 ID 不同
          fc.pre(nonExistentId !== bookmark.id)

          const refs = createTestRefs()
          const allItems = [bookmark]

          render(
            <DragOverlay
              activeId={nonExistentId}
              allItems={allItems}
              overlayRef={refs.overlayRef}
              overlayBoxRef={refs.overlayBoxRef}
              overlayStyle={refs.overlayStyle}
            />
          )

          // 不应渲染任何拖拽覆盖层
          const dragOverlay = document.querySelector('[data-testid="drag-overlay"]')
          expect(dragOverlay).toBeNull()

          cleanup()
          document.body.innerHTML = ''
        }
      ),
      { numRuns: 20 }
    )
  })
})


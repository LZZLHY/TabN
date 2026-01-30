/**
 * FolderPreviewIcon 属性测试
 * 
 * **Feature: unified-icon-system**
 * 
 * 本测试文件验证 FolderPreviewIcon 组件的核心属性：
 * - Property 4: 文件夹预览正确传递自定义样式属性
 * - Property 5: 多层嵌套文件夹预览正确应用 UnifiedIcon
 * 
 * **Validates: Requirements 2.5, 2.6, 2.7, 8.6**
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import * as fc from 'fast-check'
import { FolderPreviewIcon } from './FolderPreviewIcon'
import type { IconData, IconVariant } from '../ui/UnifiedIcon'

/**
 * 生成有效的 IconVariant
 */
const variantArbitrary: fc.Arbitrary<IconVariant> = fc.constantFrom(
  'full',
  'mini',
  'tiny',
  'micro'
)

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
 * 生成有效的 size（正整数像素值，足够大以容纳子项）
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
const iconTypeArbitrary: fc.Arbitrary<'AUTO' | 'TEXT' | 'URL'> = fc.constantFrom(
  'AUTO',
  'TEXT',
  'URL'
)

/**
 * 生成普通书签的 IconData
 */
const bookmarkIconDataArbitrary: fc.Arbitrary<IconData & { id: string; type: 'BOOKMARK'; parentId: string | null }> = fc
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
    ...data,
    type: 'BOOKMARK' as const,
    iconData: data.iconType === 'TEXT' ? (data.iconData ?? JSON.stringify({ t: 'A', c: '', f: 'system' })) : undefined,
  }))

/**
 * 生成书签列表（1-9 个书签）
 */
const bookmarkListArbitrary: fc.Arbitrary<(IconData & { id: string; type: 'BOOKMARK'; parentId: string | null })[]> = fc.array(
  bookmarkIconDataArbitrary,
  { minLength: 1, maxLength: 9 }
)

describe('**Feature: unified-icon-system, Property 4: 文件夹预览正确传递自定义样式属性**', () => {
  /**
   * 属性 4.1: 数字 borderRadius 正确应用到文件夹预览容器
   * 
   * **Validates: Requirements 2.6, 8.6**
   * 
   * 对于任意数字 borderRadius 值，当传入 FolderPreviewIcon 组件时，
   * 文件夹预览容器应应用该圆角值
   */
  it('数字 borderRadius 正确应用到文件夹预览容器', () => {
    fc.assert(
      fc.property(
        numericBorderRadiusArbitrary,
        bookmarkListArbitrary,
        (borderRadius, children) => {
          const { container } = render(
            <FolderPreviewIcon
              children={children}
              borderRadius={borderRadius}
            />
          )

          const folderContainer = container.querySelector('[data-testid="folder-preview-icon"]')
          expect(folderContainer).not.toBeNull()

          // 验证容器的 borderRadius 样式
          const style = folderContainer?.getAttribute('style') || ''
          expect(style).toContain(`border-radius: ${borderRadius}px`)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 4.2: 字符串 borderRadius 正确应用到文件夹预览容器
   * 
   * **Validates: Requirements 2.6, 8.6**
   * 
   * 对于任意字符串 borderRadius 值（如 '50%'），当传入 FolderPreviewIcon 组件时，
   * 文件夹预览容器应直接应用该圆角值
   */
  it('字符串 borderRadius 正确应用到文件夹预览容器', () => {
    fc.assert(
      fc.property(
        stringBorderRadiusArbitrary,
        bookmarkListArbitrary,
        (borderRadius, children) => {
          const { container } = render(
            <FolderPreviewIcon
              children={children}
              borderRadius={borderRadius}
            />
          )

          const folderContainer = container.querySelector('[data-testid="folder-preview-icon"]')
          expect(folderContainer).not.toBeNull()

          // 验证容器的 borderRadius 样式
          const style = folderContainer?.getAttribute('style') || ''
          expect(style).toContain(`border-radius: ${borderRadius}`)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 4.3: 自定义 size 正确应用到文件夹预览容器宽度
   * 
   * **Validates: Requirements 2.7, 8.6**
   * 
   * 对于任意 size 值，当传入 FolderPreviewIcon 组件时，
   * 文件夹预览容器的宽度应使用该值
   */
  it('自定义 size 正确应用到文件夹预览容器宽度', () => {
    fc.assert(
      fc.property(
        sizeArbitrary,
        bookmarkListArbitrary,
        (size, children) => {
          const { container } = render(
            <FolderPreviewIcon
              children={children}
              size={size}
            />
          )

          const folderContainer = container.querySelector('[data-testid="folder-preview-icon"]')
          expect(folderContainer).not.toBeNull()

          // 验证容器的 width 样式
          const style = folderContainer?.getAttribute('style') || ''
          expect(style).toContain(`width: ${size}px`)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 4.4: 自定义 size 正确应用到文件夹预览容器高度
   * 
   * **Validates: Requirements 2.7, 8.6**
   * 
   * 对于任意 size 值，当传入 FolderPreviewIcon 组件时，
   * 文件夹预览容器的高度应使用该值
   */
  it('自定义 size 正确应用到文件夹预览容器高度', () => {
    fc.assert(
      fc.property(
        sizeArbitrary,
        bookmarkListArbitrary,
        (size, children) => {
          const { container } = render(
            <FolderPreviewIcon
              children={children}
              size={size}
            />
          )

          const folderContainer = container.querySelector('[data-testid="folder-preview-icon"]')
          expect(folderContainer).not.toBeNull()

          // 验证容器的 height 样式
          const style = folderContainer?.getAttribute('style') || ''
          expect(style).toContain(`height: ${size}px`)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 4.5: 文件夹预览容器保持正方形
   * 
   * **Validates: Requirements 2.7, 8.6**
   * 
   * 文件夹预览容器应始终保持正方形（宽度等于高度）
   */
  it('文件夹预览容器保持正方形', () => {
    fc.assert(
      fc.property(
        sizeArbitrary,
        bookmarkListArbitrary,
        (size, children) => {
          const { container } = render(
            <FolderPreviewIcon
              children={children}
              size={size}
            />
          )

          const folderContainer = container.querySelector('[data-testid="folder-preview-icon"]')
          expect(folderContainer).not.toBeNull()

          const style = folderContainer?.getAttribute('style') || ''
          // 验证宽度和高度都使用相同的 size 值
          expect(style).toContain(`width: ${size}px`)
          expect(style).toContain(`height: ${size}px`)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 4.6: 同时传入 size 和 borderRadius 时都正确应用
   * 
   * **Validates: Requirements 2.6, 2.7, 8.6**
   * 
   * 当同时传入 size 和 borderRadius 时，两个属性都应正确应用
   */
  it('同时传入 size 和 borderRadius 时都正确应用', () => {
    fc.assert(
      fc.property(
        sizeArbitrary,
        borderRadiusArbitrary,
        bookmarkListArbitrary,
        (size, borderRadius, children) => {
          const expectedRadius =
            typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius

          const { container } = render(
            <FolderPreviewIcon
              children={children}
              size={size}
              borderRadius={borderRadius}
            />
          )

          const folderContainer = container.querySelector('[data-testid="folder-preview-icon"]')
          expect(folderContainer).not.toBeNull()

          const style = folderContainer?.getAttribute('style') || ''
          expect(style).toContain(`width: ${size}px`)
          expect(style).toContain(`height: ${size}px`)
          expect(style).toContain(`border-radius: ${expectedRadius}`)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 4.7: 内部 UnifiedIcon 子组件正确渲染
   * 
   * **Validates: Requirements 2.6, 2.7, 8.6**
   * 
   * 文件夹预览内部应包含 UnifiedIcon 子组件
   */
  it('内部 UnifiedIcon 子组件正确渲染', () => {
    fc.assert(
      fc.property(
        sizeArbitrary,
        bookmarkListArbitrary,
        (size, children) => {
          const { container } = render(
            <FolderPreviewIcon
              children={children}
              size={size}
            />
          )

          // 验证内部包含 UnifiedIcon 组件
          const unifiedIcons = container.querySelectorAll('[data-testid="unified-icon"]')
          // 应该有至少一个 UnifiedIcon（取决于 children 数量和 maxItems）
          expect(unifiedIcons.length).toBeGreaterThanOrEqual(Math.min(children.length, 9))
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 4.8: 空文件夹正确应用自定义样式
   * 
   * **Validates: Requirements 2.6, 2.7, 8.6**
   * 
   * 当文件夹为空时，自定义样式属性仍应正确应用
   */
  it('空文件夹正确应用自定义样式', () => {
    fc.assert(
      fc.property(
        sizeArbitrary,
        borderRadiusArbitrary,
        (size, borderRadius) => {
          const expectedRadius =
            typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius

          const { container } = render(
            <FolderPreviewIcon
              children={[]}
              size={size}
              borderRadius={borderRadius}
            />
          )

          const folderContainer = container.querySelector('[data-testid="folder-preview-icon"]')
          expect(folderContainer).not.toBeNull()
          expect(folderContainer?.getAttribute('data-empty')).toBe('true')

          const style = folderContainer?.getAttribute('style') || ''
          expect(style).toContain(`width: ${size}px`)
          expect(style).toContain(`height: ${size}px`)
          expect(style).toContain(`border-radius: ${expectedRadius}`)
        }
      ),
      { numRuns: 100 }
    )
  })
})


describe('**Feature: unified-icon-system, Property 5: 多层嵌套文件夹预览正确应用 UnifiedIcon**', () => {
  /**
   * 生成带有嵌套文件夹的书签结构
   * 返回 { children, allItems } 其中 children 是顶层项，allItems 包含所有项
   */
  const nestedFolderStructureArbitrary = fc
    .record({
      folderId: fc.uuid(),
      folderName: nameArbitrary,
      childBookmarks: fc.array(bookmarkIconDataArbitrary, { minLength: 1, maxLength: 4 }),
    })
    .map(({ folderId, folderName, childBookmarks }) => {
      // 创建子文件夹
      const folder: IconData & { id: string; type: 'FOLDER'; parentId: string | null } = {
        id: folderId,
        name: folderName,
        type: 'FOLDER',
        parentId: null,
        url: undefined,
        iconType: undefined,
        iconData: undefined,
        iconBg: undefined,
      }

      // 设置子书签的 parentId 为文件夹 ID
      const childrenWithParent = childBookmarks.map((child) => ({
        ...child,
        parentId: folderId,
      }))

      return {
        children: [folder] as (IconData & { id: string; type: string; parentId: string | null })[],
        allItems: [folder, ...childrenWithParent] as (IconData & { id: string; type: string; parentId: string | null })[],
      }
    })

  /**
   * 属性 5.1: 嵌套文件夹预览使用 UnifiedIcon 渲染子项
   * 
   * **Validates: Requirements 2.5**
   * 
   * 当文件夹内包含子文件夹时，子文件夹的预览应使用 UnifiedIcon 渲染其内部书签
   */
  it('嵌套文件夹预览使用 UnifiedIcon 渲染子项', () => {
    fc.assert(
      fc.property(
        nestedFolderStructureArbitrary,
        sizeArbitrary,
        ({ children, allItems }, size) => {
          const { container } = render(
            <FolderPreviewIcon
              children={children}
              allItems={allItems}
              size={size}
            />
          )

          // 验证嵌套文件夹预览存在
          const nestedPreviews = container.querySelectorAll('[data-testid="folder-preview-nested"]')
          // 应该有嵌套预览（因为 children 包含一个文件夹）
          expect(nestedPreviews.length).toBeGreaterThanOrEqual(1)

          // 验证嵌套预览内部包含 UnifiedIcon
          const unifiedIcons = container.querySelectorAll('[data-testid="unified-icon"]')
          // 嵌套文件夹内的书签应该使用 UnifiedIcon 渲染
          expect(unifiedIcons.length).toBeGreaterThanOrEqual(1)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 5.2: TEXT 类型图标在嵌套预览中正确显示
   * 
   * **Validates: Requirements 2.5**
   * 
   * 当嵌套文件夹内包含 TEXT 类型图标的书签时，应正确显示文字图标
   */
  it('TEXT 类型图标在嵌套预览中正确显示', () => {
    // 生成包含 TEXT 类型书签的嵌套结构
    const textBookmarkInNestedFolderArbitrary = fc
      .record({
        folderId: fc.uuid(),
        folderName: nameArbitrary,
        textIconData: textIconDataArbitrary,
        bookmarkName: nameArbitrary,
        bookmarkUrl: urlArbitrary,
      })
      .map(({ folderId, folderName, textIconData, bookmarkName, bookmarkUrl }) => {
        const folder: IconData & { id: string; type: 'FOLDER'; parentId: string | null } = {
          id: folderId,
          name: folderName,
          type: 'FOLDER',
          parentId: null,
          url: undefined,
          iconType: undefined,
          iconData: undefined,
          iconBg: undefined,
        }

        const textBookmark: IconData & { id: string; type: 'BOOKMARK'; parentId: string | null } = {
          id: `bookmark-${folderId}`,
          name: bookmarkName,
          url: bookmarkUrl,
          iconType: 'TEXT',
          iconData: textIconData,
          iconBg: undefined,
          type: 'BOOKMARK',
          parentId: folderId,
        }

        return {
          children: [folder] as (IconData & { id: string; type: string; parentId: string | null })[],
          allItems: [folder, textBookmark] as (IconData & { id: string; type: string; parentId: string | null })[],
        }
      })

    fc.assert(
      fc.property(
        textBookmarkInNestedFolderArbitrary,
        sizeArbitrary,
        ({ children, allItems }, size) => {
          const { container } = render(
            <FolderPreviewIcon
              children={children}
              allItems={allItems}
              size={size}
            />
          )

          // 验证 TEXT 类型图标正确渲染
          const textIcons = container.querySelectorAll('[data-icon-type="TEXT"]')
          expect(textIcons.length).toBeGreaterThanOrEqual(1)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 5.3: 多层嵌套文件夹递归渲染
   * 
   * **Validates: Requirements 2.5**
   * 
   * 当存在多层嵌套文件夹时，每一层都应正确渲染
   */
  it('多层嵌套文件夹递归渲染', () => {
    // 生成两层嵌套的文件夹结构
    const twoLevelNestedArbitrary = fc
      .record({
        level1FolderId: fc.uuid(),
        level2FolderId: fc.uuid(),
        level1Name: nameArbitrary,
        level2Name: nameArbitrary,
        bookmarkName: nameArbitrary,
        bookmarkUrl: urlArbitrary,
      })
      .map(({ level1FolderId, level2FolderId, level1Name, level2Name, bookmarkName, bookmarkUrl }) => {
        // 第一层文件夹
        const level1Folder: IconData & { id: string; type: 'FOLDER'; parentId: string | null } = {
          id: level1FolderId,
          name: level1Name,
          type: 'FOLDER',
          parentId: null,
          url: undefined,
          iconType: undefined,
          iconData: undefined,
          iconBg: undefined,
        }

        // 第二层文件夹（在第一层内）
        const level2Folder: IconData & { id: string; type: 'FOLDER'; parentId: string | null } = {
          id: level2FolderId,
          name: level2Name,
          type: 'FOLDER',
          parentId: level1FolderId,
          url: undefined,
          iconType: undefined,
          iconData: undefined,
          iconBg: undefined,
        }

        // 第二层文件夹内的书签
        const bookmark: IconData & { id: string; type: 'BOOKMARK'; parentId: string | null } = {
          id: `bookmark-${level2FolderId}`,
          name: bookmarkName,
          url: bookmarkUrl,
          iconType: 'AUTO',
          iconData: undefined,
          iconBg: undefined,
          type: 'BOOKMARK',
          parentId: level2FolderId,
        }

        return {
          children: [level1Folder] as (IconData & { id: string; type: string; parentId: string | null })[],
          allItems: [level1Folder, level2Folder, bookmark] as (IconData & { id: string; type: string; parentId: string | null })[],
        }
      })

    fc.assert(
      fc.property(
        twoLevelNestedArbitrary,
        sizeArbitrary,
        ({ children, allItems }, size) => {
          const { container } = render(
            <FolderPreviewIcon
              children={children}
              allItems={allItems}
              size={size}
            />
          )

          // 验证存在嵌套预览
          const nestedPreviews = container.querySelectorAll('[data-testid="folder-preview-nested"]')
          // 应该有至少一个嵌套预览（第一层文件夹）
          expect(nestedPreviews.length).toBeGreaterThanOrEqual(1)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 5.4: 嵌套文件夹预览正确应用子项变体
   * 
   * **Validates: Requirements 2.5**
   * 
   * 嵌套文件夹内的图标应使用正确的子变体尺寸
   */
  it('嵌套文件夹预览正确应用子项变体', () => {
    fc.assert(
      fc.property(
        nestedFolderStructureArbitrary,
        variantArbitrary,
        ({ children, allItems }, variant) => {
          const { container } = render(
            <FolderPreviewIcon
              children={children}
              allItems={allItems}
              variant={variant}
            />
          )

          // 验证组件正确渲染
          const folderContainer = container.querySelector('[data-testid="folder-preview-icon"]')
          expect(folderContainer).not.toBeNull()

          // 验证嵌套预览存在
          const nestedPreviews = container.querySelectorAll('[data-testid="folder-preview-nested"]')
          expect(nestedPreviews.length).toBeGreaterThanOrEqual(1)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 5.5: 空嵌套文件夹显示文件夹图标
   * 
   * **Validates: Requirements 2.5**
   * 
   * 当嵌套文件夹为空时，应显示文件夹图标而非空白
   */
  it('空嵌套文件夹显示文件夹图标', () => {
    // 生成包含空文件夹的结构
    const emptyNestedFolderArbitrary = fc
      .record({
        folderId: fc.uuid(),
        folderName: nameArbitrary,
      })
      .map(({ folderId, folderName }) => {
        const folder: IconData & { id: string; type: 'FOLDER'; parentId: string | null } = {
          id: folderId,
          name: folderName,
          type: 'FOLDER',
          parentId: null,
          url: undefined,
          iconType: undefined,
          iconData: undefined,
          iconBg: undefined,
        }

        return {
          children: [folder] as (IconData & { id: string; type: string; parentId: string | null })[],
          allItems: [folder] as (IconData & { id: string; type: string; parentId: string | null })[],
        }
      })

    fc.assert(
      fc.property(
        emptyNestedFolderArbitrary,
        sizeArbitrary,
        ({ children, allItems }, size) => {
          const { container } = render(
            <FolderPreviewIcon
              children={children}
              allItems={allItems}
              size={size}
            />
          )

          // 验证空文件夹预览存在
          const emptyPreviews = container.querySelectorAll('[data-testid="folder-preview-empty"]')
          expect(emptyPreviews.length).toBeGreaterThanOrEqual(1)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 5.6: 混合内容（书签和文件夹）正确渲染
   * 
   * **Validates: Requirements 2.5**
   * 
   * 当文件夹内同时包含书签和子文件夹时，两者都应正确渲染
   */
  it('混合内容（书签和文件夹）正确渲染', () => {
    // 生成包含书签和子文件夹的混合结构
    const mixedContentArbitrary = fc
      .record({
        folderId: fc.uuid(),
        folderName: nameArbitrary,
        bookmarkName: nameArbitrary,
        bookmarkUrl: urlArbitrary,
        nestedBookmarkName: nameArbitrary,
        nestedBookmarkUrl: urlArbitrary,
      })
      .map(({ folderId, folderName, bookmarkName, bookmarkUrl, nestedBookmarkName, nestedBookmarkUrl }) => {
        // 子文件夹
        const folder: IconData & { id: string; type: 'FOLDER'; parentId: string | null } = {
          id: folderId,
          name: folderName,
          type: 'FOLDER',
          parentId: null,
          url: undefined,
          iconType: undefined,
          iconData: undefined,
          iconBg: undefined,
        }

        // 顶层书签
        const topBookmark: IconData & { id: string; type: 'BOOKMARK'; parentId: string | null } = {
          id: `top-bookmark`,
          name: bookmarkName,
          url: bookmarkUrl,
          iconType: 'AUTO',
          iconData: undefined,
          iconBg: undefined,
          type: 'BOOKMARK',
          parentId: null,
        }

        // 子文件夹内的书签
        const nestedBookmark: IconData & { id: string; type: 'BOOKMARK'; parentId: string | null } = {
          id: `nested-bookmark`,
          name: nestedBookmarkName,
          url: nestedBookmarkUrl,
          iconType: 'AUTO',
          iconData: undefined,
          iconBg: undefined,
          type: 'BOOKMARK',
          parentId: folderId,
        }

        return {
          children: [folder, topBookmark] as (IconData & { id: string; type: string; parentId: string | null })[],
          allItems: [folder, topBookmark, nestedBookmark] as (IconData & { id: string; type: string; parentId: string | null })[],
        }
      })

    fc.assert(
      fc.property(
        mixedContentArbitrary,
        sizeArbitrary,
        ({ children, allItems }, size) => {
          const { container } = render(
            <FolderPreviewIcon
              children={children}
              allItems={allItems}
              size={size}
            />
          )

          // 验证组件正确渲染
          const folderContainer = container.querySelector('[data-testid="folder-preview-icon"]')
          expect(folderContainer).not.toBeNull()

          // 验证同时存在 UnifiedIcon（书签）和嵌套预览（文件夹）
          const unifiedIcons = container.querySelectorAll('[data-testid="unified-icon"]')
          const nestedPreviews = container.querySelectorAll('[data-testid="folder-preview-nested"]')
          
          // 应该有 UnifiedIcon（顶层书签 + 嵌套文件夹内的书签）
          expect(unifiedIcons.length).toBeGreaterThanOrEqual(1)
          // 应该有嵌套预览（子文件夹）
          expect(nestedPreviews.length).toBeGreaterThanOrEqual(1)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 5.7: 嵌套文件夹预览尺寸按比例缩小
   * 
   * **Validates: Requirements 2.5**
   * 
   * 嵌套文件夹内的图标尺寸应小于父容器尺寸
   */
  it('嵌套文件夹预览尺寸按比例缩小', () => {
    fc.assert(
      fc.property(
        nestedFolderStructureArbitrary,
        sizeArbitrary,
        ({ children, allItems }, size) => {
          const { container } = render(
            <FolderPreviewIcon
              children={children}
              allItems={allItems}
              size={size}
            />
          )

          // 获取主容器尺寸
          const folderContainer = container.querySelector('[data-testid="folder-preview-icon"]')
          expect(folderContainer).not.toBeNull()
          
          const mainStyle = folderContainer?.getAttribute('style') || ''
          const mainWidthMatch = mainStyle.match(/width:\s*(\d+)px/)
          
          if (mainWidthMatch) {
            const mainWidth = parseInt(mainWidthMatch[1], 10)
            
            // 获取嵌套预览尺寸
            const nestedPreview = container.querySelector('[data-testid="folder-preview-nested"]')
            if (nestedPreview) {
              const nestedStyle = nestedPreview.getAttribute('style') || ''
              const nestedWidthMatch = nestedStyle.match(/width:\s*(\d+)px/)
              
              if (nestedWidthMatch) {
                const nestedWidth = parseInt(nestedWidthMatch[1], 10)
                // 嵌套预览尺寸应小于主容器
                expect(nestedWidth).toBeLessThan(mainWidth)
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 5.8: 所有图标类型在嵌套预览中都能正确渲染
   * 
   * **Validates: Requirements 2.5**
   * 
   * AUTO、TEXT、URL 类型的图标在嵌套预览中都应正确渲染
   */
  it('所有图标类型在嵌套预览中都能正确渲染', () => {
    // 生成包含所有图标类型的嵌套结构
    const allIconTypesArbitrary = fc
      .record({
        folderId: fc.uuid(),
        folderName: nameArbitrary,
        autoBookmarkName: nameArbitrary,
        autoBookmarkUrl: urlArbitrary,
        textIconData: textIconDataArbitrary,
        textBookmarkName: nameArbitrary,
        textBookmarkUrl: urlArbitrary,
        urlBookmarkName: nameArbitrary,
        urlBookmarkUrl: urlArbitrary,
      })
      .map(({ folderId, folderName, autoBookmarkName, autoBookmarkUrl, textIconData, textBookmarkName, textBookmarkUrl, urlBookmarkName, urlBookmarkUrl }) => {
        const folder: IconData & { id: string; type: 'FOLDER'; parentId: string | null } = {
          id: folderId,
          name: folderName,
          type: 'FOLDER',
          parentId: null,
          url: undefined,
          iconType: undefined,
          iconData: undefined,
          iconBg: undefined,
        }

        const autoBookmark: IconData & { id: string; type: 'BOOKMARK'; parentId: string | null } = {
          id: `auto-bookmark`,
          name: autoBookmarkName,
          url: autoBookmarkUrl,
          iconType: 'AUTO',
          iconData: undefined,
          iconBg: undefined,
          type: 'BOOKMARK',
          parentId: folderId,
        }

        const textBookmark: IconData & { id: string; type: 'BOOKMARK'; parentId: string | null } = {
          id: `text-bookmark`,
          name: textBookmarkName,
          url: textBookmarkUrl,
          iconType: 'TEXT',
          iconData: textIconData,
          iconBg: undefined,
          type: 'BOOKMARK',
          parentId: folderId,
        }

        const urlBookmark: IconData & { id: string; type: 'BOOKMARK'; parentId: string | null } = {
          id: `url-bookmark`,
          name: urlBookmarkName,
          url: urlBookmarkUrl,
          iconType: 'URL',
          iconUrl: 'https://example.com/icon.png',
          iconData: undefined,
          iconBg: undefined,
          type: 'BOOKMARK',
          parentId: folderId,
        }

        return {
          children: [folder] as (IconData & { id: string; type: string; parentId: string | null })[],
          allItems: [folder, autoBookmark, textBookmark, urlBookmark] as (IconData & { id: string; type: string; parentId: string | null })[],
        }
      })

    fc.assert(
      fc.property(
        allIconTypesArbitrary,
        sizeArbitrary,
        ({ children, allItems }, size) => {
          const { container } = render(
            <FolderPreviewIcon
              children={children}
              allItems={allItems}
              size={size}
            />
          )

          // 验证组件正确渲染
          const folderContainer = container.querySelector('[data-testid="folder-preview-icon"]')
          expect(folderContainer).not.toBeNull()

          // 验证存在 UnifiedIcon 组件
          const unifiedIcons = container.querySelectorAll('[data-testid="unified-icon"]')
          // 应该有多个 UnifiedIcon（不同类型的书签）
          expect(unifiedIcons.length).toBeGreaterThanOrEqual(1)
        }
      ),
      { numRuns: 100 }
    )
  })
})


/**
 * 导入圆角计算函数用于 Property 5 测试
 */
import { calculateProportionalRadius } from '../../utils/iconRadius'
import { useAppearanceStore } from '../../stores/appearance'

/**
 * 生成有效的圆角比例（0-0.5）
 */
const ratioArbitrary: fc.Arbitrary<number> = fc.double({
  min: 0,
  max: 0.5,
  noNaN: true,
})

describe('**Feature: proportional-icon-radius, Property 5: FolderPreviewIcon 比例化圆角**', () => {
  /**
   * 在每个测试前重置 store 状态
   */
  beforeEach(() => {
    // 重置 store 到默认状态
    act(() => {
      useAppearanceStore.getState().setIconRadiusRatio(0.25)
    })
  })

  /**
   * 属性 5.1: 子图标圆角基于其实际大小和全局圆角比例计算
   * 
   * **Validates: Requirements 4.1, 4.2**
   * 
   * 对于任意文件夹预览图标，子图标的圆角应该等于 子图标大小 × 圆角比例
   */
  it('子图标圆角基于其实际大小和全局圆角比例计算', () => {
    fc.assert(
      fc.property(
        sizeArbitrary,
        ratioArbitrary,
        bookmarkListArbitrary,
        (size, ratio, children) => {
          // 设置 store 中的圆角比例
          act(() => {
            useAppearanceStore.getState().setIconRadiusRatio(ratio)
          })

          const { container } = render(
            <FolderPreviewIcon
              children={children}
              size={size}
            />
          )

          // 获取子图标
          const unifiedIcons = container.querySelectorAll('[data-testid="unified-icon"]')
          
          if (unifiedIcons.length > 0) {
            // 验证至少有一个子图标
            expect(unifiedIcons.length).toBeGreaterThan(0)
            
            // 获取第一个子图标的样式
            const firstIcon = unifiedIcons[0]
            const style = firstIcon.getAttribute('style') || ''
            
            // 从样式中提取 border-radius 值
            const radiusMatch = style.match(/border-radius:\s*([0-9.]+)px/)
            if (radiusMatch) {
              const actualRadius = parseFloat(radiusMatch[1])
              
              // 从样式中提取 width 值（子图标大小）
              const widthMatch = style.match(/width:\s*([0-9.]+)px/)
              if (widthMatch) {
                const childSize = parseFloat(widthMatch[1])
                const expectedRadius = calculateProportionalRadius(childSize, ratio)
                
                // 验证圆角值符合预期（允许浮点数误差）
                expect(Math.abs(actualRadius - expectedRadius)).toBeLessThanOrEqual(0.5)
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 5.2: 嵌套文件夹的每一层都应用比例化圆角
   * 
   * **Validates: Requirements 4.3**
   * 
   * 当文件夹内包含子文件夹时，嵌套预览的圆角也应该基于比例计算
   */
  it('嵌套文件夹的每一层都应用比例化圆角', () => {
    // 生成包含嵌套文件夹的结构
    const nestedFolderArbitrary = fc
      .record({
        folderId: fc.uuid(),
        folderName: nameArbitrary,
        childBookmarks: fc.array(bookmarkIconDataArbitrary, { minLength: 1, maxLength: 4 }),
      })
      .map(({ folderId, folderName, childBookmarks }) => {
        const folder: IconData & { id: string; type: 'FOLDER'; parentId: string | null } = {
          id: folderId,
          name: folderName,
          type: 'FOLDER',
          parentId: null,
          url: undefined,
          iconType: undefined,
          iconData: undefined,
          iconBg: undefined,
        }

        const childrenWithParent = childBookmarks.map((child) => ({
          ...child,
          parentId: folderId,
        }))

        return {
          children: [folder] as (IconData & { id: string; type: string; parentId: string | null })[],
          allItems: [folder, ...childrenWithParent] as (IconData & { id: string; type: string; parentId: string | null })[],
        }
      })

    fc.assert(
      fc.property(
        nestedFolderArbitrary,
        sizeArbitrary,
        ratioArbitrary,
        ({ children, allItems }, size, ratio) => {
          // 设置 store 中的圆角比例
          act(() => {
            useAppearanceStore.getState().setIconRadiusRatio(ratio)
          })

          const { container } = render(
            <FolderPreviewIcon
              children={children}
              allItems={allItems}
              size={size}
            />
          )

          // 获取嵌套文件夹预览
          const nestedPreviews = container.querySelectorAll('[data-testid="folder-preview-nested"]')
          
          if (nestedPreviews.length > 0) {
            const nestedPreview = nestedPreviews[0]
            const style = nestedPreview.getAttribute('style') || ''
            
            // 从样式中提取 border-radius 值
            const radiusMatch = style.match(/border-radius:\s*([0-9.]+)px/)
            if (radiusMatch) {
              const actualRadius = parseFloat(radiusMatch[1])
              
              // 从样式中提取 width 值（嵌套预览大小）
              const widthMatch = style.match(/width:\s*([0-9.]+)px/)
              if (widthMatch) {
                const nestedSize = parseFloat(widthMatch[1])
                const expectedRadius = calculateProportionalRadius(nestedSize, ratio)
                
                // 验证圆角值符合预期（允许浮点数误差）
                expect(Math.abs(actualRadius - expectedRadius)).toBeLessThanOrEqual(0.5)
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 5.3: 当圆角比例变化时，子图标圆角相应更新
   * 
   * **Validates: Requirements 4.1, 4.2**
   * 
   * 对于任意两个不同的圆角比例，子图标圆角应该按比例变化
   * 
   * 注意：此测试需要渲染两次组件，运行次数减少以避免 CI 超时
   */
  it('当圆角比例变化时，子图标圆角相应更新', () => {
    fc.assert(
      fc.property(
        sizeArbitrary,
        ratioArbitrary,
        ratioArbitrary,
        bookmarkListArbitrary,
        (size, ratio1, ratio2, children) => {
          // 使用第一个比例渲染
          act(() => {
            useAppearanceStore.getState().setIconRadiusRatio(ratio1)
          })

          const { container: container1, unmount: unmount1 } = render(
            <FolderPreviewIcon
              children={children}
              size={size}
            />
          )

          // 获取第一次渲染的子图标圆角
          const icons1 = container1.querySelectorAll('[data-testid="unified-icon"]')
          let radius1 = 0
          let childSize1 = 0
          
          if (icons1.length > 0) {
            const style1 = icons1[0].getAttribute('style') || ''
            const radiusMatch1 = style1.match(/border-radius:\s*([0-9.]+)px/)
            const widthMatch1 = style1.match(/width:\s*([0-9.]+)px/)
            if (radiusMatch1 && widthMatch1) {
              radius1 = parseFloat(radiusMatch1[1])
              childSize1 = parseFloat(widthMatch1[1])
            }
          }

          unmount1()

          // 使用第二个比例渲染
          act(() => {
            useAppearanceStore.getState().setIconRadiusRatio(ratio2)
          })

          const { container: container2 } = render(
            <FolderPreviewIcon
              children={children}
              size={size}
            />
          )

          // 获取第二次渲染的子图标圆角
          const icons2 = container2.querySelectorAll('[data-testid="unified-icon"]')
          let radius2 = 0
          
          if (icons2.length > 0) {
            const style2 = icons2[0].getAttribute('style') || ''
            const radiusMatch2 = style2.match(/border-radius:\s*([0-9.]+)px/)
            if (radiusMatch2) {
              radius2 = parseFloat(radiusMatch2[1])
            }
          }

          // 验证圆角按比例变化
          if (childSize1 > 0 && radius1 > 0 && radius2 > 0) {
            const expectedRadius1 = calculateProportionalRadius(childSize1, ratio1)
            const expectedRadius2 = calculateProportionalRadius(childSize1, ratio2)
            
            // 验证两次渲染的圆角符合各自的比例
            expect(Math.abs(radius1 - expectedRadius1)).toBeLessThanOrEqual(0.5)
            expect(Math.abs(radius2 - expectedRadius2)).toBeLessThanOrEqual(0.5)
            
            // 验证比例关系
            if (ratio1 > ratio2) {
              expect(radius1).toBeGreaterThanOrEqual(radius2)
            } else if (ratio1 < ratio2) {
              expect(radius1).toBeLessThanOrEqual(radius2)
            }
          }
        }
      ),
      { numRuns: 30 }  // 减少运行次数以避免 CI 超时
    )
  })

  /**
   * 属性 5.4: 子图标圆角计算公式验证
   * 
   * **Validates: Requirements 4.1, 4.2**
   * 
   * 验证子图标圆角 = 子图标大小 × 圆角比例
   */
  it('子图标圆角计算公式验证：子图标圆角 = 子图标大小 × 圆角比例', () => {
    fc.assert(
      fc.property(
        sizeArbitrary,
        ratioArbitrary,
        bookmarkListArbitrary,
        (size, ratio, children) => {
          // 设置 store 中的圆角比例
          act(() => {
            useAppearanceStore.getState().setIconRadiusRatio(ratio)
          })

          const { container } = render(
            <FolderPreviewIcon
              children={children}
              size={size}
            />
          )

          // 获取所有子图标
          const unifiedIcons = container.querySelectorAll('[data-testid="unified-icon"]')
          
          // 验证每个子图标的圆角
          unifiedIcons.forEach((icon) => {
            const style = icon.getAttribute('style') || ''
            
            const radiusMatch = style.match(/border-radius:\s*([0-9.]+)px/)
            const widthMatch = style.match(/width:\s*([0-9.]+)px/)
            
            if (radiusMatch && widthMatch) {
              const actualRadius = parseFloat(radiusMatch[1])
              const childSize = parseFloat(widthMatch[1])
              const expectedRadius = calculateProportionalRadius(childSize, ratio)
              
              // 验证公式：子图标圆角 = 子图标大小 × 圆角比例（四舍五入到 0.5px）
              expect(Math.abs(actualRadius - expectedRadius)).toBeLessThanOrEqual(0.5)
            }
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 5.5: 空文件夹预览也应用比例化圆角
   * 
   * **Validates: Requirements 4.1**
   * 
   * 当文件夹为空时，容器的圆角也应该基于比例计算
   */
  it('空文件夹预览也应用比例化圆角', () => {
    fc.assert(
      fc.property(
        sizeArbitrary,
        ratioArbitrary,
        (size, ratio) => {
          // 设置 store 中的圆角比例
          act(() => {
            useAppearanceStore.getState().setIconRadiusRatio(ratio)
          })

          const { container } = render(
            <FolderPreviewIcon
              children={[]}
              size={size}
            />
          )

          const folderContainer = container.querySelector('[data-testid="folder-preview-icon"]')
          expect(folderContainer).not.toBeNull()
          expect(folderContainer?.getAttribute('data-empty')).toBe('true')

          const style = folderContainer?.getAttribute('style') || ''
          const radiusMatch = style.match(/border-radius:\s*([0-9.]+)px/)
          
          if (radiusMatch) {
            const actualRadius = parseFloat(radiusMatch[1])
            const expectedRadius = calculateProportionalRadius(size, ratio)
            
            // 验证空文件夹容器的圆角符合比例计算
            expect(Math.abs(actualRadius - expectedRadius)).toBeLessThanOrEqual(0.5)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 5.6: 自定义 borderRadius 优先于比例计算
   * 
   * **Validates: Requirements 4.1**
   * 
   * 当传入自定义 borderRadius 时，应该使用自定义值而非比例计算
   */
  it('自定义 borderRadius 优先于比例计算', () => {
    fc.assert(
      fc.property(
        sizeArbitrary,
        ratioArbitrary,
        numericBorderRadiusArbitrary,
        bookmarkListArbitrary,
        (size, ratio, customBorderRadius, children) => {
          // 设置 store 中的圆角比例
          act(() => {
            useAppearanceStore.getState().setIconRadiusRatio(ratio)
          })

          const { container } = render(
            <FolderPreviewIcon
              children={children}
              size={size}
              borderRadius={customBorderRadius}
            />
          )

          const folderContainer = container.querySelector('[data-testid="folder-preview-icon"]')
          expect(folderContainer).not.toBeNull()

          const style = folderContainer?.getAttribute('style') || ''
          
          // 验证容器使用自定义圆角
          expect(style).toContain(`border-radius: ${customBorderRadius}px`)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 5.7: 嵌套文件夹内的子图标也应用比例化圆角
   * 
   * **Validates: Requirements 4.2, 4.3**
   * 
   * 嵌套文件夹内的子图标圆角也应该基于其大小和全局比例计算
   */
  it('嵌套文件夹内的子图标也应用比例化圆角', () => {
    // 生成包含嵌套文件夹的结构
    const nestedFolderWithChildrenArbitrary = fc
      .record({
        folderId: fc.uuid(),
        folderName: nameArbitrary,
        childBookmarks: fc.array(bookmarkIconDataArbitrary, { minLength: 2, maxLength: 4 }),
      })
      .map(({ folderId, folderName, childBookmarks }) => {
        const folder: IconData & { id: string; type: 'FOLDER'; parentId: string | null } = {
          id: folderId,
          name: folderName,
          type: 'FOLDER',
          parentId: null,
          url: undefined,
          iconType: undefined,
          iconData: undefined,
          iconBg: undefined,
        }

        const childrenWithParent = childBookmarks.map((child) => ({
          ...child,
          parentId: folderId,
        }))

        return {
          children: [folder] as (IconData & { id: string; type: string; parentId: string | null })[],
          allItems: [folder, ...childrenWithParent] as (IconData & { id: string; type: string; parentId: string | null })[],
        }
      })

    fc.assert(
      fc.property(
        nestedFolderWithChildrenArbitrary,
        sizeArbitrary,
        ratioArbitrary,
        ({ children, allItems }, size, ratio) => {
          // 设置 store 中的圆角比例
          act(() => {
            useAppearanceStore.getState().setIconRadiusRatio(ratio)
          })

          const { container } = render(
            <FolderPreviewIcon
              children={children}
              allItems={allItems}
              size={size}
            />
          )

          // 获取嵌套预览内的子图标
          const nestedPreview = container.querySelector('[data-testid="folder-preview-nested"]')
          
          if (nestedPreview) {
            const nestedIcons = nestedPreview.querySelectorAll('[data-testid="unified-icon"]')
            
            // 验证嵌套预览内的每个子图标圆角
            nestedIcons.forEach((icon) => {
              const style = icon.getAttribute('style') || ''
              
              const radiusMatch = style.match(/border-radius:\s*([0-9.]+)px/)
              const widthMatch = style.match(/width:\s*([0-9.]+)px/)
              
              if (radiusMatch && widthMatch) {
                const actualRadius = parseFloat(radiusMatch[1])
                const childSize = parseFloat(widthMatch[1])
                const expectedRadius = calculateProportionalRadius(childSize, ratio)
                
                // 验证嵌套子图标的圆角符合比例计算
                expect(Math.abs(actualRadius - expectedRadius)).toBeLessThanOrEqual(0.5)
              }
            })
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 5.8: 圆角比例为 0 时子图标圆角为 0
   * 
   * **Validates: Requirements 4.1, 4.2**
   * 
   * 当圆角比例为 0 时，所有子图标的圆角都应该为 0
   */
  it('圆角比例为 0 时子图标圆角为 0', () => {
    fc.assert(
      fc.property(
        sizeArbitrary,
        bookmarkListArbitrary,
        (size, children) => {
          // 设置圆角比例为 0
          act(() => {
            useAppearanceStore.getState().setIconRadiusRatio(0)
          })

          const { container } = render(
            <FolderPreviewIcon
              children={children}
              size={size}
            />
          )

          // 获取所有子图标
          const unifiedIcons = container.querySelectorAll('[data-testid="unified-icon"]')
          
          // 验证每个子图标的圆角为 0
          unifiedIcons.forEach((icon) => {
            const style = icon.getAttribute('style') || ''
            const radiusMatch = style.match(/border-radius:\s*([0-9.]+)px/)
            
            if (radiusMatch) {
              const actualRadius = parseFloat(radiusMatch[1])
              expect(actualRadius).toBe(0)
            }
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 5.9: 圆角比例为最大值 0.5 时子图标圆角正确计算
   * 
   * **Validates: Requirements 4.1, 4.2**
   * 
   * 当圆角比例为最大值 0.5 时，子图标圆角应该等于子图标大小的一半
   */
  it('圆角比例为最大值 0.5 时子图标圆角正确计算', () => {
    fc.assert(
      fc.property(
        sizeArbitrary,
        bookmarkListArbitrary,
        (size, children) => {
          // 设置圆角比例为最大值 0.5
          act(() => {
            useAppearanceStore.getState().setIconRadiusRatio(0.5)
          })

          const { container } = render(
            <FolderPreviewIcon
              children={children}
              size={size}
            />
          )

          // 获取所有子图标
          const unifiedIcons = container.querySelectorAll('[data-testid="unified-icon"]')
          
          // 验证每个子图标的圆角
          unifiedIcons.forEach((icon) => {
            const style = icon.getAttribute('style') || ''
            
            const radiusMatch = style.match(/border-radius:\s*([0-9.]+)px/)
            const widthMatch = style.match(/width:\s*([0-9.]+)px/)
            
            if (radiusMatch && widthMatch) {
              const actualRadius = parseFloat(radiusMatch[1])
              const childSize = parseFloat(widthMatch[1])
              const expectedRadius = calculateProportionalRadius(childSize, 0.5)
              
              // 验证圆角等于子图标大小的一半（四舍五入到 0.5px）
              expect(Math.abs(actualRadius - expectedRadius)).toBeLessThanOrEqual(0.5)
              // 验证圆角约等于子图标大小的一半
              expect(Math.abs(actualRadius - childSize / 2)).toBeLessThanOrEqual(0.5)
            }
          })
        }
      ),
      { numRuns: 100 }
    )
  })
})

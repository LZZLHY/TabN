/**
 * PresetSelector 组件测试
 * Requirements: 4.1, 6.1, 6.3
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PresetSelector } from './PresetSelector'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'presets.title': '预设库',
        'presets.add': '添加',
        'presets.empty': '暂无预设',
        'presets.nameTitle': '预设名称',
        'presets.namePlaceholder': '输入预设名称',
        'presets.nameRequired': '请输入预设名称',
        'presets.nameTooLong': '预设名称不能超过50个字符',
        'presets.saved': '预设已保存',
        'presets.deleted': '预设已删除',
        'presets.applied': '预设已应用',
        'presets.limitReached': '已达到预设数量上限（8个）',
        'toast.pleaseLogin': '请先登录',
        'toast.operationFailed': '操作失败',
        'common.cancel': '取消',
        'common.save': '保存',
      }
      return translations[key] || key
    },
  }),
}))

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock API
vi.mock('../../services/api', () => ({
  apiFetch: vi.fn(),
}))

describe('PresetSelector', () => {
  const defaultProps = {
    token: 'test-token',
    bookmarkId: 'bookmark-1',
    onApply: vi.fn(),
    currentConfig: {
      iconType: 'URL' as const,
      iconData: null,
      iconUrl: 'https://example.com/icon.png',
      iconBg: null,
    },
    bookmarkName: 'Test Bookmark',
    bookmarkUrl: 'https://example.com',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('渲染测试', () => {
    it('未登录时不显示组件', () => {
      const { container } = render(
        <PresetSelector {...defaultProps} token={null} />
      )
      expect(container.firstChild).toBeNull()
    })

    it('无书签 ID 时不显示组件', () => {
      const { container } = render(
        <PresetSelector {...defaultProps} bookmarkId="" />
      )
      expect(container.firstChild).toBeNull()
    })

    it('登录后显示标题和添加按钮', async () => {
      const { apiFetch } = await import('../../services/api')
      vi.mocked(apiFetch).mockResolvedValue({
        ok: true,
        data: { items: [] },
      })

      render(<PresetSelector {...defaultProps} />)
      
      expect(screen.getByText('预设库')).toBeInTheDocument()
      expect(screen.getByText('添加')).toBeInTheDocument()
    })

    it('空状态显示提示文字', async () => {
      const { apiFetch } = await import('../../services/api')
      vi.mocked(apiFetch).mockResolvedValue({
        ok: true,
        data: { items: [] },
      })

      render(<PresetSelector {...defaultProps} />)
      
      // 等待加载完成
      await vi.waitFor(() => {
        expect(screen.getByText('暂无预设')).toBeInTheDocument()
      })
    })
  })

  describe('预设列表显示', () => {
    it('显示预设列表', async () => {
      const { apiFetch } = await import('../../services/api')
      vi.mocked(apiFetch).mockResolvedValue({
        ok: true,
        data: {
          items: [
            {
              id: '1',
              userId: 'user1',
              bookmarkId: 'bookmark-1',
              name: '预设1',
              iconType: 'URL',
              iconData: null,
              iconUrl: 'https://example.com/icon1.png',
              iconBg: null,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            },
            {
              id: '2',
              userId: 'user1',
              bookmarkId: 'bookmark-1',
              name: '预设2',
              iconType: 'TEXT',
              iconData: '{"t":"AB","c":"#FF0000","f":"system"}',
              iconUrl: null,
              iconBg: '#FFFFFF',
              createdAt: '2024-01-02T00:00:00Z',
              updatedAt: '2024-01-02T00:00:00Z',
            },
          ],
        },
      })

      render(<PresetSelector {...defaultProps} />)
      
      // 等待加载完成
      await vi.waitFor(() => {
        expect(screen.getByText('预设1')).toBeInTheDocument()
        expect(screen.getByText('预设2')).toBeInTheDocument()
      })
    })

    it('显示预设数量', async () => {
      const { apiFetch } = await import('../../services/api')
      vi.mocked(apiFetch).mockResolvedValue({
        ok: true,
        data: {
          items: [
            {
              id: '1',
              userId: 'user1',
              bookmarkId: 'bookmark-1',
              name: '预设1',
              iconType: 'URL',
              iconData: null,
              iconUrl: null,
              iconBg: null,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            },
          ],
        },
      })

      render(<PresetSelector {...defaultProps} />)
      
      // 等待加载完成
      await vi.waitFor(() => {
        expect(screen.getByText('1/8')).toBeInTheDocument()
      })
    })
  })
})

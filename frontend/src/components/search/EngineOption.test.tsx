import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EngineOption } from './EngineOption'
import type { SearchEngineConfig } from '../../utils/searchEngine'

// Mock Favicon 组件
vi.mock('../Favicon', () => ({
  Favicon: ({ name }: { name?: string; onAllFailed?: () => void }) => (
    <span data-testid="favicon">{name?.charAt(0) || '?'}</span>
  ),
}))

// Mock UnifiedIcon 组件
vi.mock('../ui/UnifiedIcon', () => ({
  UnifiedIcon: ({ 
    iconType, 
    iconData, 
    iconBg, 
    name, 
    size, 
    borderRadius 
  }: { 
    iconType?: string | null
    iconData?: string | null
    iconUrl?: string | null
    iconBg?: string | null
    name?: string | null
    size?: number
    borderRadius?: number | string
  }) => {
    // 模拟 UnifiedIcon 的渲染逻辑
    if (iconType === 'BASE64' && iconData) {
      return (
        <div 
          data-testid="unified-icon" 
          data-icon-type="BASE64"
          style={{ 
            width: size, 
            height: size, 
            borderRadius,
            backgroundColor: iconBg || undefined 
          }}
        >
          <img src={iconData} alt={name || ''} data-testid="icon-img" />
        </div>
      )
    }
    return (
      <div 
        data-testid="unified-icon" 
        data-icon-type="AUTO"
        style={{ width: size, height: size, borderRadius }}
      >
        <span data-testid="favicon">{name?.charAt(0) || '?'}</span>
      </div>
    )
  },
}))

describe('EngineOption', () => {
  const mockEngine: SearchEngineConfig = {
    id: 'test-engine',
    name: '测试引擎',
    urlTemplate: 'https://test.com/search?q={query}',
    domain: 'test.com',
    isPreset: true,
  }

  const mockOnClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render engine name', () => {
    render(
      <EngineOption
        engine={mockEngine}
        isSelected={false}
        onClick={mockOnClick}
      />
    )

    expect(screen.getByText('测试引擎')).toBeInTheDocument()
  })

  it('should call onClick when clicked', () => {
    render(
      <EngineOption
        engine={mockEngine}
        isSelected={false}
        onClick={mockOnClick}
      />
    )

    fireEvent.click(screen.getByRole('button'))
    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })

  it('should show selected state', () => {
    render(
      <EngineOption
        engine={mockEngine}
        isSelected={true}
        onClick={mockOnClick}
      />
    )

    const button = screen.getByRole('button')
    expect(button.className).toContain('ring-2')
  })

  it('should render custom icon when syncedIcon is provided', () => {
    const syncedIcon = {
      iconType: 'BASE64' as const,
      iconData: 'data:image/png;base64,test',
      iconUrl: null,
      iconBg: '#ff0000',
      sourceBookmarkId: 'bookmark-1',
    }

    render(
      <EngineOption
        engine={mockEngine}
        isSelected={false}
        syncedIcon={syncedIcon}
        onClick={mockOnClick}
      />
    )

    // 使用 data-testid 查找图片元素
    const img = screen.getByTestId('icon-img')
    expect(img).toHaveAttribute('src', 'data:image/png;base64,test')
  })

  it('should show fallback letter when icon fails to load', () => {
    render(
      <EngineOption
        engine={mockEngine}
        isSelected={false}
        onClick={mockOnClick}
      />
    )

    // Favicon 组件会显示首字母
    expect(screen.getByTestId('favicon')).toHaveTextContent('测')
  })

  it('should truncate long engine names', () => {
    const longNameEngine: SearchEngineConfig = {
      ...mockEngine,
      name: '这是一个非常非常长的搜索引擎名称',
    }

    render(
      <EngineOption
        engine={longNameEngine}
        isSelected={false}
        onClick={mockOnClick}
      />
    )

    const nameElement = screen.getByText('这是一个非常非常长的搜索引擎名称')
    expect(nameElement.className).toContain('truncate')
  })
})

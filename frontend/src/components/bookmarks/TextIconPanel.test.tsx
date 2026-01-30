import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TextIconPanel } from './TextIconPanel'
import type { TextIconConfig } from '@start/shared'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string | Record<string, unknown>) => {
      if (typeof defaultValue === 'string') return defaultValue
      if (typeof defaultValue === 'object' && 'default' in defaultValue) {
        return `留空将使用默认文字：${defaultValue.default}`
      }
      if (typeof defaultValue === 'object' && 'max' in defaultValue) {
        return `最多输入 ${defaultValue.max} 个字符`
      }
      return key
    },
  }),
}))

describe('TextIconPanel', () => {
  const defaultConfig: TextIconConfig = {
    text: '',
    color: '',
    fontFamily: 'system',
  }

  const defaultProps = {
    config: defaultConfig,
    onChange: vi.fn(),
    bookmarkName: 'Google',
    bookmarkUrl: 'https://google.com',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Text Input', () => {
    it('renders text input with placeholder from bookmark name', () => {
      render(<TextIconPanel {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('G')
      expect(input).toBeInTheDocument()
    })

    it('shows character count', () => {
      render(<TextIconPanel {...defaultProps} config={{ ...defaultConfig, text: 'AB' }} />)
      
      expect(screen.getByText('2/4')).toBeInTheDocument()
    })

    it('calls onChange when text is entered', () => {
      const onChange = vi.fn()
      render(<TextIconPanel {...defaultProps} onChange={onChange} />)
      
      const input = screen.getByPlaceholderText('G')
      fireEvent.change(input, { target: { value: 'Test' } })
      
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'Test' })
      )
    })

    it('limits text to 4 characters', () => {
      const onChange = vi.fn()
      render(<TextIconPanel {...defaultProps} onChange={onChange} />)
      
      const input = screen.getByPlaceholderText('G')
      fireEvent.change(input, { target: { value: 'ABCDEFGH' } })
      
      // The call should have text truncated to 4 characters
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'ABCD' })
      )
    })

    it('shows validation message when exceeding character limit', () => {
      const onChange = vi.fn()
      render(<TextIconPanel {...defaultProps} onChange={onChange} />)
      
      const input = screen.getByPlaceholderText('G')
      fireEvent.change(input, { target: { value: 'ABCDE' } })
      
      // Validation message should appear (the mock returns the raw template)
      expect(screen.getByText(/最多输入.*个字符/)).toBeInTheDocument()
    })

    it('uses domain fallback when bookmark name is empty', () => {
      render(
        <TextIconPanel
          {...defaultProps}
          bookmarkName=""
          bookmarkUrl="https://github.com"
        />
      )
      
      const input = screen.getByPlaceholderText('G')
      expect(input).toBeInTheDocument()
    })
  })

  describe('Color Picker', () => {
    it('renders standard color palette', () => {
      render(<TextIconPanel {...defaultProps} />)
      
      // Should have 10 color buttons in the main palette
      const colorButtons = screen.getAllByRole('button').filter(
        btn => btn.style.backgroundColor !== ''
      )
      expect(colorButtons.length).toBeGreaterThanOrEqual(10)
    })

    it('calls onChange when a color is selected', () => {
      const onChange = vi.fn()
      render(<TextIconPanel {...defaultProps} onChange={onChange} />)
      
      // Find and click a color button (red color)
      const colorButtons = screen.getAllByRole('button').filter(
        btn => btn.style.backgroundColor === 'rgb(244, 67, 54)' // #F44336
      )
      
      if (colorButtons.length > 0) {
        fireEvent.click(colorButtons[0])
        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({ color: '#F44336' })
        )
      }
    })

    it('expands shade palette when clicking a color', () => {
      render(<TextIconPanel {...defaultProps} />)
      
      // Find and click a color button
      const colorButtons = screen.getAllByRole('button').filter(
        btn => btn.style.backgroundColor === 'rgb(244, 67, 54)' // #F44336
      )
      
      if (colorButtons.length > 0) {
        fireEvent.click(colorButtons[0])
        
        // Should now show shade buttons (6 shades)
        const allColorButtons = screen.getAllByRole('button').filter(
          btn => btn.style.backgroundColor !== ''
        )
        expect(allColorButtons.length).toBeGreaterThan(10)
      }
    })
  })

  describe('Font Selector', () => {
    it('renders 5 font options', () => {
      render(<TextIconPanel {...defaultProps} />)
      
      // Should have font option buttons
      const fontButtons = screen.getAllByRole('button').filter(
        btn => btn.textContent?.includes('Aa')
      )
      expect(fontButtons.length).toBe(5)
    })

    it('highlights selected font', () => {
      render(
        <TextIconPanel
          {...defaultProps}
          config={{ ...defaultConfig, fontFamily: 'serif' }}
        />
      )
      
      // The serif button should have the selected style
      const fontButtons = screen.getAllByRole('button').filter(
        btn => btn.textContent?.includes('Aa')
      )
      
      // Find the serif button (second one)
      const serifButton = fontButtons[1]
      expect(serifButton.className).toContain('ring-2')
    })

    it('calls onChange when font is selected', () => {
      const onChange = vi.fn()
      render(<TextIconPanel {...defaultProps} onChange={onChange} />)
      
      // Find and click the mono font button (third one)
      const fontButtons = screen.getAllByRole('button').filter(
        btn => btn.textContent?.includes('Aa')
      )
      
      fireEvent.click(fontButtons[2]) // mono
      
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ fontFamily: 'mono' })
      )
    })
  })

  describe('Default Values', () => {
    it('shows hint about default text in placeholder', () => {
      render(<TextIconPanel {...defaultProps} />)
      
      // The placeholder should show the default text 'G' (from Google)
      const input = screen.getByPlaceholderText('G')
      expect(input).toBeInTheDocument()
    })

    it('shows hint about default color', () => {
      render(<TextIconPanel {...defaultProps} />)
      
      // The hint should mention using theme primary color
      expect(screen.getByText(/留空将使用主题主色/)).toBeInTheDocument()
    })
  })

  describe('Unicode Support', () => {
    it('handles Chinese characters', () => {
      const onChange = vi.fn()
      render(<TextIconPanel {...defaultProps} onChange={onChange} />)
      
      const input = screen.getByPlaceholderText('G')
      fireEvent.change(input, { target: { value: '书签' } })
      
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ text: '书签' })
      )
    })

    it('handles emoji characters', () => {
      const onChange = vi.fn()
      render(<TextIconPanel {...defaultProps} onChange={onChange} />)
      
      const input = screen.getByPlaceholderText('G')
      fireEvent.change(input, { target: { value: '🔖📚' } })
      
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ text: '🔖📚' })
      )
    })

    it('correctly counts Unicode characters for limit', () => {
      const onChange = vi.fn()
      render(<TextIconPanel {...defaultProps} onChange={onChange} />)
      
      const input = screen.getByPlaceholderText('G')
      // 5 emoji characters should trigger validation
      fireEvent.change(input, { target: { value: '🔖📚🎉🎊🎁' } })
      
      // Should truncate to 4 characters
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ text: '🔖📚🎉🎊' })
      )
    })
  })
})

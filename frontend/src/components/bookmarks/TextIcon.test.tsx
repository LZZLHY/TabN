import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TextIcon, calculateFontSize, FONT_FAMILIES } from './TextIcon'

describe('TextIcon', () => {
  describe('calculateFontSize', () => {
    it('should return 55% of size for single character', () => {
      expect(calculateFontSize('A', 48)).toBe(26) // 48 * 0.55 = 26.4 → 26
      expect(calculateFontSize('中', 48)).toBe(26)
      expect(calculateFontSize('🎉', 48)).toBe(26)
    })

    it('should return 45% of size for two characters', () => {
      expect(calculateFontSize('AB', 48)).toBe(22) // 48 * 0.45 = 21.6 → 22
      expect(calculateFontSize('中文', 48)).toBe(22)
    })

    it('should return 35% of size for three characters', () => {
      expect(calculateFontSize('ABC', 48)).toBe(17) // 48 * 0.35 = 16.8 → 17
      expect(calculateFontSize('中文字', 48)).toBe(17)
    })

    it('should return 28% of size for four characters', () => {
      expect(calculateFontSize('ABCD', 48)).toBe(13) // 48 * 0.28 = 13.44 → 13
      expect(calculateFontSize('中文字符', 48)).toBe(13)
    })

    it('should return 55% of size for empty string', () => {
      expect(calculateFontSize('', 48)).toBe(26)
    })

    it('should handle different icon sizes', () => {
      expect(calculateFontSize('A', 64)).toBe(35) // 64 * 0.55 = 35.2 → 35
      expect(calculateFontSize('AB', 64)).toBe(29) // 64 * 0.45 = 28.8 → 29
      expect(calculateFontSize('ABC', 64)).toBe(22) // 64 * 0.35 = 22.4 → 22
      expect(calculateFontSize('ABCD', 64)).toBe(18) // 64 * 0.28 = 17.92 → 18
    })

    it('should correctly count Unicode characters including emoji', () => {
      // Emoji 应该被计为单个字符
      expect(calculateFontSize('🎉', 48)).toBe(26) // 1 char
      expect(calculateFontSize('🎉🎊', 48)).toBe(22) // 2 chars
      expect(calculateFontSize('A🎉B', 48)).toBe(17) // 3 chars
    })
  })

  describe('FONT_FAMILIES', () => {
    it('should have all required font families', () => {
      expect(FONT_FAMILIES).toHaveProperty('system')
      expect(FONT_FAMILIES).toHaveProperty('serif')
      expect(FONT_FAMILIES).toHaveProperty('mono')
      expect(FONT_FAMILIES).toHaveProperty('rounded')
      expect(FONT_FAMILIES).toHaveProperty('handwriting')
    })

    it('should have valid CSS font-family values', () => {
      expect(FONT_FAMILIES.system).toContain('sans-serif')
      expect(FONT_FAMILIES.serif).toContain('serif')
      expect(FONT_FAMILIES.mono).toContain('monospace')
      expect(FONT_FAMILIES.rounded).toContain('Nunito')
      expect(FONT_FAMILIES.handwriting).toContain('cursive')
    })
  })

  describe('TextIcon component', () => {
    it('should render text content', () => {
      render(<TextIcon text="A" />)
      expect(screen.getByText('A')).toBeInTheDocument()
    })

    it('should render placeholder for empty text', () => {
      render(<TextIcon text="" />)
      expect(screen.getByText('?')).toBeInTheDocument()
    })

    it('should truncate text to 4 characters', () => {
      render(<TextIcon text="ABCDEF" />)
      expect(screen.getByText('ABCD')).toBeInTheDocument()
      expect(screen.queryByText('ABCDEF')).not.toBeInTheDocument()
    })

    it('should render Unicode characters', () => {
      render(<TextIcon text="中文" />)
      expect(screen.getByText('中文')).toBeInTheDocument()
    })

    it('should render emoji', () => {
      render(<TextIcon text="🎉" />)
      expect(screen.getByText('🎉')).toBeInTheDocument()
    })

    it('should apply custom color', () => {
      render(<TextIcon text="A" color="#FF5733" />)
      const span = screen.getByText('A')
      expect(span).toHaveStyle({ color: '#FF5733' })
    })

    it('should apply custom font family', () => {
      render(<TextIcon text="A" fontFamily="serif" />)
      const span = screen.getByText('A')
      expect(span).toHaveStyle({ fontFamily: FONT_FAMILIES.serif })
    })

    it('should apply custom size', () => {
      const { container } = render(<TextIcon text="A" size={64} />)
      const div = container.firstChild as HTMLElement
      expect(div).toHaveStyle({ width: '64px', height: '64px' })
    })

    it('should apply bgStyle className', () => {
      const { container } = render(
        <TextIcon text="A" bgStyle={{ className: 'bg-primary/20' }} />
      )
      const div = container.firstChild as HTMLElement
      expect(div).toHaveClass('bg-primary/20')
    })

    it('should apply bgStyle inline styles', () => {
      const { container } = render(
        <TextIcon text="A" bgStyle={{ className: '', style: { backgroundColor: '#FF0000' } }} />
      )
      const div = container.firstChild as HTMLElement
      expect(div).toHaveStyle({ backgroundColor: '#FF0000' })
    })

    it('should apply additional className', () => {
      const { container } = render(<TextIcon text="A" className="custom-class" />)
      const div = container.firstChild as HTMLElement
      expect(div).toHaveClass('custom-class')
    })

    it('should use default values when props are not provided', () => {
      const { container } = render(<TextIcon text="A" />)
      const div = container.firstChild as HTMLElement
      const span = screen.getByText('A')
      
      // Default size is 48
      expect(div).toHaveStyle({ width: '48px', height: '48px' })
      // Default font is system
      expect(span).toHaveStyle({ fontFamily: FONT_FAMILIES.system })
      // Default font weight is 600
      expect(span).toHaveStyle({ fontWeight: '600' })
    })
  })
})

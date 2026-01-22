export type Rgb = [number, number, number]

export function hexToRgb(hex: string): Rgb | null {
  const raw = hex.trim().replace(/^#/, '')
  const normalized =
    raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null

  const n = parseInt(normalized, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return [r, g, b]
}

export function rgbToCssTriple([r, g, b]: Rgb): string {
  return `${r} ${g} ${b}`
}

function toLinear(c: number) {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

/**
 * 返回更适合“放在主题色上”的前景色（白/深色），用于计算 `--primary-fg`
 */
export function getReadableForeground(rgb: Rgb): Rgb {
  const [r, g, b] = rgb
  const L =
    0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)

  // L 越大越接近白；经验阈值 0.55 左右手感不错
  return L > 0.55 ? ([15, 23, 42] as Rgb) : ([255, 255, 255] as Rgb)
}











/**
 * 时长格式化工具函数
 * 
 * Requirements: 4.1, 4.2, 4.3
 * 
 * 根据时长范围返回不同格式：
 * - < 1小时: "X分钟 Y秒"
 * - >= 1小时 && < 1天: "X小时 Y分钟 Z秒"
 * - >= 1天: "X天 Y小时 Z分钟"
 */

const MS_PER_SECOND = 1000
const MS_PER_MINUTE = 60 * MS_PER_SECOND
const MS_PER_HOUR = 60 * MS_PER_MINUTE
const MS_PER_DAY = 24 * MS_PER_HOUR

/**
 * 格式化运行时长
 * @param ms 毫秒数
 * @returns 格式化后的字符串
 */
export function formatUptime(ms: number): string {
  // 处理负数和非数字
  if (!Number.isFinite(ms) || ms < 0) {
    ms = 0
  }

  const totalSeconds = Math.floor(ms / MS_PER_SECOND)
  const totalMinutes = Math.floor(ms / MS_PER_MINUTE)
  const totalHours = Math.floor(ms / MS_PER_HOUR)
  const days = Math.floor(ms / MS_PER_DAY)

  const seconds = totalSeconds % 60
  const minutes = totalMinutes % 60
  const hours = totalHours % 24

  // >= 1天: "X天 Y小时 Z分钟"
  if (ms >= MS_PER_DAY) {
    return `${days}天 ${hours}小时 ${minutes}分钟`
  }

  // >= 1小时 && < 1天: "X小时 Y分钟 Z秒"
  if (ms >= MS_PER_HOUR) {
    return `${totalHours}小时 ${minutes}分钟 ${seconds}秒`
  }

  // < 1小时: "X分钟 Y秒"
  return `${totalMinutes}分钟 ${seconds}秒`
}

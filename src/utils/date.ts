/**
 * 日期格式化工具函数
 */

/**
 * 格式化日期时间
 * @param date 日期字符串或日期对象
 * @param format 格式类型
 * @returns 格式化后的日期字符串
 */
export function formatDateTime(date: string | Date, format: 'datetime' | 'date' | 'time' = 'datetime'): string {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (isNaN(dateObj.getTime())) {
    return ''
  }
  
  const year = dateObj.getFullYear()
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getDate()).padStart(2, '0')
  const hours = String(dateObj.getHours()).padStart(2, '0')
  const minutes = String(dateObj.getMinutes()).padStart(2, '0')
  const seconds = String(dateObj.getSeconds()).padStart(2, '0')
  
  switch (format) {
    case 'date':
      return `${year}-${month}-${day}`
    case 'time':
      return `${hours}:${minutes}:${seconds}`
    case 'datetime':
    default:
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }
}

/**
 * 格式化日期
 * @param date 日期字符串或Date对象
 * @returns 格式化后的日期字符串 (YYYY-MM-DD)
 */
export function formatDate(date: string | Date): string {
  return formatDateTime(date, 'date')
}

/**
 * 格式化时间
 * @param date 日期字符串或Date对象
 * @returns 格式化后的时间字符串 (HH:mm:ss)
 */
export function formatTime(date: string | Date): string {
  return formatDateTime(date, 'time')
}

/**
 * 获取相对时间描述
 * @param date 日期字符串或Date对象
 * @returns 相对时间描述，如"刚刚"、"5分钟前"、"2小时前"等
 */
export function getRelativeTime(date: string | Date): string {
  if (!date) return ''
  
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''

  const now = new Date()
  const diff = now.getTime() - d.getTime()
  
  if (diff < 0) return '未来时间'
  
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  if (seconds < 60) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 30) return `${days}天前`
  if (months < 12) return `${months}个月前`
  return `${years}年前`
}

/**
 * 判断是否为今天
 * @param date 日期字符串或Date对象
 * @returns 是否为今天
 */
export function isToday(date: string | Date): boolean {
  if (!date) return false
  
  const d = new Date(date)
  if (isNaN(d.getTime())) return false

  const today = new Date()
  return d.toDateString() === today.toDateString()
}

/**
 * 判断是否为昨天
 * @param date 日期字符串或Date对象
 * @returns 是否为昨天
 */
export function isYesterday(date: string | Date): boolean {
  if (!date) return false
  
  const d = new Date(date)
  if (isNaN(d.getTime())) return false

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return d.toDateString() === yesterday.toDateString()
}

/**
 * 格式化相对时间
 * @param date 日期字符串或日期对象
 * @returns 相对时间字符串
 */
export function formatRelativeTime(date: string | Date): string {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = now.getTime() - dateObj.getTime()
  
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) {
    return `${days}天前`
  } else if (hours > 0) {
    return `${hours}小时前`
  } else if (minutes > 0) {
    return `${minutes}分钟前`
  } else {
    return '刚刚'
  }
} 
/**
 * 统一的日期时间格式化工具
 * 简化复杂的日期时间显示
 */

/**
 * 格式化日期时间为简化格式
 * @param dateString - 日期字符串或null/undefined
 * @returns 格式化后的日期时间字符串 (如: "2025-08-04 07:44")
 */
export const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Never'
  
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Invalid Date'
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

/**
 * 格式化日期为简化格式（不含时间）
 * @param dateString - 日期字符串或null/undefined
 * @returns 格式化后的日期字符串 (如: "2025-08-04")
 */
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Never'
  
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Invalid Date'
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

/**
 * 格式化为短日期格式（当年显示月-日，非当年显示年-月-日）
 * @param dateString - 日期字符串或null/undefined
 * @returns 格式化后的短日期字符串 (如: "08-04" 或 "2024-12-25")
 */
export const formatShortDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Never'
  
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Invalid Date'
  
  const now = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  
  // 如果是当年，只显示月-日
  if (year === now.getFullYear()) {
    return `${month}-${day}`
  }
  
  // 非当年显示完整年-月-日
  return `${year}-${month}-${day}`
}

/**
 * 格式化为相对时间（如: "2小时前", "3天前"）
 * @param dateString - 日期字符串或null/undefined
 * @returns 相对时间字符串
 */
export const formatRelativeTime = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Never'
  
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Invalid Date'
  
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffMinutes < 1) {
    return 'Just now'
  } else if (diffMinutes < 60) {
    return `${diffMinutes}min ago`
  } else if (diffHours < 24) {
    return `${diffHours}h ago`
  } else if (diffDays < 30) {
    return `${diffDays}d ago`
  } else {
    // 超过30天显示具体日期
    return formatShortDate(dateString)
  }
}

/**
 * 格式化时间范围为分离的日期和时间
 * @param dateString - 日期字符串或null/undefined
 * @returns 包含date和time的对象
 */
export const formatDateTimeSplit = (dateString: string | null | undefined): { date: string; time: string } => {
  if (!dateString) return { date: 'Never', time: '' }
  
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return { date: 'Invalid Date', time: '' }
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  
  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`
  }
}

/**
 * 仅格式化时间部分
 * @param dateString - 日期字符串或null/undefined
 * @returns 格式化后的时间字符串 (如: "07:44")
 */
export const formatTime = (dateString: string | null | undefined): string => {
  if (!dateString) return '--:--'
  
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '--:--'
  
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  
  return `${hours}:${minutes}`
}
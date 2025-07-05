import { ref, reactive, watch, type Ref } from 'vue'

export interface FilterConfig {
  key: string
  type: 'text' | 'select' | 'date'
  label: string
  placeholder?: string
  options?: Array<{ label: string; value: any }>
  debounce?: number // 防抖时间，默认500ms
}

export interface UseTableFiltersOptions {
  filters: FilterConfig[]
  onFilterChange?: (filters: Record<string, any>) => void
  debounceTime?: number
}

export function useTableFilters(options: UseTableFiltersOptions) {
  const { filters: filterConfigs, onFilterChange, debounceTime = 500 } = options
  
  // 创建响应式过滤器状态
  const filters = reactive<Record<string, any>>({})
  const searchInput = ref('')
  
  // 初始化过滤器默认值
  filterConfigs.forEach(config => {
    filters[config.key] = config.type === 'select' ? '' : ''
  })
  
  // 防抖定时器
  let debounceTimers: Record<string, NodeJS.Timeout> = {}
  
  // 处理过滤器变化
  const handleFilterChange = (key: string, value: any, immediate = false) => {
    filters[key] = value
    
    const config = filterConfigs.find(f => f.key === key)
    const shouldDebounce = config?.type === 'text' && !immediate
    const delay = config?.debounce ?? debounceTime
    
    if (shouldDebounce) {
      // 文本输入使用防抖
      if (debounceTimers[key]) {
        clearTimeout(debounceTimers[key])
      }
      debounceTimers[key] = setTimeout(() => {
        onFilterChange?.(filters)
      }, delay)
    } else {
      // 下拉选择立即执行
      onFilterChange?.(filters)
    }
  }
  
  // 重置所有过滤器
  const resetFilters = () => {
    // 清除所有防抖定时器
    Object.values(debounceTimers).forEach(timer => clearTimeout(timer))
    debounceTimers = {}
    
    // 重置过滤器值
    filterConfigs.forEach(config => {
      filters[config.key] = config.type === 'select' ? '' : ''
    })
    
    // 重置搜索输入
    searchInput.value = ''
    
    // 立即触发过滤器变化
    onFilterChange?.(filters)
  }
  
  // 设置过滤器值（用于外部设置）
  const setFilter = (key: string, value: any) => {
    filters[key] = value
  }
  
  // 获取当前活跃的过滤器
  const getActiveFilters = () => {
    const active: Record<string, any> = {}
    
    // 添加搜索输入
    if (searchInput.value.trim()) {
      active.search = searchInput.value.trim()
    }
    
    // 添加其他过滤器
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        active[key] = value
      }
    })
    
    return active
  }
  
  // 检查是否有活跃的过滤器
  const hasActiveFilters = () => {
    const active = getActiveFilters()
    return Object.keys(active).length > 0
  }
  
  return {
    filters,
    searchInput,
    filterConfigs,
    handleFilterChange,
    resetFilters,
    setFilter,
    getActiveFilters,
    hasActiveFilters
  }
}

// 常用过滤器配置
export const commonFilters = {
  status: {
    key: 'status',
    type: 'select' as const,
    label: 'Status',
    options: [
      { label: 'All Status', value: '' },
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' }
    ]
  },
  
  isOnline: {
    key: 'is_online',
    type: 'select' as const,
    label: 'Online Status',
    options: [
      { label: 'All', value: '' },
      { label: 'Online', value: true },
      { label: 'Offline', value: false }
    ]
  },
  
  isActive: {
    key: 'is_active',
    type: 'select' as const,
    label: 'Active Status',
    options: [
      { label: 'All Status', value: '' },
      { label: 'Active', value: true },
      { label: 'Inactive', value: false }
    ]
  }
}
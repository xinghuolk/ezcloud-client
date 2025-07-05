<script setup lang="ts">
import { computed } from 'vue'
import { useTableFilters, type FilterConfig } from '/@src/composables/useTableFilters'

interface Props {
  filters: FilterConfig[]
  onFilterChange?: (filters: Record<string, any>) => void
  debounceTime?: number
  showSearch?: boolean
  searchPlaceholder?: string
  showReset?: boolean
  resetText?: string
}

const props = withDefaults(defineProps<Props>(), {
  debounceTime: 500,
  showSearch: true,
  searchPlaceholder: '搜索...',
  showReset: true,
  resetText: '重置过滤器'
})

const emit = defineEmits<{
  filterChange: [filters: Record<string, any>]
  reset: []
}>()

// 使用 composable
const {
  filters: filterValues,
  searchInput,
  filterConfigs,
  handleFilterChange,
  resetFilters,
  getActiveFilters,
  hasActiveFilters
} = useTableFilters({
  filters: props.filters,
  onFilterChange: (filters) => {
    emit('filterChange', filters)
    props.onFilterChange?.(filters)
  },
  debounceTime: props.debounceTime
})

// 处理搜索输入变化
const handleSearchChange = () => {
  handleFilterChange('search', searchInput.value, false)
}

// 处理过滤器值变化
const handleFieldChange = (key: string, value: any) => {
  const config = filterConfigs.find(f => f.key === key)
  const immediate = config?.type !== 'text'
  handleFilterChange(key, value, immediate)
}

// 重置所有过滤器
const handleReset = () => {
  resetFilters()
  emit('reset')
}

// 计算列布局
const getColumnClass = computed(() => {
  const filterCount = props.filters.length
  const totalColumns = filterCount + (props.showSearch ? 1 : 0) + (props.showReset ? 1 : 0)
  
  if (totalColumns <= 4) return 'is-3'
  if (totalColumns <= 6) return 'is-2'
  return 'is-2'
})

defineExpose({
  getActiveFilters,
  hasActiveFilters,
  resetFilters: handleReset,
  searchInput,
  filterValues
})
</script>

<template>
  <div class="common-filter-section">
    <div class="columns is-multiline">
      <!-- 搜索输入框 -->
      <div v-if="showSearch" :class="`column ${getColumnClass}`">
        <VField>
          <VLabel>搜索</VLabel>
          <VControl>
            <VInput
              v-model="searchInput"
              :placeholder="searchPlaceholder"
              icon="lucide:search"
              @input="handleSearchChange"
            />
          </VControl>
        </VField>
      </div>

      <!-- 动态过滤器字段 -->
      <div 
        v-for="filter in filterConfigs" 
        :key="filter.key"
        :class="`column ${getColumnClass}`"
      >
        <VField>
          <VLabel>{{ filter.label }}</VLabel>
          <VControl>
            <!-- 文本输入 -->
            <VInput
              v-if="filter.type === 'text'"
              :model-value="filterValues[filter.key]"
              :placeholder="filter.placeholder || `输入${filter.label}`"
              @update:model-value="handleFieldChange(filter.key, $event)"
            />

            <!-- 下拉选择 -->
            <VSelect
              v-else-if="filter.type === 'select'"
              :model-value="filterValues[filter.key]"
              @update:model-value="handleFieldChange(filter.key, $event)"
            >
              <VOption
                v-for="option in filter.options || []"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </VOption>
            </VSelect>

            <!-- 日期选择 -->
            <VInput
              v-else-if="filter.type === 'date'"
              type="date"
              :model-value="filterValues[filter.key]"
              :placeholder="filter.placeholder || `选择${filter.label}`"
              @update:model-value="handleFieldChange(filter.key, $event)"
            />
          </VControl>
        </VField>
      </div>

      <!-- 重置按钮 -->
      <div v-if="showReset" :class="`column ${getColumnClass}`">
        <VField>
          <VLabel>&nbsp;</VLabel>
          <VControl>
            <VButton 
              @click="handleReset"
              :disabled="!hasActiveFilters()"
            >
              {{ resetText }}
            </VButton>
          </VControl>
        </VField>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.common-filter-section {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: var(--white);
  border-radius: var(--radius);
  border: 1px solid var(--fade-grey-light-3);

  .columns {
    margin-bottom: 0;

    .column {
      padding-bottom: 0;
    }
  }
}

.is-dark {
  .common-filter-section {
    background: var(--dark-sidebar);
    border-color: var(--dark-sidebar-light-12);
  }
}
</style>
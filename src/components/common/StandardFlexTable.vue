<script setup lang="ts">
import { ref, computed, watch } from 'vue'
// import type { VFlexTableWrapperDataResolver } from '/@src/components/base/table/VFlexTableWrapper.vue'
type VFlexTableWrapperDataResolver = Function

interface Props {
  columns: Record<string, any>
  data: any[] | VFlexTableWrapperDataResolver
  total?: number
  loading?: boolean
  searchable?: boolean
  sortable?: boolean
  selectable?: boolean
  pagination?: boolean
  itemsPerPage?: number
  maxLinksDisplayed?: number
}

const props = withDefaults(defineProps<Props>(), {
  total: 0,
  loading: false,
  searchable: true,
  sortable: true,
  selectable: false,
  pagination: true,
  itemsPerPage: 20,
  maxLinksDisplayed: 7
})

const emit = defineEmits<{
  selectionChange: [selection: any[]]
  rowClick: [row: any]
}>()

// 内部状态
const searchTerm = ref('')
const currentPage = ref(1)
const limit = ref(props.itemsPerPage)
const sort = ref('')
const selectedRows = ref<any[]>([])

// 计算属性
const isAsyncData = computed(() => typeof props.data === 'function')

// 本地数据过滤和排序
const processedData = computed(() => {
  if (isAsyncData.value) return []
  
  let result = [...(props.data as any[])]
  
  // 搜索过滤
  if (searchTerm.value && props.searchable) {
    const term = searchTerm.value.toLowerCase()
    result = result.filter(row => {
      return Object.values(row).some(value => 
        value && value.toString().toLowerCase().includes(term)
      )
    })
  }
  
  // 排序
  if (sort.value && props.sortable) {
    const [field, order] = sort.value.split(':')
    result.sort((a, b) => {
      const aVal = a[field]
      const bVal = b[field]
      
      if (aVal === bVal) return 0
      
      const comparison = aVal < bVal ? -1 : 1
      return order === 'desc' ? -comparison : comparison
    })
  }
  
  return result
})

const totalItems = computed(() => {
  if (isAsyncData.value) return props.total
  return processedData.value.length
})

const paginatedData = computed(() => {
  if (isAsyncData.value) return []
  if (!props.pagination) return processedData.value
  
  const start = (currentPage.value - 1) * limit.value
  return processedData.value.slice(start, start + limit.value)
})

// 处理选择变化
const handleSelectionChange = (selection: any[]) => {
  selectedRows.value = selection
  emit('selectionChange', selection)
}

// 处理行点击
const handleRowClick = (row: any) => {
  emit('rowClick', row)
}

// 重置分页当搜索或排序变化时
watch([searchTerm, sort], () => {
  currentPage.value = 1
})
</script>

<template>
  <VFlexTableWrapper
    v-if="isAsyncData"
    v-model:page="currentPage"
    v-model:limit="limit"
    v-model:searchTerm="searchTerm"
    v-model:sort="sort"
    :columns="columns"
    :data="data as VFlexTableWrapperDataResolver"
    :total="total"
  >
    <template #default="wrapperState">
      <!-- 工具栏 -->
      <VFlexTableToolbar v-if="searchable">
        <template #left>
          <VField>
            <VControl icon="lucide:search">
              <VInput
                v-model="wrapperState.searchInput"
                type="text"
                placeholder="搜索..."
                class="is-rounded"
              />
            </VControl>
          </VField>
        </template>
        
        <template #right>
          <VField>
            <VControl>
              <VSelect v-model="wrapperState.limit" class="is-rounded">
                <VOption :value="10">10 条/页</VOption>
                <VOption :value="20">20 条/页</VOption>
                <VOption :value="50">50 条/页</VOption>
                <VOption :value="100">100 条/页</VOption>
              </VSelect>
            </VControl>
          </VField>
        </template>
      </VFlexTableToolbar>

      <!-- 表格 -->
      <VFlexTable 
        rounded 
        :clickable="!!$attrs.onRowClick"
        :selectable="selectable"
        @selection-change="handleSelectionChange"
        @row-click="handleRowClick"
      >
        <!-- 加载状态 -->
        <template #body>
          <div v-if="wrapperState.loading" class="flex-list-inner">
            <div v-for="key in wrapperState.limit" :key="key" class="flex-table-item">
              <VFlexTableCell v-for="(column, columnKey) in columns" :key="columnKey" :column="column">
                <VPlaceload v-if="column.media" width="40px" height="40px" />
                <VPlaceload v-else />
              </VFlexTableCell>
            </div>
          </div>
          
          <!-- 空状态 -->
          <div v-else-if="wrapperState.data.length === 0" class="flex-list-inner">
            <VPlaceholderSection
              title="暂无数据"
              subtitle="没有找到匹配的记录"
              class="my-6"
            />
          </div>
        </template>

        <!-- 自定义单元格内容 -->
        <template #body-cell="slotProps">
          <slot name="body-cell" v-bind="slotProps" />
        </template>
      </VFlexTable>

      <!-- 分页 -->
      <VFlexPagination
        v-if="pagination && wrapperState.total > wrapperState.limit"
        v-model:current-page="wrapperState.page"
        class="mt-6"
        :item-per-page="wrapperState.limit"
        :total-items="wrapperState.total"
        :max-links-displayed="maxLinksDisplayed"
        no-router
      />
    </template>
  </VFlexTableWrapper>

  <!-- 本地数据表格 -->
  <div v-else>
    <!-- 工具栏 -->
    <div v-if="searchable || pagination" class="flex-table-toolbar mb-4">
      <VField v-if="searchable">
        <VControl icon="lucide:search">
          <VInput
            v-model="searchTerm"
            type="text"
            placeholder="搜索..."
            class="is-rounded"
          />
        </VControl>
      </VField>
      
      <VField v-if="pagination" class="ml-auto">
        <VControl>
          <VSelect v-model="limit" class="is-rounded">
            <VOption :value="10">10 条/页</VOption>
            <VOption :value="20">20 条/页</VOption>
            <VOption :value="50">50 条/页</VOption>
            <VOption :value="100">100 条/页</VOption>
          </VSelect>
        </VControl>
      </VField>
    </div>

    <!-- 表格 -->
    <VFlexTable 
      :data="paginatedData"
      :columns="columns"
      rounded
      :clickable="!!$attrs.onRowClick"
      :selectable="selectable"
      @selection-change="handleSelectionChange"
      @row-click="handleRowClick"
    >
      <!-- 自定义单元格内容 -->
      <template #body-cell="slotProps">
        <slot name="body-cell" v-bind="slotProps" />
      </template>
    </VFlexTable>

    <!-- 分页 -->
    <VFlexPagination
      v-if="pagination && totalItems > limit"
      v-model:current-page="currentPage"
      class="mt-6"
      :item-per-page="limit"
      :total-items="totalItems"
      :max-links-displayed="maxLinksDisplayed"
      no-router
    />
  </div>
</template>

<style lang="scss" scoped>
.flex-table-toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

:deep(.flex-table-item) {
  &:hover {
    background-color: var(--fade-grey-light-2);
  }
}

:deep(.dark) {
  .flex-table-item {
    &:hover {
      background-color: var(--dark-sidebar-light-8);
    }
  }
}
</style>
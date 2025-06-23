<template>
  <div class="data-table">
    <!-- 表格头部操作区 -->
    <div class="table-header" v-if="showHeader">
      <div class="header-left">
        <slot name="header-left">
          <h3 v-if="title">{{ title }}</h3>
        </slot>
      </div>
      
      <div class="header-right">
        <slot name="header-actions">
          <!-- 搜索框 -->
          <el-input
            v-if="showSearch"
            v-model="searchValue"
            placeholder="Search..."
            :prefix-icon="Search"
            clearable
            @input="handleSearch"
            style="width: 200px; margin-right: 10px;"
          />
          
          <!-- 刷新按钮 -->
          <el-button
            v-if="showRefresh"
            :icon="Refresh"
            @click="handleRefresh"
            :loading="loading"
          >
            Refresh
          </el-button>
        </slot>
      </div>
    </div>

    <!-- 表格主体 -->
    <el-table
      :data="data"
      :loading="loading"
      v-bind="tableProps"
      @selection-change="handleSelectionChange"
      @sort-change="handleSortChange"
      style="width: 100%"
    >
      <slot></slot>
    </el-table>

    <!-- 分页器 -->
    <div class="table-footer" v-if="showPagination && pagination">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :page-sizes="pageSizes"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Search, Refresh } from '@element-plus/icons-vue'
import { debounce } from 'lodash-es'

interface Props {
  data: any[]
  loading?: boolean
  title?: string
  showHeader?: boolean
  showSearch?: boolean
  showRefresh?: boolean
  showPagination?: boolean
  pagination?: {
    page: number
    limit: number
    total: number
    pages: number
  }
  pageSizes?: number[]
  tableProps?: Record<string, any>
}

interface Emits {
  (event: 'search', value: string): void
  (event: 'refresh'): void
  (event: 'page-change', page: number): void
  (event: 'size-change', size: number): void
  (event: 'selection-change', selection: any[]): void
  (event: 'sort-change', sort: { prop: string; order: string }): void
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  loading: false,
  showHeader: true,
  showSearch: true,
  showRefresh: true,
  showPagination: true,
  pageSizes: () => [10, 20, 50, 100],
  tableProps: () => ({})
})

const emit = defineEmits<Emits>()

// 搜索值
const searchValue = ref('')

// 防抖搜索
const handleSearch = debounce((value: string) => {
  emit('search', value)
}, 300)

// 刷新
const handleRefresh = () => {
  emit('refresh')
}

// 分页变化
const handleCurrentChange = (page: number) => {
  emit('page-change', page)
}

const handleSizeChange = (size: number) => {
  emit('size-change', size)
}

// 选择变化
const handleSelectionChange = (selection: any[]) => {
  emit('selection-change', selection)
}

// 排序变化
const handleSortChange = (sort: { prop: string; order: string }) => {
  emit('sort-change', sort)
}

// 监听搜索值变化
watch(searchValue, (newValue) => {
  handleSearch(newValue)
})

// 监听分页变化
watch(() => props.pagination?.page, (newPage) => {
  if (newPage) {
    emit('page-change', newPage)
  }
})

watch(() => props.pagination?.limit, (newSize) => {
  if (newSize) {
    emit('size-change', newSize)
  }
})
</script>

<style scoped>
.data-table {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left h3 {
  margin: 0;
  color: #303133;
  font-size: 18px;
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.table-footer {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .table-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
  
  .header-right {
    justify-content: space-between;
  }
  
  .data-table {
    padding: 15px;
  }
}
</style> 
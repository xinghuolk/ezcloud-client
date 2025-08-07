<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useVendorStore } from '/@src/stores/vendors'
import { useUserSession } from '/@src/stores/user-session'
import type { Vendor, CreateVendorParams } from '/@src/api/types'
import { Notyf } from 'notyf'

definePage({
  meta: {
    requiresAuth: true,
    requiresAdmin: true
  }
})

const notyf = new Notyf()
const vendorStore = useVendorStore()
const userSession = useUserSession()

// State
const loading = ref(false)
const createDialogOpen = ref(false)
const editDialogOpen = ref(false)
const selectedVendor = ref<Vendor | null>(null)

// Delete confirmation
const deleteConfirmOpen = ref(false)
const selectedVendorForDelete = ref<Vendor | null>(null)

// Search debounce
let searchTimeout: NodeJS.Timeout | null = null

// Form data
const searchForm = reactive({
  search: '',
  page: 1,
  limit: 20
})

const vendorForm = reactive<CreateVendorParams>({
  name: '',
  description: ''
})

// Computed
const isAdmin = computed(() => userSession.isAnyAdmin)
const vendors = computed(() => vendorStore.vendors)
const pagination = computed(() => vendorStore.pagination)
const vendorCount = computed(() => vendorStore.vendorCount)
const activeCount = computed(() => vendorStore.activeVendors.length)

// Methods
const fetchVendors = async () => {
  loading.value = true
  try {
    await vendorStore.fetchVendors(searchForm)
  } finally {
    loading.value = false
  }
}

// Debounced search for text inputs
const handleDebouncedSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = setTimeout(() => {
    searchForm.page = 1
    fetchVendors()
  }, 500)
}

const handleReset = () => {
  searchForm.search = ''
  searchForm.page = 1
  fetchVendors()
}

const handleRefresh = () => {
  fetchVendors()
}

const openCreateDialog = () => {
  vendorForm.name = ''
  vendorForm.description = ''
  createDialogOpen.value = true
}

const openEditDialog = (vendor: Vendor) => {
  selectedVendor.value = vendor
  vendorForm.name = vendor.name
  vendorForm.description = vendor.description || ''
  editDialogOpen.value = true
}

const handleCreate = async () => {
  if (!vendorForm.name.trim()) {
    notyf.error('Please enter vendor name')
    return
  }

  const vendor = await vendorStore.createVendor(vendorForm)
  if (vendor) {
    createDialogOpen.value = false
    fetchVendors()
  }
}

const handleUpdate = async () => {
  if (!selectedVendor.value || !vendorForm.name.trim()) {
    notyf.error('Please enter vendor name')
    return
  }

  const vendor = await vendorStore.updateVendor(selectedVendor.value.id, vendorForm)
  if (vendor) {
    editDialogOpen.value = false
    selectedVendor.value = null
  }
}

const handleDelete = (vendor: Vendor) => {
  selectedVendorForDelete.value = vendor
  deleteConfirmOpen.value = true
}

const confirmDelete = async () => {
  if (!selectedVendorForDelete.value) return
  
  try {
    const success = await vendorStore.deleteVendor(selectedVendorForDelete.value.id)
    if (success) {
      fetchVendors()
    }
  } finally {
    deleteConfirmOpen.value = false
    selectedVendorForDelete.value = null
  }
}

// 使用统一的日期格式化工具
// const formatDate = formatDateTime  // 已导入

// Watch for filter changes
watch(() => searchForm.search, () => {
  handleDebouncedSearch()
})

// Watch for pagination limit changes
watch(() => searchForm.limit, () => {
  searchForm.page = 1
  fetchVendors()
})

// Lifecycle
onMounted(() => {
  fetchVendors()
})

useHead({
  title: 'Vendor Management - Ezen Cloud',
})
</script>

<template>
  <div class="common-page-layout">
    <!-- Page Header -->
    <div class="common-page-header">
      <div class="header-content">
        <div class="header-info">
          <h1 class="title is-3">Vendor Management</h1>
          <p class="subtitle is-6">Manage device vendors and manufacturers</p>
        </div>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="columns is-multiline mb-6">
      <div class="column is-6">
        <VCard class="has-text-centered">
          <h3 class="title is-4 common-text-primary">{{ vendorCount }}</h3>
          <p class="subtitle is-6">Total Vendors</p>
        </VCard>
      </div>
      <div class="column is-6">
        <VCard class="has-text-centered">
          <h3 class="title is-4 common-text-success">{{ activeCount }}</h3>
          <p class="subtitle is-6">Active Vendors</p>
        </VCard>
      </div>
    </div>

    <!-- Controls -->
    <VCard>
      <!-- Filter Section -->
      <div class="card-content">
        <div class="columns">
          <div class="column is-8">
            <VField>
              <VLabel>Search Vendors</VLabel>
              <VControl>
                <VInput
                  v-model="searchForm.search"
                  placeholder="Search by vendor name"
                  icon="lucide:search"
                />
              </VControl>
            </VField>
          </div>
          <div class="column is-4">
            <VField>
              <VLabel>&nbsp;</VLabel>
              <VControl>
                <div class="field is-grouped">
                  <div class="control">
                    <VButton @click="handleReset">
                      Reset Filters
                    </VButton>
                  </div>
                  <div class="control">
                    <VButton @click="handleRefresh" :loading="loading">
                      Refresh
                    </VButton>
                  </div>
                  <div v-if="isAdmin" class="control">
                    <VButton color="primary" @click="openCreateDialog">
                      Add Vendor
                    </VButton>
                  </div>
                </div>
              </VControl>
            </VField>
          </div>
        </div>
      </div>

      <!-- Vendor Table -->
      <VFlexTableWrapper
        :columns="{
          name: { 
            label: 'Vendor Name',
            searchable: true,
            sortable: true,
            bold: true,
            grow: true
          },
          description: { 
            label: 'Description',
            searchable: true,
            grow: 'lg'
          },
          status: { 
            label: 'Status',
            searchable: true,
            sortable: true,
            align: 'center'
          },
          created_at: { 
            label: 'Created Date',
            sortable: true
          },
          actions: { 
            label: 'Actions',
            align: 'end',
            grow: 'lg'
          }
        }"
        :data="vendors"
      >
        <template #default="wrapperState">
          <VFlexTableToolbar>
            <template #right>
              <VField>
                <VControl>
                  <VSelect v-model="searchForm.limit" class="is-rounded">
                    <VOption :value="10">10 条/页</VOption>
                    <VOption :value="20">20 条/页</VOption>
                    <VOption :value="50">50 条/页</VOption>
                    <VOption :value="100">100 条/页</VOption>
                  </VSelect>
                </VControl>
              </VField>
            </template>
          </VFlexTableToolbar>

          <VFlexTable rounded>
            <!-- 加载状态 -->
            <template #body>
              <div v-if="loading" class="flex-list-inner">
                <div v-for="key in 5" :key="key" class="flex-table-item">
                  <VFlexTableCell :column="{ grow: true }"><VPlaceload /></VFlexTableCell>
                  <VFlexTableCell :column="{ grow: 'xl' }"><VPlaceload /></VFlexTableCell>
                  <VFlexTableCell><VPlaceload width="80px" /></VFlexTableCell>
                  <VFlexTableCell><VPlaceload width="100px" /></VFlexTableCell>
                  <VFlexTableCell :column="{ align: 'end' }"><VPlaceload width="120px" /></VFlexTableCell>
                </div>
              </div>
              
              <!-- 空状态 -->
              <div v-else-if="wrapperState.data?.length === 0" class="flex-list-inner">
                <VPlaceholderSection
                  title="暂无厂商"
                  subtitle="请添加厂商或检查搜索条件"
                  class="my-6"
                />
              </div>
            </template>

            <template #body-cell="{ row: vendor, column }">
              <template v-if="column.key === 'name'">
                <VTextEllipsis width="150px" class="common-item-name dark-inverted">
                  {{ vendor?.name || 'Unknown' }}
                </VTextEllipsis>
              </template>

              <template v-if="column.key === 'description'">
                <VTextEllipsis width="300px" class="common-text-light">
                  {{ vendor.description || 'No description' }}
                </VTextEllipsis>
              </template>

              <template v-if="column.key === 'status'">
                <VTag
                  :color="vendor.is_active ? 'success' : 'danger'"
                  outlined
                  rounded
                >
                  {{ vendor.is_active ? 'Active' : 'Inactive' }}
                </VTag>
              </template>

              <template v-if="column.key === 'created_at'">
                <VDateTimeSplit :date-string="vendor.created_at" />
              </template>

              <template v-if="column.key === 'actions'">
                <div v-if="isAdmin" class="buttons">
                  <VButton 
                    color="primary" 
                    outlined
                    @click="openEditDialog(vendor)"
                  >
                    Edit
                  </VButton>
                  <VButton 
                    color="danger" 
                    outlined
                    @click="handleDelete(vendor)"
                  >
                    Delete
                  </VButton>
                </div>
                <span v-else class="common-text-light">-</span>
              </template>
            </template>
          </VFlexTable>
        </template>
      </VFlexTableWrapper>

      <!-- Pagination -->
      <VFlexPagination
        v-if="pagination.total > 0"
        v-model:current-page="pagination.page"
        :item-per-page="pagination.limit"
        :total-items="pagination.total"
        :max-links-displayed="7"
        no-router
        @update:current-page="(page) => { searchForm.page = page; fetchVendors() }"
      />
    </VCard>

    <!-- Create Vendor Modal -->
    <VModal :open="createDialogOpen" title="Add New Vendor" actions="right" cancelLabel="Cancel" @close="createDialogOpen = false">
      <template #content>
        <VField>
          <VLabel>Vendor Name *</VLabel>
          <VControl>
            <VInput
              v-model="vendorForm.name"
              placeholder="Enter vendor name"
            />
          </VControl>
        </VField>
        
        <VField>
          <VLabel>Description</VLabel>
          <VControl>
            <VTextarea
              v-model="vendorForm.description"
              placeholder="Enter vendor description (optional)"
              rows="3"
            />
          </VControl>
        </VField>
      </template>
      
      <template #action>
        <VButton color="primary" @click="handleCreate">
          Create Vendor
        </VButton>
      </template>
    </VModal>

    <!-- Edit Vendor Modal -->
    <VModal :open="editDialogOpen" title="Edit Vendor" actions="right" cancelLabel="Cancel" @close="editDialogOpen = false">
      <template #content>
        <VField>
          <VLabel>Vendor Name *</VLabel>
          <VControl>
            <VInput
              v-model="vendorForm.name"
              placeholder="Enter vendor name"
            />
          </VControl>
        </VField>
        
        <VField>
          <VLabel>Description</VLabel>
          <VControl>
            <VTextarea
              v-model="vendorForm.description"
              placeholder="Enter vendor description (optional)"
              rows="3"
            />
          </VControl>
        </VField>
      </template>
      
      <template #action>
        <VButton color="primary" @click="handleUpdate">
          Update Vendor
        </VButton>
      </template>
    </VModal>

    <!-- Delete Confirmation Modal -->
    <VModal
      :open="deleteConfirmOpen"
      title="Confirm Delete"
      size="small"
      actions="center"
      @close="() => { deleteConfirmOpen = false; selectedVendorForDelete = null }"
    >
      <template #content>
        <div class="has-text-centered">
          <iconify-icon 
            icon="lucide:trash-2" 
            class="has-text-danger"
            style="font-size: 3rem; margin-bottom: 1rem;"
          />
          <h3 class="title is-5">Delete Vendor</h3>
          <p class="subtitle is-6" v-if="selectedVendorForDelete">
            Are you sure you want to delete vendor <strong>"{{ selectedVendorForDelete.name }}"</strong>?
          </p>
          <p class="has-text-grey">
            This action cannot be undone.
          </p>
        </div>
      </template>
      
      <template #action>
        <VButton 
          color="danger"
          @click="confirmDelete"
        >
          Delete Vendor
        </VButton>
      </template>
    </VModal>
  </div>
</template>

<style lang="scss" scoped>
:deep(.field.is-grouped) {
  flex-wrap: wrap;
  gap: 0.5rem;
}

</style>
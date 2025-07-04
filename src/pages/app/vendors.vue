<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useVendorStore } from '/@src/stores/vendors'
import { useUserSession } from '/@src/stores/user-session'
import type { Vendor, CreateVendorParams } from '/@src/api/types'
import { Notyf } from 'notyf'

definePage({
  meta: {
    requiresAuth: true
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
const isAdmin = computed(() => userSession.isAdmin)
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

const handleSearch = () => {
  searchForm.page = 1
  fetchVendors()
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

const handleDelete = async (vendor: Vendor) => {
  if (!confirm(`Are you sure you want to delete vendor "${vendor.name}"?`)) {
    return
  }

  const success = await vendorStore.deleteVendor(vendor.id)
  if (success) {
    fetchVendors()
  }
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// Lifecycle
onMounted(() => {
  fetchVendors()
})

useHead({
  title: 'Vendor Management - EzCloud',
})
</script>

<template>
  <div class="page-content-inner">
    <!-- Page Header -->
    <div class="dashboard-header">
      <div class="header-content">
        <div>
          <h1 class="title is-3">Vendor Management</h1>
          <p class="subtitle is-6">Manage device vendors and manufacturers</p>
        </div>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="columns is-multiline mb-6">
      <div class="column is-6">
        <VCard class="has-text-centered">
          <h3 class="title is-4 text-primary">{{ vendorCount }}</h3>
          <p class="subtitle is-6">Total Vendors</p>
        </VCard>
      </div>
      <div class="column is-6">
        <VCard class="has-text-centered">
          <h3 class="title is-4 text-success">{{ activeCount }}</h3>
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
                    <VButton color="primary" @click="handleSearch">
                      Search
                    </VButton>
                  </div>
                  <div class="control">
                    <VButton @click="handleReset">
                      Reset
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
          name: 'Vendor Name',
          description: 'Description',
          status: 'Status',
          created_at: 'Created Date',
          actions: 'Actions'
        }"
        :data="vendors"
      >
        <template #default="wrapperState">
          <VFlexTable rounded>
            <template #body-cell="{ row: vendor, column }">
              <template v-if="column.key === 'name'">
                <span class="item-name dark-inverted">
                  {{ vendor?.name || 'Unknown' }}
                </span>
              </template>

              <template v-if="column.key === 'description'">
                <span>{{ vendor.description || '-' }}</span>
              </template>

              <template v-if="column.key === 'status'">
                <VTag 
                  :color="vendor.is_active ? 'success' : 'danger'"
                  outlined
                >
                  {{ vendor.is_active ? 'Active' : 'Inactive' }}
                </VTag>
              </template>

              <template v-if="column.key === 'created_at'">
                <span>{{ formatDate(vendor.created_at) }}</span>
              </template>

              <template v-if="column.key === 'actions'">
                <VButtons v-if="isAdmin">
                  <VButton 
                    size="medium"
                    color="primary" 
                    outlined
                    @click="openEditDialog(vendor)"
                  >
                    Edit
                  </VButton>
                  <VButton 
                    size="medium"
                    color="danger" 
                    outlined
                    @click="handleDelete(vendor)"
                  >
                    Delete
                  </VButton>
                </VButtons>
                <span v-else>-</span>
              </template>
            </template>
          </VFlexTable>
        </template>
      </VFlexTableWrapper>

      <!-- Pagination -->
      <VFlexPagination
        v-if="pagination.total > pagination.limit"
        v-model:current-page="pagination.page"
        :item-per-page="pagination.limit"
        :total-items="pagination.total"
        :max-links-displayed="7"
        no-router
        @update:current-page="fetchVendors"
      />
    </VCard>

    <!-- Create Vendor Modal -->
    <VModal :open="createDialogOpen" title="Add New Vendor" @close="createDialogOpen = false">
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
        <VButton @click="createDialogOpen = false">Cancel</VButton>
        <VButton color="primary" @click="handleCreate">
          Create Vendor
        </VButton>
      </template>
    </VModal>

    <!-- Edit Vendor Modal -->
    <VModal :open="editDialogOpen" title="Edit Vendor" @close="editDialogOpen = false">
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
        <VButton @click="editDialogOpen = false">Cancel</VButton>
        <VButton color="primary" @click="handleUpdate">
          Update Vendor
        </VButton>
      </template>
    </VModal>
  </div>
</template>

<style lang="scss" scoped>
.page-content-inner {
  padding: 2rem;
}

.dashboard-header {
  margin-bottom: 2rem;

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    > div:first-child {
      .title {
        color: var(--dark-text);
        margin-bottom: 0.5rem;
        line-height: 1.2;
      }

      .subtitle {
        color: var(--muted-grey);
        margin-top: 0;
        line-height: 1.4;
      }
    }
  }

  @media (max-width: 768px) {
    .header-content {
      flex-direction: column;
      gap: 1rem;
      text-align: center;
    }
  }
}

.text-primary {
  color: var(--primary) !important;
}

.text-success {
  color: var(--success) !important;
}

.text-danger {
  color: var(--danger) !important;
}

:deep(.flex-table-item) {
  padding: 1rem 0.75rem;
}

:deep(.field.is-grouped) {
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
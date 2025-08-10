<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useUserSession } from '/@src/stores/user-session'
import { userManagementApi } from '/@src/api'
import type { User, UserListParams } from '/@src/api/types'
import { notyf } from '/@src/api/request'

definePage({
  meta: {
    requiresAuth: true,
    requiresSuperAdmin: true
  }
})

const userSession = useUserSession()

// State
const loading = ref(false)
const createDialogOpen = ref(false)
const editDialogOpen = ref(false)
const selectedUser = ref<User | null>(null)
const users = ref<(User & { deviceCount: number })[]>([])
const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0
})

// Search debounce
let searchTimeout: NodeJS.Timeout | null = null

// Form data
const searchForm = reactive<UserListParams>({
  search: '',
  page: 1,
  limit: 20,
  role: undefined,
  is_active: undefined
})

const userForm = reactive({
  username: '',
  email: '',
  phone: '',
  password: '',
  role: 'user' as 'user' | 'admin',
  is_active: true
})


// Computed
const isSuperAdmin = computed(() => userSession.isSuperAdmin)
const currentUser = computed(() => userSession.user)
const isEditingSuperAdmin = computed(() => selectedUser.value?.role === 'super_admin')
const existingSuperAdminCount = computed(() => 
  users.value.filter(user => user.role === 'super_admin').length
)

// Table columns definition
const columns = {
  username: { key: 'username', label: 'Username', grow: true },
  email: { key: 'email', label: 'Email', grow: false },
  role: { key: 'role', label: 'Role' },
  status: { key: 'status', label: 'Status' },
  deviceCount: { key: 'deviceCount', label: 'Devices' },
  created_at: { key: 'created_at', label: 'Created' },
  actions: { key: 'actions', label: 'Actions', align: 'end' as const }
}

// Methods
const fetchUsers = async () => {
  loading.value = true
  try {
    const response = await userManagementApi.getUsers(searchForm)
    if (response.success && response.data) {
      users.value = response.data.users
      pagination.value = response.data.pagination
      // 确保页码和每页条数同步
      searchForm.page = response.data.pagination.page
      searchForm.limit = response.data.pagination.limit
    }
  } catch (error: any) {
    console.error('Failed to fetch users:', error)
    notyf.error('Failed to load users')
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
    fetchUsers()
  }, 500)
}

const handleReset = () => {
  searchForm.search = ''
  searchForm.role = undefined
  searchForm.is_active = undefined
  searchForm.page = 1
  fetchUsers()
}

const handleRefresh = () => {
  fetchUsers()
}

const handlePageChange = (newPage: number) => {
  searchForm.page = newPage
  fetchUsers()
}

const openCreateDialog = () => {
  userForm.username = ''
  userForm.email = ''
  userForm.phone = ''
  userForm.password = ''
  userForm.role = 'user'
  userForm.is_active = true
  createDialogOpen.value = true
}

const openEditDialog = (user: User) => {
  selectedUser.value = user
  userForm.username = user.username
  userForm.email = user.email
  userForm.phone = user.phone || ''
  userForm.password = '' // 重置密码字段
  // Super Admin的role保持不变，其他用户正常设置
  userForm.role = user.role === 'super_admin' ? 'admin' : user.role
  userForm.is_active = user.is_active
  editDialogOpen.value = true
}


const handleCreate = async () => {
  if (!userForm.username.trim() || !userForm.email.trim() || !userForm.password.trim()) {
    notyf.error('Please fill in all required fields')
    return
  }

  // 防止创建多个Super Admin（虽然UI不允许选择，但安全检查）
  if (userForm.role === 'super_admin' && existingSuperAdminCount.value > 0) {
    notyf.error('Only one Super Admin user is allowed')
    return
  }

  try {
    const response = await userManagementApi.createUser({
      username: userForm.username.trim(),
      email: userForm.email.trim(),
      phone: userForm.phone.trim() || undefined,
      password: userForm.password,
      role: userForm.role,
      is_active: userForm.is_active
    })
    
    if (response.success) {
      createDialogOpen.value = false
      notyf.success('User created successfully')
      fetchUsers()
    }
  } catch (error: any) {
    console.error('Failed to create user:', error)
    notyf.error(error.message || 'Failed to create user')
  }
}

const handleUpdate = async () => {
  if (!selectedUser.value || !userForm.username.trim() || !userForm.email.trim()) {
    notyf.error('Please fill in all required fields')
    return
  }

  try {
    // 更新用户基本信息
    const updateData: any = {
      username: userForm.username.trim(),
      email: userForm.email.trim(),
      phone: userForm.phone.trim() || undefined,
      // 保护Super Admin的role不被修改
      role: isEditingSuperAdmin.value ? selectedUser.value.role : userForm.role,
      is_active: userForm.is_active
    }

    const response = await userManagementApi.updateUser(selectedUser.value.id, updateData)
    
    if (response.success) {
      // 如果提供了新密码，同时重置密码
      if (userForm.password.trim()) {
        try {
          await userManagementApi.resetUserPassword(selectedUser.value.id, {
            new_password: userForm.password.trim()
          })
          notyf.success('User updated and password reset successfully')
        } catch (passwordError: any) {
          console.error('Failed to reset password:', passwordError)
          notyf.error('User updated but password reset failed')
        }
      } else {
        notyf.success('User updated successfully')
      }
      
      editDialogOpen.value = false
      fetchUsers()
    }
  } catch (error: any) {
    console.error('Failed to update user:', error)
    notyf.error(error.message || 'Failed to update user')
  }
}



// Watchers
watch(() => searchForm.search, handleDebouncedSearch)
watch(() => searchForm.role, () => {
  searchForm.page = 1
  fetchUsers()
})
watch(() => searchForm.is_active, () => {
  searchForm.page = 1
  fetchUsers()
})
watch(() => searchForm.limit, () => {
  searchForm.page = 1
  fetchUsers()
})

// Lifecycle
onMounted(() => {
  fetchUsers()
})
</script>

<template>
  <div class="common-page-layout">
    <!-- Page Header -->
    <div class="common-page-header">
      <div class="header-content">
        <div class="header-info">
          <h1 class="title is-3">User Management</h1>
          <p class="subtitle is-6">Manage platform users and permissions</p>
        </div>
      </div>
    </div>

    <!-- Controls and Table -->
    <VCard>
      <div class="card-content">
        <!-- Filter Section -->
        <div class="columns is-multiline mb-4">
          <div class="column is-4">
            <VField>
              <VLabel>Search</VLabel>
              <VControl>
                <VInput
                  v-model="searchForm.search"
                  placeholder="Search users..."
                  icon="lucide:search"
                />
              </VControl>
            </VField>
          </div>

          <div class="column is-2">
            <VField>
              <VLabel>Role</VLabel>
              <VControl>
                <VSelect v-model="searchForm.role">
                  <VOption value="">All Roles</VOption>
                  <VOption value="user">User</VOption>
                  <VOption value="admin">Admin</VOption>
                  <VOption value="super_admin">Super Admin</VOption>
                </VSelect>
              </VControl>
            </VField>
          </div>

          <div class="column is-2">
            <VField>
              <VLabel>Status</VLabel>
              <VControl>
                <VSelect v-model="searchForm.is_active">
                  <VOption value="">All Status</VOption>
                  <VOption :value="true">Active</VOption>
                  <VOption :value="false">Inactive</VOption>
                </VSelect>
              </VControl>
            </VField>
          </div>

          <div class="column is-4">
            <VField>
              <VLabel>&nbsp;</VLabel>
              <VField grouped>
                <VControl>
                  <VButton @click="handleRefresh" :loading="loading">
                    Refresh
                  </VButton>
                </VControl>

                <VControl>
                  <VButton
                    color="success"
                    @click="openCreateDialog"
                  >
                    <VIcon icon="lucide:plus" />
                    Add User
                  </VButton>
                </VControl>

                <VControl>
                  <VButton
                    color="light"
                    outlined
                    @click="handleReset"
                  >
                    Reset
                  </VButton>
                </VControl>
              </VField>
            </VField>
          </div>
        </div>
      </div>

      <!-- User List Table -->
      <div class="card-content pt-0">
      <VFlexTableWrapper
        :columns="columns"
        :data="users"
        :limit="searchForm.limit"
        :total="pagination.total"
      >
        <template #default="wrapperState">
          <VFlexTableToolbar>
            <template #right>
              <VField>
                <VControl>
                  <VSelect v-model="searchForm.limit" class="is-rounded">
                    <VOption :value="10">10 per page</VOption>
                    <VOption :value="20">20 per page</VOption>
                    <VOption :value="50">50 per page</VOption>
                    <VOption :value="100">100 per page</VOption>
                  </VSelect>
                </VControl>
              </VField>
            </template>
          </VFlexTableToolbar>

          <VFlexTable rounded>
            <!-- Loading state -->
            <template #body>
              <div v-if="loading" class="flex-list-inner">
                <div v-for="key in 5" :key="key" class="flex-table-item">
                  <VFlexTableCell :column="{ grow: true }"><VPlaceload /></VFlexTableCell>
                  <VFlexTableCell :column="{ grow: 'xl' }"><VPlaceload /></VFlexTableCell>
                  <VFlexTableCell><VPlaceload width="80px" /></VFlexTableCell>
                  <VFlexTableCell><VPlaceload width="80px" /></VFlexTableCell>
                  <VFlexTableCell><VPlaceload width="60px" /></VFlexTableCell>
                  <VFlexTableCell><VPlaceload width="100px" /></VFlexTableCell>
                  <VFlexTableCell :column="{ align: 'end' }"><VPlaceload width="120px" /></VFlexTableCell>
                </div>
              </div>
              
              <!-- Empty state -->
              <div v-else-if="wrapperState.data?.length === 0" class="flex-list-inner">
                <VPlaceholderSection
                  title="No Users Found"
                  subtitle="Please add users or check your search criteria"
                  class="my-6"
                />
              </div>
            </template>

            <template #body-cell="{ row: user, column }">
              <template v-if="column.key === 'username'">
                <VTextEllipsis width="150px" class="common-item-name dark-inverted">
                  {{ user?.username || 'Unknown' }}
                </VTextEllipsis>
              </template>

              <template v-if="column.key === 'email'">
                <VTextEllipsis width="160px" class="common-text-light">
                  {{ user.email || 'No email' }}
                </VTextEllipsis>
              </template>

              <template v-if="column.key === 'role'">
                <VTag
                  :color="user.role === 'super_admin' ? 'purple' : user.role === 'admin' ? 'success' : 'info'"
                  outlined
                  rounded
                >
                  {{ user.role === 'super_admin' ? 'Super Admin' : user.role === 'admin' ? 'Admin' : 'User' }}
                </VTag>
              </template>

              <template v-if="column.key === 'status'">
                <VTag
                  :color="user.is_active ? 'success' : 'danger'"
                  outlined
                  rounded
                >
                  {{ user.is_active ? 'Active' : 'Inactive' }}
                </VTag>
              </template>

              <template v-if="column.key === 'deviceCount'">
                <span class="common-text-light">{{ user.deviceCount || 0 }}</span>
              </template>

              <template v-if="column.key === 'created_at'">
                <VDateTimeSplit :date-string="user.created_at" />
              </template>

              <template v-if="column.key === 'actions'">
                <VButton 
                  v-if="isSuperAdmin"
                  color="primary" 
                  outlined
                  @click="openEditDialog(user)"
                >
                  <VIcon icon="lucide:edit" />
                  Edit
                </VButton>
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
          @update:current-page="handlePageChange"
        />
      </div>
    </VCard>

    <!-- Create User Modal -->
    <VModal
      :open="createDialogOpen"
      title="Create New User"
      size="small"
      actions="right"
      @close="createDialogOpen = false"
    >
      <template #content>
        <VField>
          <VLabel>Username *</VLabel>
          <VControl>
            <VInput
              v-model="userForm.username"
              placeholder="Enter username"
            />
          </VControl>
        </VField>

        <VField>
          <VLabel>Email *</VLabel>
          <VControl>
            <VInput
              v-model="userForm.email"
              type="email"
              placeholder="Enter email"
            />
          </VControl>
        </VField>

        <VField>
          <VLabel>Phone</VLabel>
          <VControl>
            <VInput
              v-model="userForm.phone"
              placeholder="Enter phone number"
            />
          </VControl>
        </VField>

        <VField>
          <VLabel>Password *</VLabel>
          <VControl>
            <VInput
              v-model="userForm.password"
              type="password"
              placeholder="Enter password"
            />
          </VControl>
        </VField>

        <VField>
          <VLabel>Role</VLabel>
          <VControl>
            <VSelect v-model="userForm.role">
              <VOption value="user">User</VOption>
              <VOption value="admin">Admin</VOption>
            </VSelect>
          </VControl>
        </VField>

        <VField>
          <VControl>
            <VCheckbox v-model="userForm.is_active" label="Active" />
          </VControl>
        </VField>
      </template>

      <template #action>
        <VButton
          color="primary"
          @click="handleCreate"
        >
          Create User
        </VButton>
      </template>
    </VModal>

    <!-- Edit User Modal -->
    <VModal
      :open="editDialogOpen"
      title="Edit User"
      size="small"
      actions="right"
      @close="editDialogOpen = false"
    >
      <template #content>
        <VField>
          <VLabel>Username *</VLabel>
          <VControl>
            <VInput
              v-model="userForm.username"
              placeholder="Enter username"
            />
          </VControl>
        </VField>

        <VField>
          <VLabel>Email *</VLabel>
          <VControl>
            <VInput
              v-model="userForm.email"
              type="email"
              placeholder="Enter email"
            />
          </VControl>
        </VField>

        <VField>
          <VLabel>Phone</VLabel>
          <VControl>
            <VInput
              v-model="userForm.phone"
              placeholder="Enter phone number"
            />
          </VControl>
        </VField>

        <VField>
          <VLabel>New Password (optional)</VLabel>
          <VControl>
            <VInput
              v-model="userForm.password"
              type="password"
              placeholder="Leave empty to keep current password"
            />
          </VControl>
        </VField>

        <VField>
          <VLabel>Role</VLabel>
          <VControl>
            <VSelect 
              v-model="userForm.role" 
              :disabled="isEditingSuperAdmin"
            >
              <VOption value="user">User</VOption>
              <VOption value="admin">Admin</VOption>
            </VSelect>
          </VControl>
          <p v-if="isEditingSuperAdmin" class="help has-text-info">
            <VIcon icon="lucide:info" />
            Super Admin role cannot be changed for security reasons
          </p>
        </VField>

        <VField>
          <VControl>
            <VCheckbox v-model="userForm.is_active" label="Active" />
          </VControl>
        </VField>
      </template>

      <template #action>
        <VButton
          color="primary"
          @click="handleUpdate"
        >
          Update User
        </VButton>
      </template>
    </VModal>


  </div>
</template>

<style lang="scss" scoped>
// Using common page layout styles - no custom styles needed
</style>
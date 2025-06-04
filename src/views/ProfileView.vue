<template>
  <div class="profile-container">
    <el-card class="profile-card">
      <template #header>
        <div class="card-header">
          <h2>User Profile</h2>
          <p>Manage your account information</p>
        </div>
      </template>

      <el-tabs v-model="activeTab" type="border-card">
        <!-- Profile Information Tab -->
        <el-tab-pane label="Profile Information" name="profile">
          <el-form
            ref="profileFormRef"
            :model="profileForm"
            :rules="profileRules"
            label-width="120px"
            size="large"
          >
            <el-form-item label="Username" prop="username">
              <el-input
                v-model="profileForm.username"
                placeholder="Please enter username"
              />
            </el-form-item>

            <el-form-item label="Email">
              <el-input
                v-model="profileForm.email"
                disabled
                placeholder="Email cannot be changed"
              />
            </el-form-item>

            <el-form-item label="Phone" prop="phone">
              <el-input
                v-model="profileForm.phone"
                placeholder="Please enter phone number (optional)"
              />
            </el-form-item>

            <el-form-item label="Role">
              <el-tag :type="profileForm.role === 'admin' ? 'danger' : 'primary'">
                {{ profileForm.role === 'admin' ? 'Administrator' : 'User' }}
              </el-tag>
            </el-form-item>

            <el-form-item label="Status">
              <el-tag :type="profileForm.is_active ? 'success' : 'danger'">
                {{ profileForm.is_active ? 'Active' : 'Inactive' }}
              </el-tag>
            </el-form-item>

            <el-form-item label="Created At">
              <el-input
                :value="formatDate(profileForm.created_at)"
                disabled
              />
            </el-form-item>

            <el-form-item label="Last Login">
              <el-input
                :value="formatDate(profileForm.last_login_at)"
                disabled
              />
            </el-form-item>

            <el-form-item>
              <el-button
                type="primary"
                :loading="profileLoading"
                @click="handleUpdateProfile"
              >
                {{ profileLoading ? 'Updating...' : 'Update Profile' }}
              </el-button>
              <el-button @click="resetProfileForm">Reset</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- Change Password Tab -->
        <el-tab-pane label="Change Password" name="password">
          <el-form
            ref="passwordFormRef"
            :model="passwordForm"
            :rules="passwordRules"
            label-width="150px"
            size="large"
          >
            <el-form-item label="Current Password" prop="currentPassword">
              <el-input
                v-model="passwordForm.currentPassword"
                type="password"
                placeholder="Please enter current password"
                show-password
              />
            </el-form-item>

            <el-form-item label="New Password" prop="newPassword">
              <el-input
                v-model="passwordForm.newPassword"
                type="password"
                placeholder="Please enter new password"
                show-password
              />
            </el-form-item>

            <el-form-item label="Confirm Password" prop="confirmPassword">
              <el-input
                v-model="passwordForm.confirmPassword"
                type="password"
                placeholder="Please confirm new password"
                show-password
              />
            </el-form-item>

            <el-form-item>
              <el-button
                type="primary"
                :loading="passwordLoading"
                @click="handleChangePassword"
              >
                {{ passwordLoading ? 'Changing...' : 'Change Password' }}
              </el-button>
              <el-button @click="resetPasswordForm">Reset</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { authApi } from '@/api'
import { useUserStore } from '@/stores/user'
import type { User } from '@/api/types'

// Store
const userStore = useUserStore()

// Form refs
const profileFormRef = ref()
const passwordFormRef = ref()

// State
const activeTab = ref('profile')
const profileLoading = ref(false)
const passwordLoading = ref(false)

// Profile form
const profileForm = reactive<Partial<User>>({
  username: '',
  email: '',
  phone: '',
  role: 'user',
  is_active: true,
  created_at: '',
  last_login_at: ''
})

// Password form
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// Profile form validation rules
const profileRules = {
  username: [
    { required: true, message: 'Please enter username', trigger: 'blur' },
    { min: 3, max: 50, message: 'Username must be between 3-50 characters', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]+$/, message: 'Username can only contain letters, numbers and underscores', trigger: 'blur' }
  ],
  phone: [
    { pattern: /^[1-9]\d{10}$/, message: 'Please enter a valid phone number', trigger: 'blur' }
  ]
}

// Password form validation rules
const passwordRules = {
  currentPassword: [
    { required: true, message: 'Please enter current password', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: 'Please enter new password', trigger: 'blur' },
    { min: 6, message: 'Password must be at least 6 characters', trigger: 'blur' },
    { pattern: /^(?=.*[a-zA-Z])(?=.*\d)/, message: 'Password must contain at least one letter and one number', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: 'Please confirm new password', trigger: 'blur' },
    {
      validator: (rule: any, value: string, callback: Function) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('Password confirmation does not match'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// Format date
const formatDate = (dateString?: string) => {
  if (!dateString) return 'Never'
  return new Date(dateString).toLocaleString()
}

// Load user profile
const loadProfile = async () => {
  try {
    const response = await authApi.getProfile()
    if (response.success) {
      Object.assign(profileForm, response.data)
    }
  } catch (error) {
    console.error('Failed to load profile:', error)
    ElMessage.error('Failed to load profile information')
  }
}

// Handle update profile
const handleUpdateProfile = async () => {
  if (!profileFormRef.value) return

  try {
    await profileFormRef.value.validate()
    profileLoading.value = true

    const updateData = {
      username: profileForm.username,
      phone: profileForm.phone
    }

    const response = await authApi.updateProfile(updateData)
    
    if (response.success) {
      // Update user store
      userStore.updateUser(response.data)
      ElMessage.success('Profile updated successfully!')
    }

  } catch (error: any) {
    console.error('Failed to update profile:', error)
    ElMessage.error(error.message || 'Failed to update profile')
  } finally {
    profileLoading.value = false
  }
}

// Handle change password
const handleChangePassword = async () => {
  if (!passwordFormRef.value) return

  try {
    await passwordFormRef.value.validate()
    passwordLoading.value = true

    const response = await authApi.changePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    })

    if (response.success) {
      ElMessage.success('Password changed successfully!')
      resetPasswordForm()
    }

  } catch (error: any) {
    console.error('Failed to change password:', error)
    ElMessage.error(error.message || 'Failed to change password')
  } finally {
    passwordLoading.value = false
  }
}

// Reset profile form
const resetProfileForm = () => {
  if (userStore.userInfo) {
    Object.assign(profileForm, userStore.userInfo)
  }
}

// Reset password form
const resetPasswordForm = () => {
  Object.assign(passwordForm, {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  if (passwordFormRef.value) {
    passwordFormRef.value.clearValidate()
  }
}

// Initialize
onMounted(() => {
  if (userStore.userInfo) {
    Object.assign(profileForm, userStore.userInfo)
  } else {
    loadProfile()
  }
})
</script>

<style scoped>
.profile-container {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.profile-card {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}

.card-header {
  text-align: center;
}

.card-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
  font-weight: 600;
}

.card-header p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

:deep(.el-tabs__content) {
  padding: 20px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}

:deep(.el-input__inner) {
  border-radius: 6px;
}

:deep(.el-button) {
  border-radius: 6px;
  font-weight: 500;
}

.el-tag {
  font-weight: 500;
}
</style> 
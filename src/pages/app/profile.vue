<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useUserSession } from '/@src/stores/user-session'
import { Notyf } from 'notyf'

definePage({
  meta: {
    requiresAuth: true
  }
})

const userSession = useUserSession()
const notyf = new Notyf()

// State
const activeTab = ref('profile')
const profileLoading = ref(false)
const passwordLoading = ref(false)

// Profile form
const profileForm = reactive({
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

// Validation errors
const profileErrors = ref({
  username: '',
  phone: ''
})

const passwordErrors = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// Methods
const validateProfileForm = () => {
  profileErrors.value = { username: '', phone: '' }
  let isValid = true

  if (!profileForm.username.trim()) {
    profileErrors.value.username = 'Please enter username'
    isValid = false
  } else if (profileForm.username.length < 3) {
    profileErrors.value.username = 'Username must be at least 3 characters'
    isValid = false
  }

  if (profileForm.phone && !/^\+?[\d\s\-\(\)]{10,}$/.test(profileForm.phone)) {
    profileErrors.value.phone = 'Please enter a valid phone number'
    isValid = false
  }

  return isValid
}

const validatePasswordForm = () => {
  passwordErrors.value = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  }
  
  let isValid = true

  if (!passwordForm.currentPassword) {
    passwordErrors.value.currentPassword = 'Please enter current password'
    isValid = false
  }

  if (!passwordForm.newPassword) {
    passwordErrors.value.newPassword = 'Please enter new password'
    isValid = false
  } else if (passwordForm.newPassword.length < 6) {
    passwordErrors.value.newPassword = 'Password must be at least 6 characters'
    isValid = false
  } else if (!/^(?=.*[a-zA-Z])(?=.*\d)/.test(passwordForm.newPassword)) {
    passwordErrors.value.newPassword = 'Password must contain at least one letter and one number'
    isValid = false
  }

  if (!passwordForm.confirmPassword) {
    passwordErrors.value.confirmPassword = 'Please confirm new password'
    isValid = false
  } else if (passwordForm.confirmPassword !== passwordForm.newPassword) {
    passwordErrors.value.confirmPassword = 'Password confirmation does not match'
    isValid = false
  }

  return isValid
}

const loadProfile = () => {
  if (userSession.user) {
    Object.assign(profileForm, {
      username: userSession.user.username,
      email: userSession.user.email,
      phone: userSession.user.phone || '',
      role: userSession.user.role,
      is_active: userSession.user.is_active,
      created_at: userSession.user.created_at,
      last_login_at: userSession.user.last_login_at || ''
    })
  }
}

const handleUpdateProfile = async () => {
  if (!validateProfileForm()) {
    return
  }

  profileLoading.value = true
  try {
    const success = await userSession.updateProfile({
      username: profileForm.username,
      phone: profileForm.phone || undefined
    })

    if (success) {
      notyf.success('Profile updated successfully')
      loadProfile() // Reload the updated profile
    }
  } catch (error) {
    console.error('Error updating profile:', error)
  } finally {
    profileLoading.value = false
  }
}

const handleChangePassword = async () => {
  if (!validatePasswordForm()) {
    return
  }

  passwordLoading.value = true
  try {
    const success = await userSession.changePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    })

    if (success) {
      notyf.success('Password changed successfully')
      resetPasswordForm()
    }
  } catch (error) {
    console.error('Error changing password:', error)
  } finally {
    passwordLoading.value = false
  }
}

const resetProfileForm = () => {
  loadProfile()
  profileErrors.value = { username: '', phone: '' }
}

const resetPasswordForm = () => {
  Object.assign(passwordForm, {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  passwordErrors.value = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  }
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Lifecycle
onMounted(() => {
  loadProfile()
})

useHead({
  title: 'Profile - EzCloud'
})
</script>

<template>
  <div class="common-page-layout">
    <!-- Page Header -->
    <div class="common-page-header">
      <div class="header-content">
        <div class="header-info">
          <h1 class="title is-3">User Profile</h1>
          <p class="subtitle is-6">Manage your account information and settings</p>
        </div>
      </div>
    </div>

    <VCard radius="smooth">
      <VTabs 
        type="boxed"
        :selected="activeTab"
        :tabs="[
          { label: 'Profile Information', value: 'profile', icon: 'lucide:user' },
          { label: 'Change Password', value: 'password', icon: 'lucide:lock' }
        ]"
        @update:selected="activeTab = $event"
      >
        <template #tab="{ activeValue }">
          <!-- Profile Information Tab -->
          <div v-if="activeValue === 'profile'" class="tab-pane">
            <form @submit.prevent="handleUpdateProfile">
              <div class="columns is-multiline">
                <div class="column is-6">
                  <VField>
                    <VLabel>Username *</VLabel>
                    <VControl>
                      <VInput
                        v-model="profileForm.username"
                        placeholder="Please enter username"
                        :class="{ 'is-danger': profileErrors.username }"
                      />
                      <p v-if="profileErrors.username" class="help is-danger">
                        {{ profileErrors.username }}
                      </p>
                    </VControl>
                  </VField>
                </div>

                <div class="column is-6">
                  <VField>
                    <VLabel>Email</VLabel>
                    <VControl>
                      <VInput
                        v-model="profileForm.email"
                        disabled
                        placeholder="Email cannot be changed"
                      />
                    </VControl>
                  </VField>
                </div>

                <div class="column is-6">
                  <VField>
                    <VLabel>Phone</VLabel>
                    <VControl>
                      <VInput
                        v-model="profileForm.phone"
                        placeholder="Please enter phone number (optional)"
                        :class="{ 'is-danger': profileErrors.phone }"
                      />
                      <p v-if="profileErrors.phone" class="help is-danger">
                        {{ profileErrors.phone }}
                      </p>
                    </VControl>
                  </VField>
                </div>

                <div class="column is-6">
                  <VField>
                    <VLabel>Role</VLabel>
                    <VControl>
                      <VTag :color="profileForm.role === 'admin' ? 'danger' : 'primary'">
                        {{ profileForm.role === 'admin' ? 'Administrator' : 'User' }}
                      </VTag>
                    </VControl>
                  </VField>
                </div>

                <div class="column is-6">
                  <VField>
                    <VLabel>Account Status</VLabel>
                    <VControl>
                      <VTag :color="profileForm.is_active ? 'success' : 'danger'">
                        {{ profileForm.is_active ? 'Active' : 'Inactive' }}
                      </VTag>
                    </VControl>
                  </VField>
                </div>

                <div class="column is-6">
                  <VField>
                    <VLabel>Member Since</VLabel>
                    <VControl>
                      <VInput
                        :value="formatDate(profileForm.created_at)"
                        disabled
                      />
                    </VControl>
                  </VField>
                </div>

                <div class="column is-6">
                  <VField>
                    <VLabel>Last Login</VLabel>
                    <VControl>
                      <VInput
                        :value="formatDate(profileForm.last_login_at)"
                        disabled
                      />
                    </VControl>
                  </VField>
                </div>
              </div>

              <div class="form-actions">
                <VButton
                  type="submit"
                  color="primary"
                  raised
                  :loading="profileLoading"
                >
                  {{ profileLoading ? 'Updating...' : 'Update Profile' }}
                </VButton>
                <VButton @click="resetProfileForm">Reset</VButton>
              </div>
            </form>
          </div>

          <!-- Change Password Tab -->
          <div v-else-if="activeValue === 'password'" class="tab-pane">
            <form @submit.prevent="handleChangePassword">
              <div class="columns is-multiline">
                <div class="column is-12">
                  <VMessage color="info" class="mb-4">
                    <p>Your password must be at least 6 characters long and contain at least one letter and one number.</p>
                  </VMessage>
                </div>

                <div class="column is-12">
                  <VField>
                    <VLabel>Current Password *</VLabel>
                    <VControl>
                      <VInput
                        v-model="passwordForm.currentPassword"
                        type="password"
                        placeholder="Enter your current password"
                        :class="{ 'is-danger': passwordErrors.currentPassword }"
                      />
                      <p v-if="passwordErrors.currentPassword" class="help is-danger">
                        {{ passwordErrors.currentPassword }}
                      </p>
                    </VControl>
                  </VField>
                </div>

                <div class="column is-6">
                  <VField>
                    <VLabel>New Password *</VLabel>
                    <VControl>
                      <VInput
                        v-model="passwordForm.newPassword"
                        type="password"
                        placeholder="Enter new password"
                        :class="{ 'is-danger': passwordErrors.newPassword }"
                      />
                      <p v-if="passwordErrors.newPassword" class="help is-danger">
                        {{ passwordErrors.newPassword }}
                      </p>
                    </VControl>
                  </VField>
                </div>

                <div class="column is-6">
                  <VField>
                    <VLabel>Confirm New Password *</VLabel>
                    <VControl>
                      <VInput
                        v-model="passwordForm.confirmPassword"
                        type="password"
                        placeholder="Confirm new password"
                        :class="{ 'is-danger': passwordErrors.confirmPassword }"
                      />
                      <p v-if="passwordErrors.confirmPassword" class="help is-danger">
                        {{ passwordErrors.confirmPassword }}
                      </p>
                    </VControl>
                  </VField>
                </div>
              </div>

              <div class="form-actions">
                <VButton
                  type="submit"
                  color="primary"
                  raised
                  :loading="passwordLoading"
                >
                  {{ passwordLoading ? 'Changing...' : 'Change Password' }}
                </VButton>
                <VButton @click="resetPasswordForm">Reset</VButton>
              </div>
            </form>
          </div>
        </template>
      </VTabs>
    </VCard>
  </div>
</template>

<style lang="scss" scoped>


.tab-content {
  padding: 2rem 0;
}

.tab-pane {
  .form-actions {
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid var(--fade-grey-light-3);
    display: flex;
    gap: 1rem;
  }
}

:deep(.input[disabled]) {
  background-color: var(--fade-grey-light-6);
  color: var(--muted-grey);
  cursor: not-allowed;
}

:deep(.label) {
  font-weight: 600;
  color: var(--dark-text);
  margin-bottom: 0.5rem;
}

.is-dark {
  .form-actions {
    border-color: var(--dark-sidebar-light-12);
  }

  :deep(.input[disabled]) {
    background-color: var(--dark-sidebar-light-6);
    color: var(--dark-muted-grey);
  }
}

@media only screen and (max-width: 767px) {
  .page-content-inner {
    padding: 1rem;
  }

  .form-actions {
    flex-direction: column;

    .button {
      width: 100%;
    }
  }
}
</style>
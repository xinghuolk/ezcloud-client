<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useDeviceStore } from '/@src/stores/devices'
import { authApi } from '/@src/api'
import type { Device, DeviceTrustParams, DeviceTrusteeInfo, User } from '/@src/api/types'
import { Notyf } from 'notyf'

interface Props {
  device: Device
  open: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'updated'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const notyf = new Notyf()
const deviceStore = useDeviceStore()

// State
const loading = ref(false)
const trustees = ref<DeviceTrusteeInfo[]>([])
const activeTab = ref('current')
const emailValidating = ref(false)
const emailExists = ref<boolean | null>(null)
const emailCheckTimeout = ref<NodeJS.Timeout | null>(null)

// Form data
const trustForm = reactive({
  email: '',
  expires_at: '',
  notes: '',
  trustee_id: 0
})

// Computed
const isOwner = computed(() => props.device?.ownership?.isOwner)
const canManageTrust = computed(() => isOwner.value)

// Methods
const fetchTrustees = async () => {
  if (!props.device?.id) return
  
  loading.value = true
  try {
    const result = await deviceStore.getDeviceTrustees(props.device.id)
    trustees.value = result || []
  } catch (error) {
    console.error('Failed to fetch trustees:', error)
  } finally {
    loading.value = false
  }
}

// 防抖检查邮箱是否存在
const checkEmailExists = async (email: string) => {
  if (!email || !email.includes('@')) {
    emailExists.value = null
    return
  }

  emailValidating.value = true
  try {
    // 检查用户邮箱是否存在的API调用
    // const response = await authApi.checkUserExists({ email })
    // emailExists.value = response.data.exists
    // trustForm.trustee_id = response.data.user_id || 0
    
    // 临时模拟逻辑
    await new Promise(resolve => setTimeout(resolve, 500))
    emailExists.value = email.endsWith('@example.com') // 简单的模拟逻辑
  } catch (error) {
    console.error('Failed to check email:', error)
    emailExists.value = false
  } finally {
    emailValidating.value = false
  }
}

// 防抖邮箱验证
const debouncedEmailCheck = (email: string) => {
  if (emailCheckTimeout.value) {
    clearTimeout(emailCheckTimeout.value)
  }
  
  emailCheckTimeout.value = setTimeout(() => {
    checkEmailExists(email)
  }, 800)
}

const handleAddTrustee = async () => {
  if (!trustForm.email || !emailExists.value || !props.device?.id) {
    notyf.error('Please enter a valid email address')
    return
  }

  loading.value = true
  try {
    const params: DeviceTrustParams = {
      trustee_id: trustForm.trustee_id,
      expires_at: trustForm.expires_at || undefined,
      notes: trustForm.notes || undefined
    }

    const success = await deviceStore.trustDevice(props.device.id, params)
    if (success) {
      // 重置表单
      Object.assign(trustForm, {
        email: '',
        expires_at: '',
        notes: '',
        trustee_id: 0
      })
      emailExists.value = null
      // 刷新托管列表
      await fetchTrustees()
      emit('updated')
    }
  } catch (error) {
    console.error('Failed to add trustee:', error)
  } finally {
    loading.value = false
  }
}

const handleRemoveTrustee = async (trustee: DeviceTrusteeInfo) => {
  if (!props.device?.id) return

  loading.value = true
  try {
    const success = await deviceStore.untrustDevice(props.device.id, trustee.id)
    if (success) {
      await fetchTrustees()
      emit('updated')
    }
  } catch (error) {
    console.error('Failed to remove trustee:', error)
  } finally {
    loading.value = false
  }
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'success'
    case 'inactive':
      return 'warning' 
    case 'expired':
      return 'danger'
    default:
      return 'light'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'active':
      return 'Active'
    case 'inactive':
      return 'Inactive'
    case 'expired':
      return 'Expired'
    default:
      return 'Unknown'
  }
}

// Computed for email validation state
const emailValidationIcon = computed(() => {
  if (emailValidating.value) return 'lucide:loader-2'
  if (emailExists.value === true) return 'lucide:check'
  if (emailExists.value === false) return 'lucide:x'
  return null
})

const emailValidationColor = computed(() => {
  if (emailValidating.value) return 'info'
  if (emailExists.value === true) return 'success'
  if (emailExists.value === false) return 'danger'
  return null
})

// Watch for email input changes
watch(() => trustForm.email, (newEmail) => {
  if (newEmail !== '') {
    emailExists.value = null
    debouncedEmailCheck(newEmail)
  } else {
    emailExists.value = null
    if (emailCheckTimeout.value) {
      clearTimeout(emailCheckTimeout.value)
    }
  }
})

// Refresh trustees when device changes
watch(() => props.device?.id, (newId) => {
  if (newId && props.open) {
    fetchTrustees()
  }
})

// Fetch data when dialog opens
watch(() => props.open, (isOpen) => {
  if (isOpen && props.device?.id) {
    fetchTrustees()
  }
})
</script>

<template>
  <VModal 
    :open="open" 
    title="Device Trust Management" 
    size="large"
    actions="right"
    @close="emit('close')"
  >
    <template #content>
      <div v-if="!canManageTrust" class="notification is-warning">
        <div class="icon-text">
          <span class="icon">
            <iconify-icon icon="lucide:alert-triangle" />
          </span>
          <span>Only device owners can manage trust relationships</span>
        </div>
      </div>

      <div v-else>
        <VTabs 
          :selected="activeTab"
          :tabs="[
            { label: 'Current Trustees', value: 'current' },
            { label: 'Add New Trust', value: 'add' }
          ]"
          @update:selected="activeTab = $event"
        >
          <template #tab="{ activeValue }">
            <div v-if="activeValue === 'current'">
            <div class="tab-content">
              <!-- Trustees list -->
              <div v-if="loading" class="has-text-centered py-6">
                <VLoader size="medium" />
              </div>
              
              <div v-else-if="trustees.length === 0" class="has-text-centered py-6">
                <VPlaceholderSection
                  title="No Trust Relationships"
                  subtitle="This device has not been trusted to any users yet"
                  size="medium"
                />
              </div>

              <div v-else class="trustees-list">
                <VCard v-for="trustee in trustees" :key="trustee.id" class="trustee-item mb-4">
                  <div class="card-content">
                    <div class="media">
                      <div class="media-left">
                        <VAvatar :initials="trustee.username.charAt(0).toUpperCase()" />
                      </div>
                      <div class="media-content">
                        <div class="content">
                          <p class="title is-6">{{ trustee.username }}</p>
                          <p class="subtitle is-7 mb-2">{{ trustee.email }}</p>
                          <div class="tags">
                            <VTag 
                              :color="getStatusColor(trustee.status)"
                              size="small"
                            >
                              {{ getStatusText(trustee.status) }}
                            </VTag>
                            <VTag size="small" color="light">
                              Trusted: {{ formatDate(trustee.trusted_at) }}
                            </VTag>
                            <VTag 
                              v-if="trustee.expires_at" 
                              size="small" 
                              color="light"
                            >
                              Expires: {{ formatDate(trustee.expires_at) }}
                            </VTag>
                          </div>
                          <p v-if="trustee.notes" class="help">
                            Notes: {{ trustee.notes }}
                          </p>
                        </div>
                      </div>
                      <div class="media-right">
                        <VButton 
                          color="danger" 
                          size="small"
                          outlined
                          @click="handleRemoveTrustee(trustee)"
                          :loading="loading"
                        >
                          Remove Trust
                        </VButton>
                      </div>
                    </div>
                  </div>
                </VCard>
              </div>
            </div>
            </div>

            <div v-else-if="activeValue === 'add'">
            <div class="tab-content">
              <form @submit.prevent="handleAddTrustee">
                <VField>
                  <VLabel>User Email *</VLabel>
                  <VControl>
                    <VInput
                      v-model="trustForm.email"
                      type="email"
                      placeholder="Enter user email address"
                      icon="lucide:mail"
                    />
                    <!-- Email validation icon -->
                    <span v-if="emailValidationIcon" class="email-validation-icon">
                      <iconify-icon 
                        :icon="emailValidationIcon" 
                        :class="{
                          'spin': emailValidating,
                          [`text-${emailValidationColor}`]: emailValidationColor
                        }"
                      />
                    </span>
                  </VControl>
                  <p v-if="emailExists === false" class="help is-danger">
                    User with this email does not exist
                  </p>
                  <p v-else-if="emailExists === true" class="help is-success">
                    User found and can be trusted
                  </p>
                  <p v-else class="help">
                    Please enter the email address of the user you want to trust
                  </p>
                </VField>

                <VField>
                  <VLabel>Expiration Date</VLabel>
                  <VControl>
                    <VInput
                      v-model="trustForm.expires_at"
                      type="datetime-local"
                      icon="lucide:calendar"
                    />
                  </VControl>
                  <p class="help">Leave empty for permanent trust, will expire automatically after the set time</p>
                </VField>

                <VField>
                  <VLabel>Notes</VLabel>
                  <VControl>
                    <VTextarea
                      v-model="trustForm.notes"
                      placeholder="Trust reason or description (optional)"
                      rows="3"
                    />
                  </VControl>
                </VField>

                <VField grouped>
                  <VControl>
                    <VButton 
                      type="submit" 
                      color="primary"
                      :loading="loading"
                      :disabled="!emailExists"
                    >
                      Create Trust
                    </VButton>
                  </VControl>
                  <VControl>
                    <VButton @click="activeTab = 'current'">
                      Cancel
                    </VButton>
                  </VControl>
                </VField>
              </form>
            </div>
            </div>
          </template>
        </VTabs>
      </div>
    </template>

    <template #action>
      <VButton @click="emit('close')">Close</VButton>
    </template>
  </VModal>
</template>

<style lang="scss">
.trustees-list {
  .trustee-item {
    .media {
      align-items: center;
    }
    
    .tags {
      margin-bottom: 0.5rem;
      
      .tag {
        margin-right: 0.5rem;
        margin-bottom: 0.25rem;
      }
    }
  }
}

.tab-content {
  padding: 1.5rem 0;
}

.email-validation-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.2rem;
  z-index: 4;
  
  .spin {
    animation: spin 1s linear infinite;
  }
  
  .text-success {
    color: var(--success);
  }
  
  .text-danger {
    color: var(--danger);
  }
  
  .text-info {
    color: var(--info);
  }
}

@keyframes spin {
  from { transform: translateY(-50%) rotate(0deg); }
  to { transform: translateY(-50%) rotate(360deg); }
}

:deep(.control) {
  position: relative;
}
</style>
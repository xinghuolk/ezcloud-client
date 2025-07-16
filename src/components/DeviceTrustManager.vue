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
const availableUsers = ref<User[]>([])
const activeTab = ref('current')

// Form data
const trustForm = reactive<DeviceTrustParams & { username: string }>({
  trustee_id: 0,
  username: '',
  expires_at: '',
  notes: ''
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

const fetchAvailableUsers = async () => {
  try {
    // 这里需要一个获取用户列表的API，暂时使用空数组
    // const response = await authApi.getUsers()
    // availableUsers.value = response.data || []
    availableUsers.value = []
  } catch (error) {
    console.error('Failed to fetch users:', error)
  }
}

const handleAddTrustee = async () => {
  if (!trustForm.trustee_id || !props.device?.id) {
    notyf.error('请选择要托管的用户')
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
        trustee_id: 0,
        username: '',
        expires_at: '',
        notes: ''
      })
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
  return date.toLocaleDateString('zh-CN', {
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
      return '生效中'
    case 'inactive':
      return '已停用'
    case 'expired':
      return '已过期'
    default:
      return '未知'
  }
}

// 当设备信息更新时重新获取托管列表
watch(() => props.device?.id, (newId) => {
  if (newId && props.open) {
    fetchTrustees()
  }
})

// 当对话框打开时获取数据
watch(() => props.open, (isOpen) => {
  if (isOpen && props.device?.id) {
    fetchTrustees()
    fetchAvailableUsers()
  }
})
</script>

<template>
  <VModal 
    :open="open" 
    title="设备托管管理" 
    size="large"
    @close="emit('close')"
  >
    <template #content>
      <div v-if="!canManageTrust" class="notification is-warning">
        <div class="icon-text">
          <span class="icon">
            <iconify-icon icon="lucide:alert-triangle" />
          </span>
          <span>只有设备拥有者才能管理托管关系</span>
        </div>
      </div>

      <div v-else>
        <VTabs v-model="activeTab" type="boxed">
          <VTab id="current" label="当前托管">
            <div class="tab-content">
              <!-- 托管列表 -->
              <div v-if="loading" class="has-text-centered py-6">
                <VLoader size="medium" />
              </div>
              
              <div v-else-if="trustees.length === 0" class="has-text-centered py-6">
                <VPlaceholderSection
                  title="暂无托管关系"
                  subtitle="此设备尚未托管给任何用户"
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
                              托管时间：{{ formatDate(trustee.trusted_at) }}
                            </VTag>
                            <VTag 
                              v-if="trustee.expires_at" 
                              size="small" 
                              color="light"
                            >
                              过期时间：{{ formatDate(trustee.expires_at) }}
                            </VTag>
                          </div>
                          <p v-if="trustee.notes" class="help">
                            备注：{{ trustee.notes }}
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
                          取消托管
                        </VButton>
                      </div>
                    </div>
                  </div>
                </VCard>
              </div>
            </div>
          </VTab>

          <VTab id="add" label="新增托管">
            <div class="tab-content">
              <form @submit.prevent="handleAddTrustee">
                <VField>
                  <VLabel>托管用户 *</VLabel>
                  <VControl>
                    <VInput
                      v-model="trustForm.username"
                      placeholder="输入用户名或邮箱搜索用户"
                      icon="lucide:user"
                    />
                  </VControl>
                  <p class="help">请输入要托管给的用户的用户名或邮箱地址</p>
                </VField>

                <VField>
                  <VLabel>过期时间</VLabel>
                  <VControl>
                    <VInput
                      v-model="trustForm.expires_at"
                      type="datetime-local"
                      icon="lucide:calendar"
                    />
                  </VControl>
                  <p class="help">留空表示永久托管，到期后自动失效</p>
                </VField>

                <VField>
                  <VLabel>备注</VLabel>
                  <VControl>
                    <VTextarea
                      v-model="trustForm.notes"
                      placeholder="托管原因或说明（可选）"
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
                    >
                      创建托管
                    </VButton>
                  </VControl>
                  <VControl>
                    <VButton @click="activeTab = 'current'">
                      取消
                    </VButton>
                  </VControl>
                </VField>
              </form>
            </div>
          </VTab>
        </VTabs>
      </div>
    </template>

    <template #action>
      <VButton @click="emit('close')">关闭</VButton>
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
</style>
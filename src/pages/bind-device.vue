<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserSession } from '/@src/stores/user-session'
import { notyf } from '/@src/api/request'
import request from '/@src/api/request'

definePage({
  meta: {
    requiresAuth: false,
    layout: 'auth'
  }
})

const route = useRoute()
const router = useRouter()
const userSession = useUserSession()

// State
const loading = ref(false)
const bindLoading = ref(false)
const step = ref<'login' | 'bind' | 'success' | 'error'>('login')
const deviceInfo = ref<any>(null)
const bindToken = ref<string>('')
const errorMessage = ref<string>('')

// Login form
const loginForm = reactive({
  email: '',
  password: ''
})

const errors = ref({
  email: '',
  password: ''
})

// Parse token from URL and decode device info
const parseDeviceToken = () => {
  const token = route.query.token as string
  if (!token) {
    step.value = 'error'
    errorMessage.value = 'Invalid binding URL: Token parameter is missing'
    return
  }

  bindToken.value = token

  try {
    // Decode JWT token to get device information (without verification)
    const payload = JSON.parse(atob(token.split('.')[1]))
    
    // 适配优化版token字段结构 (d 替代 device)
    if (!payload.d) {
      step.value = 'error'
      errorMessage.value = 'Invalid token: Device information not found'
      return
    }

    // Check token expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      step.value = 'error'
      errorMessage.value = 'Binding token has expired. Please generate a new binding URL from the device.'
      return
    }

    // 转换优化版字段为前端期望的格式
    deviceInfo.value = {
      serial: payload.d.s,
      mac: payload.d.m,
      model: payload.d.md,
      hardware_id: payload.d.hw,
      firmware_version: payload.d.fw,
      timestamp: payload.d.ts,
      nonce: payload.d.n
    }
    
    // Check if user is already logged in
    if (userSession.isLoggedIn) {
      step.value = 'bind'
    } else {
      step.value = 'login'
    }
    
  } catch (error) {
    console.error('Failed to parse token:', error)
    step.value = 'error'
    errorMessage.value = 'Invalid token format'
  }
}

// Login validation
const validateLoginForm = () => {
  errors.value = { email: '', password: '' }
  let isValid = true

  if (!loginForm.email) {
    errors.value.email = 'Please enter your email'
    isValid = false
  } else if (!/\S+@\S+\.\S+/.test(loginForm.email)) {
    errors.value.email = 'Please enter a valid email address'
    isValid = false
  }

  if (!loginForm.password) {
    errors.value.password = 'Please enter your password'
    isValid = false
  } else if (loginForm.password.length < 6) {
    errors.value.password = 'Password must be at least 6 characters'
    isValid = false
  }

  return isValid
}

// Handle login for device binding
const handleLogin = async () => {
  if (!validateLoginForm()) {
    return
  }

  loading.value = true
  errors.value = { email: '', password: '' }

  try {
    const success = await userSession.loginUser({
      email: loginForm.email,
      password: loginForm.password
    })

    if (success) {
      notyf.success('Login successful!')
      step.value = 'bind'
    }
  } catch (error: any) {
    console.error('Login failed:', error)
    const errorMessage = error.message || 'Login failed'
    
    if (errorMessage.includes('Invalid email or password') || 
        errorMessage.includes('password') || errorMessage.includes('Password') ||
        errorMessage.includes('Invalid credentials') || errorMessage.includes('Authentication failed')) {
      errors.value.password = errorMessage
    } else if (errorMessage.includes('email') || errorMessage.includes('Email') || 
               errorMessage.includes('user not found') || errorMessage.includes('User not found')) {
      errors.value.email = errorMessage
    } else {
      errors.value.password = errorMessage
    }
  } finally {
    loading.value = false
  }
}

// Handle device binding
const handleBind = async () => {
  bindLoading.value = true

  try {
    const response = await request.post('/devices/bind/verify', {
      token: bindToken.value
    })

    console.log('Full API response:', response)
    
    // 处理统一响应格式：{success, message, data}
    if (response && typeof response === 'object' && 'success' in response) {
      // 标准响应格式：{success, message, data}
      const serverMessage = (response as any).message || ''
      console.log('Server message:', serverMessage)
      console.log('Success status:', (response as any).success)
      
      if ((response as any).success) {
        if (serverMessage.includes('already bound')) {
          step.value = 'error'
          errorMessage.value = serverMessage
          console.log('Device already bound case detected:', serverMessage)
        } else {
          step.value = 'success'
          notyf.success('Device bound successfully!')
          console.log('Device binding successful:', serverMessage)
        }
      } else {
        step.value = 'error'
        errorMessage.value = serverMessage || 'Binding failed'
      }
    } else {
      // 其他情况默认为成功
      console.log('Device binding completed:', response)
      step.value = 'success'
      notyf.success('Device bound successfully!')
    }
  } catch (error: any) {
    console.error('Device binding request failed:', error)
    step.value = 'error'
    
    // 从axios网络异常中提取服务器返回的具体错误信息，仅用于页面显示
    let serverErrorMessage = 'Network error or server unavailable'
    
    if (error.response && error.response.data) {
      // 服务器返回的错误信息
      serverErrorMessage = error.response.data.message || error.response.data.error || serverErrorMessage
    } else if (error.message && !error.message.includes('Request failed with status code')) {
      // 非HTTP状态码错误
      serverErrorMessage = error.message
    }
    
    // 只设置页面显示的错误消息，不手动显示通知（由HTTP拦截器处理）
    errorMessage.value = serverErrorMessage
  } finally {
    bindLoading.value = false
  }
}

// Navigate to devices page
const goToDevices = () => {
  router.push('/app/devices')
}

// Retry binding (go back to parse token)
const retryBinding = () => {
  parseDeviceToken()
}

onMounted(() => {
  parseDeviceToken()
})

useHead({
  title: 'Device Binding - Ezen Cloud'
})
</script>

<template>
  <div class="bind-container">
    <!-- Login Step -->
    <VCard v-if="step === 'login'" class="bind-card">
      <template #header>
        <div class="card-header">
          <iconify-icon icon="lucide:smartphone" class="device-icon" />
          <h2>Device Binding</h2>
          <p>Please login to bind this device to your account</p>
        </div>
      </template>
      
      <!-- Device Info Preview -->
      <div v-if="deviceInfo" class="device-preview">
        <h4>Device Information</h4>
        <div class="device-details">
          <div class="detail-item">
            <span class="label">Serial:</span>
            <span class="value">{{ deviceInfo.serial }}</span>
          </div>
          <div class="detail-item">
            <span class="label">MAC:</span>
            <span class="value">{{ deviceInfo.mac }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Model:</span>
            <span class="value">{{ deviceInfo.model || 'Unknown' }}</span>
          </div>
        </div>
      </div>
      
      <form @submit.prevent="handleLogin">
        <VField class="form-item">
          <VLabel>Email</VLabel>
          <VControl>
            <VInput
              v-model="loginForm.email"
              type="email"
              placeholder="Please enter your email"
              size="large"
              :class="{ 'is-danger': errors.email }"
            />
            <iconify-icon icon="lucide:user" class="form-icon" />
            <p v-if="errors.email" class="help is-danger">
              {{ errors.email }}
            </p>
          </VControl>
        </VField>
        
        <VField class="form-item">
          <VLabel>Password</VLabel>
          <VControl>
            <VInput
              v-model="loginForm.password"
              type="password"
              placeholder="Please enter your password"
              size="large"
              :class="{ 'is-danger': errors.password }"
            />
            <iconify-icon icon="lucide:lock" class="form-icon" />
            <p v-if="errors.password" class="help is-danger">
              {{ errors.password }}
            </p>
          </VControl>
        </VField>
        
        <VField class="form-item">
          <VButton
            type="submit"
            color="primary"
            size="big"
            fullwidth
            raised
            :loading="loading"
          >
            {{ loading ? 'Logging in...' : 'Login & Continue' }}
          </VButton>
        </VField>
      </form>
    </VCard>

    <!-- Bind Step -->
    <VCard v-else-if="step === 'bind'" class="bind-card">
      <template #header>
        <div class="card-header">
          <iconify-icon icon="lucide:link" class="bind-icon success" />
          <h2>Confirm Device Binding</h2>
          <p>Bind this device to your account</p>
        </div>
      </template>
      
      <div class="bind-confirmation">
        <div class="user-info">
          <h4>Account Information</h4>
          <div class="user-details">
            <div class="detail-item">
              <span class="label">User:</span>
              <span class="value">{{ userSession.user?.username }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Email:</span>
              <span class="value">{{ userSession.user?.email }}</span>
            </div>
          </div>
        </div>

        <div class="device-info">
          <h4>Device Information</h4>
          <div class="device-details">
            <div class="detail-item">
              <span class="label">Serial:</span>
              <span class="value">{{ deviceInfo.serial }}</span>
            </div>
            <div class="detail-item">
              <span class="label">MAC:</span>
              <span class="value">{{ deviceInfo.mac }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Model:</span>
              <span class="value">{{ deviceInfo.model || 'Unknown' }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Version:</span>
              <span class="value">{{ deviceInfo.firmware_version || 'Unknown' }}</span>
            </div>
          </div>
        </div>

        <VField class="form-item">
          <VButton
            color="primary"
            size="big"
            fullwidth
            raised
            :loading="bindLoading"
            @click="handleBind"
          >
            {{ bindLoading ? 'Binding Device...' : 'Confirm Binding' }}
          </VButton>
        </VField>
      </div>
    </VCard>

    <!-- Success Step -->
    <VCard v-else-if="step === 'success'" class="bind-card">
      <template #header>
        <div class="card-header">
          <iconify-icon icon="lucide:check-circle" class="success-icon" />
          <h2>Binding Successful!</h2>
          <p>Device has been successfully bound to your account</p>
        </div>
      </template>
      
      <div class="success-content">
        <div class="device-info">
          <h4>Bound Device</h4>
          <div class="device-details">
            <div class="detail-item">
              <span class="label">Serial:</span>
              <span class="value">{{ deviceInfo.serial }}</span>
            </div>
            <div class="detail-item">
              <span class="label">MAC:</span>
              <span class="value">{{ deviceInfo.mac }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Model:</span>
              <span class="value">{{ deviceInfo.model || 'Unknown' }}</span>
            </div>
          </div>
        </div>

        <VField class="form-item">
          <VButton
            color="primary"
            size="big"
            fullwidth
            raised
            @click="goToDevices"
          >
            Go to Device Management
          </VButton>
        </VField>
      </div>
    </VCard>

    <!-- Error Step -->
    <VCard v-else-if="step === 'error'" class="bind-card">
      <template #header>
        <div class="card-header">
          <iconify-icon icon="lucide:alert-circle" class="error-icon" />
          <h2>Binding Failed</h2>
          <p>Unable to bind device</p>
        </div>
      </template>
      
      <div class="error-content">
        <VMessage type="error">
          {{ errorMessage }}
        </VMessage>

        <VField class="form-item">
          <VButton
            color="primary"
            fullwidth
            outlined
            @click="retryBinding"
          >
            Retry
          </VButton>
        </VField>
      </div>
    </VCard>
  </div>
</template>

<style lang="scss" scoped>
.bind-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.bind-card {
  width: 100%;
  max-width: 500px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border-radius: var(--radius-large);
  border: none;
}

.card-header {
  text-align: center;
  padding: 1rem 0;

  .device-icon,
  .bind-icon,
  .success-icon,
  .error-icon {
    font-size: 3rem;
    margin-bottom: 0.5rem;
  }

  .device-icon {
    color: var(--primary);
  }

  .bind-icon.success {
    color: var(--success);
  }

  .success-icon {
    color: var(--success);
  }

  .error-icon {
    color: var(--danger);
  }

  h2 {
    margin: 0 0 8px 0;
    color: var(--dark-text);
    font-weight: 600;
    font-size: 1.5rem;
    line-height: 1.3;
  }

  p {
    margin: 0;
    color: var(--muted-grey);
    font-size: 0.9rem;
  }
}

.device-preview,
.bind-confirmation,
.success-content,
.error-content {
  margin-bottom: 1.5rem;
}

.device-preview {
  background: var(--fade-grey-light-2);
  border-radius: var(--radius);
  padding: 1rem;
  margin-bottom: 2rem;

  h4 {
    margin: 0 0 1rem 0;
    color: var(--dark-text);
    font-size: 1rem;
    font-weight: 600;
  }
}

.user-info,
.device-info {
  background: var(--fade-grey-light-2);
  border-radius: var(--radius);
  padding: 1rem;
  margin-bottom: 1rem;

  h4 {
    margin: 0 0 1rem 0;
    color: var(--dark-text);
    font-size: 1rem;
    font-weight: 600;
  }
}

.device-details,
.user-details {
  .detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--fade-grey-light-6);

    &:last-child {
      border-bottom: none;
    }

    .label {
      font-weight: 500;
      color: var(--muted-grey);
      font-size: 0.9rem;
    }

    .value {
      font-weight: 500;
      color: var(--dark-text);
      font-size: 0.9rem;
      font-family: var(--font-monospace);
    }
  }
}

.form-item {
  margin-bottom: 1.5rem;

  &:last-child {
    margin-bottom: 0;
  }
}

:deep(.form-icon) {
  position: absolute;
  top: 50%;
  left: 12px;
  transform: translateY(-50%);
  color: var(--muted-grey);
  font-size: 1.1rem;
  z-index: 1;
}

:deep(.input) {
  padding-left: 2.5rem;
  border-radius: var(--radius);
  font-size: 0.95rem;
  
  &.is-large {
    padding-left: 2.5rem;
  }
}

:deep(.button) {
  border-radius: var(--radius);
  font-weight: 500;
  transition: all 0.3s;
  
  &.is-fullwidth {
    justify-content: center;
  }
}

:deep(.label) {
  font-weight: 500;
  color: var(--dark-text);
  margin-bottom: 0.5rem;
}

.is-dark {
  .bind-container {
    background: linear-gradient(135deg, #2d3748 0%, #4a5568 100%);
  }
  
  .card-header {
    h2 {
      color: var(--dark-dark-text);
    }
  }

  .user-info,
  .device-info,
  .device-preview {
    background: var(--dark-sidebar-light-8);
  }
}

@media only screen and (max-width: 767px) {
  .bind-container {
    padding: 1rem;
  }

  .bind-card {
    max-width: 100%;
  }

  .card-header {
    h2 {
      font-size: 1.25rem;
    }

    .device-icon,
    .bind-icon,
    .success-icon,
    .error-icon {
      font-size: 2.5rem;
    }
  }
}
</style>
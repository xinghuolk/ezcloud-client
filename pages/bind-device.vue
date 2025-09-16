<script setup lang="ts">
import { ref, reactive, onMounted, nextTick, onBeforeUnmount, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserSession } from '/@src/stores/user-session'
import request from '/@src/api/request'
import { useAppConfig } from '/@src/stores/app-config'
import { useFormErrorHandler } from '/@src/composables/use-error-handler'

// reCAPTCHA 类型声明
declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void
      execute: (siteKey: string, options: { action: string }) => Promise<string>
      render: (element: string | Element, options: object) => number
      reset: (widgetId?: number) => void
      getResponse: (widgetId?: number) => string
      enterprise: {
        ready: (callback: () => void) => void
        execute: (siteKey: string, options: { action: string }) => Promise<string>
        render: (element: string | Element, options: object) => number
        reset: (widgetId?: number) => void
        getResponse: (widgetId?: number) => string
      }
    }
  }
}

definePage({
  meta: {
    requiresAuth: false,
    layout: 'auth'
  }
})

const route = useRoute()
const router = useRouter()
const userSession = useUserSession()
const appConfig = useAppConfig()

// Error handling
const { createFormErrors, clearFormErrors, setFieldError, handleError, showSuccess } = useFormErrorHandler()
const loginErrors = createFormErrors()

// State
const loading = ref(false)
const bindLoading = ref(false)
const step = ref<'login' | 'bind' | 'success' | 'error'>('login')
const deviceInfo = ref<any>(null)
const bindToken = ref<string>('')
const errorMessage = ref<string>('')

// reCAPTCHA v2 相关状态 (设备绑定登录)
const showRecaptchaV2 = ref(false)
const recaptchaV2WidgetId = ref<number | null>(null)
const recaptchaV2Challenge = ref<any>(null)

// reCAPTCHA Token缓存系统
const recaptchaTokenCache = reactive({
  v3Token: null as string | null,
  v3Timestamp: 0,
  v2Token: null as string | null,
  v2Timestamp: 0,
  lastAction: null as string | null,
  lastEmail: ''
})

// Token有效期 (5分钟)
const TOKEN_VALIDITY_PERIOD = 5 * 60 * 1000

// Login form
const loginForm = reactive({
  email: '',
  password: ''
})

// reCAPTCHA 配置（从预加载的store同步访问）
const recaptchaSiteKey = computed(() => appConfig.recaptchaSiteKey)

// === reCAPTCHA 相关函数 ===

// 缓存v3 token
const cacheV3Token = (token: string, action: string, email: string) => {
  recaptchaTokenCache.v3Token = token
  recaptchaTokenCache.v3Timestamp = Date.now()
  recaptchaTokenCache.lastAction = action
  recaptchaTokenCache.lastEmail = email
}

// 缓存v2 token
const cacheV2Token = (token: string, action: string, email: string) => {
  recaptchaTokenCache.v2Token = token
  recaptchaTokenCache.v2Timestamp = Date.now()
  recaptchaTokenCache.lastAction = action
  recaptchaTokenCache.lastEmail = email
}

// 检查缓存的token是否仍然有效
const isCachedTokenValid = (type: 'v3' | 'v2', action: string, email: string) => {
  const timestamp = type === 'v3' ? recaptchaTokenCache.v3Timestamp : recaptchaTokenCache.v2Timestamp
  const token = type === 'v3' ? recaptchaTokenCache.v3Token : recaptchaTokenCache.v2Token
  
  return token && 
         (Date.now() - timestamp < TOKEN_VALIDITY_PERIOD) &&
         recaptchaTokenCache.lastAction === action &&
         recaptchaTokenCache.lastEmail === email
}

// 执行reCAPTCHA v3验证
const executeRecaptcha = async (action: string) => {
  try {
    // 检查是否有有效的缓存token
    if (isCachedTokenValid('v3', action, loginForm.email)) {
      return recaptchaTokenCache.v3Token
    }
    
    if (typeof window.grecaptcha === 'undefined') {
      console.warn('reCAPTCHA not loaded yet')
      return null
    }

    // 检查配置是否可用
    if (!recaptchaSiteKey.value) {
      console.error('reCAPTCHA Site Key not configured')
      return null
    }

    return new Promise<string>((resolve) => {
      window.grecaptcha.ready(async () => {
        try {
          // 首先尝试使用 Enterprise API
          if (window.grecaptcha.enterprise) {
            console.log(`🔐 Executing reCAPTCHA Enterprise v3 for ${action}...`)
            const token = await window.grecaptcha.enterprise.execute(recaptchaSiteKey.value, { action })
            cacheV3Token(token, action, loginForm.email)
            resolve(token)
          } else {
            console.log(`🔐 Executing reCAPTCHA v3 for ${action}...`)
            const token = await window.grecaptcha.execute(recaptchaSiteKey.value, { action })
            cacheV3Token(token, action, loginForm.email)
            resolve(token)
          }
        } catch (error) {
          console.error('reCAPTCHA execution failed:', error)
          resolve('')
        }
      })
    })
  } catch (error) {
    console.error('executeRecaptcha error:', error)
    return null
  }
}

// reCAPTCHA v2 相关函数
const showRecaptchaV2Challenge = (challengeData: any) => {
  console.log('🔥 Showing reCAPTCHA v2 challenge')
  recaptchaV2Challenge.value = challengeData
  showRecaptchaV2.value = true
  
  nextTick(() => {
    initRecaptchaV2()
  })
}

const hideRecaptchaV2Challenge = () => {
  console.log('🔒 Hiding reCAPTCHA v2 challenge')
  showRecaptchaV2.value = false
  recaptchaV2Challenge.value = null
  if (recaptchaV2WidgetId.value !== null) {
    recaptchaV2WidgetId.value = null
  }
}

const initRecaptchaV2 = () => {
  if (typeof window.grecaptcha === 'undefined') {
    console.warn('reCAPTCHA not available for v2 widget')
    return
  }

  const recaptchaContainer = document.getElementById('bind-recaptcha-v2-container')
  if (!recaptchaContainer) {
    console.warn('reCAPTCHA v2 container not found')
    return
  }

  // 清除可能存在的旧widget
  recaptchaContainer.innerHTML = ''

  try {
    window.grecaptcha.ready(() => {
      recaptchaV2WidgetId.value = window.grecaptcha.render('bind-recaptcha-v2-container', {
        sitekey: recaptchaSiteKey.value,
        theme: 'light',
        size: 'normal',
        callback: onRecaptchaV2Success,
        'expired-callback': onRecaptchaV2Expired,
        'error-callback': onRecaptchaV2Error
      })
    })
  } catch (error) {
    console.error('Failed to initialize reCAPTCHA v2:', error)
  }
}

const onRecaptchaV2Success = (token: string) => {
  console.log('reCAPTCHA v2 completed successfully for device binding')
  // 自动提交登录表单
  handleLoginWithV2Token(token)
}

const onRecaptchaV2Expired = () => {
  console.log('reCAPTCHA v2 expired')
  handleError(new Error('Verification expired, please try again'))
  resetRecaptchaV2()
}

const onRecaptchaV2Error = () => {
  console.error('reCAPTCHA v2 error')
  handleError(new Error('Verification error, please try again'))
  resetRecaptchaV2()
}

const resetRecaptchaV2 = () => {
  if (recaptchaV2WidgetId.value !== null && typeof window.grecaptcha !== 'undefined') {
    window.grecaptcha.reset(recaptchaV2WidgetId.value)
  }
}

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
  clearFormErrors(loginErrors)
  let isValid = true

  if (!loginForm.email) {
    setFieldError(loginErrors, 'email', 'Please enter your email')
    isValid = false
  } else if (!/\S+@\S+\.\S+/.test(loginForm.email)) {
    setFieldError(loginErrors, 'email', 'Please enter a valid email address')
    isValid = false
  }

  if (!loginForm.password) {
    setFieldError(loginErrors, 'password', 'Please enter your password')
    isValid = false
  } else if (loginForm.password.length < 6) {
    setFieldError(loginErrors, 'password', 'Password must be at least 6 characters')
    isValid = false
  }

  return isValid
}

// Handle login for device binding with reCAPTCHA
const handleLogin = async () => {
  if (!validateLoginForm()) {
    return
  }

  loading.value = true
  // 清除之前的错误信息和reCAPTCHA v2挑战
  clearFormErrors(loginErrors)
  hideRecaptchaV2Challenge()

  try {
    // 执行 reCAPTCHA v3 验证
    const recaptchaToken = await executeRecaptcha('login')
    
    const success = await userSession.loginUser({
      email: loginForm.email,
      password: loginForm.password,
      recaptcha_token: recaptchaToken || undefined
    })

    if (success) {
      showSuccess('Login successful!')
      step.value = 'bind'
    }
  } catch (error: any) {
    console.error('Login failed:', error)
    console.log('🔍 错误详情 - status:', error.status, 'response.status:', error.response?.status)
    console.log('🔍 错误数据 - data:', error.data, 'response.data:', error.response?.data)
    
    // 检查是否是reCAPTCHA挑战响应（状态码423）
    const isRecaptchaChallenge = (error.status === 423 || error.response?.status === 423) && 
                                (error.data?.challenge_type === 'recaptcha_v2')
    
    if (isRecaptchaChallenge) {
      console.log('🔥 reCAPTCHA challenge detected - showing v2 verification')
      console.log('Challenge data:', error.data)
      handleError(error, { fallbackMessage: 'Please complete security verification and login again' })
      showRecaptchaV2Challenge(error.data)
    } else {
      // 处理其他错误
      const errorMessage = error.message || 'Login failed'
      
      if (errorMessage.includes('Invalid email or password') || 
          errorMessage.includes('password') || errorMessage.includes('Password') ||
          errorMessage.includes('Invalid credentials') || errorMessage.includes('Authentication failed')) {
        setFieldError(loginErrors, 'password', errorMessage)
      } else if (errorMessage.includes('email') || errorMessage.includes('Email') || 
                 errorMessage.includes('user not found') || errorMessage.includes('User not found')) {
        setFieldError(loginErrors, 'email', errorMessage)
      } else {
        setFieldError(loginErrors, 'password', errorMessage)
      }
    }
  } finally {
    loading.value = false
  }
}

// Handle login with reCAPTCHA v2 token
const handleLoginWithV2Token = async (v2Token: string) => {
  if (!validateLoginForm()) {
    return
  }

  loading.value = true
  // 清除之前的错误信息
  clearFormErrors(loginErrors)

  try {
    // 缓存v2 token用于后续使用
    cacheV2Token(v2Token, 'login', loginForm.email)
    
    const success = await userSession.loginUser({
      email: loginForm.email,
      password: loginForm.password,
      recaptcha_token: recaptchaV2Challenge.value?.recaptcha_result ? 
        (await executeRecaptcha('login')) || undefined : undefined, // 保持v3 token
      recaptcha_v2_token: v2Token // 添加v2 token参数
    })

    if (success) {
      showSuccess('Login successful!')
      hideRecaptchaV2Challenge() // 隐藏挑战界面
      step.value = 'bind'
    }
  } catch (error: any) {
    console.error('Login with v2 token failed:', error)
    const errorMessage = error.message || 'Login failed'
    
    if (errorMessage.includes('Invalid email or password') || 
        errorMessage.includes('password') || errorMessage.includes('Password') ||
        errorMessage.includes('Invalid credentials') || errorMessage.includes('Authentication failed')) {
      setFieldError(loginErrors, 'password', errorMessage)
    } else if (errorMessage.includes('email') || errorMessage.includes('Email') || 
               errorMessage.includes('user not found') || errorMessage.includes('User not found')) {
      setFieldError(loginErrors, 'email', errorMessage)
    } else {
      setFieldError(loginErrors, 'password', errorMessage)
    }
    
    // 重置v2验证
    resetRecaptchaV2()
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
          showSuccess('Device bound successfully!')
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
      showSuccess('Device bound successfully!')
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

// 动态加载reCAPTCHA脚本（参考auth/index.vue）
const loadRecaptchaScripts = () => {
  // 获取reCAPTCHA配置
  const siteKey = appConfig.recaptchaSiteKey
  const v2SiteKey = appConfig.recaptchaV2SiteKey
  
  if (siteKey) {
    // 加载reCAPTCHA Enterprise脚本
    const enterpriseScript = document.createElement('script')
    enterpriseScript.src = `https://www.google.com/recaptcha/enterprise.js?render=${siteKey}`
    enterpriseScript.defer = true
    enterpriseScript.onload = () => {
      console.log('✅ reCAPTCHA Enterprise脚本加载成功')
    }
    enterpriseScript.onerror = (error) => {
      console.error('❌ reCAPTCHA Enterprise脚本加载失败:', error)
    }
    document.head.appendChild(enterpriseScript)
  } else {
    console.warn('⚠️ RECAPTCHA_SITE_KEY未配置')
  }
  
  if (v2SiteKey) {
    // 加载reCAPTCHA v2脚本
    const v2Script = document.createElement('script')
    v2Script.src = 'https://www.google.com/recaptcha/api.js'
    v2Script.async = true
    v2Script.defer = true
    document.head.appendChild(v2Script)
    console.log('✅ reCAPTCHA v2脚本已加载')
  } else {
    console.warn('⚠️ RECAPTCHA_V2_SITE_KEY未配置')
  }
}

onMounted(() => {
  // 加载reCAPTCHA脚本
  loadRecaptchaScripts()
  // 解析设备Token
  parseDeviceToken()
})

onBeforeUnmount(() => {
  // 清理定时器和资源
  hideRecaptchaV2Challenge()
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
              :class="{ 'is-danger': loginErrors.email }"
            />
            <iconify-icon icon="lucide:user" class="form-icon" />
            <p v-if="loginErrors.email" class="help is-danger">
              {{ loginErrors.email }}
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
              :class="{ 'is-danger': loginErrors.password }"
            />
            <iconify-icon icon="lucide:lock" class="form-icon" />
            <p v-if="loginErrors.password" class="help is-danger">
              {{ loginErrors.password }}
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
            :disabled="showRecaptchaV2"
          >
            {{ loading ? 'Logging in...' : 'Login & Continue' }}
          </VButton>
        </VField>
      </form>
      
      <!-- reCAPTCHA v2 Challenge -->
      <Transition name="fade">
        <div v-if="showRecaptchaV2" class="recaptcha-challenge">
          <div class="challenge-header">
            <iconify-icon icon="lucide:shield-check" class="challenge-icon" />
            <h3>Additional Security Verification</h3>
            <p>{{ recaptchaV2Challenge?.data?.message || 'Please complete the verification below to continue' }}</p>
          </div>
          
          <div class="recaptcha-widget">
            <div id="bind-recaptcha-v2-container"></div>
          </div>
          
          <VButton
            color="light"
            fullwidth
            outlined
            @click="hideRecaptchaV2Challenge"
          >
            Cancel
          </VButton>
        </div>
      </Transition>
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

// reCAPTCHA v2 Challenge 样式
.recaptcha-challenge {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: var(--fade-grey-light-2);
  border-radius: var(--radius);
  border: 2px solid var(--primary);

  .challenge-header {
    text-align: center;
    margin-bottom: 1rem;

    .challenge-icon {
      font-size: 2rem;
      color: var(--primary);
      margin-bottom: 0.5rem;
    }

    h3 {
      margin: 0 0 0.5rem 0;
      color: var(--dark-text);
      font-weight: 600;
      font-size: 1.1rem;
    }

    p {
      margin: 0 0 1rem 0;
      color: var(--muted-grey);
      font-size: 0.9rem;
      line-height: 1.4;
    }
  }

  .recaptcha-widget {
    display: flex;
    justify-content: center;
    margin: 1.5rem 0;

    #bind-recaptcha-v2-container {
      transform: scale(1);
      transform-origin: center;
    }
  }
}

// Transition animations
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-20px);
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

  .recaptcha-challenge {
    background: var(--dark-sidebar-light-8);
    border-color: var(--primary);

    .challenge-header {
      h3 {
        color: var(--dark-dark-text);
      }

      p {
        color: var(--light-text);
      }
    }
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

  .recaptcha-challenge {
    padding: 1rem;

    .challenge-header {
      .challenge-icon {
        font-size: 1.75rem;
      }

      h3 {
        font-size: 1rem;
      }

      p {
        font-size: 0.85rem;
      }
    }

    .recaptcha-widget {
      margin: 1rem 0;

      #bind-recaptcha-v2-container {
        transform: scale(0.9);
        transform-origin: center;
      }
    }
  }
}
</style>
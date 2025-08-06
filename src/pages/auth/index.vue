<script setup lang="ts">
import { ref, reactive, computed, watch, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useUserSession } from '/@src/stores/user-session'
import { useUserToken } from '/@src/composables/user-token'
import { Notyf } from 'notyf'
import type { SendVerificationCodeParams, VerifyCodeParams, EnhancedRegisterParams } from '/@src/api/types'

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

const router = useRouter()
const userSession = useUserSession()
const notyf = new Notyf()

// State
const loading = ref(false)
const registerLoading = ref(false)
const showRegister = ref(false)

// reCAPTCHA v2 相关状态 (登录)
const showRecaptchaV2 = ref(false)
const recaptchaV2WidgetId = ref<number | null>(null)
const recaptchaV2Challenge = ref<any>(null)

// reCAPTCHA v2 相关状态 (注册)
const showRegisterRecaptchaV2 = ref(false)
const registerRecaptchaV2WidgetId = ref<number | null>(null)
const registerRecaptchaV2Challenge = ref<any>(null)

// 智能验证Token缓存系统
const recaptchaTokenCache = reactive({
  v3Token: null as string | null,
  v3Timestamp: 0,
  v2Token: null as string | null,
  v2Timestamp: 0,
  lastAction: null as string | null, // 'send_email' | 'registration'
  lastEmail: '' // 记录验证的邮箱地址
})

// Token有效期 (5分钟)
const TOKEN_VALIDITY_PERIOD = 5 * 60 * 1000

// Verification code states
const verificationCodeLoading = ref(false)
const codeCountdown = ref(0)
const countdownTimer = ref<number | null>(null)

// Code verification status
const codeVerification = reactive({
  status: 'idle', // idle, verifying, success, error
  message: '',
  isValid: false
})

// Login form
const loginForm = reactive({
  email: '',
  password: ''
})

// Register form  
const registerForm = reactive({
  username: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  verificationCode: ''
})

const errors = ref({
  email: '',
  password: ''
})

const registerErrors = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  verificationCode: ''
})

// Computed
const canSendCode = computed(() => {
  return registerForm.email && 
         /\S+@\S+\.\S+/.test(registerForm.email) && 
         codeCountdown.value === 0 &&
         !verificationCodeLoading.value
})

const countdownText = computed(() => {
  return codeCountdown.value > 0 ? `${codeCountdown.value}s` : 'Send Code'
})

const showVerificationField = computed(() => {
  return codeCountdown.value > 0 || codeVerification.isValid
})

const canSubmitRegistration = computed(() => {
  // 检查基本字段是否填写完整，但不显示错误消息
  const hasBasicInfo = registerForm.username.length >= 3 && 
                      registerForm.email && 
                      /\S+@\S+\.\S+/.test(registerForm.email) &&
                      registerForm.password.length >= 6 &&
                      registerForm.confirmPassword === registerForm.password
  
  return hasBasicInfo && codeVerification.isValid && !registerLoading.value
})

// Watch verification code input for auto-validation
watch(() => registerForm.verificationCode, async (newCode) => {
  if (newCode && newCode.length === 6 && /^\d{6}$/.test(newCode)) {
    await verifyCodeRealtime()
  } else if (newCode && newCode.length < 6) {
    // Reset verification status when user is typing
    codeVerification.status = 'idle'
    codeVerification.message = ''
    codeVerification.isValid = false
  }
})

// 倒计时管理
const startCountdown = (seconds: number = 60) => {
  codeCountdown.value = seconds
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value)
  }
  
  countdownTimer.value = setInterval(() => {
    codeCountdown.value--
    if (codeCountdown.value <= 0) {
      clearInterval(countdownTimer.value!)
      countdownTimer.value = null
    }
  }, 1000) as unknown as number
}

const clearCountdown = () => {
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value)
    countdownTimer.value = null
  }
  codeCountdown.value = 0
}

onBeforeUnmount(() => {
  clearCountdown()
})

// Clean up function when modal closes
const handleModalClose = () => {
  showRegister.value = false
  clearCountdown()
  
  // Reset form
  Object.assign(registerForm, {
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    verificationCode: ''
  })
  
  // Reset errors
  Object.assign(registerErrors.value, {
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    verificationCode: ''
  })
  
  // Reset verification status
  codeVerification.status = 'idle'
  codeVerification.message = ''
  codeVerification.isValid = false
  
  // 重置注册reCAPTCHA v2状态
  hideRegisterRecaptchaV2Challenge()
  
  // 清理Token缓存 (可选择性清理，保留用户验证状态)
  // clearTokenCache()
}

// Validation
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

// Validate registration form step 1 (basic information)
const validateRegisterStep1 = () => {
  registerErrors.value.username = ''
  registerErrors.value.email = ''
  registerErrors.value.password = ''
  registerErrors.value.confirmPassword = ''
  let isValid = true

  if (!registerForm.username) {
    registerErrors.value.username = 'Please enter username'
    isValid = false
  } else if (registerForm.username.length < 3 || registerForm.username.length > 50) {
    registerErrors.value.username = 'Username must be between 3-50 characters'
    isValid = false
  } else if (!/^[a-zA-Z0-9_]+$/.test(registerForm.username)) {
    registerErrors.value.username = 'Username can only contain letters, numbers and underscores'
    isValid = false
  }

  if (!registerForm.email) {
    registerErrors.value.email = 'Please enter email address'
    isValid = false
  } else if (!/\S+@\S+\.\S+/.test(registerForm.email)) {
    registerErrors.value.email = 'Please enter a valid email address'
    isValid = false
  }

  if (!registerForm.password) {
    registerErrors.value.password = 'Please enter password'
    isValid = false
  } else if (registerForm.password.length < 6) {
    registerErrors.value.password = 'Password must be at least 6 characters'
    isValid = false
  } else if (!/^(?=.*[a-zA-Z])(?=.*\d)/.test(registerForm.password)) {
    registerErrors.value.password = 'Password must contain at least one letter and one number'
    isValid = false
  }

  if (!registerForm.confirmPassword) {
    registerErrors.value.confirmPassword = 'Please confirm password'
    isValid = false
  } else if (registerForm.confirmPassword !== registerForm.password) {
    registerErrors.value.confirmPassword = 'Password confirmation does not match'
    isValid = false
  }

  return isValid
}

// Validate registration form step 2 (verification code)
const validateRegisterStep2 = () => {
  registerErrors.value.verificationCode = ''
  let isValid = true

  if (!registerForm.verificationCode) {
    registerErrors.value.verificationCode = 'Please enter verification code'
    isValid = false
  } else if (!/^\d{6}$/.test(registerForm.verificationCode)) {
    registerErrors.value.verificationCode = 'Verification code must be 6 digits'
    isValid = false
  }

  return isValid
}

// Individual field validation functions (called on blur)
const validateUsername = () => {
  registerErrors.value.username = ''
  
  if (!registerForm.username) {
    registerErrors.value.username = 'Please enter username'
  } else if (registerForm.username.length < 3 || registerForm.username.length > 50) {
    registerErrors.value.username = 'Username must be between 3-50 characters'
  } else if (!/^[a-zA-Z0-9_]+$/.test(registerForm.username)) {
    registerErrors.value.username = 'Username can only contain letters, numbers and underscores'
  }
}

const validateEmail = () => {
  registerErrors.value.email = ''
  
  if (!registerForm.email) {
    registerErrors.value.email = 'Please enter email address'
  } else if (!/\S+@\S+\.\S+/.test(registerForm.email)) {
    registerErrors.value.email = 'Please enter a valid email address'
  }
}

const validatePassword = () => {
  registerErrors.value.password = ''
  
  if (!registerForm.password) {
    registerErrors.value.password = 'Please enter password'
  } else if (registerForm.password.length < 6) {
    registerErrors.value.password = 'Password must be at least 6 characters'
  } else if (!/^(?=.*[a-zA-Z])(?=.*\d)/.test(registerForm.password)) {
    registerErrors.value.password = 'Password must contain at least one letter and one number'
  }
}

const validateConfirmPassword = () => {
  registerErrors.value.confirmPassword = ''
  
  if (!registerForm.confirmPassword) {
    registerErrors.value.confirmPassword = 'Please confirm password'
  } else if (registerForm.confirmPassword !== registerForm.password) {
    registerErrors.value.confirmPassword = 'Password confirmation does not match'
  }
}

// Legacy validation function (traditional)
const validateRegisterForm = () => {
  return validateRegisterStep1()
}


// reCAPTCHA v3 验证函数
const executeRecaptcha = async (action: string): Promise<string | null> => {
  return new Promise((resolve) => {
    if (typeof window.grecaptcha?.enterprise === 'undefined') {
      console.warn('reCAPTCHA Enterprise not loaded, skipping verification')
      resolve(null)
      return
    }

    // 从环境变量获取 Site Key（不使用硬编码 fallback）
    const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY
    if (!siteKey) {
      console.error('VITE_RECAPTCHA_SITE_KEY 环境变量未配置')
      resolve(null)
      return
    }

    window.grecaptcha.enterprise.ready(() => {
      window.grecaptcha.enterprise.execute(siteKey, { action })
        .then((token: string) => {
          console.log('reCAPTCHA Enterprise token generated for action:', action)
          resolve(token)
        })
        .catch((error: any) => {
          console.error('reCAPTCHA Enterprise execution failed:', error)
          resolve(null)
        })
    })
  })
}

// reCAPTCHA v2 处理函数
const initRecaptchaV2 = (): Promise<void> => {
  return new Promise((resolve) => {
    if (typeof window.grecaptcha === 'undefined') {
      console.error('reCAPTCHA not loaded')
      resolve()
      return
    }

    window.grecaptcha.ready(() => {
      // 获取 v2 site key
      const v2SiteKey = import.meta.env.VITE_RECAPTCHA_V2_SITE_KEY || '6LexK5wrAAAAAMchqZ_TsZBWzZV6MBwVgjbBMlsb'
      
      // 渲染 reCAPTCHA v2 widget
      recaptchaV2WidgetId.value = window.grecaptcha.render('recaptcha-v2-container', {
        'sitekey': v2SiteKey,
        'callback': onRecaptchaV2Success,
        'expired-callback': onRecaptchaV2Expired,
        'error-callback': onRecaptchaV2Error
      })
      
      console.log('reCAPTCHA v2 widget initialized')
      resolve()
    })
  })
}

const onRecaptchaV2Success = (token: string) => {
  console.log('reCAPTCHA v2 completed successfully')
  // 自动提交登录表单
  handleLoginWithV2Token(token)
}

const onRecaptchaV2Expired = () => {
  console.log('reCAPTCHA v2 expired')
  notyf.error('验证已过期，请重新验证')
  resetRecaptchaV2()
}

const onRecaptchaV2Error = () => {
  console.error('reCAPTCHA v2 error')
  notyf.error('验证出现错误，请重试')
  resetRecaptchaV2()
}

const resetRecaptchaV2 = () => {
  if (recaptchaV2WidgetId.value !== null && typeof window.grecaptcha !== 'undefined') {
    window.grecaptcha.reset(recaptchaV2WidgetId.value)
  }
}

const hideRecaptchaV2Challenge = () => {
  showRecaptchaV2.value = false
  recaptchaV2Challenge.value = null
  resetRecaptchaV2()
}

// 注册专用的reCAPTCHA v2处理函数
const initRegisterRecaptchaV2 = (): Promise<void> => {
  return new Promise((resolve) => {
    if (typeof window.grecaptcha === 'undefined') {
      console.error('reCAPTCHA not loaded')
      resolve()
      return
    }

    window.grecaptcha.ready(() => {
      // 获取 v2 site key
      const v2SiteKey = import.meta.env.VITE_RECAPTCHA_V2_SITE_KEY || '6LexK5wrAAAAAMchqZ_TsZBWzZV6MBwVgjbBMlsb'
      
      // 渲染 reCAPTCHA v2 widget for registration
      registerRecaptchaV2WidgetId.value = window.grecaptcha.render('register-recaptcha-v2-container', {
        'sitekey': v2SiteKey,
        'callback': onRegisterRecaptchaV2Success,
        'expired-callback': onRegisterRecaptchaV2Expired,
        'error-callback': onRegisterRecaptchaV2Error
      })
      
      console.log('reCAPTCHA v2 widget initialized for registration')
      resolve()
    })
  })
}

const onRegisterRecaptchaV2Success = (token: string) => {
  console.log('reCAPTCHA v2 completed successfully for registration')
  
  // 缓存v2 token
  cacheV2Token(token, 'send_email_v2', registerForm.email)
  
  // 根据当前情况决定后续操作
  if (recaptchaTokenCache.lastAction === 'send_email' || !codeVerification.isValid) {
    // 如果是为了发送邮件，重新发送邮件
    handleSendEmailWithV2Token(token)
  } else {
    // 如果是为了注册，提交注册
    handleEnhancedRegisterWithV2Token(token)
  }
}

const onRegisterRecaptchaV2Expired = () => {
  console.log('reCAPTCHA v2 expired for registration')
  notyf.error('验证已过期，请重新验证')
  resetRegisterRecaptchaV2()
}

const onRegisterRecaptchaV2Error = () => {
  console.error('reCAPTCHA v2 error for registration')
  notyf.error('验证出现错误，请重试')
  resetRegisterRecaptchaV2()
}

const resetRegisterRecaptchaV2 = () => {
  if (registerRecaptchaV2WidgetId.value !== null && typeof window.grecaptcha !== 'undefined') {
    window.grecaptcha.reset(registerRecaptchaV2WidgetId.value)
  }
}

const hideRegisterRecaptchaV2Challenge = () => {
  showRegisterRecaptchaV2.value = false
  registerRecaptchaV2Challenge.value = null
  resetRegisterRecaptchaV2()
}

// Token管理辅助函数
const cacheV3Token = (token: string, action: string, email: string = '') => {
  recaptchaTokenCache.v3Token = token
  recaptchaTokenCache.v3Timestamp = Date.now()
  recaptchaTokenCache.lastAction = action
  if (email) recaptchaTokenCache.lastEmail = email
  console.log(`✅ Cached v3 token for action: ${action}`)
}

const cacheV2Token = (token: string, action: string, email: string = '') => {
  recaptchaTokenCache.v2Token = token
  recaptchaTokenCache.v2Timestamp = Date.now()
  recaptchaTokenCache.lastAction = action
  if (email) recaptchaTokenCache.lastEmail = email
  console.log(`✅ Cached v2 token for action: ${action}`)
}

const clearTokenCache = () => {
  Object.assign(recaptchaTokenCache, {
    v3Token: null,
    v3Timestamp: 0,
    v2Token: null,
    v2Timestamp: 0,
    lastAction: null,
    lastEmail: ''
  })
  console.log('🗑️ Cleared token cache')
}

const isTokenValid = (timestamp: number): boolean => {
  return Date.now() - timestamp < TOKEN_VALIDITY_PERIOD
}

const getTokenAge = (timestamp: number): number => {
  return Math.floor((Date.now() - timestamp) / 1000) // seconds
}

// 智能验证选择核心函数
const getOptimalRecaptchaToken = async (action: string, email: string = ''): Promise<{
  useV2: boolean
  v2Token: string | null
  v3Token: string | null
  fromCache: boolean
  cacheInfo?: string
}> => {
  const now = Date.now()
  
  // 检查v2 token (优先级最高，因为用户已完成挑战)
  if (recaptchaTokenCache.v2Token && isTokenValid(recaptchaTokenCache.v2Timestamp)) {
    const age = getTokenAge(recaptchaTokenCache.v2Timestamp)
    console.log(`♾️ Using cached v2 token (age: ${age}s) for action: ${action}`)
    
    return {
      useV2: true,
      v2Token: recaptchaTokenCache.v2Token,
      v3Token: null,
      fromCache: true,
      cacheInfo: `v2 token cached ${age}s ago from ${recaptchaTokenCache.lastAction}`
    }
  }
  
  // 检查v3 token
  if (recaptchaTokenCache.v3Token && 
      isTokenValid(recaptchaTokenCache.v3Timestamp) &&
      recaptchaTokenCache.lastEmail === email) {
    const age = getTokenAge(recaptchaTokenCache.v3Timestamp)
    console.log(`♾️ Using cached v3 token (age: ${age}s) for action: ${action}`)
    
    return {
      useV2: false,
      v2Token: null,
      v3Token: recaptchaTokenCache.v3Token,
      fromCache: true,
      cacheInfo: `v3 token cached ${age}s ago from ${recaptchaTokenCache.lastAction}`
    }
  }
  
  // 需要新的v3验证
  console.log(`🆕 Generating new v3 token for action: ${action}`)
  const newV3Token = await executeRecaptcha(action)
  cacheV3Token(newV3Token, action, email)
  
  return {
    useV2: false,
    v2Token: null,
    v3Token: newV3Token,
    fromCache: false,
    cacheInfo: 'newly generated v3 token'
  }
}

// Handlers
const handleLogin = async () => {
  if (!validateLoginForm()) {
    return
  }

  loading.value = true
  // 清除之前的错误信息和reCAPTCHA v2挑战
  errors.value = { email: '', password: '' }
  hideRecaptchaV2Challenge()

  try {
    // 执行 reCAPTCHA v3 验证
    const recaptchaToken = await executeRecaptcha('login')
    
    const success = await userSession.loginUser({
      email: loginForm.email,
      password: loginForm.password,
      recaptcha_token: recaptchaToken
    })

    if (success) {
      notyf.success('Login successful!')
      await router.push('/app')
    }
  } catch (error: any) {
    console.error('Login failed:', error)
    
    // 检查是否是reCAPTCHA挑战响应（状态码423）
    if (error.status === 423 && error.data?.challenge_type === 'recaptcha_v2') {
      // 显示reCAPTCHA v2验证
      recaptchaV2Challenge.value = error.data
      showRecaptchaV2.value = true
      
      // 初始化reCAPTCHA v2 widget
      setTimeout(async () => {
        try {
          await initRecaptchaV2()
          notyf.info('请完成安全验证后重新登录')
        } catch (initError) {
          console.error('Failed to initialize reCAPTCHA v2:', initError)
          notyf.error('安全验证初始化失败，请刷新页面重试')
        }
      }, 100)
      
      loading.value = false
      return
    }
    
    const errorMessage = error.message || 'Login failed'
    
    // 根据错误消息类型设置到相应的输入框下方
    if (errorMessage.includes('Invalid email or password') || 
        errorMessage.includes('password') || errorMessage.includes('Password') ||
        errorMessage.includes('Invalid credentials') || errorMessage.includes('Authentication failed')) {
      errors.value.password = errorMessage
    } else if (errorMessage.includes('email') || errorMessage.includes('Email') || 
               errorMessage.includes('user not found') || errorMessage.includes('User not found')) {
      errors.value.email = errorMessage
    } else {
      // 对于其他错误，显示在密码框下方（通常是认证错误）
      errors.value.password = errorMessage
    }
  } finally {
    loading.value = false
  }
}

// 处理reCAPTCHA v2验证后的登录
const handleLoginWithV2Token = async (v2Token: string) => {
  if (!validateLoginForm()) {
    return
  }

  loading.value = true
  // 清除之前的错误信息
  errors.value = { email: '', password: '' }

  try {
    const success = await userSession.loginUser({
      email: loginForm.email,
      password: loginForm.password,
      recaptcha_token: recaptchaV2Challenge.value?.recaptcha_result?.action ? 
        await executeRecaptcha('login') : null, // 保持v3 token
      recaptcha_v2_token: v2Token
    })

    if (success) {
      notyf.success('Login successful!')
      hideRecaptchaV2Challenge()
      await router.push('/app')
    }
  } catch (error: any) {
    console.error('Login with v2 token failed:', error)
    const errorMessage = error.message || 'Login failed'
    
    // 重置reCAPTCHA v2以允许重试
    resetRecaptchaV2()
    
    // 根据错误消息类型设置到相应的输入框下方
    if (errorMessage.includes('Invalid email or password') || 
        errorMessage.includes('password') || errorMessage.includes('Password') ||
        errorMessage.includes('Invalid credentials') || errorMessage.includes('Authentication failed')) {
      errors.value.password = errorMessage
    } else if (errorMessage.includes('email') || errorMessage.includes('Email') || 
               errorMessage.includes('user not found') || errorMessage.includes('User not found')) {
      errors.value.email = errorMessage
    } else {
      // 对于其他错误，显示在密码框下方（通常是认证错误）
      errors.value.password = errorMessage
    }
  } finally {
    loading.value = false
  }
}

// Send verification code
const handleSendVerificationCode = async () => {
  // Validate email first
  if (!registerForm.email) {
    registerErrors.value.email = 'Please enter email address'
    return
  }
  if (!/\S+@\S+\.\S+/.test(registerForm.email)) {
    registerErrors.value.email = 'Please enter a valid email address'
    return
  }

  verificationCodeLoading.value = true
  registerErrors.value.email = ''
  
  // Reset verification status
  codeVerification.status = 'idle'
  codeVerification.message = ''
  codeVerification.isValid = false

  try {
    // 使用智能验证选择
    const tokens = await getOptimalRecaptchaToken('send_verification_code', registerForm.email)
    
    if (tokens.fromCache && tokens.cacheInfo) {
      console.log(`💾 Smart verification: ${tokens.cacheInfo}`)
      // 可选择显示给用户
      // notyf.info('使用之前的验证状态')
    }
    
    const params: SendVerificationCodeParams = {
      email: registerForm.email,
      type: 'registration',
      recaptcha_token: tokens.v3Token,
      recaptcha_v2_token: tokens.v2Token
    }

    const result = await userSession.sendVerificationCode(params)
    if (result.success) {
      notyf.success('Verification code sent, please check your email')
      startCountdown(result.expires_in || 300) // Default 5 minutes
      
      // 成功后更新缓存状态
      recaptchaTokenCache.lastAction = 'send_email'
    } else {
      registerErrors.value.email = result.error || 'Failed to send verification code'
    }
  } catch (error: any) {
    console.error('Send verification code failed:', error)
    
    // 检查是否是reCAPTCHA v2挑战响应
    if (error.status === 423 && error.data?.challenge_type === 'recaptcha_v2') {
      // 显示reCAPTCHA v2验证 for email sending
      registerRecaptchaV2Challenge.value = error.data
      showRegisterRecaptchaV2.value = true
      
      // 初始化reCAPTCHA v2 widget
      setTimeout(async () => {
        try {
          await initRegisterRecaptchaV2()
          notyf.info('请完成安全验证后重新发送验证码')
        } catch (initError) {
          console.error('Failed to initialize reCAPTCHA v2 for email:', initError)
          notyf.error('安全验证初始化失败，请刷新页面重试')
        }
      }, 100)
      
      verificationCodeLoading.value = false
      return
    }
    
    registerErrors.value.email = 'Failed to send verification code, please try again later'
  } finally {
    verificationCodeLoading.value = false
  }
}

// Real-time verification code validation
const verifyCodeRealtime = async () => {
  if (!registerForm.verificationCode || registerForm.verificationCode.length !== 6) {
    return
  }

  codeVerification.status = 'verifying'
  codeVerification.message = 'Verifying...'

  const params: VerifyCodeParams = {
    email: registerForm.email,
    code: registerForm.verificationCode,
    type: 'registration'
  }

  try {
    const result = await userSession.verifyCode(params)
    if (result.success) {
      codeVerification.status = 'success'
      codeVerification.message = 'Code verified!'
      codeVerification.isValid = true
      registerErrors.value.verificationCode = ''
    } else {
      codeVerification.status = 'error'
      codeVerification.message = result.error || 'Invalid verification code'
      codeVerification.isValid = false
      registerErrors.value.verificationCode = codeVerification.message
    }
  } catch (error) {
    codeVerification.status = 'error'
    codeVerification.message = 'Verification failed'
    codeVerification.isValid = false
    registerErrors.value.verificationCode = codeVerification.message
  }
}

// Enhanced registration with verification code - 智能验证优化
const handleEnhancedRegister = async () => {
  if (!canSubmitRegistration.value) {
    return
  }

  registerLoading.value = true
  // 清除之前的reCAPTCHA v2挑战 (只有在需要旰验证时)
  hideRegisterRecaptchaV2Challenge()

  try {
    // 使用智能验证选择
    const tokens = await getOptimalRecaptchaToken('registration', registerForm.email)
    
    if (tokens.fromCache && tokens.cacheInfo) {
      console.log(`💾 Smart registration: ${tokens.cacheInfo}`)
      notyf.info('使用之前的验证状态，免重复验证')
    }
    
    const params: EnhancedRegisterParams = {
      username: registerForm.username,
      email: registerForm.email,
      password: registerForm.password,
      phone: registerForm.phone || undefined,
      verification_code: registerForm.verificationCode,
      recaptcha_token: tokens.v3Token,
      recaptcha_v2_token: tokens.v2Token
    }

    const result = await userSession.enhancedRegisterUser(params)
    if (result.success) {
      notyf.success('Registration successful! Please login with your new account.')
      
      // Clear form and close modal
      Object.assign(registerForm, {
        username: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        verificationCode: ''
      })
      
      // Reset verification status
      codeVerification.status = 'idle'
      codeVerification.message = ''
      codeVerification.isValid = false
      
      showRegister.value = false
      clearCountdown()
      
      // 清理token缓存（成功注册后清理）
      clearTokenCache()
      
      // Auto-fill login form
      loginForm.email = params.email
      loginForm.password = ''
    } else {
      notyf.error(result.error || 'Registration failed')
    }
  } catch (error: any) {
    console.error('Registration failed:', error)
    
    // 只有在没有有效v2 token时才触发v2挑战
    if (error.status === 423 && error.data?.challenge_type === 'recaptcha_v2' && 
        (!recaptchaTokenCache.v2Token || !isTokenValid(recaptchaTokenCache.v2Timestamp))) {
      // 显示reCAPTCHA v2验证 for registration
      registerRecaptchaV2Challenge.value = error.data
      showRegisterRecaptchaV2.value = true
      
      // 初始化reCAPTCHA v2 widget for registration
      setTimeout(async () => {
        try {
          await initRegisterRecaptchaV2()
          notyf.info('请完成安全验证后重新注册')
        } catch (initError) {
          console.error('Failed to initialize reCAPTCHA v2 for registration:', initError)
          notyf.error('安全验证初始化失败，请刷新页面重试')
        }
      }, 100)
      
      registerLoading.value = false
      return
    }
    
    const errorMessage = error.message || 'Registration failed, please try again later'
    notyf.error(errorMessage)
  } finally {
    registerLoading.value = false
  }
}

// 处理reCAPTCHA v2验证后的注册 - 智能优化
const handleEnhancedRegisterWithV2Token = async (v2Token: string) => {
  if (!canSubmitRegistration.value) {
    return
  }

  registerLoading.value = true

  try {
    // 使用刚缓存的v2 token和可能存在的v3 token
    const useExistingV3 = recaptchaTokenCache.v3Token && 
                         isTokenValid(recaptchaTokenCache.v3Timestamp) &&
                         recaptchaTokenCache.lastEmail === registerForm.email
    
    let v3Token = null
    if (useExistingV3) {
      v3Token = recaptchaTokenCache.v3Token
      console.log('💾 Using existing v3 token with new v2 token for registration')
    } else if (registerRecaptchaV2Challenge.value?.recaptcha_result?.action) {
      // 只有在明确需要时才生成新v3 token
      v3Token = await executeRecaptcha('registration')
    }
    
    const params: EnhancedRegisterParams = {
      username: registerForm.username,
      email: registerForm.email,
      password: registerForm.password,
      phone: registerForm.phone || undefined,
      verification_code: registerForm.verificationCode,
      recaptcha_token: v3Token,
      recaptcha_v2_token: v2Token
    }

    const result = await userSession.enhancedRegisterUser(params)
    if (result.success) {
      notyf.success('Registration successful! Please login with your new account.')
      
      // Clear form and close modal
      Object.assign(registerForm, {
        username: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        verificationCode: ''
      })
      
      // Reset verification status
      codeVerification.status = 'idle'
      codeVerification.message = ''
      codeVerification.isValid = false
      
      hideRegisterRecaptchaV2Challenge()
      showRegister.value = false
      clearCountdown()
      
      // 清理token缓存（成功注册后清理）
      clearTokenCache()
      
      // Auto-fill login form
      loginForm.email = params.email
      loginForm.password = ''
    } else {
      notyf.error(result.error || 'Registration failed')
    }
  } catch (error: any) {
    console.error('Registration with v2 token failed:', error)
    const errorMessage = error.message || 'Registration failed, please try again later'
    
    // 重置reCAPTCHA v2以允许重试
    resetRegisterRecaptchaV2()
    
    notyf.error(errorMessage)
  } finally {
    registerLoading.value = false
  }
}

// 处理reCAPTCHA v2验证后的邮件发送
const handleSendEmailWithV2Token = async (v2Token: string) => {
  if (!registerForm.email) {
    registerErrors.value.email = 'Please enter email address'
    return
  }

  verificationCodeLoading.value = true
  registerErrors.value.email = ''

  try {
    // 同时使用v3和v2 token
    const v3Token = registerRecaptchaV2Challenge.value?.recaptcha_result?.action ? 
      await executeRecaptcha('send_verification_code') : null
    
    const params: SendVerificationCodeParams = {
      email: registerForm.email,
      type: 'registration',
      recaptcha_token: v3Token,
      recaptcha_v2_token: v2Token
    }

    const result = await userSession.sendVerificationCode(params)
    if (result.success) {
      notyf.success('Verification code sent, please check your email')
      startCountdown(result.expires_in || 300)
      
      // 隐藏v2挑战界面
      hideRegisterRecaptchaV2Challenge()
      
      // 更新缓存状态
      recaptchaTokenCache.lastAction = 'send_email'
    } else {
      registerErrors.value.email = result.error || 'Failed to send verification code'
    }
  } catch (error: any) {
    console.error('Send email with v2 token failed:', error)
    const errorMessage = error.message || 'Failed to send verification code, please try again later'
    
    // 重置reCAPTCHA v2以允许重试
    resetRegisterRecaptchaV2()
    
    registerErrors.value.email = errorMessage
  } finally {
    verificationCodeLoading.value = false
  }
}

const handleRegister = async () => {
  if (!validateRegisterForm()) {
    return
  }

  registerLoading.value = true

  try {
    const { confirmPassword, ...registerData } = registerForm
    const success = await userSession.registerUser(registerData)

    if (success) {
      notyf.success('Registration successful! Please login with your new account.')
      showRegister.value = false
      
      // Clear register form
      Object.assign(registerForm, {
        username: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
      })
      
      // Auto-fill login form with new account info
      loginForm.email = registerData.email
      loginForm.password = ''
    }
  } catch (error: any) {
    console.error('Registration failed:', error)
    notyf.error(error.message || 'Registration failed')
  } finally {
    registerLoading.value = false
  }
}

useHead({
  title: 'Login - EzCloud Device Management Platform',
  script: [
    {
      src: `https://www.google.com/recaptcha/enterprise.js?render=${import.meta.env.VITE_RECAPTCHA_SITE_KEY}`,
      defer: true
    },
    {
      src: 'https://www.google.com/recaptcha/api.js',
      async: true,
      defer: true
    }
  ]
})
</script>

<template>
  <div class="login-container">
    <VCard class="login-card">
      <template #header>
        <div class="card-header">
          <h2>EzCloud Device Management Platform</h2>
          <p>User Login</p>
        </div>
      </template>
      
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
        
        <!-- reCAPTCHA v2 验证区域 -->
        <VField v-if="showRecaptchaV2" class="form-item recaptcha-field">
          <div class="recaptcha-notice">
            <iconify-icon icon="lucide:shield-check" />
            <span>请完成安全验证</span>
          </div>
          <div class="recaptcha-container">
            <div id="recaptcha-v2-container"></div>
          </div>
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
            {{ loading ? 'Logging in...' : 'Login' }}
          </VButton>
        </VField>

        <VField class="form-item">
          <VButton
            type="button"
            fullwidth
            outlined
            @click="showRegister = true"
          >
            Don't have an account? Register here
          </VButton>
        </VField>
      </form>
    </VCard>


    <!-- Register Modal -->
    <VModal
      :open="showRegister"
      title="User Registration"
      size="medium"
      actions="right"
      cancelLabel="Cancel"
      @close="handleModalClose"
    >
      <template #content>
        <div class="register-content">
          <form @submit.prevent="handleEnhancedRegister">
            <!-- 基本信息分组 -->
            <div class="form-section">
              <h4 class="section-title">Basic Information</h4>
              
              <!-- Username -->
              <VField class="form-item">
                <VLabel>Username</VLabel>
                <VControl>
                  <VInput
                    v-model="registerForm.username"
                    placeholder="Enter your username"
                    :class="{ 'is-danger': registerErrors.username }"
                    @blur="validateUsername"
                  />
                  <p v-if="registerErrors.username" class="help is-danger">
                    {{ registerErrors.username }}
                  </p>
                </VControl>
              </VField>
              
              <!-- Email -->
                              <!-- Email with inline verification code -->
                <VField class="form-item email-field">
                  <VLabel>Email</VLabel>
                  <div class="email-input-group">
                    <VControl expanded>
                      <VInput
                        v-model="registerForm.email"
                        type="email"
                        placeholder="Enter your email address"
                        :class="{ 'is-danger': registerErrors.email }"
                        @blur="validateEmail"
                      />
                    </VControl>
                    <VControl>
                      <VButton
                        color="primary"
                        :disabled="!canSendCode"
                        :loading="verificationCodeLoading"
                        @click="handleSendVerificationCode"
                        size="small"
                      >
                        {{ countdownText }}
                      </VButton>
                    </VControl>
                  </div>
                  <p v-if="registerErrors.email" class="help is-danger">
                    {{ registerErrors.email }}
                  </p>
                  <p v-else-if="codeCountdown > 0" class="help is-success">
                    <iconify-icon icon="lucide:check-circle" />
                    Code sent! Check your email. Resend in {{ codeCountdown }}s
                  </p>

                  <!-- Compact Verification Code -->
                  <div v-if="showVerificationField" class="verification-compact">
                    <div class="verification-header">
                      <VLabel class="verification-label">Verification Code</VLabel>
                      <span class="verification-hint">Enter the 6-digit code sent to {{ registerForm.email }}</span>
                    </div>
                    <VControl class="verification-input-wrapper">
                      <VInput
                        v-model="registerForm.verificationCode"
                        placeholder="000000"
                        maxlength="6"
                        class="verification-input"
                        :class="{
                          'is-danger': registerErrors.verificationCode,
                          'is-success': codeVerification.isValid
                        }"
                      />
                      <span class="icon is-small is-right verification-icon">
                        <iconify-icon 
                          v-if="codeVerification.status === 'verifying'" 
                          icon="lucide:loader-2" 
                          class="animate-spin"
                        />
                        <iconify-icon 
                          v-else-if="codeVerification.isValid" 
                          icon="lucide:check-circle" 
                          class="has-text-success"
                        />
                        <iconify-icon 
                          v-else-if="codeVerification.status === 'error'" 
                          icon="lucide:x-circle" 
                          class="has-text-danger"
                        />
                      </span>
                    </VControl>
                    <p v-if="registerErrors.verificationCode" class="help is-danger verification-error">
                      {{ registerErrors.verificationCode }}
                    </p>
                    <p v-else-if="codeVerification.message" class="help verification-message" :class="{
                      'is-success': codeVerification.isValid,
                      'is-warning': codeVerification.status === 'verifying'
                    }">
                      {{ codeVerification.message }}
                    </p>
                  </div>
                </VField>
              
              <!-- Phone (Optional) -->
              <VField class="form-item">
                <VLabel>Phone Number <span class="optional-label">(Optional)</span></VLabel>
                <VControl>
                  <VInput
                    v-model="registerForm.phone"
                    placeholder="Enter phone number (optional)"
                  />
                </VControl>
              </VField>
            </div>

            <!-- 密码设置分组 -->
            <div class="form-section">
              <h4 class="section-title">Password Setup</h4>
              
              <!-- Password Fields in Two Columns -->
              <div class="password-row">
                <VField class="form-item password-field">
                  <VLabel>Password</VLabel>
                  <VControl>
                    <VInput
                      v-model="registerForm.password"
                      type="password"
                      placeholder="Enter password"
                      :class="{ 'is-danger': registerErrors.password }"
                      @blur="validatePassword"
                    />
                    <p v-if="registerErrors.password" class="help is-danger">
                      {{ registerErrors.password }}
                    </p>
                  </VControl>
                </VField>
                
                <VField class="form-item password-field">
                  <VLabel>Confirm Password</VLabel>
                  <VControl>
                    <VInput
                      v-model="registerForm.confirmPassword"
                      type="password"
                      placeholder="Confirm password"
                      :class="{ 'is-danger': registerErrors.confirmPassword }"
                      @blur="validateConfirmPassword"
                    />
                    <p v-if="registerErrors.confirmPassword" class="help is-danger">
                      {{ registerErrors.confirmPassword }}
                    </p>
                  </VControl>
                </VField>
              </div>
            </div>

            <!-- reCAPTCHA v2 验证区域 (for registration) -->
            <VField v-if="showRegisterRecaptchaV2" class="form-section recaptcha-section">
              <div class="recaptcha-notice">
                <iconify-icon icon="lucide:shield-check" />
                <span>请完成安全验证</span>
              </div>
              <div class="recaptcha-container">
                <div id="register-recaptcha-v2-container"></div>
              </div>
            </VField>

            <!-- Verification code section removed - now inline with email field -->
          </form>
        </div>
      </template>
      
      <template #action>
        <VButton 
          color="primary" 
          :disabled="!canSubmitRegistration"
          :loading="registerLoading"
          @click="handleEnhancedRegister"
        >
          {{ registerLoading ? 'Registering...' : 'Register Account' }}
        </VButton>
      </template>
    </VModal>
  </div>
</template>

<style lang="scss" scoped>
// Register form styles
.register-content {
  max-width: 100%;
}

.form-section {
  margin-bottom: 2rem;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.section-title {
  color: var(--primary);
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 1.25rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--fade-grey-light-3);
  
  .is-dark & {
    border-bottom-color: var(--dark-sidebar-light-2);
  }
}

// Two-column password layout
.password-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
}

.password-field {
  margin-bottom: 0 !important;
}



// Optional label styling
.optional-label {
  font-size: 0.85rem;
  color: var(--muted-grey);
  font-weight: 400;
}

// Compact verification field styles
.verification-compact {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: var(--fade-grey-light-3);
  border-radius: var(--radius);
  border: 1px solid var(--fade-grey-dark-4);
  
  .verification-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    
    .verification-label {
      color: var(--primary);
      font-weight: 600;
      font-size: 0.85rem;
      margin: 0;
    }
    
    .verification-hint {
      color: var(--muted-grey);
      font-size: 0.75rem;
      font-weight: 400;
    }
  }
  
  .verification-input-wrapper {
    position: relative;
    
    .verification-input {
      font-family: 'Courier New', monospace;
      font-size: 1rem;
      text-align: center;
      letter-spacing: 0.3em;
      padding: 0.5rem 2rem 0.5rem 0.75rem;
      height: 2.5rem;
      
      &.is-success {
        border-color: var(--success);
        background-color: var(--success-light);
      }
      
      &.is-danger {
        border-color: var(--danger);
        background-color: var(--danger-light);
      }
    }
    
    .verification-icon {
      position: absolute;
      right: 0.5rem;
      top: 50%;
      transform: translateY(-50%);
      z-index: 2;
    }
  }
  
  .verification-error,
  .verification-message {
    margin-top: 0.25rem;
    font-size: 0.75rem;
  }

  .is-dark & {
    background: var(--dark-sidebar-light-3);
    border-color: var(--dark-sidebar-light-12);
  }
}

// Email field with button group
.email-input-group {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  
  .control {
    &.is-expanded {
      flex: 1;
    }
    
    .button {
      min-width: 80px;
      height: 2.5rem; // Match input height
      white-space: nowrap;
      font-size: 0.85rem;
      
      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }
  }
}

// Enhanced email field container
.email-field {
  .verification-compact {
    animation: slideDown 0.3s ease-out;
    margin-top: 0.75rem;
  }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
    max-height: 0;
  }
  to {
    opacity: 1;
    transform: translateY(0);
    max-height: 200px;
  }
}

// Email field specific styles
.email-field {
  .label {
    margin-bottom: 0.5rem;
  }
  
  .help {
    margin-top: 0.5rem;
    margin-bottom: 0;
  }
}

// Success/error icons and messages
.help {
  &.is-success {
    color: var(--success);
    
    .iconify-icon {
      margin-right: 0.25rem;
    }
  }
  
  &.is-warning {
    color: var(--warning);
  }
}

// Icon animations
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

// Status icons in input fields
:deep(.icon) {
  &.is-right {
    .iconify-icon {
      font-size: 1.1rem;
      
      &.has-text-success {
        color: var(--success) !important;
      }
      
      &.has-text-danger {
        color: var(--danger) !important;
      }
    }
  }
}

// Form item spacing
.form-item {
  margin-bottom: 1.5rem;

  &:last-child {
    margin-bottom: 0;
  }
}

// Login page specific styles
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.login-card {
  width: 100%;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border-radius: var(--radius-large);
  border: none;
}

.card-header {
  text-align: center;
  padding: 1rem 0;

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
  .login-container {
    background: linear-gradient(135deg, #2d3748 0%, #4a5568 100%);
  }
  
  .card-header {
    h2 {
      color: var(--dark-dark-text);
    }
  }
}

// reCAPTCHA v2 简洁样式 (for login)
.recaptcha-field {
  background: var(--fade-grey-light-2);
  border-radius: var(--radius);
  padding: 1rem;
  border: 1px solid var(--fade-grey-dark-4);
  text-align: center;
  
  .recaptcha-notice {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1rem;
    color: var(--primary);
    font-weight: 500;
    
    .iconify-icon {
      margin-right: 0.5rem;
      font-size: 1.1rem;
    }
  }
  
  .recaptcha-container {
    display: flex;
    justify-content: center;
  }
}

// reCAPTCHA v2 for registration modal
.recaptcha-section {
  background: var(--fade-grey-light-2);
  border-radius: var(--radius);
  padding: 1.5rem;
  border: 1px solid var(--primary-light);
  text-align: center;
  margin: 1.5rem 0;
  animation: slideDown 0.3s ease-out;
  
  .recaptcha-notice {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1rem;
    color: var(--primary);
    font-weight: 600;
    font-size: 1rem;
    
    .iconify-icon {
      margin-right: 0.5rem;
      font-size: 1.2rem;
    }
  }
  
  .recaptcha-container {
    display: flex;
    justify-content: center;
    
    // Responsive scaling for mobile
    @media only screen and (max-width: 480px) {
      #register-recaptcha-v2-container {
        transform: scale(0.85);
        transform-origin: center;
      }
    }
  }
  
  .is-dark & {
    background: var(--dark-sidebar-light-2);
    border-color: var(--primary);
  }
}

@media only screen and (max-width: 767px) {
  .login-container {
    padding: 1rem;
  }

  .card-header {
    h2 {
      font-size: 1.25rem;
    }
  }
  
  .recaptcha-field {
    padding: 0.75rem;
    
    .recaptcha-container #recaptcha-v2-container {
      transform: scale(0.85);
    }
  }
}
</style>
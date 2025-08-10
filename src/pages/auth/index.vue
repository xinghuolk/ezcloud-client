<script setup lang="ts">
import { ref, reactive, computed, watch, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useUserSession } from '/@src/stores/user-session'
import { useUserToken } from '/@src/composables/user-token'
import { useDarkmode } from '/@src/composables/darkmode'
import { notyf } from '/@src/api/request'
import type { SendVerificationCodeParams, VerifyCodeParams, EnhancedRegisterParams } from '/@src/api/types'
// Import logos directly  
import logoLight from '/@src/assets/images/EzenCloud-Logo_v2.png'
import logoDark from '/@src/assets/images/EzenCloud-Logo-v2-Dark.png'

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
const darkmode = useDarkmode()

// 根据dark mode状态动态选择logo
const logoSrc = computed(() => {
  const isDarkMode = darkmode.isDark.value
  return isDarkMode ? logoDark : logoLight
})

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

// 6位验证码输入框
const codeInputs = ref(['', '', '', '', '', ''])
const codeInputRefs = ref<HTMLInputElement[]>([])

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
  verificationCode: '',
  agreeToPrivacy: false,
  agreeToTerms: false
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
  verificationCode: '',
  agreeToPrivacy: '',
  agreeToTerms: ''
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
  
  // 检查是否同意隐私政策和服务条款
  const hasAgreedToTerms = registerForm.agreeToPrivacy && registerForm.agreeToTerms
  
  return hasBasicInfo && codeVerification.isValid && hasAgreedToTerms && !registerLoading.value
})

// Watch verification code input for auto-validation
// 现在由 updateVerificationCode 函数处理，不再需要这个 watcher

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
    verificationCode: '',
    agreeToPrivacy: false,
    agreeToTerms: false
  })
  
  // Reset errors
  Object.assign(registerErrors.value, {
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    verificationCode: '',
    agreeToPrivacy: '',
    agreeToTerms: ''
  })
  
  // Reset verification status and clear code inputs
  clearCodeInputs()
  
  // 重置注册reCAPTCHA v2状态
  hideRegisterRecaptchaV2Challenge()
  
  // 清理Token缓存 (可选择性清理，保留用户验证状态)
  // clearTokenCache()
}

// 验证码输入框处理函数
const handleCodeInput = (index: number, event: Event) => {
  const target = event.target as HTMLInputElement
  const value = target.value.replace(/\D/g, '') // 只允许数字
  
  // 检查是否是粘贴操作（输入了多个字符）
  if (value.length > 1) {
    // 直接处理多字符输入（类似粘贴）
    const digits = value.slice(0, 6) // 只取前6个数字
    
    // 清空所有输入框
    for (let i = 0; i < 6; i++) {
      codeInputs.value[i] = ''
    }
    
    // 填充数字
    for (let i = 0; i < 6; i++) {
      if (digits[i]) {
        codeInputs.value[i] = digits[i]
        const input = codeInputRefs.value[i]
        if (input) {
          input.value = digits[i]
        }
      }
    }
    
    updateVerificationCode()
    
    // 焦点移到最后一个有值的输入框
    const lastFilledIndex = digits.length - 1
    const focusIndex = lastFilledIndex >= 0 ? Math.min(lastFilledIndex, 5) : 0
    const targetInput = codeInputRefs.value[focusIndex]
    if (targetInput) {
      targetInput.focus()
    }
    return
  }
  
  // 正常单个字符输入
  codeInputs.value[index] = value
  target.value = value // 确保DOM同步
  
  // 更新合并的验证码
  updateVerificationCode()
  
  // 如果输入了数字且不是最后一个输入框，自动跳到下一个
  if (value && index < 5) {
    const nextInput = codeInputRefs.value[index + 1]
    if (nextInput) {
      nextInput.focus()
    }
  }
}

const handleCodeKeydown = (index: number, event: KeyboardEvent) => {
  const target = event.target as HTMLInputElement
  
  // 处理退格键
  if (event.key === 'Backspace') {
    if (!codeInputs.value[index] && index > 0) {
      // 如果当前输入框为空且不是第一个，跳到上一个输入框
      const prevInput = codeInputRefs.value[index - 1]
      if (prevInput) {
        prevInput.focus()
        codeInputs.value[index - 1] = ''
        updateVerificationCode()
      }
    } else {
      // 清空当前输入框
      codeInputs.value[index] = ''
      updateVerificationCode()
    }
    return
  }
  
  // 处理方向键
  if (event.key === 'ArrowLeft' && index > 0) {
    const prevInput = codeInputRefs.value[index - 1]
    if (prevInput) {
      prevInput.focus()
    }
  } else if (event.key === 'ArrowRight' && index < 5) {
    const nextInput = codeInputRefs.value[index + 1]
    if (nextInput) {
      nextInput.focus()
    }
  }
  
  // 阻止非数字字符输入
  if (!/\d/.test(event.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault()
  }
}

const handleCodePaste = (event: ClipboardEvent) => {
  event.preventDefault()
  const paste = (event.clipboardData || (window as any).clipboardData)?.getData('text')
  
  if (paste) {
    const digits = paste.replace(/\D/g, '').slice(0, 6) // 只取前6个数字
    
    // 清空所有输入框先
    for (let i = 0; i < 6; i++) {
      codeInputs.value[i] = ''
    }
    
    // 强制触发响应式更新
    nextTick(() => {
      // 填充到输入框中
      for (let i = 0; i < 6; i++) {
        if (digits[i]) {
          codeInputs.value[i] = digits[i]
          // 同时更新DOM元素的值
          const input = codeInputRefs.value[i]
          if (input) {
            input.value = digits[i]
          }
        }
      }
      
      updateVerificationCode()
      
      // 焦点移到最后一个有值的输入框
      const lastFilledIndex = digits.length - 1
      const focusIndex = lastFilledIndex >= 0 ? Math.min(lastFilledIndex, 5) : 0
      const targetInput = codeInputRefs.value[focusIndex]
      if (targetInput) {
        targetInput.focus()
        targetInput.select() // 选中文本以便用户知道焦点位置
      }
    })
  }
}

const updateVerificationCode = () => {
  const code = codeInputs.value.join('')
  registerForm.verificationCode = code
  
  // 如果输入完整6位，自动触发验证
  if (code.length === 6 && /^\d{6}$/.test(code)) {
    // 使用nextTick确保DOM更新完成后再验证
    nextTick(() => {
      verifyCodeRealtime()
    })
  } else if (code.length < 6) {
    // 重置验证状态
    codeVerification.status = 'idle'
    codeVerification.message = ''
    codeVerification.isValid = false
  }
}

const clearCodeInputs = () => {
  codeInputs.value = ['', '', '', '', '', '']
  registerForm.verificationCode = ''
  codeVerification.status = 'idle'
  codeVerification.message = ''
  codeVerification.isValid = false
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

const validatePrivacyAgreement = () => {
  registerErrors.value.agreeToPrivacy = ''
  
  if (!registerForm.agreeToPrivacy) {
    registerErrors.value.agreeToPrivacy = 'Please accept the Privacy Policy'
  }
}

const validateTermsAgreement = () => {
  registerErrors.value.agreeToTerms = ''
  
  if (!registerForm.agreeToTerms) {
    registerErrors.value.agreeToTerms = 'Please accept the Terms of Service'
  }
}

// Validate agreement checkboxes
const validateAgreements = () => {
  validatePrivacyAgreement()
  validateTermsAgreement()
  
  return registerForm.agreeToPrivacy && registerForm.agreeToTerms
}

// Validate the entire registration form
const validateCompleteRegistrationForm = () => {
  const step1Valid = validateRegisterStep1()
  const step2Valid = validateRegisterStep2()
  const agreementsValid = validateAgreements()
  
  return step1Valid && step2Valid && agreementsValid
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
  if (newV3Token) {
    cacheV3Token(newV3Token, action, email)
  }
  
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
      recaptcha_token: recaptchaToken || undefined
    })

    if (success) {
      notyf.success('Login successful!')
      await router.push('/app')
    }
  } catch (error: any) {
    console.error('Login failed:', error)
    console.log('🔍 错误详情 - status:', error.status, 'response.status:', error.response?.status)
    console.log('🔍 错误数据 - data:', error.data, 'response.data:', error.response?.data)
    
    // 检查是否是reCAPTCHA挑战响应（状态码423）
    const isRecaptchaChallenge = (error.status === 423 || error.response?.status === 423) && 
                                (error.data?.challenge_type === 'recaptcha_v2')
    
    console.log('🎯 是否为 reCAPTCHA 挑战:', isRecaptchaChallenge)
    console.log('🔍 检查 challenge_type:', error.data?.challenge_type)
    
    if (isRecaptchaChallenge) {
      // 显示reCAPTCHA v2验证
      recaptchaV2Challenge.value = error.data
      showRecaptchaV2.value = true
      console.log('🚀 设置挑战数据:', error.data)
      
      // 初始化reCAPTCHA v2 widget
      setTimeout(async () => {
        try {
          await initRecaptchaV2()
          notyf.success('请完成安全验证后重新登录')
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
  clearCodeInputs()

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
       recaptcha_token: tokens.v3Token || undefined,
       recaptcha_v2_token: tokens.v2Token || undefined
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
    if (error.response?.status === 423 && error.response?.data?.challenge_type === 'recaptcha_v2') {
      // 显示reCAPTCHA v2验证 for email sending
      registerRecaptchaV2Challenge.value = error.response.data
      showRegisterRecaptchaV2.value = true
      
      // 初始化reCAPTCHA v2 widget
      setTimeout(async () => {
        try {
          await initRegisterRecaptchaV2()
          notyf.success('请完成安全验证后重新发送验证码')
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

  // 在提交之前进行完整验证
  if (!validateCompleteRegistrationForm()) {
    notyf.error('Please check all required fields and agreements')
    return
  }

  registerLoading.value = true
  // 清除之前的reCAPTCHA v2挑战 (only when needed for revalidation)
  hideRegisterRecaptchaV2Challenge()

  try {
    let tokens: { v3Token: string | null, v2Token: string | null, fromCache: boolean, cacheInfo: string } = { 
      v3Token: null, 
      v2Token: null, 
      fromCache: false, 
      cacheInfo: '' 
    }
    
    // 智能验证策略：如果已通过邮箱验证码验证，可能跳过reCAPTCHA
    const hasValidEmailVerification = codeVerification.isValid && 
                                     recaptchaTokenCache.lastAction === 'send_email' &&
                                     recaptchaTokenCache.lastEmail === registerForm.email
    
    if (hasValidEmailVerification) {
      // 邮箱验证码已验证，检查是否有可用的验证token
      if (recaptchaTokenCache.v2Token && isTokenValid(recaptchaTokenCache.v2Timestamp)) {
        // 有有效的v2 token，直接使用
        tokens = {
          v3Token: null,
          v2Token: recaptchaTokenCache.v2Token,
          fromCache: true,
          cacheInfo: '使用邮箱验证时的v2 token，跳过重复验证'
        }
        console.log('✅ 智能验证：使用邮箱验证的v2 token，跳过注册reCAPTCHA')
      } else if (recaptchaTokenCache.v3Token && isTokenValid(recaptchaTokenCache.v3Timestamp)) {
        // 有有效的v3 token，直接使用
        tokens = {
          v3Token: recaptchaTokenCache.v3Token,
          v2Token: null,
          fromCache: true,
          cacheInfo: '使用邮箱验证时的v3 token，跳过重复验证'
        }
        console.log('✅ 智能验证：使用邮箱验证的v3 token，跳过注册reCAPTCHA')
      } else {
        // 没有可用token，但邮箱已验证，使用轻量级验证
        console.log('✅ 智能验证：邮箱已验证，跳过注册reCAPTCHA验证')
        tokens = { v3Token: null, v2Token: null, fromCache: true, cacheInfo: '邮箱已验证，跳过reCAPTCHA' }
      }
          } else {
        // 邮箱未验证或token过期，正常进行reCAPTCHA验证
        const optimalTokens = await getOptimalRecaptchaToken('registration', registerForm.email)
        tokens = {
          v3Token: optimalTokens.v3Token,
          v2Token: optimalTokens.v2Token,
          fromCache: optimalTokens.fromCache,
          cacheInfo: optimalTokens.cacheInfo || ''
        }
      }
    
    if (tokens.fromCache && tokens.cacheInfo) {
      console.log(`💾 Smart registration: ${tokens.cacheInfo}`)
    }
    
         const params: EnhancedRegisterParams = {
       username: registerForm.username,
       email: registerForm.email,
       password: registerForm.password,
       phone: registerForm.phone || undefined,
       verification_code: registerForm.verificationCode,
       recaptcha_token: tokens.v3Token || undefined,
       recaptcha_v2_token: tokens.v2Token || undefined
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
        verificationCode: '',
        agreeToPrivacy: false,
        agreeToTerms: false
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
    if (error.response?.status === 423 && error.response?.data?.challenge_type === 'recaptcha_v2' && 
        (!recaptchaTokenCache.v2Token || !isTokenValid(recaptchaTokenCache.v2Timestamp))) {
      // 显示reCAPTCHA v2验证 for registration
      registerRecaptchaV2Challenge.value = error.response.data
      showRegisterRecaptchaV2.value = true
      
      // 初始化reCAPTCHA v2 widget for registration
      setTimeout(async () => {
        try {
          await initRegisterRecaptchaV2()
          notyf.success('请完成安全验证后重新注册')
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
       recaptcha_token: v3Token || undefined,
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
        verificationCode: '',
        agreeToPrivacy: false,
        agreeToTerms: false
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
       recaptcha_token: v3Token || undefined,
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
        confirmPassword: '',
        verificationCode: '',
        agreeToPrivacy: false,
        agreeToTerms: false
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
  title: 'Login - Ezen Cloud',
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
    <div class="login-wrapper">
      <!-- Logo -->
      <div class="logo-container">
        <img :src="logoSrc" alt="EzCloud Logo" class="logo-image" />
      </div>
      
      <!-- Login Card -->
      <VCard class="login-card">
      
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
    </div>


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
                    <div class="verification-input-wrapper">
                      <div class="code-inputs-container">
                        <input
                          v-for="(digit, index) in codeInputs"
                          :key="index"
                          :ref="(el) => { if (el) codeInputRefs[index] = el as HTMLInputElement }"
                          v-model="codeInputs[index]"
                          type="text"
                          inputmode="numeric"
                          pattern="[0-9]"
                          maxlength="1"
                          class="code-input"
                          :class="{
                            'is-danger': registerErrors.verificationCode,
                            'is-success': codeVerification.isValid,
                            'is-filled': codeInputs[index]
                          }"
                          @input="handleCodeInput(index, $event)"
                          @keydown="handleCodeKeydown(index, $event)"
                          @paste="handleCodePaste"
                          autocomplete="off"
                        />
                      </div>
                      <div class="verification-icon">
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
                      </div>
                    </div>
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

            <!-- 用户协议和隐私政策 -->
            <div class="form-section">
              <h4 class="section-title">User Agreement</h4>
              
              <VField class="form-item agreement-field">
                <VControl>
                  <label class="checkbox-wrapper">
                    <input
                      v-model="registerForm.agreeToPrivacy"
                      type="checkbox"
                      class="agreement-checkbox"
                      @blur="validatePrivacyAgreement"
                    />
                    <span class="checkbox-text">
                      I have read and agree to the 
                      <a 
                        href="https://www.ezencloud.com/privacy" 
                        target="_blank" 
                        class="agreement-link"
                        rel="noopener noreferrer"
                      >
                        Privacy Policy
                      </a>
                    </span>
                  </label>
                  <p v-if="registerErrors.agreeToPrivacy" class="help is-danger agreement-error">
                    {{ registerErrors.agreeToPrivacy }}
                  </p>
                </VControl>
              </VField>

              <VField class="form-item agreement-field">
                <VControl>
                  <label class="checkbox-wrapper">
                    <input
                      v-model="registerForm.agreeToTerms"
                      type="checkbox"
                      class="agreement-checkbox"
                      @blur="validateTermsAgreement"
                    />
                    <span class="checkbox-text">
                      I have read and agree to the 
                      <a 
                        href="https://www.ezencloud.com/terms" 
                        target="_blank" 
                        class="agreement-link"
                        rel="noopener noreferrer"
                      >
                        Terms of Service
                      </a>
                    </span>
                  </label>
                  <p v-if="registerErrors.agreeToTerms" class="help is-danger agreement-error">
                    {{ registerErrors.agreeToTerms }}
                  </p>
                </VControl>
              </VField>
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

// Agreement checkbox styling
.agreement-field {
  margin-bottom: 1rem !important;
  
  .checkbox-wrapper {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    cursor: pointer;
    line-height: 1.5;
    
    .agreement-checkbox {
      margin-top: 0.1rem; // 微调以与文本对齐
      width: 1rem;
      height: 1rem;
      min-width: 1rem;
      flex-shrink: 0;
      cursor: pointer;
      accent-color: var(--primary);
      
      &:focus {
        outline: 2px solid var(--primary-light);
        outline-offset: 2px;
      }
    }
    
    .checkbox-text {
      font-size: 0.9rem;
      color: var(--dark-text);
      line-height: 1.5;
      
      .agreement-link {
        color: var(--primary);
        text-decoration: underline;
        font-weight: 500;
        transition: color 0.2s ease;
        
        &:hover {
          color: var(--primary-dark);
          text-decoration: none;
        }
        
        &:focus {
          outline: 2px solid var(--primary-light);
          outline-offset: 1px;
          border-radius: 2px;
        }
      }
    }
    
    &:hover .checkbox-text {
      color: var(--dark-text-dark);
    }
  }
  
  .agreement-error {
    margin-top: 0.5rem;
    margin-left: 1.75rem; // 对齐checkbox文本
  }
}

// Dark mode styles for agreement checkboxes
.is-dark {
  .agreement-field {
    .checkbox-wrapper {
      .checkbox-text {
        color: var(--dark-dark-text);
        
        .agreement-link {
          color: var(--primary-light);
          
          &:hover {
            color: var(--primary);
          }
        }
      }
      
      &:hover .checkbox-text {
        color: var(--white);
      }
    }
  }
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
      font-size: 0.9rem;
      font-weight: 400;
      line-height: 1.4;
    }
  }
  
  .verification-input-wrapper {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    
    .code-inputs-container {
      display: flex !important;
      gap: 0.5rem;
      justify-content: center;
      align-items: center;
      flex-wrap: nowrap;
      
      .code-input {
        width: 2.5rem !important;
        height: 2.5rem !important;
        min-width: 2.5rem !important;
        min-height: 2.5rem !important;
        max-width: 2.5rem !important;
        max-height: 2.5rem !important;
        text-align: center !important;
        font-family: 'Courier New', monospace !important;
        font-size: 1.25rem !important;
        font-weight: 600 !important;
        border: 2px solid #ddd !important;
        border-radius: 8px !important;
        background: white !important;
        transition: all 0.2s ease;
        padding: 0 !important;
        margin: 0 !important;
        box-sizing: border-box !important;
        display: block !important;
        appearance: none !important;
        -webkit-appearance: none !important;
        -moz-appearance: textfield !important;
        
        &:focus {
          outline: none !important;
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 3px var(--primary-light);
          transform: translateY(-1px);
        }
        
        &.is-filled {
          border-color: var(--primary) !important;
          background-color: var(--primary-light) !important;
          color: var(--primary);
        }
        
        &.is-success {
          border-color: var(--success) !important;
          background-color: var(--success-light) !important;
          color: var(--success);
        }
        
        &.is-danger {
          border-color: var(--danger) !important;
          background-color: var(--danger-light) !important;
          color: var(--danger);
          animation: shake 0.3s ease-in-out;
        }
        
        &:hover:not(:focus) {
          border-color: var(--primary-light) !important;
        }
      }
    }
    
    .verification-icon {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 1.5rem;
      
      .iconify-icon {
        font-size: 1.25rem;
        
        &.has-text-success {
          color: var(--success) !important;
        }
        
        &.has-text-danger {
          color: var(--danger) !important;
        }
      }
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
    
    .code-inputs-container .code-input {
      background: var(--dark-sidebar-light-2);
      border-color: var(--dark-sidebar-light-12);
      color: var(--dark-dark-text);
      
      &:focus {
        border-color: var(--primary);
        box-shadow: 0 0 0 3px var(--primary-light);
      }
      
      &.is-filled {
        border-color: var(--primary);
        background-color: var(--dark-sidebar-light-6);
      }
    }
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

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  75% { transform: translateX(3px); }
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
  background: linear-gradient(145deg,#92B9E0 0%,#80BBA1 100%);
  padding: 2rem;
}

.login-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  width: 100%;
  max-width: 600px;
}

.logo-container {
  display: flex;
  justify-content: center;
  align-items: center;
  
  .logo-image {
    max-width: 300px;
    max-height: 80px;
    width: auto;
    height: auto;
    object-fit: contain;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));
    transition: transform 0.3s ease;
    
    &:hover {
      transform: scale(1.02);
    }
  }
}

.login-card {
  width: 100%;
  max-width: 480px !important;
  min-width: 420px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border-radius: var(--radius-large);
  border: none;
  padding: 2.5rem;
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

  .login-wrapper {
    gap: 1.5rem;
  }

  .logo-container {
    .logo-image {
      max-width: 250px;
      max-height: 60px;
    }
  }
  
  .recaptcha-field {
    padding: 0.75rem;
    
    .recaptcha-container #recaptcha-v2-container {
      transform: scale(0.85);
    }
  }
  
  // 移动端验证码输入框优化
  .verification-input-wrapper {
    .code-inputs-container {
      gap: 0.3rem !important;
      
      .code-input {
        width: 2.2rem !important;
        height: 2.2rem !important;
        font-size: 1.1rem !important;
      }
    }
  }
  
  .verification-compact {
    padding: 0.6rem;
    
    .verification-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
      
      .verification-hint {
        font-size: 0.85rem;
      }
    }
  }
}
</style>
<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <div class="card-header">
          <h2>EzCloud Device Management Platform</h2>
          <p>User Login</p>
        </div>
      </template>
      
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        label-width="80px"
        size="large"
      >
        <el-form-item label="Email" prop="email">
          <el-input
            v-model="loginForm.email"
            type="email"
            placeholder="Please enter your email"
            :prefix-icon="User"
          />
        </el-form-item>
        
        <el-form-item label="Password" prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="Please enter your password"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        
        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            @click="handleLogin"
            style="width: 100%"
          >
            {{ loading ? 'Logging in...' : 'Login' }}
          </el-button>
        </el-form-item>
        
        <el-form-item>
          <el-button
            link
            @click="showRegister = true"
            style="width: 100%"
          >
            Don't have an account? Register here
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Register Dialog -->
    <el-dialog v-model="showRegister" title="User Registration" width="400px">
      <el-form
        ref="registerFormRef"
        :model="registerForm"
        :rules="registerRules"
        label-width="100px"
      >
        <el-form-item label="Username" prop="username">
          <el-input v-model="registerForm.username" placeholder="Please enter username" />
        </el-form-item>
        
        <el-form-item label="Email" prop="email">
          <el-input v-model="registerForm.email" type="email" placeholder="Please enter email address" />
        </el-form-item>
        
        <el-form-item label="Phone" prop="phone">
          <el-input v-model="registerForm.phone" placeholder="Phone number (optional)" />
        </el-form-item>
        
        <el-form-item label="Password" prop="password">
          <el-input
            v-model="registerForm.password"
            type="password"
            placeholder="Please enter password"
            show-password
          />
        </el-form-item>
        
        <el-form-item label="Confirm" prop="confirmPassword">
          <el-input
            v-model="registerForm.confirmPassword"
            type="password"
            placeholder="Please confirm password"
            show-password
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showRegister = false">Cancel</el-button>
          <el-button type="primary" :loading="registerLoading" @click="handleRegister">
            {{ registerLoading ? 'Registering...' : 'Register' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { authApi } from '@/api'
import { useUserStore } from '@/stores/user'
import type { LoginParams, RegisterParams } from '@/api/types'

// Router
const router = useRouter()

// Store
const userStore = useUserStore()

// Form refs
const loginFormRef = ref()
const registerFormRef = ref()

// State
const loading = ref(false)
const registerLoading = ref(false)
const showRegister = ref(false)

// Login form
const loginForm = reactive<LoginParams>({
  email: '',
  password: ''
})

// Register form
const registerForm = reactive<RegisterParams & { confirmPassword: string }>({
  username: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: ''
})

// Login form validation rules
const loginRules = {
  email: [
    { required: true, message: 'Please enter your email', trigger: 'blur' },
    { type: 'email', message: 'Please enter a valid email address', trigger: 'blur' }
  ],
  password: [
    { required: true, message: 'Please enter your password', trigger: 'blur' },
    { min: 6, message: 'Password must be at least 6 characters', trigger: 'blur' }
  ]
}

// Register form validation rules
const registerRules = {
  username: [
    { required: true, message: 'Please enter username', trigger: 'blur' },
    { min: 3, max: 50, message: 'Username must be between 3-50 characters', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]+$/, message: 'Username can only contain letters, numbers and underscores', trigger: 'blur' }
  ],
  email: [
    { required: true, message: 'Please enter email address', trigger: 'blur' },
    { type: 'email', message: 'Please enter a valid email address', trigger: 'blur' }
  ],
  password: [
    { required: true, message: 'Please enter password', trigger: 'blur' },
    { min: 6, message: 'Password must be at least 6 characters', trigger: 'blur' },
    { pattern: /^(?=.*[a-zA-Z])(?=.*\d)/, message: 'Password must contain at least one letter and one number', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: 'Please confirm password', trigger: 'blur' },
    {
      validator: (rule: any, value: string, callback: Function) => {
        if (value !== registerForm.password) {
          callback(new Error('Password confirmation does not match'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// Handle login
const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  try {
    await loginFormRef.value.validate()
    loading.value = true
    
    const response = await authApi.login(loginForm)
    
    if (response.success) {
      // Save authentication info to store and localStorage
      userStore.setToken(response.data.token)
      userStore.setUser(response.data.user)
      
      ElMessage.success('Login successful!')
      
      // Redirect to home page
      await router.push('/')
      
      console.log('Login successful, user info:', response.data.user)
    }
    
  } catch (error: any) {
    console.error('Login failed:', error)
    ElMessage.error(error.message || 'Login failed')
  } finally {
    loading.value = false
  }
}

// Handle register
const handleRegister = async () => {
  if (!registerFormRef.value) return
  
  try {
    await registerFormRef.value.validate()
    registerLoading.value = true
    
    const { confirmPassword, ...registerData } = registerForm
    const response = await authApi.register(registerData)
    
    if (response.success) {
      ElMessage.success('Registration successful! Please login with your new account.')
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
    ElMessage.error(error.message || 'Registration failed')
  } finally {
    registerLoading.value = false
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
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

:deep(.el-form-item__label) {
  font-weight: 500;
}

:deep(.el-input__inner) {
  border-radius: 8px;
}

:deep(.el-button) {
  border-radius: 8px;
  font-weight: 500;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style> 
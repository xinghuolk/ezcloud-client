<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserSession } from '/@src/stores/user-session'
import { useUserToken } from '/@src/composables/user-token'
import { Notyf } from 'notyf'

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
  confirmPassword: ''
})

const errors = ref({
  email: '',
  password: ''
})

const registerErrors = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

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

const validateRegisterForm = () => {
  registerErrors.value = { username: '', email: '', password: '', confirmPassword: '' }
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


// Handlers
const handleLogin = async () => {
  if (!validateLoginForm()) {
    return
  }

  loading.value = true

  try {
    const success = await userSession.loginUser({
      email: loginForm.email,
      password: loginForm.password
    })

    if (success) {
      notyf.success('Login successful!')
      await router.push('/app')
    }
  } catch (error: any) {
    console.error('Login failed:', error)
    notyf.error(error.message || 'Login failed')
  } finally {
    loading.value = false
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
  title: 'Login - EzCloud Device Management Platform'
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
      size="small"
      actions="right"
      @close="showRegister = false"
    >
      <template #content>
        <form @submit.prevent="handleRegister">
          <VField class="form-item">
            <VLabel>Username</VLabel>
            <VControl>
              <VInput
                v-model="registerForm.username"
                placeholder="Please enter username"
                :class="{ 'is-danger': registerErrors.username }"
              />
              <p v-if="registerErrors.username" class="help is-danger">
                {{ registerErrors.username }}
              </p>
            </VControl>
          </VField>
          
          <VField class="form-item">
            <VLabel>Email</VLabel>
            <VControl>
              <VInput
                v-model="registerForm.email"
                type="email"
                placeholder="Please enter email address"
                :class="{ 'is-danger': registerErrors.email }"
              />
              <p v-if="registerErrors.email" class="help is-danger">
                {{ registerErrors.email }}
              </p>
            </VControl>
          </VField>
          
          <VField class="form-item">
            <VLabel>Phone</VLabel>
            <VControl>
              <VInput
                v-model="registerForm.phone"
                placeholder="Phone number (optional)"
              />
            </VControl>
          </VField>
          
          <VField class="form-item">
            <VLabel>Password</VLabel>
            <VControl>
              <VInput
                v-model="registerForm.password"
                type="password"
                placeholder="Please enter password"
                :class="{ 'is-danger': registerErrors.password }"
              />
              <p v-if="registerErrors.password" class="help is-danger">
                {{ registerErrors.password }}
              </p>
            </VControl>
          </VField>
          
          <VField class="form-item">
            <VLabel>Confirm Password</VLabel>
            <VControl>
              <VInput
                v-model="registerForm.confirmPassword"
                type="password"
                placeholder="Please confirm password"
                :class="{ 'is-danger': registerErrors.confirmPassword }"
              />
              <p v-if="registerErrors.confirmPassword" class="help is-danger">
                {{ registerErrors.confirmPassword }}
              </p>
            </VControl>
          </VField>
        </form>
      </template>
      
      <template #action>
        <VButton @click="showRegister = false">Cancel</VButton>
        <VButton 
          color="primary" 
          :loading="registerLoading"
          @click="handleRegister"
        >
          {{ registerLoading ? 'Registering...' : 'Register' }}
        </VButton>
      </template>
    </VModal>
  </div>
</template>

<style lang="scss" scoped>
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
  .login-container {
    background: linear-gradient(135deg, #2d3748 0%, #4a5568 100%);
  }
  
  .card-header {
    h2 {
      color: var(--dark-dark-text);
    }
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
}
</style>
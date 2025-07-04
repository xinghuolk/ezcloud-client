<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserSession } from '/@src/stores/user-session'

const router = useRouter()
const userSession = useUserSession()

onMounted(() => {
  // 如果用户已登录，重定向到应用首页
  if (userSession.isLoggedIn) {
    router.replace('/app')
  } else {
    // 如果用户未登录，重定向到登录页
    router.replace('/auth')
  }
})

useHead({
  title: 'EzCloud - IoT Device Management Platform',
})
</script>

<template>
  <div class="loading-container">
    <VLoader size="large" />
    <p class="loading-text">Loading EzCloud...</p>
  </div>
</template>

<style lang="scss" scoped>
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--background-grey);

  .loading-text {
    margin-top: 1rem;
    color: var(--muted-grey);
    font-weight: 500;
    font-size: 1.1rem;
  }
}

.is-dark {
  .loading-container {
    background: var(--dark-sidebar-dark-6);
  }
}
</style>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { SideblockItem } from '/@src/components/layouts/sideblock/sideblock.types'
import { useUserSession } from '/@src/stores/user-session'
import { useDarkmode } from '/@src/composables/darkmode'
import ToolbarUserProfile from '/@src/components/partials/layout/toolbar/ToolbarUserProfile.vue'
// Import logos directly
import logoLight from '/@src/assets/images/EzenCloud-Logo_v2.png'
import logoDark from '/@src/assets/images/EzenCloud-Logo-v2-Dark.png'

const router = useRouter()
const userSession = useUserSession()
const darkmode = useDarkmode()

// 根据dark mode状态动态选择logo
const logoSrc = computed(() => {
  // 直接访问响应式值，确保能触发重新计算
  const isDarkMode = darkmode.isDark.value
  console.log('🌙 Dark mode status changed to:', isDarkMode)
  
  // 修正逻辑：暗色模式使用暗色logo，亮色模式使用亮色logo
  const selectedLogo = isDarkMode ? logoDark : logoLight
  
  console.log('🎨 Selected logo:', selectedLogo)
  console.log('🎨 Logic: darkmode =', isDarkMode, '-> using', isDarkMode ? 'dark logo' : 'light logo')
  
  return selectedLogo
})

const allLinks = ref<SideblockItem[]>([
  {
    type: 'link',
    label: 'Dashboard',
    icon: 'lucide:home',
    to: '/app',
    // 所有用户都可以访问
  },
  {
    type: 'link',
    label: 'Device Management',
    icon: 'lucide:monitor',
    to: '/app/devices',
    permission: 'device:view',
  },
  {
    type: 'link',
    label: 'Vendor Management',
    icon: 'lucide:building',
    to: '/app/vendors',
    permission: 'vendor:manage',
  },
  {
    type: 'link',
    label: 'Device Models',
    icon: 'lucide:package',
    to: '/app/models',
    permission: 'model:manage',
  },
  {
    type: 'link',
    label: 'Serial Numbers',
    icon: 'lucide:hash',
    to: '/app/serials',
    permission: 'serial:manage',
  },
  {
    type: 'link',
    label: 'Firmware Management',
    icon: 'lucide:download',
    to: '/app/firmware',
    permission: 'firmware:manage',
  },
  {
    type: 'link',
    label: 'WiFi Templates',
    icon: 'lucide:wifi',
    to: '/app/wifi-templates',
    permission: 'wifi:configure',
  },
  {
    type: 'link',
    label: 'User Management',
    icon: 'lucide:users',
    to: '/app/users',
    permission: 'user:manage',
  },
  {
    type: 'divider',
  },
  {
    type: 'link',
    label: 'Profile',
    icon: 'lucide:user',
    to: '/app/profile',
    permission: 'profile:edit',
  },
  {
    type: 'link',
    label: 'About',
    icon: 'lucide:info',
    to: '/app/about',
    permission: 'system:view',
  },
])

// 根据用户权限过滤菜单项
const links = computed(() => {
  return allLinks.value.filter(link => {
    // 分隔符总是显示
    if (link.type === 'divider') return true
    
    // 如果没有权限要求，默认显示
    if (!('permission' in link) || !link.permission) return true
    
    // 检查用户权限
    return userSession.hasPermission(link.permission)
  })
})

// 调试：监听darkmode变化
watch(() => darkmode.isDark.value, (newValue, oldValue) => {
  console.log(`🔄 Darkmode changed: ${oldValue} → ${newValue}`)
  console.log('🔄 Logo will change to:', logoSrc.value)
}, { immediate: true })

</script>

<template>
  <SideblockLayout
    :links
    open-on-mounted
    size="large"
  >
    <slot />

    <template #logo>
      <div class="is-hidden-mobile logo-container">
        <img :src="logoSrc" alt="EzCloud" class="logo-image" />
      </div>
    </template>

    <template #toolbar>
      <VDarkmodeToggle />
    </template>

    <template #toolbar-mobile>
      <ToolbarUserProfile />
    </template>

    <template #sideblock-end>
      <ToolbarUserProfile end />
    </template>
  </SideblockLayout>
</template>

<style lang="scss" scoped>
.logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 0 1rem;
  
  .logo-image {
    width: 100%;
    max-width: 190px;
    height: auto;
    max-height: 50px;
    object-fit: contain;
    transition: all 0.3s ease;
    
    &:hover {
      transform: scale(1.02);
    }
  }
}

// 移动端隐藏时保持样式一致
@media (max-width: 768px) {
  .logo-container {
    padding: 0 0.5rem;
  }
}
</style>
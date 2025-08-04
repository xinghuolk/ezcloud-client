<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { SideblockItem } from '/@src/components/layouts/sideblock/sideblock.types'
import { useUserSession } from '/@src/stores/user-session'
import ToolbarUserProfile from '/@src/components/partials/layout/toolbar/ToolbarUserProfile.vue'

const router = useRouter()
const userSession = useUserSession()

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

</script>

<template>
  <SideblockLayout
    :links
    open-on-mounted
    size="large"
  >
    <slot />

    <template #logo>
      <h3 class="is-hidden-mobile ml-2">
        EzCloud
      </h3>
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
</style>
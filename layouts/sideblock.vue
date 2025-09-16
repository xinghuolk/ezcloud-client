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
import logoFav from '/@src/assets/images/EzenCloud-Logo_Fav.png'

const router = useRouter()
const userSession = useUserSession()
const darkmode = useDarkmode()

// 根据dark mode状态动态选择logo
const logoSrc = computed(() => {
  // 直接访问响应式值，确保能触发重新计算
  const isDarkMode = darkmode.isDark.value

  // 修正逻辑：暗色模式使用暗色logo，亮色模式使用亮色logo
  const selectedLogo = isDarkMode ? logoDark : logoLight

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
  // TODO: [v2.1] WiFi Templates功能 - 需完成WiFi模板管理的完整功能开发、设备兼容性测试和模板配置验证后启用
  // {
  //   type: 'link',
  //   label: 'WiFi Templates',
  //   icon: 'lucide:wifi',
  //   to: '/app/wifi-templates',
  //   permission: 'wifi:configure',
  // },
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
      <!-- 桌面端logo -->
      <div class="is-hidden-mobile logo-container">
        <RouterLink to="/app" class="logo-link">
          <img :src="logoSrc" alt="EzenCloud" class="logo-image" />
        </RouterLink>
      </div>
      <!-- 移动端logo -->
      <div class="is-hidden-tablet mobile-logo-container">
        <RouterLink to="/app" class="logo-link">
          <img :src="logoSrc" alt="EzenCloud" class="mobile-logo-image" />
        </RouterLink>
      </div>
    </template>

    <template #logo-collapsed>
      <div class="is-hidden-mobile logo-container-collapsed">
        <RouterLink to="/app" class="logo-link">
          <img :src="logoFav" alt="EzenCloud" class="logo-image-collapsed" />
        </RouterLink>
      </div>
    </template>

    <template #toolbar>
      <VDarkmodeToggle />
    </template>

    <template #toolbar-mobile>
      <ToolbarUserProfile mobile />
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

  .logo-link {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    text-decoration: none;
    cursor: pointer;
  }

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

.logo-container-collapsed {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 0;

  .logo-link {
    display: flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    cursor: pointer;
  }

  .logo-image-collapsed {
    width: 40px;
    height: 40px;
    object-fit: contain;
    transition: all 0.3s ease;

    &:hover {
      transform: scale(1.1);
    }
  }
}

.mobile-logo-container {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  height: 100%;
  padding: 0 1rem;

  .logo-link {
    display: flex;
    align-items: center;
    text-decoration: none;
    cursor: pointer;
  }

  .mobile-logo-image {
    height: 36px;
    max-height: 36px;
    width: auto;
    object-fit: contain;
    transition: all 0.3s ease;
  }
}

// 移动端隐藏时保持样式一致
@media (max-width: 768px) {
  .logo-container {
    padding: 0 0.5rem;
  }
}
</style>
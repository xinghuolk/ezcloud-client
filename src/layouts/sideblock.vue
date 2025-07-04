<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { SideblockItem } from '/@src/components/layouts/sideblock/sideblock.types'
import ToolbarUserProfile from '/@src/components/partials/layout/toolbar/ToolbarUserProfile.vue'

const router = useRouter()

const links = ref<SideblockItem[]>([
  {
    type: 'link',
    label: 'Dashboard',
    icon: 'lucide:home',
    to: '/app',
  },
  {
    type: 'link',
    label: 'Device Management',
    icon: 'lucide:monitor',
    to: '/app/devices',
  },
  {
    type: 'link',
    label: 'Vendor Management',
    icon: 'lucide:building',
    to: '/app/vendors',
  },
  {
    type: 'link',
    label: 'Device Models',
    icon: 'lucide:package',
    to: '/app/models',
  },
  {
    type: 'link',
    label: 'Serial Numbers',
    icon: 'lucide:hash',
    to: '/app/serials',
  },
  {
    type: 'link',
    label: 'WiFi Templates',
    icon: 'lucide:wifi',
    to: '/app/wifi-templates',
  },
  {
    type: 'divider',
  },
  {
    type: 'link',
    label: 'Profile',
    icon: 'lucide:user',
    to: '/app/profile',
  },
  {
    type: 'link',
    label: 'About',
    icon: 'lucide:info',
    to: '/app/about',
  },
])

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
<script setup lang="ts">
import type { SideblockItem, SideblockItemAction } from './sideblock.types'

const props = withDefaults(
  defineProps<{
    link: SideblockItem
    collapsed?: boolean
  }>(),
  {
    collapsed: false,
  },
)

// Type guard for action items
const isActionItem = (link: SideblockItem): link is SideblockItemAction => {
  return link.type === 'action' && 'onClick' in link
}

// Handle click for action items
const handleActionClick = () => {
  if (isActionItem(props.link)) {
    props.link.onClick()
  }
}
</script>

<template>
  <!-- Link items -->
  <li v-if="props.link.type === 'link'">
    <VLink
      :to="props.link.to"
      class="single-link"
      v-tooltip.right="props.collapsed ? `${props.link.label}${props.link.badge !== undefined ? ` (${props.link.badge})` : ''}` : null"
    >
      <span class="icon">
        <VIcon :icon="props.link.icon" />
      </span>
      <span :class="{ 'sr-only': props.collapsed }">{{ props.link.label }}</span>
      <span v-if="props.link.badge !== undefined" :class="['badge', { 'sr-only': props.collapsed }]">{{ props.link.badge }}</span>
    </VLink>
  </li>

  <!-- Component items -->
  <component
    :is="props.link.component"
    v-else-if="props.link.type === 'component'"
    :title="props.link.label"
  />

  <!-- Action items -->
  <li v-else-if="props.link.type === 'action'">
    <a
      role="button"
      tabindex="0"
      class="single-link"
      v-tooltip.right="props.collapsed ? `${props.link.label}${props.link.badge !== undefined ? ` (${props.link.badge})` : ''}` : null"
      @click="handleActionClick"
      @keydown.enter.prevent="handleActionClick"
    >
      <span class="icon">
        <VIcon :icon="props.link.icon" />
      </span>
      <span :class="{ 'sr-only': props.collapsed }">{{ props.link.label }}</span>
      <span v-if="props.link.badge !== undefined" :class="['badge', { 'sr-only': props.collapsed }]">{{ props.link.badge }}</span>
    </a>
  </li>

  <!-- Collapse items -->
  <VCollapseLinks
    v-else-if="props.link.type === 'collapse'"
    :links="props.link.children"
  >
    <div class="icon">
      <VIcon :icon="props.link.icon" />
    </div>
    <span :class="{ 'sr-only': props.collapsed }">{{ props.link.label }}</span>
  </VCollapseLinks>

  <!-- Divider -->
  <li
    v-else-if="props.link.type === 'divider'"
    class="divider"
    role="separator"
    aria-hidden="true"
  />
</template>

<style lang="scss" scoped>
// Screen reader only class - accessible but visually hidden
.sr-only {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}
</style>
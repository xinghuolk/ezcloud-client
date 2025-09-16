import type { VNode, Component } from 'vue'

// -- Sideblock
export interface SideblockItemCollapse {
  type: 'collapse'
  id: string
  icon: string
  hideMobile?: boolean
  label?: string
  permission?: string  // 权限检查

  children: {
    label: string
    to: string
    icon?: string
    tag?: string
    permission?: string  // 子项权限检查
  }[]
}
export interface SideblockItemLink {
  type: 'link'
  icon: string
  hideMobile?: boolean
  label?: string
  badge?: string | number
  permission?: string  // 权限检查

  to: string
}
export interface SideblockItemAction {
  type: 'action'
  id: string
  icon: string
  hideMobile?: boolean
  label?: string
  badge?: string | number
  permission?: string  // 权限检查

  onClick: (event: Event) => void
}
export interface SideblockItemComponent {
  type: 'component'
  id: string
  hideMobile?: boolean
  label?: string
  permission?: string  // 权限检查

  component: string | Component | (() => VNode)
}
export interface SideblockItemDivider {
  type: 'divider'
  label?: string
}

export type SideblockItem =
  | SideblockItemCollapse
  | SideblockItemLink
  | SideblockItemAction
  | SideblockItemComponent
  | SideblockItemDivider

// -- Context
export type SideblockTheme =
  | 'default'
  | 'curved'
  | 'color'
  | 'color-curved'

export interface SideblockLayoutContext {
  links: ComputedRef<SideblockItem[]>
  theme: ComputedRef<SideblockTheme>

  closeOnChange: ComputedRef<boolean>
  openOnMounted: ComputedRef<boolean>

  isMobileSideblockOpen: Ref<boolean>
  isDesktopSideblockOpen: Ref<boolean>
}

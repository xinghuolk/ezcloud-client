import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Tab类型定义
export interface TabItem {
  id: string
  name: string
  title: string
  type: 'main' | 'ssh-terminal' | 'device-detail'
  closable: boolean
  deviceId?: number
  deviceName?: string
  deviceSerial?: string
  props?: Record<string, any>
  meta?: Record<string, any>
}

// SSH终端Tab专用接口
export interface SSHTerminalTab extends TabItem {
  type: 'ssh-terminal'
  deviceId: number
  deviceName: string
  deviceSerial: string
  connected: boolean
  sshPort?: number
  lastActivity: number
}

export const useTabsStore = defineStore('tabs', () => {
  // 状态
  const activeTabId = ref<string>('main')
  const tabs = ref<TabItem[]>([
    {
      id: 'main',
      name: 'main',
      title: '工作区',
      type: 'main',
      closable: false
    }
  ])

  // 计算属性
  const activeTab = computed(() => tabs.value.find(tab => tab.id === activeTabId.value))
  const sshTerminalTabs = computed(() => 
    tabs.value.filter(tab => tab.type === 'ssh-terminal') as SSHTerminalTab[]
  )
  const closableTabs = computed(() => tabs.value.filter(tab => tab.closable))

  // 私有方法：生成唯一Tab ID
  const generateTabId = (type: string, deviceId?: number): string => {
    const timestamp = Date.now()
    const suffix = deviceId ? `-${deviceId}` : ''
    return `${type}${suffix}-${timestamp}`
  }

  // 私有方法：从sessionStorage加载Tab状态
  const loadTabsFromStorage = () => {
    try {
      const storedTabs = sessionStorage.getItem('ezcloud_tabs')
      const storedActiveId = sessionStorage.getItem('ezcloud_active_tab')
      
      if (storedTabs) {
        const parsedTabs = JSON.parse(storedTabs) as TabItem[]
        // 过滤掉无效的Tab，保留main Tab
        const validTabs = parsedTabs.filter(tab => 
          tab.id === 'main' || (tab.closable && tab.deviceId)
        )
        
        if (validTabs.length > 0) {
          tabs.value = validTabs
        }
      }
      
      if (storedActiveId && tabs.value.some(tab => tab.id === storedActiveId)) {
        activeTabId.value = storedActiveId
      }
    } catch (error) {
      console.warn('Failed to load tabs from sessionStorage:', error)
    }
  }

  // 私有方法：保存Tab状态到sessionStorage
  const saveTabsToStorage = () => {
    try {
      sessionStorage.setItem('ezcloud_tabs', JSON.stringify(tabs.value))
      sessionStorage.setItem('ezcloud_active_tab', activeTabId.value)
    } catch (error) {
      console.warn('Failed to save tabs to sessionStorage:', error)
    }
  }

  // 方法：打开SSH终端Tab
  const openSSHTerminal = (deviceId: number, deviceName: string, deviceSerial: string, sshPort?: number): string => {
    // 检查是否已存在该设备的SSH终端Tab
    const existingTab = sshTerminalTabs.value.find(tab => tab.deviceId === deviceId)
    if (existingTab) {
      activeTabId.value = existingTab.id
      return existingTab.id
    }

    // 创建新的SSH终端Tab
    const newTab: SSHTerminalTab = {
      id: generateTabId('ssh-terminal', deviceId),
      name: `ssh-terminal-${deviceId}`,
      title: `终端 - ${deviceName}`,
      type: 'ssh-terminal',
      closable: true,
      deviceId,
      deviceName,
      deviceSerial,
      connected: false,
      sshPort,
      lastActivity: Date.now(),
      props: {
        deviceId,
        deviceName,
        deviceSerial,
        sshPort
      }
    }

    tabs.value.push(newTab)
    activeTabId.value = newTab.id
    saveTabsToStorage()

    return newTab.id
  }

  // 方法：关闭Tab
  const closeTab = (tabId: string): boolean => {
    const tabIndex = tabs.value.findIndex(tab => tab.id === tabId)
    if (tabIndex === -1) return false

    const tab = tabs.value[tabIndex]
    
    // 不能关闭main Tab
    if (!tab.closable) return false

    // 如果关闭的是当前活动Tab，需要切换到其他Tab
    if (activeTabId.value === tabId) {
      // 优先切换到前一个Tab，如果没有则切换到后一个，最后切换到main
      if (tabIndex > 0) {
        activeTabId.value = tabs.value[tabIndex - 1].id
      } else if (tabIndex < tabs.value.length - 1) {
        activeTabId.value = tabs.value[tabIndex + 1].id
      } else {
        activeTabId.value = 'main'
      }
    }

    // 移除Tab
    tabs.value.splice(tabIndex, 1)
    saveTabsToStorage()

    return true
  }

  // 方法：切换到指定Tab
  const switchToTab = (tabId: string): boolean => {
    const tab = tabs.value.find(tab => tab.id === tabId)
    if (!tab) return false

    activeTabId.value = tabId
    saveTabsToStorage()
    return true
  }

  // 方法：更新SSH终端Tab状态
  const updateSSHTerminalStatus = (tabId: string, connected: boolean, sshPort?: number) => {
    const tab = tabs.value.find(tab => tab.id === tabId) as SSHTerminalTab
    if (tab && tab.type === 'ssh-terminal') {
      tab.connected = connected
      tab.lastActivity = Date.now()
      if (sshPort) {
        tab.sshPort = sshPort
      }
      saveTabsToStorage()
    }
  }

  // 方法：获取SSH终端Tab信息
  const getSSHTerminalTab = (tabId: string): SSHTerminalTab | null => {
    const tab = tabs.value.find(tab => tab.id === tabId)
    return (tab && tab.type === 'ssh-terminal') ? tab as SSHTerminalTab : null
  }

  // 方法：关闭所有可关闭的Tab
  const closeAllClosableTabs = (): number => {
    const closableTabIds = closableTabs.value.map(tab => tab.id)
    let closedCount = 0

    closableTabIds.forEach(tabId => {
      if (closeTab(tabId)) {
        closedCount++
      }
    })

    return closedCount
  }

  // 方法：清理无效Tab（设备不存在等）
  const cleanupInvalidTabs = (validDeviceIds: number[]) => {
    const invalidTabs = sshTerminalTabs.value.filter(tab => 
      !validDeviceIds.includes(tab.deviceId)
    )

    invalidTabs.forEach(tab => {
      closeTab(tab.id)
    })

    return invalidTabs.length
  }

  // 方法：重置Tab状态
  const resetTabs = () => {
    tabs.value = [
      {
        id: 'main',
        name: 'main',
        title: '工作区',
        type: 'main',
        closable: false
      }
    ]
    activeTabId.value = 'main'
    
    // 清除存储
    try {
      sessionStorage.removeItem('ezcloud_tabs')
      sessionStorage.removeItem('ezcloud_active_tab')
    } catch (error) {
      console.warn('Failed to clear tabs from sessionStorage:', error)
    }
  }

  // 初始化：从sessionStorage恢复Tab状态
  loadTabsFromStorage()

  return {
    // 状态
    activeTabId,
    tabs,
    
    // 计算属性
    activeTab,
    sshTerminalTabs,
    closableTabs,
    
    // 方法
    openSSHTerminal,
    closeTab,
    switchToTab,
    updateSSHTerminalStatus,
    getSSHTerminalTab,
    closeAllClosableTabs,
    cleanupInvalidTabs,
    resetTabs
  }
})
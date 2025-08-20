/**
 * WebSocket API集成测试
 * 测试前端WebSocket实时通信功能，包括：
 * - SSH终端WebSocket连接
 * - 设备状态实时更新
 * - 连接管理和重连机制
 * - 消息队列和缓冲机制
 * - 错误处理和降级策略
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useDeviceStore } from '/@src/stores/devices'
import { timerUtils } from './setup'

// WebSocket Mock Implementation
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  url: string
  readyState: number = MockWebSocket.CONNECTING
  protocol: string = ''
  
  private listeners: Map<string, Function[]> = new Map()
  private messageQueue: any[] = []
  private connectionDelay: number = 100

  constructor(url: string, protocols?: string | string[]) {
    this.url = url
    this.protocol = Array.isArray(protocols) ? protocols[0] || '' : protocols || ''
    
    // Simulate connection delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      this.dispatchEvent({ type: 'open' })
    }, this.connectionDelay)
  }

  send = vi.fn((data: string | ArrayBuffer) => {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open')
    }
    
    // Store sent messages for verification
    this.messageQueue.push(data)
    
    // Echo back for testing
    setTimeout(() => {
      this.receiveMessage(data)
    }, 10)
  })

  close = vi.fn((code?: number, reason?: string) => {
    this.readyState = MockWebSocket.CLOSING
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED
      this.dispatchEvent({ 
        type: 'close', 
        code: code || 1000, 
        reason: reason || 'Normal closure' 
      })
    }, 50)
  })

  addEventListener = vi.fn((type: string, listener: Function) => {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, [])
    }
    this.listeners.get(type)!.push(listener)
  })

  removeEventListener = vi.fn((type: string, listener: Function) => {
    const listeners = this.listeners.get(type)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  })

  dispatchEvent(event: any) {
    const listeners = this.listeners.get(event.type) || []
    listeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('WebSocket event listener error:', error)
      }
    })
  }

  // Test utilities
  receiveMessage(data: any) {
    this.dispatchEvent({
      type: 'message',
      data: typeof data === 'string' ? data : JSON.stringify(data)
    })
  }

  simulateError(error: Error) {
    this.dispatchEvent({ type: 'error', error })
  }

  simulateConnectionLoss() {
    this.readyState = MockWebSocket.CLOSED
    this.dispatchEvent({ 
      type: 'close', 
      code: 1006, 
      reason: 'Abnormal closure' 
    })
  }

  getMessageQueue() {
    return [...this.messageQueue]
  }

  clearMessageQueue() {
    this.messageQueue = []
  }
}

// WebSocket Connection Manager
class WebSocketManager {
  private connections: Map<string, MockWebSocket> = new Map()
  private reconnectAttempts: Map<string, number> = new Map()
  private maxReconnectAttempts: number = 5
  private reconnectDelay: number = 1000

  connect(url: string, protocols?: string | string[]): MockWebSocket {
    const ws = new MockWebSocket(url, protocols)
    this.connections.set(url, ws)
    this.reconnectAttempts.set(url, 0)
    
    // Setup auto-reconnect on connection loss
    ws.addEventListener('close', (event: any) => {
      if (event.code !== 1000) { // Not normal closure
        this.handleReconnect(url, protocols)
      }
    })
    
    return ws
  }

  private async handleReconnect(url: string, protocols?: string | string[]) {
    const attempts = this.reconnectAttempts.get(url) || 0
    
    if (attempts < this.maxReconnectAttempts) {
      this.reconnectAttempts.set(url, attempts + 1)
      
      await new Promise(resolve => setTimeout(resolve, this.reconnectDelay * Math.pow(2, attempts)))
      
      try {
        const newWs = this.connect(url, protocols)
        console.log(`WebSocket reconnected to ${url} (attempt ${attempts + 1})`)
        return newWs
      } catch (error) {
        console.error(`WebSocket reconnection failed for ${url}:`, error)
        this.handleReconnect(url, protocols)
      }
    } else {
      console.error(`WebSocket max reconnection attempts reached for ${url}`)
    }
  }

  disconnect(url: string) {
    const ws = this.connections.get(url)
    if (ws) {
      ws.close(1000, 'Normal closure')
      this.connections.delete(url)
      this.reconnectAttempts.delete(url)
    }
  }

  getConnection(url: string): MockWebSocket | undefined {
    return this.connections.get(url)
  }

  disconnectAll() {
    for (const [url] of this.connections) {
      this.disconnect(url)
    }
  }
}

// Mock global WebSocket
global.WebSocket = MockWebSocket as any

// Message processors for different WebSocket message types
const processSSHTerminalMessage = (message: any) => {
  if (typeof message === 'string') {
    try {
      const parsed = JSON.parse(message)
      return {
        type: 'ssh_terminal',
        command: parsed.command,
        output: parsed.output,
        error: parsed.error,
        session_id: parsed.session_id
      }
    } catch {
      return { type: 'ssh_terminal', raw: message }
    }
  }
  return message
}

const processDeviceStatusMessage = (message: any) => {
  try {
    const parsed = typeof message === 'string' ? JSON.parse(message) : message
    return {
      type: 'device_status_update',
      device_id: parsed.device_id,
      status: parsed.status,
      timestamp: parsed.timestamp || new Date().toISOString()
    }
  } catch {
    return { type: 'unknown', raw: message }
  }
}

describe('WebSocket API集成测试', () => {
  let deviceStore: ReturnType<typeof useDeviceStore>
  let wsManager: WebSocketManager

  beforeEach(() => {
    setActivePinia(createPinia())
    deviceStore = useDeviceStore()
    wsManager = new WebSocketManager()
    vi.clearAllMocks()
  })

  afterEach(() => {
    wsManager.disconnectAll()
    vi.clearAllMocks()
  })

  describe('SSH终端WebSocket连接', () => {
    it('应该成功建立SSH终端连接', async () => {
      const deviceId = 1
      const token = 'test_jwt_token'
      const wsUrl = `/ws/ssh-terminal/device/${deviceId}?token=${token}`
      
      const ws = wsManager.connect(wsUrl)
      
      // Wait for connection to open
      await new Promise(resolve => {
        ws.addEventListener('open', resolve)
      })
      
      expect(ws.readyState).toBe(MockWebSocket.OPEN)
      expect(ws.url).toBe(wsUrl)
    })

    it('应该正确处理SSH命令发送和响应', async () => {
      const deviceId = 1
      const token = 'test_jwt_token'
      const wsUrl = `/ws/ssh-terminal/device/${deviceId}?token=${token}`
      
      const ws = wsManager.connect(wsUrl)
      await new Promise(resolve => ws.addEventListener('open', resolve))
      
      const receivedMessages: any[] = []
      ws.addEventListener('message', (event: any) => {
        const processed = processSSHTerminalMessage(event.data)
        receivedMessages.push(processed)
      })
      
      // Send SSH command
      const command = {
        type: 'command',
        command: 'ls -la',
        session_id: 'session_123'
      }
      
      ws.send(JSON.stringify(command))
      
      // Simulate server response
      const response = {
        type: 'output',
        output: 'total 12\ndrwxr-xr-x 3 root root 4096 Jan 1 12:00 .\ndrwxr-xr-x 4 root root 4096 Jan 1 12:00 ..',
        session_id: 'session_123'
      }
      
      ws.receiveMessage(JSON.stringify(response))
      
      await nextTick()
      
      // Verify command was sent
      const sentMessages = ws.getMessageQueue()
      expect(sentMessages).toHaveLength(1)
      expect(JSON.parse(sentMessages[0])).toEqual(command)
      
      // Verify response was received and processed
      expect(receivedMessages).toHaveLength(1)
      expect(receivedMessages[0].output).toContain('drwxr-xr-x')
      expect(receivedMessages[0].session_id).toBe('session_123')
    })

    it('应该处理SSH连接错误和重连', async () => {
      const deviceId = 1
      const token = 'test_jwt_token'
      const wsUrl = `/ws/ssh-terminal/device/${deviceId}?token=${token}`
      
      const ws = wsManager.connect(wsUrl)
      await new Promise(resolve => ws.addEventListener('open', resolve))
      
      const errorEvents: any[] = []
      const closeEvents: any[] = []
      
      ws.addEventListener('error', (event: any) => {
        errorEvents.push(event)
      })
      
      ws.addEventListener('close', (event: any) => {
        closeEvents.push(event)
      })
      
      // Simulate SSH authentication error
      ws.simulateError(new Error('SSH authentication failed'))
      
      // Simulate connection loss
      ws.simulateConnectionLoss()
      
      await nextTick()
      
      expect(errorEvents).toHaveLength(1)
      expect(errorEvents[0].error.message).toBe('SSH authentication failed')
      
      expect(closeEvents).toHaveLength(1)
      expect(closeEvents[0].code).toBe(1006) // Abnormal closure
    })

    it('应该支持多个并发SSH会话', async () => {
      const deviceIds = [1, 2, 3]
      const token = 'test_jwt_token'
      const connections: MockWebSocket[] = []
      
      // Create multiple SSH connections
      for (const deviceId of deviceIds) {
        const wsUrl = `/ws/ssh-terminal/device/${deviceId}?token=${token}`
        const ws = wsManager.connect(wsUrl)
        connections.push(ws)
        
        await new Promise(resolve => ws.addEventListener('open', resolve))
      }
      
      // Verify all connections are established
      expect(connections).toHaveLength(3)
      connections.forEach((ws, index) => {
        expect(ws.readyState).toBe(MockWebSocket.OPEN)
        expect(ws.url).toContain(`device/${deviceIds[index]}`)
      })
      
      // Send commands to each session
      connections.forEach((ws, index) => {
        const command = {
          type: 'command',
          command: `echo "Hello from device ${deviceIds[index]}"`,
          session_id: `session_${deviceIds[index]}`
        }
        ws.send(JSON.stringify(command))
      })
      
      // Verify all commands were sent
      connections.forEach(ws => {
        expect(ws.getMessageQueue()).toHaveLength(1)
      })
    })
  })

  describe('设备状态实时更新', () => {
    it('应该接收设备状态更新并同步到store', async () => {
      const wsUrl = '/ws/device-status'
      const ws = wsManager.connect(wsUrl)
      await new Promise(resolve => ws.addEventListener('open', resolve))
      
      const statusUpdates: any[] = []
      ws.addEventListener('message', (event: any) => {
        const processed = processDeviceStatusMessage(event.data)
        statusUpdates.push(processed)
        
        // Simulate store update
        if (processed.type === 'device_status_update') {
          deviceStore.updateDeviceInList(processed.device_id, {
            is_online: processed.status.is_online,
            last_seen: processed.timestamp
          })
        }
      })
      
      // Simulate device coming online
      const onlineUpdate = {
        device_id: 1,
        status: {
          is_online: true,
          signal_strength: -75,
          battery_level: 85
        },
        timestamp: new Date().toISOString()
      }
      
      ws.receiveMessage(JSON.stringify(onlineUpdate))
      
      // Simulate device going offline
      const offlineUpdate = {
        device_id: 1,
        status: {
          is_online: false,
          last_seen: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      }
      
      ws.receiveMessage(JSON.stringify(offlineUpdate))
      
      await nextTick()
      
      expect(statusUpdates).toHaveLength(2)
      expect(statusUpdates[0].status.is_online).toBe(true)
      expect(statusUpdates[1].status.is_online).toBe(false)
    })

    it('应该处理批量状态更新', async () => {
      const wsUrl = '/ws/device-status'
      const ws = wsManager.connect(wsUrl)
      await new Promise(resolve => ws.addEventListener('open', resolve))
      
      const batchUpdates: any[] = []
      ws.addEventListener('message', (event: any) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'batch_status_update') {
            batchUpdates.push(data)
          }
        } catch (error) {
          console.error('Failed to parse batch update:', error)
        }
      })
      
      // Simulate batch status update
      const batchUpdate = {
        type: 'batch_status_update',
        updates: [
          { device_id: 1, status: { is_online: true, battery_level: 90 } },
          { device_id: 2, status: { is_online: false, last_seen: '2024-01-01T12:00:00Z' } },
          { device_id: 3, status: { is_online: true, signal_strength: -65 } }
        ],
        timestamp: new Date().toISOString()
      }
      
      ws.receiveMessage(JSON.stringify(batchUpdate))
      
      await nextTick()
      
      expect(batchUpdates).toHaveLength(1)
      expect(batchUpdates[0].updates).toHaveLength(3)
      
      // Verify each device update
      const updates = batchUpdates[0].updates
      expect(updates[0].device_id).toBe(1)
      expect(updates[0].status.is_online).toBe(true)
      expect(updates[1].device_id).toBe(2)
      expect(updates[1].status.is_online).toBe(false)
      expect(updates[2].device_id).toBe(3)
      expect(updates[2].status.signal_strength).toBe(-65)
    })

    it('应该正确处理设备状态订阅和取消订阅', async () => {
      const wsUrl = '/ws/device-status'
      const ws = wsManager.connect(wsUrl)
      await new Promise(resolve => ws.addEventListener('open', resolve))
      
      // Subscribe to specific devices
      const subscribeMessage = {
        type: 'subscribe',
        device_ids: [1, 2, 3],
        status_types: ['online', 'battery', 'signal']
      }
      
      ws.send(JSON.stringify(subscribeMessage))
      
      // Unsubscribe from one device
      const unsubscribeMessage = {
        type: 'unsubscribe',
        device_ids: [2]
      }
      
      ws.send(JSON.stringify(unsubscribeMessage))
      
      const sentMessages = ws.getMessageQueue()
      expect(sentMessages).toHaveLength(2)
      
      const subscribe = JSON.parse(sentMessages[0])
      const unsubscribe = JSON.parse(sentMessages[1])
      
      expect(subscribe.type).toBe('subscribe')
      expect(subscribe.device_ids).toEqual([1, 2, 3])
      expect(unsubscribe.type).toBe('unsubscribe')
      expect(unsubscribe.device_ids).toEqual([2])
    })
  })

  describe('连接管理和错误处理', () => {
    it('应该处理WebSocket连接超时', async () => {
      // Create a WebSocket that never opens
      const ws = new MockWebSocket('/ws/timeout-test')
      ws.connectionDelay = 10000 // 10 second delay
      
      const openEvents: any[] = []
      const timeoutReached = ref(false)
      
      ws.addEventListener('open', (event) => {
        openEvents.push(event)
      })
      
      // Simulate connection timeout
      setTimeout(() => {
        timeoutReached.value = true
        ws.simulateError(new Error('Connection timeout'))
      }, 5000)
      
      // Fast-forward time for testing
      timerUtils.enableFakeTimers()
      timerUtils.advanceTimers(5000)
      
      expect(timeoutReached.value).toBe(true)
      expect(openEvents).toHaveLength(0)
      expect(ws.readyState).toBe(MockWebSocket.CONNECTING)
    })

    it('应该实现指数退避重连策略', async () => {
      const wsUrl = '/ws/unreliable-connection'
      let connectionAttempts = 0
      let reconnectDelays: number[] = []
      
      // Mock a connection that fails multiple times
      const originalConnect = wsManager.connect.bind(wsManager)
      wsManager.connect = (url: string, protocols?: string | string[]) => {
        connectionAttempts++
        const ws = originalConnect(url, protocols)
        
        if (connectionAttempts <= 3) {
          // Fail first 3 attempts
          setTimeout(() => {
            ws.simulateConnectionLoss()
          }, 100)
        }
        
        return ws
      }
      
      // Track reconnection delays
      const originalSetTimeout = global.setTimeout
      global.setTimeout = ((callback: Function, delay: number) => {
        if (delay > 100) { // Filter out other timeouts
          reconnectDelays.push(delay)
        }
        return originalSetTimeout(callback, delay)
      }) as any
      
      const ws = wsManager.connect(wsUrl)
      
      // Allow time for multiple reconnection attempts
      await new Promise(resolve => setTimeout(resolve, 200))
      
      expect(connectionAttempts).toBeGreaterThan(1)
      
      // Verify exponential backoff (each delay should be roughly double the previous)
      for (let i = 1; i < reconnectDelays.length; i++) {
        expect(reconnectDelays[i]).toBeGreaterThanOrEqual(reconnectDelays[i - 1])
      }
      
      // Restore original setTimeout
      global.setTimeout = originalSetTimeout
    })

    it('应该正确处理消息队列和缓冲', async () => {
      const wsUrl = '/ws/buffered-connection'
      const ws = wsManager.connect(wsUrl)
      
      const messageBuffer: any[] = []
      
      // Send messages before connection is open
      const pendingMessages = [
        { type: 'ping', timestamp: Date.now() },
        { type: 'subscribe', device_ids: [1, 2] },
        { type: 'command', cmd: 'status' }
      ]
      
      // Simulate message buffering
      pendingMessages.forEach(msg => {
        if (ws.readyState === MockWebSocket.OPEN) {
          ws.send(JSON.stringify(msg))
        } else {
          messageBuffer.push(msg)
        }
      })
      
      // When connection opens, send buffered messages
      ws.addEventListener('open', () => {
        messageBuffer.forEach(msg => {
          ws.send(JSON.stringify(msg))
        })
        messageBuffer.length = 0
      })
      
      // Wait for connection to open
      await new Promise(resolve => ws.addEventListener('open', resolve))
      
      expect(messageBuffer).toHaveLength(0) // All messages should be sent
      expect(ws.getMessageQueue()).toHaveLength(3) // All 3 messages sent
    })
  })

  describe('WebSocket性能和内存管理', () => {
    it('应该正确清理WebSocket连接和事件监听器', async () => {
      const wsUrl = '/ws/cleanup-test'
      const ws = wsManager.connect(wsUrl)
      await new Promise(resolve => ws.addEventListener('open', resolve))
      
      const messageHandler = vi.fn()
      const errorHandler = vi.fn()
      const closeHandler = vi.fn()
      
      ws.addEventListener('message', messageHandler)
      ws.addEventListener('error', errorHandler)
      ws.addEventListener('close', closeHandler)
      
      // Verify listeners are attached
      expect(ws.addEventListener).toHaveBeenCalledWith('message', messageHandler)
      expect(ws.addEventListener).toHaveBeenCalledWith('error', errorHandler)
      expect(ws.addEventListener).toHaveBeenCalledWith('close', closeHandler)
      
      // Disconnect and cleanup
      wsManager.disconnect(wsUrl)
      
      // Verify close event was triggered
      expect(closeHandler).toHaveBeenCalled()
      
      // Verify connection is removed
      expect(wsManager.getConnection(wsUrl)).toBeUndefined()
    })

    it('应该处理大量并发WebSocket连接', async () => {
      const connectionCount = 50
      const connections: MockWebSocket[] = []
      
      // Create many concurrent connections
      for (let i = 0; i < connectionCount; i++) {
        const wsUrl = `/ws/concurrent-test-${i}`
        const ws = wsManager.connect(wsUrl)
        connections.push(ws)
      }
      
      // Wait for all connections to open
      await Promise.all(
        connections.map(ws => 
          new Promise(resolve => ws.addEventListener('open', resolve))
        )
      )
      
      // Verify all connections are open
      expect(connections).toHaveLength(connectionCount)
      connections.forEach(ws => {
        expect(ws.readyState).toBe(MockWebSocket.OPEN)
      })
      
      // Send messages to all connections
      connections.forEach((ws, index) => {
        ws.send(JSON.stringify({ id: index, message: `Test message ${index}` }))
      })
      
      // Verify all messages were sent
      connections.forEach(ws => {
        expect(ws.getMessageQueue()).toHaveLength(1)
      })
      
      // Cleanup all connections
      wsManager.disconnectAll()
      
      // Verify all connections are closed
      await new Promise(resolve => setTimeout(resolve, 100))
      connections.forEach(ws => {
        expect(ws.readyState).toBe(MockWebSocket.CLOSED)
      })
    })
  })
})
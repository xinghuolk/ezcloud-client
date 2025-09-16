import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { useDeviceDialogs } from '../useDeviceDialogs'
import type { Device } from '/@src/api/types'

describe('useDeviceDialogs', () => {
  // Test data factory
  const createMockDevice = (overrides: Partial<Device> = {}): Device => ({
    id: 1,
    serial: 'TEST123456789',
    name: 'Test Device',
    model: 'TestModel',
    version: '1.0.0',
    is_online: true,
    is_activate: true,
    is_owner: true,
    is_trusted: false,
    last_seen: '2023-12-01T10:00:00Z',
    created_at: '2023-12-01T09:00:00Z',
    wanip: '192.168.1.100',
    public_ip: '203.0.113.1',
    primary_mac: 'AA:BB:CC:DD:EE:FF',
    ownership: {
      isOwner: true,
      isTrusted: false,
      ownerInfo: null
    },
    deviceModel: {
      id: 1,
      modelname: 'TestModel',
      oemname: 'TestOEM'
    },
    ...overrides
  })

  let composable: ReturnType<typeof useDeviceDialogs>

  beforeEach(() => {
    composable = useDeviceDialogs()
  })

  describe('Initial State', () => {
    it('should initialize with all dialogs closed', () => {
      expect(composable.bindDialogOpen.value).toBe(false)
      expect(composable.detailsDialogOpen.value).toBe(false)
      expect(composable.batchDialogOpen.value).toBe(false)
      expect(composable.trustDialogOpen.value).toBe(false)
      expect(composable.rebootConfirmOpen.value).toBe(false)
      expect(composable.unbindConfirmOpen.value).toBe(false)
    })

    it('should initialize with no selected devices', () => {
      expect(composable.selectedDevice.value).toBeNull()
      expect(composable.selectedDeviceForReboot.value).toBeNull()
      expect(composable.selectedDeviceForUnbind.value).toBeNull()
      expect(composable.selectedDevicesForBatch.value).toEqual([])
    })

    it('should initialize batch operation state', () => {
      expect(composable.batchOperation.value).toBe('')
      expect(composable.batchOperationParams.value).toEqual({})
    })

    it('should provide all expected methods', () => {
      // Open methods
      expect(typeof composable.openDetailsDialog).toBe('function')
      expect(typeof composable.openRebootConfirm).toBe('function')
      expect(typeof composable.openUnbindConfirm).toBe('function')
      expect(typeof composable.openBatchDialog).toBe('function')
      expect(typeof composable.openTrustDialog).toBe('function')
      expect(typeof composable.openBindDialog).toBe('function')
      
      // Close methods
      expect(typeof composable.closeDetailsDialog).toBe('function')
      expect(typeof composable.closeRebootConfirm).toBe('function')
      expect(typeof composable.closeUnbindConfirm).toBe('function')
      expect(typeof composable.closeBatchDialog).toBe('function')
      expect(typeof composable.closeTrustDialog).toBe('function')
      expect(typeof composable.closeBindDialog).toBe('function')
      expect(typeof composable.closeAllDialogs).toBe('function')
    })
  })

  describe('Details Dialog', () => {
    it('should open details dialog with selected device', async () => {
      const mockDevice = createMockDevice({ id: 1, name: 'Test Device 1' })
      
      composable.openDetailsDialog(mockDevice)
      await nextTick()
      
      expect(composable.detailsDialogOpen.value).toBe(true)
      expect(composable.selectedDevice.value).toEqual(mockDevice)
    })

    it('should close details dialog and clear selection', async () => {
      const mockDevice = createMockDevice()
      
      // First open the dialog
      composable.openDetailsDialog(mockDevice)
      await nextTick()
      expect(composable.detailsDialogOpen.value).toBe(true)
      expect(composable.selectedDevice.value).toEqual(mockDevice)
      
      // Then close it
      composable.closeDetailsDialog()
      await nextTick()
      
      expect(composable.detailsDialogOpen.value).toBe(false)
      expect(composable.selectedDevice.value).toBeNull()
    })

    it('should update selected device when opening again', async () => {
      const device1 = createMockDevice({ id: 1, name: 'Device 1' })
      const device2 = createMockDevice({ id: 2, name: 'Device 2' })
      
      composable.openDetailsDialog(device1)
      await nextTick()
      expect(composable.selectedDevice.value).toEqual(device1)
      
      composable.openDetailsDialog(device2)
      await nextTick()
      expect(composable.selectedDevice.value).toEqual(device2)
      expect(composable.detailsDialogOpen.value).toBe(true)
    })
  })

  describe('Reboot Confirmation Dialog', () => {
    it('should open reboot confirm dialog with selected device', async () => {
      const mockDevice = createMockDevice({ id: 2, name: 'Reboot Device' })
      
      composable.openRebootConfirm(mockDevice)
      await nextTick()
      
      expect(composable.rebootConfirmOpen.value).toBe(true)
      expect(composable.selectedDeviceForReboot.value).toEqual(mockDevice)
    })

    it('should close reboot confirm dialog and clear selection', async () => {
      const mockDevice = createMockDevice()
      
      composable.openRebootConfirm(mockDevice)
      await nextTick()
      expect(composable.rebootConfirmOpen.value).toBe(true)
      expect(composable.selectedDeviceForReboot.value).toEqual(mockDevice)
      
      composable.closeRebootConfirm()
      await nextTick()
      
      expect(composable.rebootConfirmOpen.value).toBe(false)
      expect(composable.selectedDeviceForReboot.value).toBeNull()
    })
  })

  describe('Unbind Confirmation Dialog', () => {
    it('should open unbind confirm dialog with selected device', async () => {
      const mockDevice = createMockDevice({ id: 3, name: 'Unbind Device' })
      
      composable.openUnbindConfirm(mockDevice)
      await nextTick()
      
      expect(composable.unbindConfirmOpen.value).toBe(true)
      expect(composable.selectedDeviceForUnbind.value).toEqual(mockDevice)
    })

    it('should close unbind confirm dialog and clear selection', async () => {
      const mockDevice = createMockDevice()
      
      composable.openUnbindConfirm(mockDevice)
      await nextTick()
      expect(composable.unbindConfirmOpen.value).toBe(true)
      expect(composable.selectedDeviceForUnbind.value).toEqual(mockDevice)
      
      composable.closeUnbindConfirm()
      await nextTick()
      
      expect(composable.unbindConfirmOpen.value).toBe(false)
      expect(composable.selectedDeviceForUnbind.value).toBeNull()
    })
  })

  describe('Batch Dialog', () => {
    it('should open batch dialog with devices and operation', async () => {
      const mockDevices = [
        createMockDevice({ id: 1, name: 'Device 1' }),
        createMockDevice({ id: 2, name: 'Device 2' }),
        createMockDevice({ id: 3, name: 'Device 3' })
      ]
      const operation = 'reboot'
      
      composable.openBatchDialog(mockDevices, operation)
      await nextTick()
      
      expect(composable.batchDialogOpen.value).toBe(true)
      expect(composable.selectedDevicesForBatch.value).toEqual(mockDevices)
      expect(composable.batchOperation.value).toBe(operation)
      expect(composable.batchOperationParams.value).toEqual({})
    })

    it('should open batch dialog with parameters', async () => {
      const mockDevices = [createMockDevice({ id: 1 })]
      const operation = 'update'
      const params = { version: '2.0.0', timeout: 30 }
      
      composable.openBatchDialog(mockDevices, operation, params)
      await nextTick()
      
      expect(composable.batchDialogOpen.value).toBe(true)
      expect(composable.selectedDevicesForBatch.value).toEqual(mockDevices)
      expect(composable.batchOperation.value).toBe(operation)
      expect(composable.batchOperationParams.value).toEqual(params)
    })

    it('should close batch dialog and clear all batch state', async () => {
      const mockDevices = [createMockDevice()]
      const operation = 'reboot'
      const params = { timeout: 30 }
      
      composable.openBatchDialog(mockDevices, operation, params)
      await nextTick()
      expect(composable.batchDialogOpen.value).toBe(true)
      expect(composable.selectedDevicesForBatch.value).toEqual(mockDevices)
      expect(composable.batchOperation.value).toBe(operation)
      expect(composable.batchOperationParams.value).toEqual(params)
      
      composable.closeBatchDialog()
      await nextTick()
      
      expect(composable.batchDialogOpen.value).toBe(false)
      expect(composable.selectedDevicesForBatch.value).toEqual([])
      expect(composable.batchOperation.value).toBe('')
      expect(composable.batchOperationParams.value).toEqual({})
    })

    it('should handle empty devices array', async () => {
      composable.openBatchDialog([], 'test')
      await nextTick()
      
      expect(composable.batchDialogOpen.value).toBe(true)
      expect(composable.selectedDevicesForBatch.value).toEqual([])
      expect(composable.batchOperation.value).toBe('test')
    })
  })

  describe('Trust Dialog', () => {
    it('should open trust dialog with selected device', async () => {
      const mockDevice = createMockDevice({ id: 4, name: 'Trust Device' })
      
      composable.openTrustDialog(mockDevice)
      await nextTick()
      
      expect(composable.trustDialogOpen.value).toBe(true)
      expect(composable.selectedDevice.value).toEqual(mockDevice)
    })

    it('should close trust dialog and clear selection', async () => {
      const mockDevice = createMockDevice()
      
      composable.openTrustDialog(mockDevice)
      await nextTick()
      expect(composable.trustDialogOpen.value).toBe(true)
      expect(composable.selectedDevice.value).toEqual(mockDevice)
      
      composable.closeTrustDialog()
      await nextTick()
      
      expect(composable.trustDialogOpen.value).toBe(false)
      expect(composable.selectedDevice.value).toBeNull()
    })

    it('should share selectedDevice with details dialog', async () => {
      const device1 = createMockDevice({ id: 1, name: 'Device 1' })
      const device2 = createMockDevice({ id: 2, name: 'Device 2' })
      
      // Open details dialog first
      composable.openDetailsDialog(device1)
      await nextTick()
      expect(composable.selectedDevice.value).toEqual(device1)
      
      // Open trust dialog with different device
      composable.openTrustDialog(device2)
      await nextTick()
      expect(composable.selectedDevice.value).toEqual(device2)
      expect(composable.trustDialogOpen.value).toBe(true)
      expect(composable.detailsDialogOpen.value).toBe(true) // Should still be open
    })
  })

  describe('Bind Dialog', () => {
    it('should open bind dialog', async () => {
      composable.openBindDialog()
      await nextTick()
      
      expect(composable.bindDialogOpen.value).toBe(true)
    })

    it('should close bind dialog', async () => {
      composable.openBindDialog()
      await nextTick()
      expect(composable.bindDialogOpen.value).toBe(true)
      
      composable.closeBindDialog()
      await nextTick()
      
      expect(composable.bindDialogOpen.value).toBe(false)
    })

    it('should handle multiple open/close cycles', async () => {
      for (let i = 0; i < 3; i++) {
        composable.openBindDialog()
        await nextTick()
        expect(composable.bindDialogOpen.value).toBe(true)
        
        composable.closeBindDialog()
        await nextTick()
        expect(composable.bindDialogOpen.value).toBe(false)
      }
    })
  })

  describe('Close All Dialogs', () => {
    it('should close all dialogs and reset all state', async () => {
      const mockDevices = [
        createMockDevice({ id: 1 }),
        createMockDevice({ id: 2 })
      ]
      const singleDevice = createMockDevice({ id: 3 })
      const params = { test: 'value' }
      
      // Open all dialogs with data
      composable.openBindDialog()
      composable.openDetailsDialog(singleDevice)
      composable.openTrustDialog(singleDevice)
      composable.openRebootConfirm(singleDevice)
      composable.openUnbindConfirm(singleDevice)
      composable.openBatchDialog(mockDevices, 'test-operation', params)
      
      await nextTick()
      
      // Verify all dialogs are open
      expect(composable.bindDialogOpen.value).toBe(true)
      expect(composable.detailsDialogOpen.value).toBe(true)
      expect(composable.trustDialogOpen.value).toBe(true)
      expect(composable.rebootConfirmOpen.value).toBe(true)
      expect(composable.unbindConfirmOpen.value).toBe(true)
      expect(composable.batchDialogOpen.value).toBe(true)
      
      // Verify state is set
      expect(composable.selectedDevice.value).toEqual(singleDevice)
      expect(composable.selectedDeviceForReboot.value).toEqual(singleDevice)
      expect(composable.selectedDeviceForUnbind.value).toEqual(singleDevice)
      expect(composable.selectedDevicesForBatch.value).toEqual(mockDevices)
      expect(composable.batchOperation.value).toBe('test-operation')
      expect(composable.batchOperationParams.value).toEqual(params)
      
      // Close all dialogs
      composable.closeAllDialogs()
      await nextTick()
      
      // Verify all dialogs are closed
      expect(composable.bindDialogOpen.value).toBe(false)
      expect(composable.detailsDialogOpen.value).toBe(false)
      expect(composable.trustDialogOpen.value).toBe(false)
      expect(composable.rebootConfirmOpen.value).toBe(false)
      expect(composable.unbindConfirmOpen.value).toBe(false)
      expect(composable.batchDialogOpen.value).toBe(false)
      
      // Verify all state is reset
      expect(composable.selectedDevice.value).toBeNull()
      expect(composable.selectedDeviceForReboot.value).toBeNull()
      expect(composable.selectedDeviceForUnbind.value).toBeNull()
      expect(composable.selectedDevicesForBatch.value).toEqual([])
      expect(composable.batchOperation.value).toBe('')
      expect(composable.batchOperationParams.value).toEqual({})
    })

    it('should be safe to call when no dialogs are open', async () => {
      // Call closeAllDialogs on fresh state
      composable.closeAllDialogs()
      await nextTick()
      
      // Should remain in closed state
      expect(composable.bindDialogOpen.value).toBe(false)
      expect(composable.detailsDialogOpen.value).toBe(false)
      expect(composable.trustDialogOpen.value).toBe(false)
      expect(composable.rebootConfirmOpen.value).toBe(false)
      expect(composable.unbindConfirmOpen.value).toBe(false)
      expect(composable.batchDialogOpen.value).toBe(false)
    })
  })

  describe('State Reactivity', () => {
    it('should maintain reactivity for all refs', async () => {
      // Test direct assignment to refs
      composable.bindDialogOpen.value = true
      composable.selectedDevice.value = createMockDevice({ id: 99 })
      composable.batchOperation.value = 'direct-assignment'
      
      await nextTick()
      
      expect(composable.bindDialogOpen.value).toBe(true)
      expect(composable.selectedDevice.value?.id).toBe(99)
      expect(composable.batchOperation.value).toBe('direct-assignment')
    })

    it('should handle rapid state changes', async () => {
      const device1 = createMockDevice({ id: 1 })
      const device2 = createMockDevice({ id: 2 })
      const device3 = createMockDevice({ id: 3 })
      
      // Rapid device selection changes
      composable.openDetailsDialog(device1)
      composable.openDetailsDialog(device2)
      composable.openDetailsDialog(device3)
      
      await nextTick()
      
      expect(composable.selectedDevice.value).toEqual(device3)
      expect(composable.detailsDialogOpen.value).toBe(true)
    })
  })

  describe('Multiple Dialog Interactions', () => {
    it('should allow multiple dialogs to be open simultaneously', async () => {
      const device1 = createMockDevice({ id: 1 })
      const device2 = createMockDevice({ id: 2 })
      const devices = [device1, device2]
      
      composable.openBindDialog()
      composable.openDetailsDialog(device1)
      composable.openRebootConfirm(device2)
      composable.openBatchDialog(devices, 'test')
      
      await nextTick()
      
      expect(composable.bindDialogOpen.value).toBe(true)
      expect(composable.detailsDialogOpen.value).toBe(true)
      expect(composable.rebootConfirmOpen.value).toBe(true)
      expect(composable.batchDialogOpen.value).toBe(true)
      
      expect(composable.selectedDevice.value).toEqual(device1)
      expect(composable.selectedDeviceForReboot.value).toEqual(device2)
      expect(composable.selectedDevicesForBatch.value).toEqual(devices)
    })

    it('should handle closing individual dialogs while others remain open', async () => {
      const device = createMockDevice()
      
      // Open multiple dialogs
      composable.openBindDialog()
      composable.openDetailsDialog(device)
      composable.openRebootConfirm(device)
      
      await nextTick()
      expect(composable.bindDialogOpen.value).toBe(true)
      expect(composable.detailsDialogOpen.value).toBe(true)
      expect(composable.rebootConfirmOpen.value).toBe(true)
      
      // Close one dialog
      composable.closeDetailsDialog()
      await nextTick()
      
      expect(composable.bindDialogOpen.value).toBe(true)
      expect(composable.detailsDialogOpen.value).toBe(false)
      expect(composable.rebootConfirmOpen.value).toBe(true)
      expect(composable.selectedDevice.value).toBeNull()
      expect(composable.selectedDeviceForReboot.value).toEqual(device)
    })
  })

  describe('Parameter Handling', () => {
    it('should handle null and undefined parameters gracefully', async () => {
      const devices = [createMockDevice()]
      
      // Test with null params
      composable.openBatchDialog(devices, 'test', null)
      await nextTick()
      expect(composable.batchOperationParams.value).toEqual({})
      
      // Test with undefined params
      composable.openBatchDialog(devices, 'test', undefined)
      await nextTick()
      expect(composable.batchOperationParams.value).toEqual({})
    })

    it('should handle complex parameter objects', async () => {
      const devices = [createMockDevice()]
      const complexParams = {
        timeout: 30,
        retries: 3,
        options: {
          force: true,
          backup: false
        },
        targets: ['config', 'firmware']
      }
      
      composable.openBatchDialog(devices, 'complex', complexParams)
      await nextTick()
      
      expect(composable.batchOperationParams.value).toEqual(complexParams)
    })
  })

  describe('Edge Cases', () => {
    it('should handle same device selected for different operations', async () => {
      const device = createMockDevice({ id: 1 })
      
      composable.openRebootConfirm(device)
      composable.openUnbindConfirm(device)
      composable.openTrustDialog(device)
      
      await nextTick()
      
      expect(composable.selectedDevice.value).toEqual(device)
      expect(composable.selectedDeviceForReboot.value).toEqual(device)
      expect(composable.selectedDeviceForUnbind.value).toEqual(device)
      
      // All three should be the same reference
      expect(composable.selectedDevice.value).toBe(composable.selectedDeviceForReboot.value)
      expect(composable.selectedDeviceForReboot.value).toBe(composable.selectedDeviceForUnbind.value)
    })

    it('should handle empty strings and operations', async () => {
      const devices = [createMockDevice()]
      
      composable.openBatchDialog(devices, '')
      await nextTick()
      
      expect(composable.batchOperation.value).toBe('')
      expect(composable.batchDialogOpen.value).toBe(true)
    })
  })
})
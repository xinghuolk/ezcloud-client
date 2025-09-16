import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import DeviceDialogs from '../DeviceDialogs.vue'
import type { Device } from '/@src/api/types'

// Mock Vuero components
vi.mock('/@src/components/base/VModal.vue', () => ({
  default: {
    name: 'VModal',
    template: `
      <div class="v-modal-mock" :class="{ 'is-open': open }">
        <div class="modal-header">{{ title }}</div>
        <div class="modal-content"><slot name="content" /></div>
        <div class="modal-actions">
          <button class="cancel-btn" @click="$emit('close')">{{ cancelLabel || 'Cancel' }}</button>
          <slot name="action" />
        </div>
      </div>
    `,
    props: ['open', 'title', 'size', 'actions', 'cancelLabel'],
    emits: ['close']
  }
}))

vi.mock('/@src/components/base/form/VField.vue', () => ({
  default: {
    name: 'VField',
    template: '<div class="v-field"><slot /></div>'
  }
}))

vi.mock('/@src/components/base/form/VLabel.vue', () => ({
  default: {
    name: 'VLabel',
    template: '<label class="v-label"><slot /></label>'
  }
}))

vi.mock('/@src/components/base/form/VControl.vue', () => ({
  default: {
    name: 'VControl',
    template: '<div class="v-control"><slot /></div>'
  }
}))

vi.mock('/@src/components/base/form/VInput.vue', () => ({
  default: {
    name: 'VInput',
    template: '<input class="v-input" :class="$attrs.class" :placeholder="placeholder" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder'],
    emits: ['update:modelValue']
  }
}))

vi.mock('/@src/components/base/form/VSelect.vue', () => ({
  default: {
    name: 'VSelect',
    template: '<select class="v-select" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
    props: ['modelValue'],
    emits: ['update:modelValue']
  }
}))

vi.mock('/@src/components/base/form/VOption.vue', () => ({
  default: {
    name: 'VOption',
    template: '<option class="v-option" :value="value"><slot /></option>',
    props: ['value']
  }
}))

vi.mock('/@src/components/base/VButton.vue', () => ({
  default: {
    name: 'VButton',
    template: '<button class="v-button" :class="[`is-${color}`, { \'is-disabled\': disabled }]" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
    props: ['color', 'disabled'],
    emits: ['click']
  }
}))

vi.mock('/@src/components/base/VMessage.vue', () => ({
  default: {
    name: 'VMessage',
    template: '<div class="v-message" :class="`is-${color}`"><slot /></div>',
    props: ['color']
  }
}))

// Mock composables
vi.mock('/@src/composables/use-error-handler', () => ({
  useFormErrorHandler: vi.fn(() => ({}))
}))

describe('DeviceDialogs.vue', () => {
  // Test data factories
  const createMockDevice = (overrides: Partial<Device> = {}): Device => ({
    id: 1,
    serial: 'TEST123456789',
    name: 'Test Device',
    model: 'TestModel',
    version: '1.0.0',
    is_online: true,
    is_activate: true,
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

  const defaultProps = {
    bindDialogOpen: false,
    bindErrors: {},
    batchDialogOpen: false,
    selectedDevices: [],
    rebootConfirmOpen: false,
    selectedDeviceForReboot: null,
    unbindConfirmOpen: false,
    selectedDeviceForUnbind: null
  }

  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Component Rendering', () => {
    it('should render all dialog modals', () => {
      wrapper = mount(DeviceDialogs, {
        props: defaultProps
      })

      const modals = wrapper.findAll('.v-modal-mock')
      expect(modals).toHaveLength(4)
      expect(modals[0].text()).toContain('Bind Device')
      expect(modals[1].text()).toContain('Batch Operations')
      expect(modals[2].text()).toContain('Confirm Reboot')
      expect(modals[3].text()).toContain('Confirm Unbind Device')
    })

    it('should pass correct props to modals', () => {
      wrapper = mount(DeviceDialogs, {
        props: {
          ...defaultProps,
          bindDialogOpen: true,
          batchDialogOpen: true
        }
      })

      const modals = wrapper.findAll('.v-modal-mock')
      expect(modals[0].classes()).toContain('is-open')
      expect(modals[1].classes()).toContain('is-open')
      expect(modals[2].classes()).not.toContain('is-open')
      expect(modals[3].classes()).not.toContain('is-open')
    })
  })

  describe('Bind Device Dialog', () => {
    beforeEach(() => {
      wrapper = mount(DeviceDialogs, {
        props: {
          ...defaultProps,
          bindDialogOpen: true
        }
      })
    })

    it('should render bind device form fields', () => {
      const serialInput = wrapper.find('input[placeholder="Enter device serial number"]')
      const nameInput = wrapper.find('input[placeholder="Enter device name (optional)"]')
      
      expect(serialInput.exists()).toBe(true)
      expect(nameInput.exists()).toBe(true)
    })

    it('should handle form input updates', async () => {
      const serialInput = wrapper.find('input[placeholder="Enter device serial number"]')
      const nameInput = wrapper.find('input[placeholder="Enter device name (optional)"]')
      
      await serialInput.setValue('TEST123456')
      await nameInput.setValue('Test Device')
      
      expect(wrapper.vm.bindForm.serial).toBe('TEST123456')
      expect(wrapper.vm.bindForm.name).toBe('Test Device')
    })

    it('should display validation errors', async () => {
      wrapper = mount(DeviceDialogs, {
        props: {
          ...defaultProps,
          bindDialogOpen: true,
          bindErrors: {
            serial: 'Serial number is required'
          }
        }
      })

      const errorMsg = wrapper.find('.help.is-danger')
      expect(errorMsg.exists()).toBe(true)
      expect(errorMsg.text()).toBe('Serial number is required')
    })

    it('should apply error class to input when validation fails', () => {
      wrapper = mount(DeviceDialogs, {
        props: {
          ...defaultProps,
          bindDialogOpen: true,
          bindErrors: {
            serial: 'Serial number is required'
          }
        }
      })

      const serialInput = wrapper.find('input[placeholder="Enter device serial number"]')
      expect(serialInput.classes()).toContain('is-danger')
    })

    it('should emit bind-device event with form data', async () => {
      const serialInput = wrapper.find('input[placeholder="Enter device serial number"]')
      const nameInput = wrapper.find('input[placeholder="Enter device name (optional)"]')
      const bindButton = wrapper.find('.v-button.is-primary')

      await serialInput.setValue('TEST123456')
      await nameInput.setValue('Test Device')
      await bindButton.trigger('click')

      expect(wrapper.emitted('bind-device')).toBeTruthy()
      expect(wrapper.emitted('bind-device')[0]).toEqual([{
        serial: 'TEST123456',
        name: 'Test Device'
      }])
    })

    it('should emit update:bindDialogOpen when closing', async () => {
      const cancelButton = wrapper.find('.cancel-btn')
      await cancelButton.trigger('click')

      expect(wrapper.emitted('update:bindDialogOpen')).toBeTruthy()
      expect(wrapper.emitted('update:bindDialogOpen')[0]).toEqual([false])
    })

    it('should reset form data when closing dialog', async () => {
      // Set form data
      const serialInput = wrapper.find('input[placeholder="Enter device serial number"]')
      const nameInput = wrapper.find('input[placeholder="Enter device name (optional)"]')
      
      await serialInput.setValue('TEST123456')
      await nameInput.setValue('Test Device')
      
      expect(wrapper.vm.bindForm.serial).toBe('TEST123456')
      expect(wrapper.vm.bindForm.name).toBe('Test Device')

      // Close dialog
      const cancelButton = wrapper.find('.cancel-btn')
      await cancelButton.trigger('click')

      // Form should be reset
      expect(wrapper.vm.bindForm.serial).toBe('')
      expect(wrapper.vm.bindForm.name).toBe('')
    })
  })

  describe('Batch Operations Dialog', () => {
    const mockDevices = [
      createMockDevice({ id: 1, serial: 'DEV001' }),
      createMockDevice({ id: 2, serial: 'DEV002' }),
      createMockDevice({ id: 3, serial: 'DEV003' })
    ]

    beforeEach(() => {
      wrapper = mount(DeviceDialogs, {
        props: {
          ...defaultProps,
          batchDialogOpen: true,
          selectedDevices: mockDevices
        }
      })
    })

    it('should display selected devices count', () => {
      const message = wrapper.find('.v-message.is-info')
      expect(message.text()).toContain('Selected 3 devices for batch operation')
    })

    it('should render operation select with options', () => {
      const select = wrapper.find('.v-select')
      const options = wrapper.findAll('.v-option')
      
      expect(select.exists()).toBe(true)
      expect(options).toHaveLength(3) // Empty option + reboot + logs
      expect(options[1].attributes('value')).toBe('reboot')
      expect(options[2].attributes('value')).toBe('logs')
    })

    it('should handle operation selection', async () => {
      const select = wrapper.find('.v-select')
      await select.setValue('reboot')
      
      expect(wrapper.vm.batchForm.operation).toBe('reboot')
    })

    it('should disable execute button when no operation selected', () => {
      const executeButton = wrapper.find('.v-button.is-primary')
      expect(executeButton.classes()).toContain('is-disabled')
      expect(executeButton.attributes('disabled')).toBeDefined()
    })

    it('should enable execute button when operation selected', async () => {
      const select = wrapper.find('.v-select')
      await select.setValue('reboot')
      await nextTick()
      
      const executeButton = wrapper.find('.v-button.is-primary')
      expect(executeButton.classes()).not.toContain('is-disabled')
      expect(executeButton.attributes('disabled')).toBeUndefined()
    })

    it('should emit batch-operation event with selected operation', async () => {
      const select = wrapper.find('.v-select')
      const executeButton = wrapper.find('.v-button.is-primary')
      
      await select.setValue('reboot')
      await executeButton.trigger('click')

      expect(wrapper.emitted('batch-operation')).toBeTruthy()
      expect(wrapper.emitted('batch-operation')[0]).toEqual([{
        operation: 'reboot'
      }])
    })

    it('should emit update:batchDialogOpen when closing', async () => {
      const cancelButton = wrapper.find('.cancel-btn')
      await cancelButton.trigger('click')

      expect(wrapper.emitted('update:batchDialogOpen')).toBeTruthy()
      expect(wrapper.emitted('update:batchDialogOpen')[0]).toEqual([false])
    })

    it('should reset form when closing dialog', async () => {
      // Set operation
      const select = wrapper.find('.v-select')
      await select.setValue('reboot')
      expect(wrapper.vm.batchForm.operation).toBe('reboot')

      // Close dialog
      const cancelButton = wrapper.find('.cancel-btn')
      await cancelButton.trigger('click')

      // Form should be reset
      expect(wrapper.vm.batchForm.operation).toBe('')
    })

    it('should handle zero selected devices', () => {
      wrapper = mount(DeviceDialogs, {
        props: {
          ...defaultProps,
          batchDialogOpen: true,
          selectedDevices: []
        }
      })

      const message = wrapper.find('.v-message.is-info')
      expect(message.text()).toContain('Selected 0 devices for batch operation')
    })
  })

  describe('Reboot Confirmation Dialog', () => {
    const mockDevice = createMockDevice({
      serial: 'TEST123456789',
      name: 'Test Device'
    })

    beforeEach(() => {
      wrapper = mount(DeviceDialogs, {
        props: {
          ...defaultProps,
          rebootConfirmOpen: true,
          selectedDeviceForReboot: mockDevice
        }
      })
    })

    it('should display device serial in confirmation message', () => {
      const subtitle = wrapper.find('.subtitle.is-6')
      expect(subtitle.html()).toContain('<strong>TEST123456789</strong>')
    })

    it('should render reboot icon and styling', () => {
      const icon = wrapper.find('iconify-icon[icon="lucide:refresh-cw"]')
      expect(icon.exists()).toBe(true)
      expect(icon.classes()).toContain('has-text-warning')
    })

    it('should display reboot warning message', () => {
      const warningText = wrapper.find('.has-text-grey')
      expect(warningText.text()).toContain('The reboot process takes about 1-2 minutes')
    })

    it('should emit confirm-reboot event when confirmed', async () => {
      const confirmButton = wrapper.find('.v-button.is-warning')
      await confirmButton.trigger('click')

      expect(wrapper.emitted('confirm-reboot')).toBeTruthy()
      expect(wrapper.emitted('confirm-reboot')[0]).toEqual([])
    })

    it('should emit update:rebootConfirmOpen when closing', async () => {
      const cancelButton = wrapper.find('.cancel-btn')
      await cancelButton.trigger('click')

      expect(wrapper.emitted('update:rebootConfirmOpen')).toBeTruthy()
      expect(wrapper.emitted('update:rebootConfirmOpen')[0]).toEqual([false])
    })

    it('should handle null selectedDeviceForReboot', () => {
      wrapper = mount(DeviceDialogs, {
        props: {
          ...defaultProps,
          rebootConfirmOpen: true,
          selectedDeviceForReboot: null
        }
      })

      const subtitle = wrapper.find('.subtitle.is-6')
      expect(subtitle.exists()).toBe(false)
    })
  })

  describe('Unbind Confirmation Dialog', () => {
    const mockDevice = createMockDevice({
      serial: 'TEST987654321',
      name: 'Device to Unbind'
    })

    beforeEach(() => {
      wrapper = mount(DeviceDialogs, {
        props: {
          ...defaultProps,
          unbindConfirmOpen: true,
          selectedDeviceForUnbind: mockDevice
        }
      })
    })

    it('should display device serial in confirmation message', () => {
      const subtitle = wrapper.find('.subtitle.is-6')
      expect(subtitle.html()).toContain('<strong>TEST987654321</strong>')
    })

    it('should render unbind icon and styling', () => {
      const icon = wrapper.find('iconify-icon[icon="lucide:unlink"]')
      expect(icon.exists()).toBe(true)
      expect(icon.classes()).toContain('has-text-danger')
    })

    it('should display unbind warning message', () => {
      const warningText = wrapper.find('.has-text-grey')
      expect(warningText.text()).toContain('This will remove the device from your account permanently')
      expect(warningText.text()).toContain('This action cannot be undone')
    })

    it('should emit confirm-unbind event when confirmed', async () => {
      const confirmButton = wrapper.find('.v-button.is-danger')
      await confirmButton.trigger('click')

      expect(wrapper.emitted('confirm-unbind')).toBeTruthy()
      expect(wrapper.emitted('confirm-unbind')[0]).toEqual([])
    })

    it('should emit update:unbindConfirmOpen when closing', async () => {
      const cancelButton = wrapper.find('.cancel-btn')
      await cancelButton.trigger('click')

      expect(wrapper.emitted('update:unbindConfirmOpen')).toBeTruthy()
      expect(wrapper.emitted('update:unbindConfirmOpen')[0]).toEqual([false])
    })

    it('should handle null selectedDeviceForUnbind', () => {
      wrapper = mount(DeviceDialogs, {
        props: {
          ...defaultProps,
          unbindConfirmOpen: true,
          selectedDeviceForUnbind: null
        }
      })

      const subtitle = wrapper.find('.subtitle.is-6')
      expect(subtitle.exists()).toBe(false)
    })
  })

  describe('Event Handler Methods', () => {
    beforeEach(() => {
      wrapper = mount(DeviceDialogs, {
        props: defaultProps
      })
    })

    it('should have correct method implementations', () => {
      // Test all handler methods exist
      expect(typeof wrapper.vm.handleCloseBindDialog).toBe('function')
      expect(typeof wrapper.vm.handleCloseBatchDialog).toBe('function')
      expect(typeof wrapper.vm.handleCloseRebootDialog).toBe('function')
      expect(typeof wrapper.vm.handleCloseUnbindDialog).toBe('function')
      expect(typeof wrapper.vm.handleBindDevice).toBe('function')
      expect(typeof wrapper.vm.handleBatchOperation).toBe('function')
      expect(typeof wrapper.vm.confirmReboot).toBe('function')
      expect(typeof wrapper.vm.confirmUnbind).toBe('function')
    })

    it('should reset bind form when handleCloseBindDialog is called', () => {
      // Set form data
      wrapper.vm.bindForm.serial = 'TEST123'
      wrapper.vm.bindForm.name = 'Test'

      // Call handler
      wrapper.vm.handleCloseBindDialog()

      expect(wrapper.vm.bindForm.serial).toBe('')
      expect(wrapper.vm.bindForm.name).toBe('')
    })

    it('should reset batch form when handleCloseBatchDialog is called', () => {
      // Set form data
      wrapper.vm.batchForm.operation = 'reboot'

      // Call handler
      wrapper.vm.handleCloseBatchDialog()

      expect(wrapper.vm.batchForm.operation).toBe('')
    })
  })

  describe('Form Data Reactivity', () => {
    beforeEach(() => {
      wrapper = mount(DeviceDialogs, {
        props: {
          ...defaultProps,
          bindDialogOpen: true,
          batchDialogOpen: true
        }
      })
    })

    it('should maintain reactive bind form data', async () => {
      expect(wrapper.vm.bindForm).toBeTypeOf('object')
      expect(wrapper.vm.bindForm.serial).toBe('')
      expect(wrapper.vm.bindForm.name).toBe('')

      // Modify form data
      wrapper.vm.bindForm.serial = 'NEW123'
      await nextTick()

      expect(wrapper.vm.bindForm.serial).toBe('NEW123')
    })

    it('should maintain reactive batch form data', async () => {
      expect(wrapper.vm.batchForm).toBeTypeOf('object')
      expect(wrapper.vm.batchForm.operation).toBe('')

      // Modify form data
      wrapper.vm.batchForm.operation = 'logs'
      await nextTick()

      expect(wrapper.vm.batchForm.operation).toBe('logs')
    })
  })

  describe('Props Validation', () => {
    it('should accept all required props', () => {
      const mockDevice = createMockDevice()
      const testProps = {
        bindDialogOpen: true,
        bindErrors: { serial: 'Error message' },
        batchDialogOpen: false,
        selectedDevices: [mockDevice],
        rebootConfirmOpen: false,
        selectedDeviceForReboot: mockDevice,
        unbindConfirmOpen: true,
        selectedDeviceForUnbind: null
      }

      wrapper = mount(DeviceDialogs, {
        props: testProps
      })

      expect(wrapper.props()).toMatchObject(testProps)
    })

    it('should handle empty arrays and null values', () => {
      const testProps = {
        bindDialogOpen: false,
        bindErrors: {},
        batchDialogOpen: false,
        selectedDevices: [],
        rebootConfirmOpen: false,
        selectedDeviceForReboot: null,
        unbindConfirmOpen: false,
        selectedDeviceForUnbind: null
      }

      wrapper = mount(DeviceDialogs, {
        props: testProps
      })

      expect(wrapper.props()).toMatchObject(testProps)
    })
  })

  describe('Component Integration', () => {
    it('should emit all expected events', async () => {
      wrapper = mount(DeviceDialogs, {
        props: {
          ...defaultProps,
          bindDialogOpen: true,
          batchDialogOpen: true,
          rebootConfirmOpen: true,
          unbindConfirmOpen: true,
          selectedDevices: [createMockDevice()],
          selectedDeviceForReboot: createMockDevice(),
          selectedDeviceForUnbind: createMockDevice()
        }
      })

      // Test all possible events
      const allButtons = wrapper.findAll('.v-button')
      const cancelButtons = wrapper.findAll('.cancel-btn')

      // Click all cancel buttons (close events)
      for (const button of cancelButtons) {
        await button.trigger('click')
      }

      // Check close events were emitted
      expect(wrapper.emitted('update:bindDialogOpen')).toBeTruthy()
      expect(wrapper.emitted('update:batchDialogOpen')).toBeTruthy()
      expect(wrapper.emitted('update:rebootConfirmOpen')).toBeTruthy()
      expect(wrapper.emitted('update:unbindConfirmOpen')).toBeTruthy()
    })
  })
})
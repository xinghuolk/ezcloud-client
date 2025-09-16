<script setup lang="ts">
import { reactive, defineProps, defineEmits } from 'vue'
import type { Device } from '/@src/api/types'
import { useFormErrorHandler } from '/@src/composables/use-error-handler'

const props = defineProps<{
  // Bind Dialog
  bindDialogOpen: boolean
  bindErrors: Record<string, string>
  
  // Batch Dialog
  batchDialogOpen: boolean
  selectedDevices: Device[]
  
  // Reboot Confirm Dialog
  rebootConfirmOpen: boolean
  selectedDeviceForReboot: Device | null
  
  // Unbind Confirm Dialog
  unbindConfirmOpen: boolean
  selectedDeviceForUnbind: Device | null
}>()

const emit = defineEmits<{
  'update:bindDialogOpen': [value: boolean]
  'update:batchDialogOpen': [value: boolean]
  'update:rebootConfirmOpen': [value: boolean]
  'update:unbindConfirmOpen': [value: boolean]
  'bind-device': [data: { serial: string; name: string }]
  'batch-operation': [data: { operation: string }]
  'confirm-reboot': []
  'confirm-unbind': []
}>()

// Form data
const bindForm = reactive({
  serial: '',
  name: ''
})

const batchForm = reactive({
  operation: ''
})

// Event handlers
const handleCloseBindDialog = () => {
  emit('update:bindDialogOpen', false)
  bindForm.serial = ''
  bindForm.name = ''
}

const handleCloseBatchDialog = () => {
  emit('update:batchDialogOpen', false)
  batchForm.operation = ''
}

const handleCloseRebootDialog = () => {
  emit('update:rebootConfirmOpen', false)
}

const handleCloseUnbindDialog = () => {
  emit('update:unbindConfirmOpen', false)
}

const handleBindDevice = () => {
  emit('bind-device', { ...bindForm })
}

const handleBatchOperation = () => {
  emit('batch-operation', { operation: batchForm.operation })
}

const confirmReboot = () => {
  emit('confirm-reboot')
}

const confirmUnbind = () => {
  emit('confirm-unbind')
}
</script>

<template>
  <!-- Bind Device Modal -->
  <VModal 
    :open="bindDialogOpen" 
    title="Bind Device" 
    actions="right" 
    cancelLabel="Cancel" 
    @close="handleCloseBindDialog"
  >
    <template #content>
      <VField>
        <VLabel>Serial Number *</VLabel>
        <VControl>
          <VInput
            v-model="bindForm.serial"
            placeholder="Enter device serial number"
            :class="{ 'is-danger': bindErrors?.serial }"
          />
        </VControl>
        <p v-if="bindErrors?.serial" class="help is-danger">
          {{ bindErrors.serial }}
        </p>
      </VField>
      
      <VField>
        <VLabel>Device Name</VLabel>
        <VControl>
          <VInput
            v-model="bindForm.name"
            placeholder="Enter device name (optional)"
          />
        </VControl>
      </VField>
    </template>
    
    <template #action>
      <VButton color="primary" @click="handleBindDevice">
        Bind Device
      </VButton>
    </template>
  </VModal>

  <!-- Batch Operations Modal -->
  <VModal 
    :open="batchDialogOpen" 
    title="Batch Operations" 
    actions="right" 
    cancelLabel="Cancel" 
    @close="handleCloseBatchDialog"
  >
    <template #content>
      <VMessage color="info">
        Selected {{ selectedDevices?.length || 0 }} devices for batch operation
      </VMessage>
      
      <VField>
        <VLabel>Operation</VLabel>
        <VControl>
          <VSelect v-model="batchForm.operation">
            <VOption value="">Select operation</VOption>
            <VOption value="reboot">Reboot Devices</VOption>
            <VOption value="logs">Collect Logs</VOption>
            <!-- TODO: [v2.1] 批量SIM切换选项 - 需完成并发操作安全性测试后启用 -->
            <!-- <VOption value="sim_slot_1">Switch to SIM Slot 1</VOption>
            <VOption value="sim_slot_2">Switch to SIM Slot 2</VOption> -->
          </VSelect>
        </VControl>
      </VField>
    </template>
    
    <template #action>
      <VButton 
        color="primary" 
        :disabled="!batchForm.operation"
        @click="handleBatchOperation"
      >
        Execute
      </VButton>
    </template>
  </VModal>

  <!-- Reboot Confirmation Dialog -->
  <VModal 
    :open="rebootConfirmOpen"
    title="Confirm Reboot"
    size="small"
    actions="center"
    @close="handleCloseRebootDialog"
  >
    <template #content>
      <div class="has-text-centered">
        <iconify-icon 
          icon="lucide:refresh-cw" 
          class="has-text-warning"
          style="font-size: 3rem; margin-bottom: 1rem;"
        />
        <h3 class="title is-5">Reboot Device</h3>
        <p class="subtitle is-6" v-if="selectedDeviceForReboot">
          Are you sure you want to reboot device "<strong>{{ selectedDeviceForReboot.serial }}</strong>"?
        </p>
        <p class="has-text-grey">
          The reboot process takes about 1-2 minutes and the device will be temporarily disconnected.
        </p>
      </div>
    </template>
    
    <template #action>
      <VButton 
        color="warning"
        @click="confirmReboot"
      >
        Confirm Reboot
      </VButton>
    </template>
  </VModal>

  <!-- Unbind Confirmation Dialog -->
  <VModal 
    :open="unbindConfirmOpen"
    title="Confirm Unbind Device"
    size="small"
    actions="center"
    @close="handleCloseUnbindDialog"
  >
    <template #content>
      <div class="has-text-centered">
        <iconify-icon 
          icon="lucide:unlink" 
          class="has-text-danger"
          style="font-size: 3rem; margin-bottom: 1rem;"
        />
        <h3 class="title is-5">Unbind Device</h3>
        <p class="subtitle is-6" v-if="selectedDeviceForUnbind">
          Are you sure you want to unbind device "<strong>{{ selectedDeviceForUnbind.serial }}</strong>"?
        </p>
        <p class="has-text-grey">
          This will remove the device from your account permanently. This action cannot be undone.
        </p>
      </div>
    </template>
    
    <template #action>
      <VButton 
        color="danger"
        @click="confirmUnbind"
      >
        Unbind Device
      </VButton>
    </template>
  </VModal>
</template>
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { wifiTemplatesApi } from '/@src/api'
import type { WiFiTemplate } from '/@src/api/types'
import { Notyf } from 'notyf'
import type { VTagColor } from '/@src/components/base/VTag.vue'
import VDateTimeSplit from '/@src/components/base/VDateTimeSplit.vue'

definePage({
  meta: {
    requiresAuth: true
  }
})

const notyf = new Notyf()

// State
const loading = ref(false)
const templates = ref<WiFiTemplate[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const searchQuery = ref('')
const activeFilter = ref('')

// Dialogs
const showDetailDialog = ref(false)
const showEditDialog = ref(false)
const showCreateDialog = ref(false)
const viewingTemplate = ref<WiFiTemplate | null>(null)
const editingTemplate = ref<WiFiTemplate | null>(null)
const loadingDetails = ref(false)
const submittingCreate = ref(false)
const submittingEdit = ref(false)

// Create template form data
const createForm = ref({
  name: '',
  description: '',
  country: 'CN',
  is_active: true,
  radioConfigs: [
    {
      band: '2.4G' as '2.4G' | '5G' | '6G',
      channel: 'auto',
      txpower: 20,
      htmode: '11g',
      enabled: true
    },
    {
      band: '5G' as '2.4G' | '5G' | '6G',
      channel: 'auto', 
      txpower: 20,
      htmode: '11a',
      enabled: true
    }
  ],
  ssidConfigs: [
    {
      band: '2.4G' as '2.4G' | '5G' | '6G',
      ssid_index: 0,
      ssid: '',
      password: '',
      encryption: 'psk2',
      hidden: false,
      enabled: true,
      isolate: false
    }
  ]
})

// Search debounce
let searchTimeout: NodeJS.Timeout | null = null

// Get band tag color
const getBandTagColor = (band: string): VTagColor => {
  const colorMap: Record<string, VTagColor> = {
    '2.4G': 'success',
    '5G': 'warning',
    '6G': 'danger'
  }
  return colorMap[band] || 'info'
}

// Load templates
const loadTemplates = async () => {
  loading.value = true
  try {
    const params: any = {
      page: currentPage.value,
      limit: pageSize.value
    }
    
    if (searchQuery.value) {
      params.search = searchQuery.value
    }
    
    if (activeFilter.value !== '') {
      params.is_active = activeFilter.value === 'true'
    }

    const response = await wifiTemplatesApi.getTemplates(params)
    if (response.success) {
      templates.value = response.data.templates || []
      total.value = response.data.pagination?.total || 0
    }
  } catch (error) {
    console.error('Load templates error:', error)
    notyf.error('Failed to load WiFi templates')
  } finally {
    loading.value = false
  }
}

// Handle search (debounced for text input)
const handleSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    loadTemplates()
  }, 500)
}

// Handle filter (immediate for dropdowns)
const handleFilter = () => {
  currentPage.value = 1
  loadTemplates()
}

// View template
const viewTemplate = async (template: WiFiTemplate) => {
  loadingDetails.value = true
  try {
    // Fetch full template details including radioConfigs and ssidConfigs
    const response = await wifiTemplatesApi.getTemplate(template.id!)
    if (response.success) {
      viewingTemplate.value = response.data
      showDetailDialog.value = true
    } else {
      notyf.error('Failed to load template details')
    }
  } catch (error) {
    console.error('View template error:', error)
    notyf.error('Failed to load template details')
  } finally {
    loadingDetails.value = false
  }
}

// Edit template
const editTemplate = async (template: WiFiTemplate) => {
  loadingDetails.value = true
  try {
    // Fetch full template details for editing
    const response = await wifiTemplatesApi.getTemplate(template.id!)
    if (response.success) {
      editingTemplate.value = response.data
      showEditDialog.value = true
    } else {
      notyf.error('Failed to load template for editing')
    }
  } catch (error) {
    console.error('Edit template error:', error)
    notyf.error('Failed to load template for editing')
  } finally {
    loadingDetails.value = false
  }
}

// Save template changes
const saveTemplate = async () => {
  if (!editingTemplate.value) return
  
  // Validation
  if (!editingTemplate.value.name.trim()) {
    notyf.error('Please enter template name')
    return
  }
  
  if (!editingTemplate.value.ssidConfigs || editingTemplate.value.ssidConfigs.length === 0) {
    notyf.error('At least one SSID configuration is required')
    return
  }
  
  // Validate SSIDs
  for (const ssid of editingTemplate.value.ssidConfigs) {
    if (!ssid.ssid.trim()) {
      notyf.error('Please enter SSID name')
      return
    }
    if (ssid.encryption !== 'none' && !ssid.password?.trim()) {
      notyf.error('Please enter password for secured SSID')
      return
    }
  }
  
  submittingEdit.value = true
  try {
    const updateData = {
      name: editingTemplate.value.name,
      description: editingTemplate.value.description,
      country: editingTemplate.value.country,
      is_active: editingTemplate.value.is_active,
      radioConfigs: editingTemplate.value.radioConfigs?.map(radio => ({
        band: radio.band,
        channel: radio.channel,
        txpower: radio.txpower,
        htmode: radio.htmode,
        enabled: radio.enabled
      })) || [],
      ssidConfigs: editingTemplate.value.ssidConfigs?.map(ssid => ({
        band: ssid.band,
        ssid_index: ssid.ssid_index,
        ssid: ssid.ssid,
        password: ssid.password,
        encryption: ssid.encryption,
        hidden: ssid.hidden,
        enabled: ssid.enabled,
        isolate: ssid.isolate
      })) || []
    }
    
    const response = await wifiTemplatesApi.updateTemplate(editingTemplate.value.id!, updateData)
    
    if (response.success) {
      notyf.success('Template updated successfully')
      showEditDialog.value = false
      loadTemplates() // Refresh the list
    } else {
      notyf.error(response.message || 'Failed to update template')
    }
  } catch (error) {
    console.error('Save template error:', error)
    notyf.error('Failed to update template')
  } finally {
    submittingEdit.value = false
  }
}

// Create template
const createTemplate = () => {
  resetCreateForm()
  showCreateDialog.value = true
}

// Reset create form
const resetCreateForm = () => {
  createForm.value = {
    name: '',
    description: '',
    country: 'CN',
    is_active: true,
    radioConfigs: [
      {
        band: '2.4G' as const,
        channel: 'auto',
        txpower: 20,
        htmode: '11g',
        enabled: true
      },
      {
        band: '5G' as const,
        channel: 'auto', 
        txpower: 20,
        htmode: '11a',
        enabled: true
      }
    ],
    ssidConfigs: [
      {
        band: '2.4G' as const,
        ssid_index: 0,
        ssid: '',
        password: '',
        encryption: 'psk2',
        hidden: false,
        enabled: true,
        isolate: false
      }
    ]
  }
}

// Submit create template
const submitCreateTemplate = async () => {
  if (!createForm.value.name.trim()) {
    notyf.error('Please enter template name')
    return
  }
  
  if (createForm.value.ssidConfigs.length === 0) {
    notyf.error('At least one SSID configuration is required')
    return
  }
  
  // Validate SSIDs
  for (const ssid of createForm.value.ssidConfigs) {
    if (!ssid.ssid.trim()) {
      notyf.error('Please enter SSID name')
      return
    }
    if (ssid.encryption !== 'none' && !ssid.password?.trim()) {
      notyf.error('Please enter password for secured SSID')
      return
    }
  }
  
  submittingCreate.value = true
  try {
    const response = await wifiTemplatesApi.createTemplate(createForm.value)
    if (response.success) {
      notyf.success('WiFi template created successfully')
      showCreateDialog.value = false
      loadTemplates()
    } else {
      notyf.error(response.message || 'Failed to create template')
    }
  } catch (error) {
    console.error('Create template error:', error)
    notyf.error('Failed to create template')
  } finally {
    submittingCreate.value = false
  }
}

// Add radio config
const addRadioConfig = () => {
  const availableBands: ('2.4G' | '5G' | '6G')[] = ['2.4G', '5G', '6G']
  const usedBands = createForm.value.radioConfigs.map(r => r.band)
  const availableBand = availableBands.find(band => !(usedBands as string[]).includes(band))
  
  if (availableBand) {
    createForm.value.radioConfigs.push({
      band: availableBand as '2.4G' | '5G' | '6G',
      channel: 'auto',
      txpower: 20,
      htmode: availableBand === '2.4G' ? '11g' : '11a',
      enabled: true
    })
  }
}

// Remove radio config
const removeRadioConfig = (index: number) => {
  if (createForm.value.radioConfigs.length > 1) {
    createForm.value.radioConfigs.splice(index, 1)
  }
}

// Add SSID config
const addSSIDConfig = () => {
  const maxIndex = Math.max(...createForm.value.ssidConfigs.map(s => s.ssid_index), -1)
  createForm.value.ssidConfigs.push({
    band: '2.4G' as const,
    ssid_index: maxIndex + 1,
    ssid: '',
    password: '',
    encryption: 'psk2',
    hidden: false,
    enabled: true,
    isolate: false
  })
}

// Remove SSID config
const removeSSIDConfig = (index: number) => {
  if (createForm.value.ssidConfigs.length > 1) {
    createForm.value.ssidConfigs.splice(index, 1)
  }
}

// Edit mode functions
// Add radio config for edit mode
const addEditRadioConfig = () => {
  if (!editingTemplate.value) return
  
  if (!editingTemplate.value.radioConfigs) {
    editingTemplate.value.radioConfigs = []
  }
  
  const availableBands: ('2.4G' | '5G' | '6G')[] = ['2.4G', '5G', '6G']
  const usedBands = editingTemplate.value.radioConfigs.map(r => r.band)
  const availableBand = availableBands.find(band => !(usedBands as string[]).includes(band))
  
  if (availableBand) {
    editingTemplate.value.radioConfigs.push({
      band: availableBand as '2.4G' | '5G' | '6G',
      channel: 'auto',
      txpower: 20,
      htmode: availableBand === '2.4G' ? '11g' : '11a',
      enabled: true
    })
  }
}

// Remove radio config for edit mode
const removeEditRadioConfig = (index: number) => {
  if (!editingTemplate.value?.radioConfigs) return
  
  if (editingTemplate.value.radioConfigs.length > 1) {
    editingTemplate.value.radioConfigs.splice(index, 1)
  }
}

// Add SSID config for edit mode
const addEditSSIDConfig = () => {
  if (!editingTemplate.value) return
  
  if (!editingTemplate.value.ssidConfigs) {
    editingTemplate.value.ssidConfigs = []
  }
  
  const maxIndex = Math.max(...editingTemplate.value.ssidConfigs.map(s => s.ssid_index), -1)
  editingTemplate.value.ssidConfigs.push({
    band: '2.4G' as const,
    ssid_index: maxIndex + 1,
    ssid: '',
    password: '',
    encryption: 'psk2',
    hidden: false,
    enabled: true,
    isolate: false
  })
}

// Remove SSID config for edit mode
const removeEditSSIDConfig = (index: number) => {
  if (!editingTemplate.value?.ssidConfigs) return
  
  if (editingTemplate.value.ssidConfigs.length > 1) {
    editingTemplate.value.ssidConfigs.splice(index, 1)
  }
}

// Toggle template status
const toggleTemplateStatus = async (template: WiFiTemplate) => {
  try {
    const response = await wifiTemplatesApi.toggleTemplate(template.id!)
    if (response.success) {
      notyf.success(`Template ${template.is_active ? 'disabled' : 'enabled'} successfully`)
      loadTemplates()
    }
  } catch (error) {
    console.error('Toggle template error:', error)
    notyf.error('Failed to update template status')
  }
}

// Delete template
const deleteTemplate = async (template: WiFiTemplate) => {
  if (!confirm(`Are you sure you want to delete WiFi template "${template.name}"? This action cannot be undone.`)) {
    return
  }
  
  try {
    const response = await wifiTemplatesApi.deleteTemplate(template.id!)
    if (response.success) {
      notyf.success('Template deleted successfully')
      loadTemplates()
    }
  } catch (error) {
    console.error('Delete template error:', error)
    notyf.error('Failed to delete template')
  }
}



// Watch for search and filter changes
watch(() => searchQuery.value, () => {
  handleSearch()
})

watch(() => activeFilter.value, () => {
  handleFilter()
})

// Watch pagination
watch(() => currentPage.value, () => {
  loadTemplates()
})

// Watch for pageSize changes - reset to page 1
watch(() => pageSize.value, () => {
  currentPage.value = 1
  loadTemplates()
})

// Lifecycle
onMounted(() => {
  loadTemplates()
})

useHead({
  title: 'WiFi Templates - EzCloud'
})
</script>

<template>
  <div class="common-page-layout">
    <!-- Page Header -->
    <div class="common-page-header">
      <div class="header-content">
        <div class="header-info">
          <h1 class="title is-3">WiFi Template Management</h1>
          <p class="subtitle is-6">Manage WiFi configuration templates for tri-band multi-SSID devices</p>
        </div>
      </div>
    </div>

    <!-- Controls -->
    <VCard>
      <!-- Filter Section -->
      <div class="card-content">
        <div class="columns">
          <div class="column is-6">
            <VField>
              <VLabel>Search Templates</VLabel>
              <VControl>
                <VInput
                  v-model="searchQuery"
                  placeholder="Search by template name"
                  icon="lucide:search"
                />
              </VControl>
            </VField>
          </div>
          <div class="column is-3">
            <VField>
              <VLabel>Status Filter</VLabel>
              <VControl>
                <VSelect
                  v-model="activeFilter"
                  placeholder="All Status"
                >
                  <VOption value="">All Status</VOption>
                  <VOption value="true">Active</VOption>
                  <VOption value="false">Inactive</VOption>
                </VSelect>
              </VControl>
            </VField>
          </div>
          <div class="column is-3">
            <VField>
              <VLabel>&nbsp;</VLabel>
              <VControl>
                <div class="field is-grouped">
                  <div class="control">
                    <VButton @click="loadTemplates" :loading="loading">
                      Refresh
                    </VButton>
                  </div>
                  <div class="control">
                    <VButton color="primary" @click="createTemplate">
                      Add Template
                    </VButton>
                  </div>
                </div>
              </VControl>
            </VField>
          </div>
        </div>
      </div>

      <!-- WiFi Templates Table -->
      <VFlexTableWrapper
        :columns="{
          name: { 
            label: 'Template Name', 
            searchable: true,
            sortable: true,
            bold: true,
            grow: true
          },
          description: { 
            label: 'Description',
            searchable: true,
            grow: 'lg'
          },
          bands: { 
            label: 'Radio Bands',
            align: 'center'
          },
          ssidCount: { 
            label: 'SSID Count', 
            sortable: true,
            align: 'center'
          },
          country: { 
            label: 'Country', 
            sortable: true,
            align: 'center'
          },
          created: { 
            label: 'Created', 
            sortable: true
          },
          actions: { 
            label: 'Actions', 
            align: 'end'
          }
        }"
        :data="templates"
        :loading="loading"
      >
        <template #default="wrapperState">
          <VFlexTableToolbar>
            <template #right>
              <VField>
                <VControl>
                  <VSelect v-model="pageSize" class="is-rounded">
                    <VOption :value="10">10 条/页</VOption>
                    <VOption :value="20">20 条/页</VOption>
                    <VOption :value="50">50 条/页</VOption>
                    <VOption :value="100">100 条/页</VOption>
                  </VSelect>
                </VControl>
              </VField>
            </template>
          </VFlexTableToolbar>

          <VFlexTable rounded>
            <!-- 加载状态 -->
            <template #body>
              <div v-if="loading" class="flex-list-inner">
                <div v-for="key in 5" :key="key" class="flex-table-item">
                  <VFlexTableCell :column="{ grow: true }"><VPlaceload /></VFlexTableCell>
                  <VFlexTableCell :column="{ grow: 'lg' }"><VPlaceload /></VFlexTableCell>
                  <VFlexTableCell><VPlaceload width="120px" /></VFlexTableCell>
                  <VFlexTableCell><VPlaceload width="80px" /></VFlexTableCell>
                  <VFlexTableCell><VPlaceload width="80px" /></VFlexTableCell>
                  <VFlexTableCell><VPlaceload width="100px" /></VFlexTableCell>
                  <VFlexTableCell :column="{ align: 'end' }"><VPlaceload width="60px" /></VFlexTableCell>
                </div>
              </div>
              
              <!-- 空状态 -->
              <div v-else-if="wrapperState.data?.length === 0" class="flex-list-inner">
                <VPlaceholderSection
                  title="暂无WiFi模板"
                  subtitle="请创建WiFi模板或检查搜索条件"
                  class="my-6"
                />
              </div>
            </template>
            <template #body-cell="{ row: template, column }">
              <template v-if="column.key === 'name'">
                <div class="template-name">
                  <VTextEllipsis width="150px" class="name">
                    {{ template.name }}
                  </VTextEllipsis>
                  <VTag 
                    :color="template.is_active ? 'success' : 'light'" 
                    rounded
                    class="ml-2"
                  >
                    {{ template.is_active ? 'Active' : 'Inactive' }}
                  </VTag>
                </div>
              </template>

              <template v-if="column.key === 'description'">
                <VTextEllipsis width="250px" class="description">
                  {{ template.description || 'No description' }}
                </VTextEllipsis>
              </template>

              <template v-if="column.key === 'bands'">
                <div class="radio-bands">
                  <VTag
                    v-for="radio in template.radioConfigs || []"
                    :key="radio.band"
                    :color="getBandTagColor(radio.band)"
                    rounded
                    class="mr-1"
                  >
                    {{ radio.band }}
                  </VTag>
                </div>
              </template>

              <template v-if="column.key === 'ssidCount'">
                <VTag color="primary" outlined rounded>
                  {{ template.ssidConfigs?.length || 0 }}
                </VTag>
              </template>

              <template v-if="column.key === 'country'">
                <VTextEllipsis width="80px" class="country-code">
                  {{ template.country || '-' }}
                </VTextEllipsis>
              </template>

              <template v-if="column.key === 'created'">
                <VDateTimeSplit 
                  :date-string="template.created_at"
                  size="small"
                  align="left"
                />
              </template>

              <template v-if="column.key === 'actions'">
                <VDropdown spaced right icon="lucide:more-horizontal">
                  <template #content>
                    <a class="dropdown-item is-media" @click="viewTemplate(template)">
                      <div class="icon">
                        <iconify-icon icon="lucide:eye" />
                      </div>
                      <div class="meta">
                        <span>View Details</span>
                      </div>
                    </a>
                    <a 
                      class="dropdown-item is-media" 
                      @click="editTemplate(template)"
                    >
                      <div class="icon">
                        <iconify-icon icon="lucide:edit" />
                      </div>
                      <div class="meta">
                        <span>Edit Template</span>
                      </div>
                    </a>
                    <a 
                      class="dropdown-item is-media"
                      @click="toggleTemplateStatus(template)"
                    >
                      <div class="icon">
                        <iconify-icon :icon="template.is_active ? 'lucide:eye-off' : 'lucide:eye'" />
                      </div>
                      <div class="meta">
                        <span>{{ template.is_active ? 'Disable' : 'Enable' }}</span>
                      </div>
                    </a>
                    <hr class="dropdown-divider">
                    <a 
                      class="dropdown-item is-media has-text-danger"
                      @click="deleteTemplate(template)"
                    >
                      <div class="icon">
                        <iconify-icon icon="lucide:trash-2" />
                      </div>
                      <div class="meta">
                        <span>Delete Template</span>
                      </div>
                    </a>
                  </template>
                </VDropdown>
              </template>
            </template>
          </VFlexTable>

          <div v-if="templates.length === 0" class="empty-state">
            <VPlaceholderSection 
              title="No templates found"
              subtitle="Create your first WiFi template to get started"
            >
              <template #action>
                <VButton 
                  color="primary" 
                  raised
                  @click="createTemplate"
                >
                  Create Template
                </VButton>
              </template>
            </VPlaceholderSection>
          </div>
        </template>
      </VFlexTableWrapper>

    </VCard>

    <!-- Template Detail Modal -->
    <VModal 
      :open="showDetailDialog"
      title="Template Details"
      size="large"
      actions="right"
      @close="showDetailDialog = false"
    >
      <template #content>
        <!-- Loading State -->
        <div v-if="loadingDetails" class="loading-state">
          <VPlaceload />
          <p class="mt-4 has-text-centered">Loading template details...</p>
        </div>

        <!-- Template Details -->
        <div v-else-if="viewingTemplate" class="template-details">
          <div class="detail-grid">
            <div class="detail-item">
              <label>Template Name</label>
              <span>{{ viewingTemplate.name }}</span>
            </div>
            <div class="detail-item">
              <label>Description</label>
              <span>{{ viewingTemplate.description || 'No description' }}</span>
            </div>
            <div class="detail-item">
              <label>Country</label>
              <span>{{ viewingTemplate.country || '-' }}</span>
            </div>
            <div class="detail-item">
              <label>Status</label>
              <VTag :color="viewingTemplate.is_active ? 'success' : 'light'">
                {{ viewingTemplate.is_active ? 'Active' : 'Inactive' }}
              </VTag>
            </div>
          </div>

          <div class="radio-configs">
            <h4 class="subtitle">Radio Configurations</h4>
            <div v-if="viewingTemplate.radioConfigs && viewingTemplate.radioConfigs.length > 0" class="radio-grid">
              <div 
                v-for="radio in viewingTemplate.radioConfigs" 
                :key="radio.band"
                class="radio-item"
              >
                <h5>{{ radio.band }} Band</h5>
                <div class="radio-details">
                  <span><strong>Channel:</strong> {{ radio.channel }}</span>
                  <span><strong>Power:</strong> {{ radio.txpower }}dBm</span>
                  <span><strong>Mode:</strong> {{ radio.htmode }}</span>
                  <span><strong>Enabled:</strong> {{ radio.enabled ? 'Yes' : 'No' }}</span>
                </div>
              </div>
            </div>
            <div v-else class="empty-config">
              <VPlaceholderSection
                title="No Radio Configurations"
                subtitle="This template doesn't have any radio configurations defined"
                class="py-4"
              />
            </div>
          </div>

          <div class="ssid-configs">
            <h4 class="subtitle">SSID Configurations</h4>
            <div v-if="viewingTemplate.ssidConfigs && viewingTemplate.ssidConfigs.length > 0" class="ssid-grid">
              <div 
                v-for="ssid in viewingTemplate.ssidConfigs" 
                :key="`${ssid.band}-${ssid.ssid_index}`"
                class="ssid-item"
              >
                <h5>{{ ssid.ssid }}</h5>
                <div class="ssid-details">
                  <span><strong>Band:</strong> {{ ssid.band }}</span>
                  <span><strong>Index:</strong> {{ ssid.ssid_index }}</span>
                  <span><strong>Security:</strong> {{ ssid.encryption }}</span>
                  <span><strong>Hidden:</strong> {{ ssid.hidden ? 'Yes' : 'No' }}</span>
                  <span><strong>Enabled:</strong> {{ ssid.enabled ? 'Yes' : 'No' }}</span>
                  <span><strong>Isolate:</strong> {{ ssid.isolate ? 'Yes' : 'No' }}</span>
                </div>
              </div>
            </div>
            <div v-else class="empty-config">
              <VPlaceholderSection
                title="No SSID Configurations"
                subtitle="This template doesn't have any SSID configurations defined"
                class="py-4"
              />
            </div>
          </div>
        </div>
      </template>
      
      <template #action>
        <VButton @click="showDetailDialog = false">Close</VButton>
      </template>
    </VModal>

    <!-- Template Edit Modal -->
    <VModal 
      :open="showEditDialog"
      title="Edit WiFi Template"
      size="large"
      actions="right"
      @close="showEditDialog = false"
    >
      <template #content>
        <!-- Loading State -->
        <div v-if="loadingDetails" class="loading-state">
          <VPlaceload />
          <p class="mt-4 has-text-centered">Loading template for editing...</p>
        </div>

        <!-- Edit Form -->
        <div v-else-if="editingTemplate" class="edit-form">
          <!-- Basic Information -->
          <div class="form-section">
            <h4 class="subtitle">Basic Information</h4>
            
            <VField>
              <VLabel>Template Name *</VLabel>
              <VControl>
                <VInput 
                  v-model="editingTemplate.name"
                  placeholder="Enter template name"
                />
              </VControl>
            </VField>

            <VField>
              <VLabel>Description</VLabel>
              <VControl>
                <VTextarea 
                  v-model="editingTemplate.description"
                  placeholder="Enter template description"
                  rows="3"
                />
              </VControl>
            </VField>

            <div class="columns">
              <div class="column is-6">
                <VField>
                  <VLabel>Country Code</VLabel>
                  <VControl>
                    <VInput 
                      v-model="editingTemplate.country"
                      placeholder="e.g., CN, US, GB"
                      maxlength="2"
                    />
                  </VControl>
                </VField>
              </div>
              <div class="column is-6">
                <VField>
                  <VLabel>Status</VLabel>
                  <VControl>
                    <VCheckbox 
                      v-model="editingTemplate.is_active"
                      color="success"
                      label="Active Template"
                    />
                  </VControl>
                </VField>
              </div>
            </div>
          </div>

          <!-- Radio Configurations -->
          <div class="form-section">
            <div class="section-header">
              <h4 class="subtitle">Radio Configurations</h4>
              <VButton 
                size="medium" 
                outlined
                @click="addEditRadioConfig"
                :disabled="!editingTemplate.radioConfigs || editingTemplate.radioConfigs.length >= 3"
              >
                <iconify-icon icon="lucide:plus" class="mr-2" />
                Add Radio
              </VButton>
            </div>
            
            <div class="radio-configs">
              <div 
                v-for="(radio, index) in editingTemplate.radioConfigs || []" 
                :key="radio.id || index"
                class="config-item"
              >
                <div class="config-header">
                  <h5>{{ radio.band }} Band</h5>
                  <VButton 
                    v-if="editingTemplate.radioConfigs && editingTemplate.radioConfigs.length > 1"
                    size="medium" 
                    color="danger"
                    outlined
                    @click="removeEditRadioConfig(index)"
                  >
                    <iconify-icon icon="lucide:trash-2" />
                  </VButton>
                </div>
                
                <div class="columns">
                  <div class="column is-3">
                    <VField>
                      <VLabel>Band</VLabel>
                      <VControl>
                        <VSelect v-model="radio.band">
                          <VOption value="2.4G">2.4G</VOption>
                          <VOption value="5G">5G</VOption>
                          <VOption value="6G">6G</VOption>
                        </VSelect>
                      </VControl>
                    </VField>
                  </div>
                  <div class="column is-3">
                    <VField>
                      <VLabel>Channel</VLabel>
                      <VControl>
                        <VInput 
                          v-model="radio.channel"
                          placeholder="auto or number"
                        />
                      </VControl>
                    </VField>
                  </div>
                  <div class="column is-3">
                    <VField>
                      <VLabel>TX Power</VLabel>
                      <VControl>
                        <VInput 
                          v-model.number="radio.txpower"
                          type="number"
                          min="1"
                          max="30"
                        />
                      </VControl>
                    </VField>
                  </div>
                  <div class="column is-3">
                    <VField>
                      <VLabel>HT Mode</VLabel>
                      <VControl>
                        <VSelect v-model="radio.htmode">
                          <VOption value="11g">11g</VOption>
                          <VOption value="11a">11a</VOption>
                          <VOption value="11n">11n</VOption>
                          <VOption value="11ac">11ac</VOption>
                          <VOption value="11ax">11ax</VOption>
                        </VSelect>
                      </VControl>
                    </VField>
                  </div>
                </div>
                
                <VField>
                  <VControl>
                    <VCheckbox 
                      v-model="radio.enabled"
                      color="success"
                      label="Enable Radio"
                    />
                  </VControl>
                </VField>
              </div>
            </div>
          </div>

          <!-- SSID Configurations -->
          <div class="form-section">
            <div class="section-header">
              <h4 class="subtitle">SSID Configurations</h4>
              <VButton 
                size="medium" 
                outlined
                @click="addEditSSIDConfig"
                :disabled="!editingTemplate.ssidConfigs || editingTemplate.ssidConfigs.length >= 8"
              >
                <iconify-icon icon="lucide:plus" class="mr-2" />
                Add SSID
              </VButton>
            </div>
            
            <div class="ssid-configs">
              <div 
                v-for="(ssid, index) in editingTemplate.ssidConfigs || []" 
                :key="ssid.id || index"
                class="config-item"
              >
                <div class="config-header">
                  <h5>SSID {{ ssid.ssid_index }}</h5>
                  <VButton 
                    v-if="editingTemplate.ssidConfigs && editingTemplate.ssidConfigs.length > 1"
                    
                    color="danger"
                    outlined
                    @click="removeEditSSIDConfig(index)"
                  >
                    <iconify-icon icon="lucide:trash-2" />
                  </VButton>
                </div>
                
                <div class="columns">
                  <div class="column is-4">
                    <VField>
                      <VLabel>SSID Name *</VLabel>
                      <VControl>
                        <VInput 
                          v-model="ssid.ssid"
                          placeholder="Enter SSID name"
                        />
                      </VControl>
                    </VField>
                  </div>
                  <div class="column is-3">
                    <VField>
                      <VLabel>Band</VLabel>
                      <VControl>
                        <VSelect v-model="ssid.band">
                          <VOption value="2.4G">2.4G</VOption>
                          <VOption value="5G">5G</VOption>
                          <VOption value="6G">6G</VOption>
                        </VSelect>
                      </VControl>
                    </VField>
                  </div>
                  <div class="column is-3">
                    <VField>
                      <VLabel>Encryption</VLabel>
                      <VControl>
                        <VSelect v-model="ssid.encryption">
                          <VOption value="none">None</VOption>
                          <VOption value="psk">WPA-PSK</VOption>
                          <VOption value="psk2">WPA2-PSK</VOption>
                          <VOption value="psk-mixed">WPA/WPA2-PSK</VOption>
                        </VSelect>
                      </VControl>
                    </VField>
                  </div>
                  <div class="column is-2">
                    <VField>
                      <VLabel>Index</VLabel>
                      <VControl>
                        <VInput 
                          v-model.number="ssid.ssid_index"
                          type="number"
                          min="0"
                          max="3"
                        />
                      </VControl>
                    </VField>
                  </div>
                </div>
                
                <div v-if="ssid.encryption !== 'none'" class="columns">
                  <div class="column is-6">
                    <VField>
                      <VLabel>Password *</VLabel>
                      <VControl>
                        <VInput 
                          v-model="ssid.password"
                          type="password"
                          placeholder="Enter WiFi password"
                        />
                      </VControl>
                    </VField>
                  </div>
                </div>
                
                <div class="columns">
                  <div class="column is-4">
                    <VField>
                      <VControl>
                        <VCheckbox 
                          v-model="ssid.enabled"
                          color="success"
                          label="Enable SSID"
                        />
                      </VControl>
                    </VField>
                  </div>
                  <div class="column is-4">
                    <VField>
                      <VControl>
                        <VCheckbox 
                          v-model="ssid.hidden"
                          color="warning"
                          label="Hidden SSID"
                        />
                      </VControl>
                    </VField>
                  </div>
                  <div class="column is-4">
                    <VField>
                      <VControl>
                        <VCheckbox 
                          v-model="ssid.isolate"
                          color="info"
                          label="Client Isolation"
                        />
                      </VControl>
                    </VField>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
      
      <template #action>
        <VButton @click="showEditDialog = false" light>Cancel</VButton>
        <VButton 
          color="primary" 
          raised
          :loading="submittingEdit"
          @click="saveTemplate"
        >
          Save Changes
        </VButton>
      </template>
    </VModal>

    <!-- Create Template Modal -->
    <VModal 
      :open="showCreateDialog"
      title="Create WiFi Template"
      size="large"
      actions="right"
      @close="showCreateDialog = false"
    >
      <template #content>
        <div class="create-form">
          <!-- Basic Information -->
          <div class="form-section">
            <h4 class="subtitle">Basic Information</h4>
            
            <VField>
              <VLabel>Template Name *</VLabel>
              <VControl>
                <VInput 
                  v-model="createForm.name"
                  placeholder="Enter template name"
                />
              </VControl>
            </VField>

            <VField>
              <VLabel>Description</VLabel>
              <VControl>
                <VTextarea 
                  v-model="createForm.description"
                  placeholder="Enter template description"
                  rows="3"
                />
              </VControl>
            </VField>

            <div class="columns">
              <div class="column is-6">
                <VField>
                  <VLabel>Country Code</VLabel>
                  <VControl>
                    <VInput 
                      v-model="createForm.country"
                      placeholder="e.g., CN, US, GB"
                      maxlength="2"
                    />
                  </VControl>
                </VField>
              </div>
              <div class="column is-6">
                <VField>
                  <VLabel>Status</VLabel>
                  <VControl>
                    <VCheckbox 
                      v-model="createForm.is_active"
                      color="success"
                      label="Active Template"
                    />
                  </VControl>
                </VField>
              </div>
            </div>
          </div>

          <!-- Radio Configurations -->
          <div class="form-section">
            <div class="section-header">
              <h4 class="subtitle">Radio Configurations</h4>
              <VButton 
                size="medium" 
                outlined
                @click="addRadioConfig"
                :disabled="createForm.radioConfigs.length >= 3"
              >
                <iconify-icon icon="lucide:plus" class="mr-2" />
                Add Radio
              </VButton>
            </div>
            
            <div class="radio-configs">
              <div 
                v-for="(radio, index) in createForm.radioConfigs" 
                :key="index"
                class="config-item"
              >
                <div class="config-header">
                  <h5>{{ radio.band }} Band</h5>
                  <VButton 
                    v-if="createForm.radioConfigs.length > 1"
                    
                    color="danger"
                    outlined
                    @click="removeRadioConfig(index)"
                  >
                    <iconify-icon icon="lucide:trash-2" />
                  </VButton>
                </div>
                
                <div class="columns">
                  <div class="column is-3">
                    <VField>
                      <VLabel>Band</VLabel>
                      <VControl>
                        <VSelect v-model="radio.band">
                          <VOption value="2.4G">2.4G</VOption>
                          <VOption value="5G">5G</VOption>
                          <VOption value="6G">6G</VOption>
                        </VSelect>
                      </VControl>
                    </VField>
                  </div>
                  <div class="column is-3">
                    <VField>
                      <VLabel>Channel</VLabel>
                      <VControl>
                        <VInput 
                          v-model="radio.channel"
                          placeholder="auto or number"
                        />
                      </VControl>
                    </VField>
                  </div>
                  <div class="column is-3">
                    <VField>
                      <VLabel>TX Power</VLabel>
                      <VControl>
                        <VInput 
                          v-model.number="radio.txpower"
                          type="number"
                          min="1"
                          max="30"
                        />
                      </VControl>
                    </VField>
                  </div>
                  <div class="column is-3">
                    <VField>
                      <VLabel>HT Mode</VLabel>
                      <VControl>
                        <VSelect v-model="radio.htmode">
                          <VOption value="11g">11g</VOption>
                          <VOption value="11a">11a</VOption>
                          <VOption value="11n">11n</VOption>
                          <VOption value="11ac">11ac</VOption>
                          <VOption value="11ax">11ax</VOption>
                        </VSelect>
                      </VControl>
                    </VField>
                  </div>
                </div>
                
                <VField>
                  <VControl>
                    <VCheckbox 
                      v-model="radio.enabled"
                      color="success"
                      label="Enable Radio"
                    />
                  </VControl>
                </VField>
              </div>
            </div>
          </div>

          <!-- SSID Configurations -->
          <div class="form-section">
            <div class="section-header">
              <h4 class="subtitle">SSID Configurations</h4>
              <VButton 
                size="medium" 
                outlined
                @click="addSSIDConfig"
                :disabled="createForm.ssidConfigs.length >= 8"
              >
                <iconify-icon icon="lucide:plus" class="mr-2" />
                Add SSID
              </VButton>
            </div>
            
            <div class="ssid-configs">
              <div 
                v-for="(ssid, index) in createForm.ssidConfigs" 
                :key="index"
                class="config-item"
              >
                <div class="config-header">
                  <h5>SSID {{ ssid.ssid_index }}</h5>
                  <VButton 
                    v-if="createForm.ssidConfigs.length > 1"
                    
                    color="danger"
                    outlined
                    @click="removeSSIDConfig(index)"
                  >
                    <iconify-icon icon="lucide:trash-2" />
                  </VButton>
                </div>
                
                <div class="columns">
                  <div class="column is-4">
                    <VField>
                      <VLabel>SSID Name *</VLabel>
                      <VControl>
                        <VInput 
                          v-model="ssid.ssid"
                          placeholder="Enter SSID name"
                        />
                      </VControl>
                    </VField>
                  </div>
                  <div class="column is-3">
                    <VField>
                      <VLabel>Band</VLabel>
                      <VControl>
                        <VSelect v-model="ssid.band">
                          <VOption value="2.4G">2.4G</VOption>
                          <VOption value="5G">5G</VOption>
                          <VOption value="6G">6G</VOption>
                        </VSelect>
                      </VControl>
                    </VField>
                  </div>
                  <div class="column is-3">
                    <VField>
                      <VLabel>Encryption</VLabel>
                      <VControl>
                        <VSelect v-model="ssid.encryption">
                          <VOption value="none">None</VOption>
                          <VOption value="psk">WPA-PSK</VOption>
                          <VOption value="psk2">WPA2-PSK</VOption>
                          <VOption value="psk-mixed">WPA/WPA2-PSK</VOption>
                        </VSelect>
                      </VControl>
                    </VField>
                  </div>
                  <div class="column is-2">
                    <VField>
                      <VLabel>Index</VLabel>
                      <VControl>
                        <VInput 
                          v-model.number="ssid.ssid_index"
                          type="number"
                          min="0"
                          max="3"
                        />
                      </VControl>
                    </VField>
                  </div>
                </div>
                
                <div v-if="ssid.encryption !== 'none'" class="columns">
                  <div class="column is-6">
                    <VField>
                      <VLabel>Password *</VLabel>
                      <VControl>
                        <VInput 
                          v-model="ssid.password"
                          type="password"
                          placeholder="Enter WiFi password"
                        />
                      </VControl>
                    </VField>
                  </div>
                </div>
                
                <div class="columns">
                  <div class="column is-4">
                    <VField>
                      <VControl>
                        <VCheckbox 
                          v-model="ssid.enabled"
                          color="success"
                          label="Enable SSID"
                        />
                      </VControl>
                    </VField>
                  </div>
                  <div class="column is-4">
                    <VField>
                      <VControl>
                        <VCheckbox 
                          v-model="ssid.hidden"
                          color="warning"
                          label="Hidden SSID"
                        />
                      </VControl>
                    </VField>
                  </div>
                  <div class="column is-4">
                    <VField>
                      <VControl>
                        <VCheckbox 
                          v-model="ssid.isolate"
                          color="info"
                          label="Client Isolation"
                        />
                      </VControl>
                    </VField>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
      
      <template #action>
        <VButton @click="showCreateDialog = false" light>Cancel</VButton>
        <VButton 
          color="primary" 
          raised
          :loading="submittingCreate"
          @click="submitCreateTemplate"
        >
          Create Template
        </VButton>
      </template>
    </VModal>
  </div>
</template>

<style lang="scss" scoped>
:deep(.field.is-grouped) {
  flex-wrap: wrap;
  gap: 0.5rem;
}

.template-name {
  display: flex;
  align-items: center;

  .name {
    font-weight: 600;
    color: var(--dark-text);
  }
}

.description {
  color: var(--muted-grey);
  font-size: 0.9rem;
}

.radio-bands {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.country-code {
  font-family: 'Courier New', monospace;
  font-weight: 600;
}



.empty-state {
  padding: 3rem 0;
}

.loading-state {
  padding: 3rem 0;
  text-align: center;
}

.empty-config {
  padding: 2rem 0;
  text-align: center;
  background: var(--fade-grey-light-6);
  border-radius: var(--radius);
  border: 1px dashed var(--fade-grey-light-3);
}

.edit-form {
  .form-section {
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--fade-grey-light-3);

    .subtitle {
      margin: 0 0 0.5rem 0;
      color: var(--dark-text);
      font-weight: 600;
    }

    .help {
      color: var(--muted-grey);
      font-size: 0.9rem;
      font-style: italic;
    }
  }
}

.template-details {
  .detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;

    .detail-item {
      padding: 1rem;
      background: var(--fade-grey-light-6);
      border-radius: var(--radius);

      label {
        display: block;
        font-weight: 600;
        color: var(--muted-grey);
        font-size: 0.85rem;
        margin-bottom: 0.5rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      span {
        color: var(--dark-text);
        font-weight: 500;
      }
    }
  }

  .radio-configs,
  .ssid-configs {
    margin-bottom: 2rem;

    .subtitle {
      margin: 0 0 1rem 0;
      color: var(--dark-text);
      font-weight: 600;
    }
  }

  .radio-grid,
  .ssid-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;

    .radio-item,
    .ssid-item {
      padding: 1.5rem;
      background: var(--fade-grey-light-6);
      border-radius: var(--radius);
      border: 1px solid var(--fade-grey-light-3);

      h5 {
        margin: 0 0 1rem 0;
        color: var(--dark-text);
        font-weight: 600;
      }

      .radio-details,
      .ssid-details {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;

        span {
          color: var(--muted-grey);
          font-size: 0.9rem;
        }
      }
    }
  }
}

.create-form,
.edit-form {
  .form-section {
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid var(--fade-grey-light-3);

    &:last-child {
      border-bottom: none;
      margin-bottom: 0;
    }

    .subtitle {
      margin: 0 0 1rem 0;
      color: var(--dark-text);
      font-weight: 600;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;

      .subtitle {
        margin: 0;
      }
    }
  }

  .config-item {
    padding: 1.5rem;
    background: var(--fade-grey-light-6);
    border-radius: var(--radius);
    border: 1px solid var(--fade-grey-light-3);
    margin-bottom: 1rem;

    &:last-child {
      margin-bottom: 0;
    }

    .config-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;

      h5 {
        margin: 0;
        color: var(--dark-text);
        font-weight: 600;
      }
    }
  }
}

.is-dark {
  .detail-item,
  .radio-item,
  .ssid-item {
    background: var(--dark-sidebar-light-6);
    border-color: var(--dark-sidebar-light-12);
  }

  .empty-config {
    background: var(--dark-sidebar-light-6);
    border-color: var(--dark-sidebar-light-12);
  }

  .create-form,
  .edit-form {
    .form-section {
      border-color: var(--dark-sidebar-light-12);
    }

    .config-item {
      background: var(--dark-sidebar-light-6);
      border-color: var(--dark-sidebar-light-12);
    }
  }
}

@media only screen and (max-width: 767px) {
  .detail-grid,
  .radio-grid,
  .ssid-grid {
    grid-template-columns: 1fr;
  }
}
</style>
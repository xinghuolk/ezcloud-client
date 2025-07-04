<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useUserSession } from '/@src/stores/user-session'
import { wifiTemplatesApi } from '/@src/api'
import type { WiFiTemplate } from '/@src/api/types'
import { Notyf } from 'notyf'
import type { VTagColor } from '/@src/components/base/VTag.vue'

definePage({
  meta: {
    requiresAuth: true
  }
})

const userSession = useUserSession()
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
const viewingTemplate = ref<WiFiTemplate | null>(null)

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

// Handle search
const handleSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    loadTemplates()
  }, 500)
}

// Handle filter
const handleFilter = () => {
  currentPage.value = 1
  loadTemplates()
}

// View template
const viewTemplate = (template: WiFiTemplate) => {
  viewingTemplate.value = template
  showDetailDialog.value = true
}

// Edit template
const editTemplate = (template: WiFiTemplate) => {
  // TODO: Implement edit modal
  notyf.error('Edit functionality is not yet implemented')
  console.log('Edit template:', template)
}

// Create template
const createTemplate = () => {
  // TODO: Implement create modal
  notyf.error('Create functionality is not yet implemented')
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

// Format date
const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}


// Watch pagination
watch([currentPage, pageSize], () => {
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
  <div class="page-content-inner">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="title is-3">WiFi Template Management</h1>
        <p class="subtitle is-6">Manage WiFi configuration templates for tri-band multi-SSID devices</p>
      </div>
      <div class="header-actions">
        <VButton 
          v-if="userSession.isAdmin"
          color="primary" 
          raised
          @click="createTemplate"
        >
          <iconify-icon icon="lucide:plus" class="mr-2" />
          Create Template
        </VButton>
      </div>
    </div>

    <!-- Filter Bar -->
    <VCard radius="smooth" class="mb-6">
      <div class="filter-bar">
        <div class="filter-left">
          <VField>
            <VControl>
              <VInput
                v-model="searchQuery"
                placeholder="Search templates..."
                icon="feather:search"
                @input="handleSearch"
              />
            </VControl>
          </VField>
          
          <VField>
            <VControl>
              <VSelect
                v-model="activeFilter"
                placeholder="All Status"
                @change="handleFilter"
              >
                <VOption value="">All Status</VOption>
                <VOption value="true">Active</VOption>
                <VOption value="false">Inactive</VOption>
              </VSelect>
            </VControl>
          </VField>
        </div>
        
        <div class="filter-right">
          <VButton @click="loadTemplates" outlined>
            <iconify-icon icon="lucide:refresh-cw" class="mr-2" />
            Refresh
          </VButton>
        </div>
      </div>
    </VCard>

    <!-- Templates Table -->
    <VCard radius="smooth">
      <VFlexTableWrapper
        :columns="{
          name: { label: 'Template Name', searchable: true },
          description: { label: 'Description' },
          bands: { label: 'Radio Bands' },
          ssidCount: { label: 'SSID Count', align: 'center' },
          country: { label: 'Country', align: 'center' },
          created: { label: 'Created', sortable: true },
          actions: { label: 'Actions', align: 'end' }
        }"
        :data="templates"
        :loading="loading"
      >
        <template #default>
          <VFlexTable rounded>
            <template #body-cell="{ row: template, column }">
              <template v-if="column.key === 'name'">
                <div class="template-name">
                  <span class="name">{{ template.name }}</span>
                  <VTag 
                    :color="template.is_active ? 'success' : 'light'" 
                    size="tiny"
                    class="ml-2"
                  >
                    {{ template.is_active ? 'Active' : 'Inactive' }}
                  </VTag>
                </div>
              </template>

              <template v-if="column.key === 'description'">
                <span class="description">{{ template.description || 'No description' }}</span>
              </template>

              <template v-if="column.key === 'bands'">
                <div class="radio-bands">
                  <VTag
                    v-for="radio in template.radioConfigs || []"
                    :key="radio.band"
                    :color="getBandTagColor(radio.band)"
                    size="tiny"
                    class="mr-1"
                  >
                    {{ radio.band }}
                  </VTag>
                </div>
              </template>

              <template v-if="column.key === 'ssidCount'">
                <VTag color="primary" outlined>
                  {{ template.ssidConfigs?.length || 0 }}
                </VTag>
              </template>

              <template v-if="column.key === 'country'">
                <span class="country-code">{{ template.country || '-' }}</span>
              </template>

              <template v-if="column.key === 'created'">
                <span class="date-text">{{ formatDate(template.created_at) }}</span>
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
                      v-if="userSession.isAdmin"
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
                      v-if="userSession.isAdmin"
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
                      v-if="userSession.isAdmin"
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
                  v-if="userSession.isAdmin"
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
      @close="showDetailDialog = false"
    >
      <div v-if="viewingTemplate" class="template-details">
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
          <div class="radio-grid">
            <div 
              v-for="radio in viewingTemplate.radioConfigs || []" 
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
        </div>

        <div class="ssid-configs">
          <h4 class="subtitle">SSID Configurations</h4>
          <div class="ssid-grid">
            <div 
              v-for="ssid in viewingTemplate.ssidConfigs || []" 
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
        </div>
      </div>
      
      <template #action>
        <VButton @click="showDetailDialog = false">Close</VButton>
      </template>
    </VModal>
  </div>
</template>

<style lang="scss" scoped>
.page-content-inner {
  padding: 2rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;

  .header-content {
    .title {
      margin: 0 0 0.5rem 0;
      line-height: 1.2;
      color: var(--dark-text);
    }

    .subtitle {
      color: var(--muted-grey);
      margin: 0;
      line-height: 1.4;
    }
  }
}

.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;

  .filter-left {
    display: flex;
    gap: 1rem;
    align-items: center;
  }
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

.date-text {
  font-size: 0.85rem;
  color: var(--muted-grey);
}


.empty-state {
  padding: 3rem 0;
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

.is-dark {
  .detail-item,
  .radio-item,
  .ssid-item {
    background: var(--dark-sidebar-light-6);
    border-color: var(--dark-sidebar-light-12);
  }
}

@media only screen and (max-width: 767px) {
  .page-content-inner {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .filter-bar {
    flex-direction: column;
    gap: 1rem;

    .filter-left {
      flex-direction: column;
      width: 100%;
    }
  }

  .detail-grid,
  .radio-grid,
  .ssid-grid {
    grid-template-columns: 1fr;
  }
}
</style>
import request from './request'

// 射频配置接口
export interface WiFiRadioConfig {
  id?: number
  template_id?: number
  band: '2.4G' | '5G' | '6G'
  channel: string
  txpower: number
  htmode: string
  enabled: boolean
  created_at?: string
  updated_at?: string
}

// SSID配置接口
export interface WiFiSSIDConfig {
  id?: number
  template_id?: number
  band: '2.4G' | '5G' | '6G'
  ssid_index: number // 0-3
  ssid: string
  password?: string
  encryption: string
  hidden: boolean
  enabled: boolean
  isolate: boolean
  created_at?: string
  updated_at?: string
}

// WiFi模板接口（v2.0架构）
export interface WiFiTemplate {
  id?: number
  name: string
  description?: string
  country: string
  is_active: boolean
  created_at?: string
  updated_at?: string
  // 关联数据
  radioConfigs?: WiFiRadioConfig[]
  ssidConfigs?: WiFiSSIDConfig[]
}

// 创建/更新模板时的数据结构
export interface WiFiTemplateCreateData {
  name: string
  description?: string
  country: string
  is_active?: boolean
  radioConfigs: Omit<WiFiRadioConfig, 'id' | 'template_id' | 'created_at' | 'updated_at'>[]
  ssidConfigs: Omit<WiFiSSIDConfig, 'id' | 'template_id' | 'created_at' | 'updated_at'>[]
}

export interface WiFiTemplateUpdateData extends Partial<WiFiTemplateCreateData> {}

export interface WiFiTemplateListParams {
  page?: number
  limit?: number
  search?: string
  is_active?: boolean
  band?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface WiFiTemplateListResponse {
  success: boolean
  data: {
    templates: WiFiTemplate[]
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface WiFiTemplateResponse {
  success: boolean
  data: WiFiTemplate
  message?: string
}

export interface ApiResponse {
  success: boolean
  message: string
}

// 克隆模板参数
export interface WiFiTemplateCloneParams {
  source_id: number
  name: string
  description?: string
}

export const wifiTemplateApi = {
  // 获取WiFi模板列表
  getTemplates(params: WiFiTemplateListParams = {}): Promise<WiFiTemplateListResponse> {
    return request({
      url: '/wifi-templates',
      method: 'get',
      params
    })
  },

  // 获取WiFi模板详情
  getTemplate(id: number): Promise<WiFiTemplateResponse> {
    return request({
      url: `/wifi-templates/${id}`,
      method: 'get'
    })
  },

  // 创建WiFi模板
  createTemplate(data: WiFiTemplateCreateData): Promise<WiFiTemplateResponse> {
    return request({
      url: '/wifi-templates',
      method: 'post',
      data
    })
  },

  // 更新WiFi模板
  updateTemplate(id: number, data: WiFiTemplateUpdateData): Promise<WiFiTemplateResponse> {
    return request({
      url: `/wifi-templates/${id}`,
      method: 'put',
      data
    })
  },

  // 删除WiFi模板
  deleteTemplate(id: number): Promise<ApiResponse> {
    return request({
      url: `/wifi-templates/${id}`,
      method: 'delete'
    })
  },

  // 克隆WiFi模板
  cloneTemplate(params: WiFiTemplateCloneParams): Promise<WiFiTemplateResponse> {
    return request({
      url: '/wifi-templates/clone',
      method: 'post',
      data: params
    })
  },

  // 切换模板状态
  toggleTemplate(id: number): Promise<WiFiTemplateResponse> {
    return request({
      url: `/wifi-templates/${id}/toggle`,
      method: 'patch'
    })
  }
}

export default wifiTemplateApi 
import request from './request'

export interface WiFiTemplate {
  id?: number
  name: string
  description?: string
  radio_2g_channel: string
  radio_2g_txpower: number
  radio_2g_htmode: string
  radio_2g_enabled: boolean
  radio_5g_channel: string
  radio_5g_txpower: number
  radio_5g_htmode: string
  radio_5g_enabled: boolean
  country: string
  ssid_2g_main: string
  ssid_2g_main_password: string
  ssid_2g_main_encryption: string
  ssid_2g_main_hidden: boolean
  ssid_2g_main_enabled: boolean
  ssid_2g_guest: string
  ssid_2g_guest_password: string
  ssid_2g_guest_encryption: string
  ssid_2g_guest_hidden: boolean
  ssid_2g_guest_enabled: boolean
  ssid_2g_guest_isolate: boolean
  ssid_5g_main: string
  ssid_5g_main_password: string
  ssid_5g_main_encryption: string
  ssid_5g_main_hidden: boolean
  ssid_5g_main_enabled: boolean
  ssid_5g_guest: string
  ssid_5g_guest_password: string
  ssid_5g_guest_encryption: string
  ssid_5g_guest_hidden: boolean
  ssid_5g_guest_enabled: boolean
  ssid_5g_guest_isolate: boolean
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface WiFiTemplateListParams {
  page?: number
  limit?: number
  search?: string
  is_active?: boolean
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

export const wifiTemplateApi = {
  // 获取WiFi模板列表
  getTemplates(params: WiFiTemplateListParams = {}): Promise<WiFiTemplateListResponse> {
    return request({
      url: '/api/v1/wifi-templates',
      method: 'get',
      params
    })
  },

  // 获取WiFi模板详情
  getTemplate(id: number): Promise<WiFiTemplateResponse> {
    return request({
      url: `/api/v1/wifi-templates/${id}`,
      method: 'get'
    })
  },

  // 创建WiFi模板
  createTemplate(data: Partial<WiFiTemplate>): Promise<WiFiTemplateResponse> {
    return request({
      url: '/api/v1/wifi-templates',
      method: 'post',
      data
    })
  },

  // 更新WiFi模板
  updateTemplate(id: number, data: Partial<WiFiTemplate>): Promise<WiFiTemplateResponse> {
    return request({
      url: `/api/v1/wifi-templates/${id}`,
      method: 'put',
      data
    })
  },

  // 删除WiFi模板
  deleteTemplate(id: number): Promise<ApiResponse> {
    return request({
      url: `/api/v1/wifi-templates/${id}`,
      method: 'delete'
    })
  }
}

export default wifiTemplateApi 
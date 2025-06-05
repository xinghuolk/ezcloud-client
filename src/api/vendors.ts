import request from './request'

// 厂商接口定义
export interface Vendor {
  id: number
  name: string
  description?: string
  is_active: boolean
  modelCount?: number
  created_at: string
  updated_at: string
}

export interface VendorCreateRequest {
  name: string
  description?: string
  is_active?: boolean
}

export interface VendorUpdateRequest {
  name?: string
  description?: string
  is_active?: boolean
}

export interface VendorListParams {
  page?: number
  limit?: number
  name?: string
  is_active?: boolean
}

export interface VendorListResponse {
  vendors: Vendor[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface VendorDetailResponse extends Vendor {
  deviceModels?: Array<{
    id: number
    oemname: string
    stdname: string
    devtype: string
    is_active: boolean
  }>
}

export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  errors?: Array<{
    field: string
    message: string
  }>
}

// 厂商API服务类
class VendorApiService {
  private baseURL = '/vendors'

  /**
   * 获取厂商列表
   */
  async getVendors(params?: VendorListParams): Promise<VendorListResponse> {
    const response = await request.get(this.baseURL, { params })
    return response.data
  }

  /**
   * 获取厂商详情
   */
  async getVendor(id: number): Promise<VendorDetailResponse> {
    const response = await request.get(`${this.baseURL}/${id}`)
    return response.data
  }

  /**
   * 创建厂商
   */
  async createVendor(vendor: VendorCreateRequest): Promise<Vendor> {
    const response = await request.post(this.baseURL, vendor)
    return response.data
  }

  /**
   * 更新厂商
   */
  async updateVendor(id: number, vendor: VendorUpdateRequest): Promise<Vendor> {
    const response = await request.put(`${this.baseURL}/${id}`, vendor)
    return response.data
  }

  /**
   * 删除厂商
   */
  async deleteVendor(id: number): Promise<void> {
    await request.delete(`${this.baseURL}/${id}`)
  }

  /**
   * 切换厂商状态
   */
  async toggleVendorStatus(id: number): Promise<Vendor> {
    const response = await request.patch(`${this.baseURL}/${id}/toggle-status`)
    return response.data
  }
}

// 导出单例
export const vendorApi = new VendorApiService()
export default vendorApi 
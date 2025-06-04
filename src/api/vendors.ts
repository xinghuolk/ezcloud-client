import axios from 'axios'

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
  private baseURL = '/api/v1/vendors'

  /**
   * 获取厂商列表
   */
  async getVendors(params?: VendorListParams): Promise<VendorListResponse> {
    const response = await axios.get<ApiResponse<VendorListResponse>>(this.baseURL, {
      params
    })
    
    if (!response.data.success) {
      throw new Error(response.data.message || '获取厂商列表失败')
    }
    
    return response.data.data!
  }

  /**
   * 获取厂商详情
   */
  async getVendor(id: number): Promise<VendorDetailResponse> {
    const response = await axios.get<ApiResponse<VendorDetailResponse>>(`${this.baseURL}/${id}`)
    
    if (!response.data.success) {
      throw new Error(response.data.message || '获取厂商详情失败')
    }
    
    return response.data.data!
  }

  /**
   * 创建厂商
   */
  async createVendor(vendor: VendorCreateRequest): Promise<Vendor> {
    const response = await axios.post<ApiResponse<Vendor>>(this.baseURL, vendor)
    
    if (!response.data.success) {
      throw new Error(response.data.message || '创建厂商失败')
    }
    
    return response.data.data!
  }

  /**
   * 更新厂商
   */
  async updateVendor(id: number, vendor: VendorUpdateRequest): Promise<Vendor> {
    const response = await axios.put<ApiResponse<Vendor>>(`${this.baseURL}/${id}`, vendor)
    
    if (!response.data.success) {
      throw new Error(response.data.message || '更新厂商失败')
    }
    
    return response.data.data!
  }

  /**
   * 删除厂商
   */
  async deleteVendor(id: number): Promise<void> {
    const response = await axios.delete<ApiResponse>(`${this.baseURL}/${id}`)
    
    if (!response.data.success) {
      throw new Error(response.data.message || '删除厂商失败')
    }
  }

  /**
   * 切换厂商状态
   */
  async toggleVendorStatus(id: number): Promise<Vendor> {
    const response = await axios.patch<ApiResponse<Vendor>>(`${this.baseURL}/${id}/toggle-status`)
    
    if (!response.data.success) {
      throw new Error(response.data.message || '切换厂商状态失败')
    }
    
    return response.data.data!
  }
}

// 导出单例
export const vendorApi = new VendorApiService()
export default vendorApi 
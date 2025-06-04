import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { 
  Vendor, 
  VendorCreateRequest, 
  VendorUpdateRequest, 
  VendorListParams,
  VendorDetailResponse 
} from '@/api/vendors'
import { vendorApi } from '@/api/vendors'

export const useVendorStore = defineStore('vendors', () => {
  // 状态
  const vendors = ref<Vendor[]>([])
  const currentVendor = ref<VendorDetailResponse | null>(null)
  const loading = ref(false)
  const pagination = ref({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  })

  // Getters
  const activeVendors = computed(() => 
    vendors.value.filter(vendor => vendor.is_active)
  )

  const inactiveVendors = computed(() => 
    vendors.value.filter(vendor => !vendor.is_active)
  )

  const totalVendors = computed(() => pagination.value.total)

  // Actions

  /**
   * 获取厂商列表
   */
  const fetchVendors = async (params?: VendorListParams) => {
    try {
      loading.value = true
      const response = await vendorApi.getVendors(params)
      
      vendors.value = response.vendors
      pagination.value = response.pagination
      
      return response
    } catch (error: any) {
      ElMessage.error(error.message || '获取厂商列表失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取厂商详情
   */
  const fetchVendor = async (id: number) => {
    try {
      loading.value = true
      const vendor = await vendorApi.getVendor(id)
      currentVendor.value = vendor
      return vendor
    } catch (error: any) {
      ElMessage.error(error.message || '获取厂商详情失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 创建厂商
   */
  const createVendor = async (vendorData: VendorCreateRequest) => {
    try {
      loading.value = true
      const newVendor = await vendorApi.createVendor(vendorData)
      
      // 添加到列表开头
      vendors.value.unshift(newVendor)
      pagination.value.total += 1
      
      ElMessage.success('厂商创建成功')
      return newVendor
    } catch (error: any) {
      ElMessage.error(error.message || '创建厂商失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新厂商
   */
  const updateVendor = async (id: number, vendorData: VendorUpdateRequest) => {
    try {
      loading.value = true
      const updatedVendor = await vendorApi.updateVendor(id, vendorData)
      
      // 更新列表中的厂商
      const index = vendors.value.findIndex(v => v.id === id)
      if (index !== -1) {
        vendors.value[index] = updatedVendor
      }
      
      // 更新当前厂商
      if (currentVendor.value && currentVendor.value.id === id) {
        currentVendor.value = { ...currentVendor.value, ...updatedVendor }
      }
      
      ElMessage.success('厂商更新成功')
      return updatedVendor
    } catch (error: any) {
      ElMessage.error(error.message || '更新厂商失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 删除厂商
   */
  const deleteVendor = async (id: number, vendorName?: string) => {
    try {
      await ElMessageBox.confirm(
        `确定要删除厂商 "${vendorName || '未知'}" 吗？删除后无法恢复。`,
        '确认删除',
        {
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
          type: 'warning',
          confirmButtonClass: 'el-button--danger'
        }
      )

      loading.value = true
      await vendorApi.deleteVendor(id)
      
      // 从列表中移除
      const index = vendors.value.findIndex(v => v.id === id)
      if (index !== -1) {
        vendors.value.splice(index, 1)
        pagination.value.total -= 1
      }
      
      // 清除当前厂商
      if (currentVendor.value && currentVendor.value.id === id) {
        currentVendor.value = null
      }
      
      ElMessage.success('厂商删除成功')
    } catch (error: any) {
      if (error.message !== 'cancel') {
        ElMessage.error(error.message || '删除厂商失败')
      }
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 切换厂商状态
   */
  const toggleVendorStatus = async (id: number) => {
    try {
      loading.value = true
      const updatedVendor = await vendorApi.toggleVendorStatus(id)
      
      // 更新列表中的厂商
      const index = vendors.value.findIndex(v => v.id === id)
      if (index !== -1) {
        vendors.value[index] = updatedVendor
      }
      
      // 更新当前厂商
      if (currentVendor.value && currentVendor.value.id === id) {
        currentVendor.value = { ...currentVendor.value, ...updatedVendor }
      }
      
      ElMessage.success(`厂商${updatedVendor.is_active ? '启用' : '禁用'}成功`)
      return updatedVendor
    } catch (error: any) {
      ElMessage.error(error.message || '切换厂商状态失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 搜索厂商
   */
  const searchVendors = async (searchParams: VendorListParams) => {
    return await fetchVendors(searchParams)
  }

  /**
   * 重置状态
   */
  const resetState = () => {
    vendors.value = []
    currentVendor.value = null
    loading.value = false
    pagination.value = {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0
    }
  }

  /**
   * 分页变更
   */
  const changePage = async (page: number, searchParams?: VendorListParams) => {
    const params = {
      ...searchParams,
      page,
      limit: pagination.value.limit
    }
    return await fetchVendors(params)
  }

  /**
   * 每页大小变更
   */
  const changePageSize = async (limit: number, searchParams?: VendorListParams) => {
    const params = {
      ...searchParams,
      page: 1,
      limit
    }
    return await fetchVendors(params)
  }

  return {
    // 状态
    vendors,
    currentVendor,
    loading,
    pagination,

    // Getters
    activeVendors,
    inactiveVendors,
    totalVendors,

    // Actions
    fetchVendors,
    fetchVendor,
    createVendor,
    updateVendor,
    deleteVendor,
    toggleVendorStatus,
    searchVendors,
    resetState,
    changePage,
    changePageSize
  }
}) 
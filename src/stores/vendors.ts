import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Vendor, CreateVendorParams } from '/@src/api/types'
import { vendorApi } from '/@src/api'
import { notyf } from '/@src/api/request'

export const useVendorStore = defineStore('vendors', () => {
  // State
  const vendors = ref<Vendor[]>([])
  const currentVendor = ref<Vendor | null>(null)
  const loading = ref(false)
  const pagination = ref({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  // Getters
  const activeVendors = computed(() => 
    vendors.value.filter(vendor => vendor.is_active)
  )

  const inactiveVendors = computed(() => 
    vendors.value.filter(vendor => !vendor.is_active)
  )

  const vendorCount = computed(() => vendors.value.length)

  // Actions
  const fetchVendors = async (params?: { 
    page?: number
    limit?: number
    search?: string 
  }) => {
    loading.value = true
    try {
      const response = await vendorApi.getVendors(params)
      if (response.success) {
        vendors.value = response.data.vendors || []
        pagination.value = {
          page: response.data.pagination?.page || 1,
          limit: response.data.pagination?.limit || 20,
          total: response.data.pagination?.total || 0,
          totalPages: response.data.pagination?.totalPages || 0
        }
      } else {
        // axios拦截器已处理错误提示
      }
    } catch (error) {
      console.error('Failed to fetch vendors:', error)
      // axios拦截器已处理错误提示
    } finally {
      loading.value = false
    }
  }

  const fetchVendor = async (id: number) => {
    try {
      const response = await vendorApi.getVendor(id)
      if (response.success) {
        currentVendor.value = response.data
        return response.data
      } else {
        // axios拦截器已处理错误提示
        return null
      }
    } catch (error) {
      console.error('Failed to fetch vendor details:', error)
      // axios拦截器已处理错误提示
      return null
    }
  }

  const createVendor = async (vendorData: CreateVendorParams) => {
    try {
      const response = await vendorApi.createVendor(vendorData)
      if (response.success) {
        // Add to the beginning of list
        vendors.value.unshift(response.data)
        pagination.value.total += 1
        notyf.success('Vendor created successfully')
        return response.data
      } else {
        // axios拦截器已处理错误提示，这里不重复显示
        return null
      }
    } catch (error) {
      console.error('Failed to create vendor:', error)
      // axios拦截器已处理错误提示，这里不重复显示
      return null
    }
  }

  const updateVendor = async (id: number, vendorData: Partial<CreateVendorParams>) => {
    try {
      const response = await vendorApi.updateVendor(id, vendorData)
      if (response.success) {
        // Update vendor in list
        const index = vendors.value.findIndex(v => v.id === id)
        if (index !== -1) {
          vendors.value[index] = response.data
        }
        
        // Update current vendor
        if (currentVendor.value && currentVendor.value.id === id) {
          currentVendor.value = response.data
        }
        
        notyf.success('Vendor updated successfully')
        return response.data
      } else {
        // axios拦截器已处理错误提示，这里不重复显示
        return null
      }
    } catch (error) {
      console.error('Failed to update vendor:', error)
      // axios拦截器已处理错误提示，这里不重复显示
      return null
    }
  }

  const deleteVendor = async (id: number) => {
    try {
      const response = await vendorApi.deleteVendor(id)
      if (response.success) {
        // Remove from list
        const index = vendors.value.findIndex(v => v.id === id)
        if (index !== -1) {
          vendors.value.splice(index, 1)
          pagination.value.total -= 1
        }
        
        // Clear current vendor if it's the deleted one
        if (currentVendor.value && currentVendor.value.id === id) {
          currentVendor.value = null
        }
        
        notyf.success('Vendor deleted successfully')
        return true
      } else {
        // axios拦截器已处理错误提示，这里不重复显示
        return false
      }
    } catch (error) {
      console.error('Failed to delete vendor:', error)
      // axios拦截器已处理错误提示，这里不重复显示
      return false
    }
  }

  const fetchAllActiveVendors = async () => {
    try {
      const response = await vendorApi.getAllActiveVendors()
      if (response.success) {
        return response.data
      } else {
        // axios拦截器已处理错误提示
        return []
      }
    } catch (error) {
      console.error('Failed to fetch active vendors:', error)
      // axios拦截器已处理错误提示
      return []
    }
  }

  const clearVendors = () => {
    vendors.value = []
    currentVendor.value = null
    pagination.value = {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0
    }
  }

  const setCurrentVendor = (vendor: Vendor | null) => {
    currentVendor.value = vendor
  }

  return {
    // State
    vendors,
    currentVendor,
    loading,
    pagination,

    // Getters
    activeVendors,
    inactiveVendors,
    vendorCount,

    // Actions
    fetchVendors,
    fetchVendor,
    createVendor,
    updateVendor,
    deleteVendor,
    fetchAllActiveVendors,
    clearVendors,
    setCurrentVendor
  }
})
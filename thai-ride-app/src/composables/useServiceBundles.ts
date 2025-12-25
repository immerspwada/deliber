/**
 * useServiceBundles - Service Bundles Composable
 * 
 * Feature: Service Bundles - Book multiple services at once with discount
 * Example: Moving + Laundry, Ride + Shopping
 * 
 * @syncs-with
 * - Admin: useAdmin.ts (view/manage bundles)
 * - Database: Realtime subscription on service_bundles
 * - Notifications: Push notification on bundle status changes
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

export interface BundleService {
  type: 'ride' | 'delivery' | 'shopping' | 'queue' | 'moving' | 'laundry'
  request_id: string
  status?: string
  estimated_price?: number
}

export interface ServiceBundle {
  id: string
  bundle_uid: string
  user_id: string
  name: string
  description: string | null
  services: BundleService[]
  total_estimated_price: number
  total_final_price: number | null
  bundle_discount: number
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'partial'
  all_services_matched: boolean
  all_services_completed: boolean
  completed_services_count: number
  total_services_count: number
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface BundleTemplate {
  id: string
  name: string
  name_th: string
  description: string | null
  description_th: string | null
  service_types: string[]
  discount_percentage: number
  icon: string | null
  color: string
  is_popular: boolean
  display_order: number
}

export function useServiceBundles() {
  const authStore = useAuthStore()
  const bundles = ref<ServiceBundle[]>([])
  const templates = ref<BundleTemplate[]>([])
  const currentBundle = ref<ServiceBundle | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Fetch bundle templates
  const fetchTemplates = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('bundle_templates')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      if (fetchError) throw fetchError
      templates.value = data || []
      return templates.value
    } catch (err: any) {
      console.error('Error fetching bundle templates:', err)
      error.value = err.message
      return []
    }
  }

  // Calculate bundle discount
  const calculateDiscount = (serviceTypes: string[], totalPrice: number): number => {
    const template = templates.value.find(t => 
      t.service_types.length === serviceTypes.length &&
      t.service_types.every(type => serviceTypes.includes(type))
    )
    
    const discountPercentage = template?.discount_percentage || 10
    return Math.round((totalPrice * discountPercentage / 100) * 100) / 100
  }

  // Create service bundle
  const createBundle = async (params: {
    name: string
    services: BundleService[]
    totalEstimatedPrice: number
  }) => {
    if (!authStore.user?.id) {
      error.value = 'กรุณาเข้าสู่ระบบก่อนใช้งาน'
      return null
    }

    if (params.services.length < 2) {
      error.value = 'ต้องเลือกบริการอย่างน้อย 2 รายการ'
      return null
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: createError } = await supabase.rpc('create_service_bundle', {
        p_user_id: authStore.user.id,
        p_name: params.name,
        p_services: params.services,
        p_total_estimated_price: params.totalEstimatedPrice
      })

      if (createError) throw createError

      // Fetch the created bundle
      const { data: bundle, error: fetchError } = await supabase
        .from('service_bundles')
        .select('*')
        .eq('id', data)
        .single()

      if (fetchError) throw fetchError

      currentBundle.value = bundle
      return bundle
    } catch (err: any) {
      console.error('Error creating bundle:', err)
      error.value = err.message || 'เกิดข้อผิดพลาดในการสร้างแพ็คเกจ'
      return null
    } finally {
      loading.value = false
    }
  }

  // Fetch user's bundles
  const fetchBundles = async (limit = 20) => {
    if (!authStore.user?.id) {
      bundles.value = []
      return []
    }

    loading.value = true
    try {
      const { data, error: fetchError } = await supabase
        .from('service_bundles')
        .select('*')
        .eq('user_id', authStore.user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (fetchError) throw fetchError
      bundles.value = data || []
      return bundles.value
    } catch (err: any) {
      console.error('Error fetching bundles:', err)
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  // Get bundle by ID
  const getBundleById = async (bundleId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('service_bundles')
        .select('*')
        .eq('id', bundleId)
        .single()

      if (fetchError) throw fetchError
      return data
    } catch (err: any) {
      console.error('Error fetching bundle:', err)
      return null
    }
  }

  // Get bundle by UID
  const getBundleByUid = async (bundleUid: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('service_bundles')
        .select('*')
        .eq('bundle_uid', bundleUid)
        .single()

      if (fetchError) throw fetchError
      return data
    } catch (err: any) {
      console.error('Error fetching bundle:', err)
      return null
    }
  }

  // Cancel bundle
  const cancelBundle = async (bundleId: string) => {
    loading.value = true
    try {
      const { error: updateError } = await supabase
        .from('service_bundles')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', bundleId)
        .eq('user_id', authStore.user?.id || '')

      if (updateError) throw updateError
      return true
    } catch (err: any) {
      console.error('Error cancelling bundle:', err)
      error.value = err.message
      return false
    } finally {
      loading.value = false
    }
  }

  // Subscribe to bundle updates
  const subscribeToBundle = (bundleId: string, callback: (bundle: ServiceBundle) => void) => {
    const channel = supabase
      .channel(`bundle:${bundleId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'service_bundles',
          filter: `id=eq.${bundleId}`
        },
        (payload) => {
          const updated = payload.new as ServiceBundle
          currentBundle.value = updated
          callback(updated)
        }
      )
      .subscribe()

    return {
      unsubscribe: () => channel.unsubscribe()
    }
  }

  // Format status
  const formatStatus = (status: string): string => {
    const statuses: Record<string, string> = {
      pending: 'รอดำเนินการ',
      active: 'กำลังดำเนินการ',
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิก',
      partial: 'เสร็จบางส่วน'
    }
    return statuses[status] || status
  }

  // Get status color
  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      pending: '#F59E0B',
      active: '#3B82F6',
      completed: '#10B981',
      cancelled: '#EF4444',
      partial: '#8B5CF6'
    }
    return colors[status] || '#6B7280'
  }

  // Calculate savings
  const calculateSavings = (bundle: ServiceBundle): number => {
    return bundle.bundle_discount
  }

  // Get progress percentage
  const getProgress = (bundle: ServiceBundle): number => {
    if (bundle.total_services_count === 0) return 0
    return Math.round((bundle.completed_services_count / bundle.total_services_count) * 100)
  }

  // Clear error
  const clearError = () => {
    error.value = null
  }

  return {
    bundles,
    templates,
    currentBundle,
    loading,
    error,
    fetchTemplates,
    calculateDiscount,
    createBundle,
    fetchBundles,
    getBundleById,
    getBundleByUid,
    cancelBundle,
    subscribeToBundle,
    formatStatus,
    getStatusColor,
    calculateSavings,
    getProgress,
    clearError
  }
}

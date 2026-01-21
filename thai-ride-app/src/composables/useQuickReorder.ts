/**
 * useQuickReorder - Quick Reorder System
 * Feature: F254 - Quick Reorder / Repeat Last Order
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { useToast } from './useToast'

export interface ReorderableItem {
  id: string
  service_type: 'ride' | 'delivery' | 'shopping' | 'queue' | 'moving' | 'laundry'
  from_location: string
  to_location: string
  completed_at: string
  reorder_count: number
  can_reorder: boolean
}

export const useQuickReorder = () => {
  const authStore = useAuthStore()
  const { showSuccess, showError, showInfo } = useToast()
  
  const reorderableItems = ref<ReorderableItem[]>([])
  const loading = ref(false)
  const reordering = ref(false)
  
  const hasReorderableItems = computed(() => reorderableItems.value.length > 0)
  const mostRecentItem = computed(() => reorderableItems.value[0] || null)
  
  const fetchReorderableItems = async (limit = 5) => {
    if (!authStore.user?.id) return
    loading.value = true
    try {
      const { data, error } = await supabase.rpc('get_reorderable_items', {
        p_user_id: authStore.user.id,
        p_limit: limit
      })
      if (error) throw error
      reorderableItems.value = data || []
    } catch (err) {
      console.error('Error fetching reorderable items:', err)
    } finally {
      loading.value = false
    }
  }
  
  const quickReorderRide = async (originalRideId: string, method = 'quick_button') => {
    if (!authStore.user?.id) {
      showError('กรุณาเข้าสู่ระบบ')
      return null
    }
    reordering.value = true
    try {
      const { data, error } = await supabase.rpc('quick_reorder_ride', {
        p_original_ride_id: originalRideId,
        p_reorder_method: method
      })
      if (error) throw error
      showSuccess('สั่งรถซ้ำเรียบร้อย! 🚗')
      await fetchReorderableItems()
      return data as string
    } catch (err: any) {
      console.error('Error reordering ride:', err)
      showError(err.message || 'ไม่สามารถสั่งซ้ำได้')
      return null
    } finally {
      reordering.value = false
    }
  }
  
  const quickReorderDelivery = async (originalDeliveryId: string, method = 'quick_button') => {
    if (!authStore.user?.id) {
      showError('กรุณาเข้าสู่ระบบ')
      return null
    }
    reordering.value = true
    try {
      const { data, error } = await supabase.rpc('quick_reorder_delivery', {
        p_original_delivery_id: originalDeliveryId,
        p_reorder_method: method
      })
      if (error) throw error
      showSuccess('สั่งส่งของซ้ำเรียบร้อย! 📦')
      await fetchReorderableItems()
      return data as string
    } catch (err: any) {
      console.error('Error reordering delivery:', err)
      showError(err.message || 'ไม่สามารถสั่งซ้ำได้')
      return null
    } finally {
      reordering.value = false
    }
  }
  
  const quickReorder = async (item: ReorderableItem, method = 'quick_button') => {
    switch (item.service_type) {
      case 'ride':
        return await quickReorderRide(item.id, method)
      case 'delivery':
        return await quickReorderDelivery(item.id, method)
      default:
        showInfo(`การสั่งซ้ำสำหรับ ${item.service_type} กำลังพัฒนา`)
        return null
    }
  }
  
  const getServiceIcon = (serviceType: string) => {
    const icons: Record<string, string> = {
      ride: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
      delivery: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
    }
    return icons[serviceType] || icons.ride
  }
  
  const getServiceLabel = (serviceType: string) => {
    const labels: Record<string, string> = {
      ride: 'เรียกรถ',
      delivery: 'ส่งของ',
      shopping: 'ซื้อของ',
      queue: 'จองคิว'
    }
    return labels[serviceType] || serviceType
  }
  
  const getServiceColor = (serviceType: string) => {
    const colors: Record<string, string> = {
      ride: '#00A86B',
      delivery: '#F5A623',
      shopping: '#E53935',
      queue: '#9C27B0'
    }
    return colors[serviceType] || '#00A86B'
  }
  
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`
    if (diffDays === 1) return 'เมื่อวาน'
    if (diffDays < 7) return `${diffDays} วันที่แล้ว`
    return `${Math.floor(diffDays / 7)} สัปดาห์ที่แล้ว`
  }
  
  return {
    reorderableItems,
    loading,
    reordering,
    hasReorderableItems,
    mostRecentItem,
    fetchReorderableItems,
    quickReorder,
    quickReorderRide,
    quickReorderDelivery,
    getServiceIcon,
    getServiceLabel,
    getServiceColor,
    formatTimeAgo
  }
}

// Default export for better compatibility
export default useQuickReorder

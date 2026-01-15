/**
 * useProviderService - Vue Composable wrapper for Provider Service
 * 
 * Provides reactive access to provider state with proper lifecycle management
 */

import { onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { providerService, type ProviderJob, type ServiceError } from '../services/providerService'

export interface UseProviderServiceOptions {
  autoInitialize?: boolean
  redirectOnAccept?: boolean
}

export function useProviderService(options: UseProviderServiceOptions = {}) {
  const { autoInitialize = true, redirectOnAccept = true } = options
  const router = useRouter()
  
  // =====================================================
  // Actions with UX enhancements
  // =====================================================
  
  async function acceptJobWithRedirect(jobId: string): Promise<boolean> {
    const result = await providerService.acceptJob(jobId)
    
    if (result.success && result.job && redirectOnAccept) {
      const timestamp = Date.now()
      router.push(`/provider/job/${jobId}?status=matched&step=1-matched&timestamp=${timestamp}`)
    }
    
    return result.success
  }
  
  async function goOnline(): Promise<boolean> {
    if (providerService.isOnline.value) return true
    return await providerService.toggleOnlineStatus()
  }
  
  async function goOffline(): Promise<boolean> {
    if (!providerService.isOnline.value) return true
    return await providerService.toggleOnlineStatus()
  }
  
  async function refreshJobs(): Promise<void> {
    await providerService.loadAvailableJobs()
  }
  
  // =====================================================
  // Lifecycle
  // =====================================================
  
  onMounted(async () => {
    if (autoInitialize) {
      await providerService.initialize()
    }
  })
  
  onUnmounted(() => {
    // Don't cleanup on unmount - service is singleton
    // Only cleanup when explicitly logging out
  })
  
  // =====================================================
  // Helpers
  // =====================================================
  
  function formatDistance(km?: number): string {
    if (!km) return ''
    return km < 1 ? `${Math.round(km * 1000)} ม.` : `${km.toFixed(1)} กม.`
  }
  
  function formatTime(dateStr: string): string {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
    if (mins < 1) return 'ใหม่'
    if (mins < 60) return `${mins} นาที`
    return `${Math.floor(mins / 60)} ชม.`
  }
  
  function formatFare(amount: number): string {
    return `฿${amount.toLocaleString()}`
  }
  
  function getStatusText(status: ProviderJob['status']): string {
    const statusMap: Record<ProviderJob['status'], string> = {
      pending: 'รอรับงาน',
      matched: 'รับงานแล้ว',
      pickup: 'กำลังไปรับ',
      in_progress: 'กำลังเดินทาง',
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิก'
    }
    return statusMap[status] || status
  }
  
  function getStatusColor(status: ProviderJob['status']): string {
    const colorMap: Record<ProviderJob['status'], string> = {
      pending: 'text-yellow-600 bg-yellow-50',
      matched: 'text-blue-600 bg-blue-50',
      pickup: 'text-purple-600 bg-purple-50',
      in_progress: 'text-green-600 bg-green-50',
      completed: 'text-gray-600 bg-gray-50',
      cancelled: 'text-red-600 bg-red-50'
    }
    return colorMap[status] || 'text-gray-600 bg-gray-50'
  }
  
  function getErrorMessage(error: ServiceError | null): string {
    return error?.userMessage || ''
  }
  
  // =====================================================
  // Return
  // =====================================================
  
  return {
    // State
    profile: providerService.profile,
    availableJobs: providerService.availableJobs,
    currentJob: providerService.currentJob,
    location: providerService.location,
    loading: providerService.loading,
    error: providerService.error,
    connectionStatus: providerService.connectionStatus,
    
    // Computed
    isOnline: providerService.isOnline,
    isAvailable: providerService.isAvailable,
    isVerified: providerService.isVerified,
    canAcceptJobs: providerService.canAcceptJobs,
    hasCurrentJob: providerService.hasCurrentJob,
    jobCount: providerService.jobCount,
    
    // Actions
    initialize: providerService.initialize,
    loadProfile: providerService.loadProfile,
    toggleOnlineStatus: providerService.toggleOnlineStatus,
    loadAvailableJobs: providerService.loadAvailableJobs,
    acceptJob: providerService.acceptJob,
    acceptJobWithRedirect,
    updateJobStatus: providerService.updateJobStatus,
    loadCurrentJob: providerService.loadCurrentJob,
    goOnline,
    goOffline,
    refreshJobs,
    clearError: providerService.clearError,
    cleanup: providerService.cleanup,
    
    // Helpers
    formatDistance,
    formatTime,
    formatFare,
    getStatusText,
    getStatusColor,
    getErrorMessage
  }
}

export type { ProviderJob, ServiceError } from '../services/providerService'

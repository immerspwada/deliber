/**
 * Provider Components - Centralized Exports
 * 
 * All provider-facing components for dashboard, job management,
 * earnings tracking, and cross-role integration
 */

// Core Provider Components
export { default as ActiveRideView } from './ActiveRideView.vue'
export { default as DeliveryProofCapture } from './DeliveryProofCapture.vue'
export { default as EarningsCard } from './EarningsCard.vue'
export { default as EarningsChart } from './EarningsChart.vue'
export { default as OnlineToggle } from './OnlineToggle.vue'
export { default as PassengerRatingModal } from './PassengerRatingModal.vue'
export { default as PerformanceScoreCard } from './PerformanceScoreCard.vue'
export { default as ProviderOnboardingAlert } from './ProviderOnboardingAlert.vue'
export { default as ProviderSkeleton } from './ProviderSkeleton.vue'
export { default as RideRequestCard } from './RideRequestCard.vue'
export { default as SignatureCapture } from './SignatureCapture.vue'
export { default as TripProgressCard } from './TripProgressCard.vue'

// Cross-Role Integration Components (F174-F177)
export { default as CrossRoleStatusBar } from './CrossRoleStatusBar.vue'
export { default as JobNotificationToast } from './JobNotificationToast.vue'
export { default as LiveCustomerInfo } from './LiveCustomerInfo.vue'

// Re-export cross-role utilities for provider use
export { useCrossRoleEvents, CrossRoleEvents, eventBus } from '../../lib/crossRoleEventBus'
export { useCrossRoleSync } from '../../composables/useCrossRoleSync'

// Provider-specific utilities
export const providerUtils = {
  /**
   * Format earnings amount
   */
  formatEarnings: (amount: number): string => {
    return `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
  },

  /**
   * Format distance for provider
   */
  formatDistance: (km: number): string => {
    if (km < 1) {
      return `${Math.round(km * 1000)} ม.`
    }
    return `${km.toFixed(1)} กม.`
  },

  /**
   * Format duration for provider
   */
  formatDuration: (minutes: number): string => {
    if (minutes < 60) {
      return `${Math.round(minutes)} นาที`
    }
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return mins > 0 ? `${hours} ชม. ${mins} น.` : `${hours} ชม.`
  },

  /**
   * Get job status text in Thai
   */
  getJobStatusText: (status: string): string => {
    const statusMap: Record<string, string> = {
      pending: 'รอรับงาน',
      matched: 'รับงานแล้ว',
      arriving: 'กำลังไปรับ',
      arrived: 'ถึงจุดรับแล้ว',
      picked_up: 'รับผู้โดยสาร/ของแล้ว',
      in_progress: 'กำลังดำเนินการ',
      in_transit: 'กำลังเดินทาง',
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิก'
    }
    return statusMap[status] || status
  },

  /**
   * Get status color
   */
  getStatusColor: (status: string): string => {
    const colorMap: Record<string, string> = {
      pending: '#F5A623',
      matched: '#1976D2',
      arriving: '#1976D2',
      arrived: '#00A86B',
      picked_up: '#00A86B',
      in_progress: '#00A86B',
      in_transit: '#00A86B',
      completed: '#00A86B',
      cancelled: '#E53935'
    }
    return colorMap[status] || '#666666'
  },

  /**
   * Calculate estimated earnings from fare
   */
  calculateEarnings: (fare: number, platformFeePercent: number = 15): number => {
    return fare * (1 - platformFeePercent / 100)
  },

  /**
   * Format time ago
   */
  formatTimeAgo: (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'เมื่อสักครู่'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} นาทีที่แล้ว`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ชม.ที่แล้ว`
    return `${Math.floor(diffInSeconds / 86400)} วันที่แล้ว`
  },

  /**
   * Get service type display name
   */
  getServiceTypeName: (type: string): string => {
    const typeMap: Record<string, string> = {
      ride: 'เรียกรถ',
      delivery: 'ส่งของ',
      shopping: 'ซื้อของ',
      queue: 'จองคิว',
      moving: 'ขนย้าย',
      laundry: 'ซักผ้า'
    }
    return typeMap[type] || type
  },

  /**
   * Get service type icon name
   */
  getServiceTypeIcon: (type: string): string => {
    const iconMap: Record<string, string> = {
      ride: 'car',
      delivery: 'package',
      shopping: 'shopping-bag',
      queue: 'clock',
      moving: 'truck',
      laundry: 'shirt'
    }
    return iconMap[type] || 'circle'
  },

  /**
   * Check if job is urgent (created recently)
   */
  isUrgentJob: (createdAt: string, thresholdMinutes: number = 5): boolean => {
    const created = new Date(createdAt)
    const now = new Date()
    const diffMinutes = (now.getTime() - created.getTime()) / (1000 * 60)
    return diffMinutes <= thresholdMinutes
  },

  /**
   * Calculate distance between two coordinates
   */
  calculateDistance: (
    lat1: number, lng1: number,
    lat2: number, lng2: number
  ): number => {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }
}

// Color constants for provider UI
export const providerColors = {
  primary: '#00A86B',
  primaryHover: '#008F5B',
  primaryLight: '#E8F5EF',
  
  online: '#00A86B',
  offline: '#E53935',
  busy: '#F5A623',
  
  earnings: '#00A86B',
  bonus: '#9B59B6',
  tips: '#F5A623',
  
  text: {
    primary: '#1A1A1A',
    secondary: '#666666',
    muted: '#999999'
  },
  
  background: {
    primary: '#FFFFFF',
    secondary: '#F5F5F5',
    success: '#E8F5EF',
    warning: '#FFF8E1',
    error: '#FFEBEE'
  },
  
  border: {
    light: '#F0F0F0',
    default: '#E8E8E8'
  }
} as const

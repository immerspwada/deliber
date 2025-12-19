/**
 * Customer Components - Enhanced UX Components
 * 
 * Centralized exports for all customer-facing enhanced components
 * Features: haptic feedback, progressive loading, micro-interactions
 */

// Core Enhanced Components
export { default as ProgressiveLoadingOverlay } from './ProgressiveLoadingOverlay.vue'
export { default as EnhancedServiceCard } from './EnhancedServiceCard.vue'
export { default as PullToRefresh } from './PullToRefresh.vue'
export { default as EmptyState } from './EmptyState.vue'

// Cute Customer Components (New)
export { default as WelcomeHeader } from './WelcomeHeader.vue'
export { default as QuickDestinationSearch } from './QuickDestinationSearch.vue'
export { default as CuteServiceGrid } from './CuteServiceGrid.vue'
export { default as ActiveOrderCard } from './ActiveOrderCard.vue'
export { default as SavedPlacesRow } from './SavedPlacesRow.vue'
export { default as QuickShortcuts } from './QuickShortcuts.vue'
export { default as PromoBanner } from './PromoBanner.vue'
export { default as RecentDestinations } from './RecentDestinations.vue'
export { default as ProviderCTA } from './ProviderCTA.vue'
export { default as BottomNavigation } from './BottomNavigation.vue'
export { default as LoyaltyCard } from './LoyaltyCard.vue'
export { default as FloatingActionButton } from './FloatingActionButton.vue'
export { default as ChatWidget } from './ChatWidget.vue'

// Re-export composables for convenience
export { useHapticFeedback } from '../../composables/useHapticFeedback'

// Type exports
export type { HapticType } from '../../composables/useHapticFeedback'

// Utility functions
export const customerUtils = {
  /**
   * Format Thai phone number
   */
  formatThaiPhone: (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
  },

  /**
   * Format currency for Thai Baht
   */
  formatCurrency: (amount: number): string => {
    return `฿${amount.toLocaleString('th-TH')}`
  },

  /**
   * Format distance
   */
  formatDistance: (km: number): string => {
    if (km < 1) {
      return `${Math.round(km * 1000)} ม.`
    }
    return `${km.toFixed(1)} กม.`
  },

  /**
   * Format duration
   */
  formatDuration: (minutes: number): string => {
    if (minutes < 60) {
      return `${Math.round(minutes)} นาที`
    }
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return mins > 0 ? `${hours} ชม. ${mins} นาที` : `${hours} ชั่วโมง`
  },

  /**
   * Format relative time
   */
  formatRelativeTime: (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - d.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'เมื่อสักครู่'
    if (diffInMinutes < 60) return `${diffInMinutes} นาทีที่แล้ว`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours} ชั่วโมงที่แล้ว`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays} วันที่แล้ว`
    
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
  },

  /**
   * Get greeting based on time of day
   */
  getGreeting: (): string => {
    const hour = new Date().getHours()
    if (hour < 12) return 'สวัสดีตอนเช้า'
    if (hour < 17) return 'สวัสดีตอนบ่าย'
    return 'สวัสดีตอนเย็น'
  },

  /**
   * Get status color
   */
  getStatusColor: (status: string): string => {
    const colorMap: Record<string, string> = {
      pending: '#F5A623',
      matched: '#00A86B',
      arrived: '#1976D2',
      in_progress: '#00A86B',
      completed: '#00A86B',
      cancelled: '#E53935',
      error: '#E53935'
    }
    return colorMap[status] || '#666666'
  },

  /**
   * Get status text in Thai
   */
  getStatusText: (type: string, status: string): string => {
    const statusMap: Record<string, Record<string, string>> = {
      ride: {
        pending: 'กำลังหาคนขับ',
        matched: 'คนขับกำลังมา',
        arrived: 'คนขับถึงแล้ว',
        in_progress: 'กำลังเดินทาง',
        completed: 'เสร็จสิ้น',
        cancelled: 'ยกเลิกแล้ว'
      },
      delivery: {
        pending: 'กำลังหาไรเดอร์',
        matched: 'ไรเดอร์กำลังมารับ',
        picked_up: 'รับของแล้ว',
        in_transit: 'กำลังจัดส่ง',
        delivered: 'ส่งแล้ว',
        cancelled: 'ยกเลิกแล้ว'
      },
      shopping: {
        pending: 'กำลังหาคนซื้อ',
        matched: 'กำลังซื้อของ',
        purchased: 'ซื้อเสร็จแล้ว',
        delivering: 'กำลังจัดส่ง',
        delivered: 'ส่งแล้ว',
        cancelled: 'ยกเลิกแล้ว'
      }
    }
    return statusMap[type]?.[status] || status
  },

  /**
   * Truncate text with ellipsis
   */
  truncateText: (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  },

  /**
   * Debounce function
   */
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: ReturnType<typeof setTimeout>
    return (...args: Parameters<T>) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }
  }
}

// Color constants
export const customerColors = {
  primary: '#00A86B',
  primaryHover: '#008F5B',
  primaryLight: '#E8F5EF',
  
  success: '#00A86B',
  warning: '#F5A623',
  error: '#E53935',
  info: '#1976D2',
  
  pickup: '#00A86B',
  destination: '#E53935',
  
  text: {
    primary: '#1A1A1A',
    secondary: '#666666',
    muted: '#999999'
  },
  
  background: {
    primary: '#FFFFFF',
    secondary: '#F5F5F5',
    muted: '#FAFAFA'
  },
  
  border: {
    light: '#F0F0F0',
    default: '#E8E8E8'
  }
} as const

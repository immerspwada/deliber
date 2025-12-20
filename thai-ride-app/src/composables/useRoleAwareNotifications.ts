/**
 * useRoleAwareNotifications - Cross-Role Notification System
 * Feature: F176 - Role-Aware Notifications
 * 
 * ระบบแจ้งเตือนที่ปรับตาม Role พร้อม templates
 * - Customer: รับแจ้งเตือนสถานะ request, provider location, payment
 * - Provider: รับแจ้งเตือนงานใหม่, customer updates, earnings
 * - Admin: รับแจ้งเตือน alerts, system events, monitoring
 * 
 * @syncs-with
 * - crossRoleEventBus.ts (F174) - Event communication
 * - useCrossRoleSync.ts (F175) - Real-time sync
 * - useSoundNotification.ts - Sound alerts
 * - usePushNotifications.ts - Push notifications
 * 
 * Tables: user_notifications, notification_delivery_log
 * Migration: 062_notification_system_v2.sql
 */

import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { 
  eventBus, 
  useCrossRoleEvents,
  type UserRole,
  type CrossRoleEvent,
  type CrossRoleEventType
} from '@/lib/crossRoleEventBus'
import { useSoundNotification, type SoundType } from './useSoundNotification'
import { useAuthStore } from '@/stores/auth'
import type { ServiceType } from '@/lib/serviceRegistry'

// =====================================================
// Types & Interfaces
// =====================================================

/**
 * Notification types supported by the system
 */
export type NotificationType =
  // Request lifecycle
  | 'request_created'
  | 'request_matched'
  | 'request_completed'
  | 'request_cancelled'
  // Provider events
  | 'provider_assigned'
  | 'provider_arrived'
  | 'provider_location_updated'
  | 'provider_online'
  | 'provider_offline'
  // Payment events
  | 'payment_completed'
  | 'payment_failed'
  | 'refund_issued'
  // Rating events
  | 'rating_received'
  | 'rating_reminder'
  // Admin events
  | 'admin_alert'
  | 'admin_action_required'
  // System events
  | 'system_notification'
  | 'system_maintenance'
  | 'system_update'

/**
 * Notification priority levels
 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

/**
 * Notification action button
 */
export interface NotificationAction {
  id: string
  label: string
  labelTh: string
  url?: string
  action?: string
  style?: 'primary' | 'secondary' | 'danger'
}

/**
 * Notification template structure
 */
export interface NotificationTemplate {
  id: NotificationType
  titleEn: string
  titleTh: string
  messageEn: string
  messageTh: string
  icon: string
  sound: SoundType
  priority: NotificationPriority
  actions?: NotificationAction[]
  roles: UserRole[]
  category: string
}

/**
 * Notification data payload
 */
export interface NotificationData {
  requestId?: string
  trackingId?: string
  serviceType?: ServiceType
  providerId?: string
  providerName?: string
  customerId?: string
  customerName?: string
  amount?: number
  rating?: number
  reason?: string
  eta?: number
  [key: string]: any
}

/**
 * Notification object
 */
export interface RoleAwareNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  icon: string
  priority: NotificationPriority
  data: NotificationData
  actions: NotificationAction[]
  isRead: boolean
  createdAt: string
  expiresAt?: string
}

/**
 * Send notification options
 */
export interface SendNotificationOptions {
  playSound?: boolean
  showPush?: boolean
  vibrate?: boolean
  persist?: boolean
}

// =====================================================
// Notification Templates
// =====================================================

/**
 * Notification templates for all event types
 * Templates are role-aware and support Thai/English
 */
const notificationTemplates: Record<NotificationType, NotificationTemplate> = {
  // Request Lifecycle
  request_created: {
    id: 'request_created',
    titleEn: 'New Request',
    titleTh: 'คำขอใหม่',
    messageEn: 'New {{serviceType}} request from {{customerName}}',
    messageTh: 'คำขอ{{serviceType}}ใหม่จาก {{customerName}}',
    icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6',
    sound: 'new_request',
    priority: 'high',
    roles: ['provider', 'admin'],
    category: 'ride_updates',
    actions: [
      { id: 'accept', label: 'Accept', labelTh: 'รับงาน', action: 'accept_request', style: 'primary' },
      { id: 'decline', label: 'Decline', labelTh: 'ปฏิเสธ', action: 'decline_request', style: 'secondary' }
    ]
  },
  request_matched: {
    id: 'request_matched',
    titleEn: 'Driver Found',
    titleTh: 'พบคนขับแล้ว',
    messageEn: '{{providerName}} is on the way. ETA: {{eta}} mins',
    messageTh: '{{providerName}} กำลังมา ถึงใน {{eta}} นาที',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    sound: 'success',
    priority: 'high',
    roles: ['customer', 'admin'],
    category: 'ride_updates',
    actions: [
      { id: 'track', label: 'Track', labelTh: 'ติดตาม', url: '/tracking/{{requestId}}', style: 'primary' },
      { id: 'contact', label: 'Contact', labelTh: 'ติดต่อ', action: 'contact_provider', style: 'secondary' }
    ]
  },
  request_completed: {
    id: 'request_completed',
    titleEn: 'Trip Completed',
    titleTh: 'เสร็จสิ้นการเดินทาง',
    messageEn: 'Your trip has been completed. Total: ฿{{amount}}',
    messageTh: 'การเดินทางเสร็จสิ้น ยอดรวม: ฿{{amount}}',
    icon: 'M5 13l4 4L19 7',
    sound: 'complete',
    priority: 'normal',
    roles: ['customer', 'provider', 'admin'],
    category: 'ride_updates',
    actions: [
      { id: 'rate', label: 'Rate', labelTh: 'ให้คะแนน', url: '/rate/{{requestId}}', style: 'primary' },
      { id: 'receipt', label: 'Receipt', labelTh: 'ใบเสร็จ', url: '/receipt/{{requestId}}', style: 'secondary' }
    ]
  },
  request_cancelled: {
    id: 'request_cancelled',
    titleEn: 'Request Cancelled',
    titleTh: 'ยกเลิกคำขอ',
    messageEn: 'Your request has been cancelled. {{reason}}',
    messageTh: 'คำขอถูกยกเลิก {{reason}}',
    icon: 'M6 18L18 6M6 6l12 12',
    sound: 'cancel',
    priority: 'high',
    roles: ['customer', 'provider', 'admin'],
    category: 'ride_updates'
  },

  // Provider Events
  provider_assigned: {
    id: 'provider_assigned',
    titleEn: 'Job Assigned',
    titleTh: 'ได้รับงาน',
    messageEn: 'You have been assigned to {{customerName}}\'s request',
    messageTh: 'คุณได้รับงานจาก {{customerName}}',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    sound: 'accept',
    priority: 'high',
    roles: ['provider'],
    category: 'ride_updates',
    actions: [
      { id: 'navigate', label: 'Navigate', labelTh: 'นำทาง', action: 'start_navigation', style: 'primary' },
      { id: 'contact', label: 'Contact', labelTh: 'ติดต่อ', action: 'contact_customer', style: 'secondary' }
    ]
  },
  provider_arrived: {
    id: 'provider_arrived',
    titleEn: 'Driver Arrived',
    titleTh: 'คนขับถึงแล้ว',
    messageEn: '{{providerName}} has arrived at pickup location',
    messageTh: '{{providerName}} ถึงจุดรับแล้ว',
    icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z',
    sound: 'arrival',
    priority: 'high',
    roles: ['customer', 'admin'],
    category: 'ride_updates',
    actions: [
      { id: 'contact', label: 'Contact', labelTh: 'ติดต่อ', action: 'contact_provider', style: 'primary' }
    ]
  },
  provider_location_updated: {
    id: 'provider_location_updated',
    titleEn: 'Location Updated',
    titleTh: 'อัพเดทตำแหน่ง',
    messageEn: 'Driver location has been updated',
    messageTh: 'ตำแหน่งคนขับอัพเดทแล้ว',
    icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z',
    sound: 'status_change',
    priority: 'low',
    roles: ['customer'],
    category: 'ride_updates'
  },
  provider_online: {
    id: 'provider_online',
    titleEn: 'You are Online',
    titleTh: 'คุณออนไลน์แล้ว',
    messageEn: 'You are now online and can receive requests',
    messageTh: 'คุณออนไลน์แล้ว สามารถรับงานได้',
    icon: 'M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z',
    sound: 'success',
    priority: 'normal',
    roles: ['provider'],
    category: 'system'
  },
  provider_offline: {
    id: 'provider_offline',
    titleEn: 'You are Offline',
    titleTh: 'คุณออฟไลน์แล้ว',
    messageEn: 'You are now offline and will not receive requests',
    messageTh: 'คุณออฟไลน์แล้ว จะไม่ได้รับงานใหม่',
    icon: 'M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414',
    sound: 'status_change',
    priority: 'normal',
    roles: ['provider'],
    category: 'system'
  },

  // Payment Events
  payment_completed: {
    id: 'payment_completed',
    titleEn: 'Payment Successful',
    titleTh: 'ชำระเงินสำเร็จ',
    messageEn: 'Payment of ฿{{amount}} has been processed',
    messageTh: 'ชำระเงิน ฿{{amount}} สำเร็จแล้ว',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    sound: 'payment',
    priority: 'normal',
    roles: ['customer', 'provider', 'admin'],
    category: 'payment'
  },
  payment_failed: {
    id: 'payment_failed',
    titleEn: 'Payment Failed',
    titleTh: 'ชำระเงินไม่สำเร็จ',
    messageEn: 'Payment of ฿{{amount}} failed. {{reason}}',
    messageTh: 'ชำระเงิน ฿{{amount}} ไม่สำเร็จ {{reason}}',
    icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    sound: 'error',
    priority: 'high',
    roles: ['customer', 'admin'],
    category: 'payment',
    actions: [
      { id: 'retry', label: 'Retry', labelTh: 'ลองใหม่', action: 'retry_payment', style: 'primary' }
    ]
  },
  refund_issued: {
    id: 'refund_issued',
    titleEn: 'Refund Issued',
    titleTh: 'คืนเงินแล้ว',
    messageEn: 'Refund of ฿{{amount}} has been issued',
    messageTh: 'คืนเงิน ฿{{amount}} เรียบร้อยแล้ว',
    icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
    sound: 'success',
    priority: 'normal',
    roles: ['customer', 'admin'],
    category: 'payment'
  },

  // Rating Events
  rating_received: {
    id: 'rating_received',
    titleEn: 'New Rating',
    titleTh: 'ได้รับคะแนนใหม่',
    messageEn: 'You received a {{rating}}-star rating from {{customerName}}',
    messageTh: 'คุณได้รับ {{rating}} ดาวจาก {{customerName}}',
    icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
    sound: 'rating',
    priority: 'normal',
    roles: ['provider'],
    category: 'rewards'
  },
  rating_reminder: {
    id: 'rating_reminder',
    titleEn: 'Rate Your Trip',
    titleTh: 'ให้คะแนนการเดินทาง',
    messageEn: 'How was your trip with {{providerName}}?',
    messageTh: 'การเดินทางกับ {{providerName}} เป็นอย่างไรบ้าง?',
    icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
    sound: 'message',
    priority: 'normal',
    roles: ['customer'],
    category: 'rewards',
    actions: [
      { id: 'rate', label: 'Rate Now', labelTh: 'ให้คะแนน', url: '/rate/{{requestId}}', style: 'primary' }
    ]
  },

  // Admin Events
  admin_alert: {
    id: 'admin_alert',
    titleEn: 'Admin Alert',
    titleTh: 'แจ้งเตือนผู้ดูแล',
    messageEn: '{{message}}',
    messageTh: '{{message}}',
    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    sound: 'urgent',
    priority: 'urgent',
    roles: ['admin'],
    category: 'system'
  },
  admin_action_required: {
    id: 'admin_action_required',
    titleEn: 'Action Required',
    titleTh: 'ต้องดำเนินการ',
    messageEn: '{{message}}',
    messageTh: '{{message}}',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    sound: 'urgent',
    priority: 'high',
    roles: ['admin'],
    category: 'system',
    actions: [
      { id: 'view', label: 'View', labelTh: 'ดู', url: '{{actionUrl}}', style: 'primary' }
    ]
  },

  // System Events
  system_notification: {
    id: 'system_notification',
    titleEn: 'System Notification',
    titleTh: 'แจ้งเตือนจากระบบ',
    messageEn: '{{message}}',
    messageTh: '{{message}}',
    icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    sound: 'message',
    priority: 'normal',
    roles: ['customer', 'provider', 'admin'],
    category: 'system'
  },
  system_maintenance: {
    id: 'system_maintenance',
    titleEn: 'Scheduled Maintenance',
    titleTh: 'ปิดปรับปรุงระบบ',
    messageEn: 'System maintenance scheduled for {{scheduledTime}}',
    messageTh: 'ระบบจะปิดปรับปรุงเวลา {{scheduledTime}}',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
    sound: 'status_change',
    priority: 'high',
    roles: ['customer', 'provider', 'admin'],
    category: 'system'
  },
  system_update: {
    id: 'system_update',
    titleEn: 'App Update Available',
    titleTh: 'มีอัพเดทใหม่',
    messageEn: 'A new version of the app is available',
    messageTh: 'มีเวอร์ชันใหม่ของแอปพร้อมใช้งาน',
    icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
    sound: 'message',
    priority: 'low',
    roles: ['customer', 'provider'],
    category: 'system',
    actions: [
      { id: 'update', label: 'Update', labelTh: 'อัพเดท', action: 'update_app', style: 'primary' }
    ]
  }
}

// =====================================================
// Sound Mapping for Notification Types
// =====================================================

const soundMapping: Record<NotificationType, SoundType> = {
  request_created: 'new_request',
  request_matched: 'success',
  request_completed: 'complete',
  request_cancelled: 'cancel',
  provider_assigned: 'accept',
  provider_arrived: 'arrival',
  provider_location_updated: 'status_change',
  provider_online: 'success',
  provider_offline: 'status_change',
  payment_completed: 'payment',
  payment_failed: 'error',
  refund_issued: 'success',
  rating_received: 'rating',
  rating_reminder: 'message',
  admin_alert: 'urgent',
  admin_action_required: 'urgent',
  system_notification: 'message',
  system_maintenance: 'status_change',
  system_update: 'message'
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Parse template string with data
 * Replaces {{variable}} with actual values
 */
function parseTemplate(template: string, data: NotificationData): string {
  let result = template
  
  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g')
    result = result.replace(regex, value?.toString() || '')
  })
  
  // Clean up any remaining placeholders
  result = result.replace(/{{[^}]+}}/g, '')
  
  return result.trim()
}

/**
 * Parse action URL with data
 */
function parseActionUrl(url: string, data: NotificationData): string {
  return parseTemplate(url, data)
}

/**
 * Get service type display name in Thai
 */
function getServiceTypeNameTh(serviceType?: ServiceType): string {
  const names: Record<string, string> = {
    ride: 'เรียกรถ',
    delivery: 'ส่งของ',
    shopping: 'ซื้อของ',
    queue: 'จองคิว',
    moving: 'ขนย้าย',
    laundry: 'ซักผ้า'
  }
  return serviceType ? names[serviceType] || serviceType : ''
}

/**
 * Get service type display name in English
 */
function getServiceTypeNameEn(serviceType?: ServiceType): string {
  const names: Record<string, string> = {
    ride: 'Ride',
    delivery: 'Delivery',
    shopping: 'Shopping',
    queue: 'Queue',
    moving: 'Moving',
    laundry: 'Laundry'
  }
  return serviceType ? names[serviceType] || serviceType : ''
}

// =====================================================
// Main Composable
// =====================================================

/**
 * useRoleAwareNotifications Composable
 * 
 * Provides role-aware notification functionality for Customer, Provider, and Admin
 * Integrates with crossRoleEventBus, sound notifications, and push notifications
 */
export function useRoleAwareNotifications() {
  const authStore = useAuthStore()
  const { subscribe, emit, setContext } = useCrossRoleEvents()
  const { playSound, notify: soundNotify, haptic } = useSoundNotification()
  
  // State
  const notifications = ref<RoleAwareNotification[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const currentRole = ref<UserRole>('customer')
  const language = ref<'en' | 'th'>('th')
  const realtimeChannel = ref<RealtimeChannel | null>(null)
  
  // Computed
  const unreadCount = computed(() => 
    notifications.value.filter(n => !n.isRead).length
  )
  
  const unreadNotifications = computed(() =>
    notifications.value.filter(n => !n.isRead)
  )
  
  const recentNotifications = computed(() =>
    notifications.value.slice(0, 10)
  )

  // =====================================================
  // Core Functions
  // =====================================================

  /**
   * Initialize the notification system for a specific role
   * @param role - User role (customer, provider, admin)
   */
  async function initialize(role: UserRole): Promise<void> {
    currentRole.value = role
    
    if (authStore.user?.id) {
      setContext(role, authStore.user.id)
      await fetchNotifications()
      subscribeToRealtimeNotifications()
      subscribeToEventBusNotifications()
    }
  }

  /**
   * Get notification template based on type and role
   * @param type - Notification type
   * @param role - User role (optional, uses current role if not provided)
   * @returns Notification template or null if not found/not applicable
   */
  function getNotificationTemplate(
    type: NotificationType, 
    role?: UserRole
  ): NotificationTemplate | null {
    const template = notificationTemplates[type]
    if (!template) return null
    
    const targetRole = role || currentRole.value
    if (!template.roles.includes(targetRole)) return null
    
    return template
  }

  /**
   * Send notification to a specific role/user
   * @param role - Target role
   * @param userId - Target user ID
   * @param type - Notification type
   * @param data - Notification data
   * @param options - Send options
   */
  async function sendNotification(
    role: UserRole,
    userId: string,
    type: NotificationType,
    data: NotificationData,
    options: SendNotificationOptions = {}
  ): Promise<string | null> {
    const template = getNotificationTemplate(type, role)
    if (!template) {
      console.warn(`[Notification] Template not found for type: ${type}, role: ${role}`)
      return null
    }

    // Prepare data with service type names
    const enrichedData: NotificationData = {
      ...data,
      serviceType: data.serviceType,
      serviceTypeTh: getServiceTypeNameTh(data.serviceType),
      serviceTypeEn: getServiceTypeNameEn(data.serviceType)
    }

    // Parse title and message
    const title = language.value === 'th' 
      ? parseTemplate(template.titleTh, enrichedData)
      : parseTemplate(template.titleEn, enrichedData)
    
    const message = language.value === 'th'
      ? parseTemplate(template.messageTh, enrichedData)
      : parseTemplate(template.messageEn, enrichedData)

    // Parse actions
    const actions = (template.actions || []).map(action => ({
      ...action,
      url: action.url ? parseActionUrl(action.url, enrichedData) : undefined
    }))

    try {
      // Insert notification into database
      const { data: insertedData, error: insertError } = await supabase
        .from('user_notifications')
        .insert({
          user_id: userId,
          type: type,
          title: title,
          message: message,
          data: enrichedData,
          category_key: template.category,
          priority: template.priority,
          actions: actions,
          is_read: false
        })
        .select('id')
        .single()

      if (insertError) throw insertError

      // Emit event to event bus
      emit('system:realtime_connected' as CrossRoleEventType, {
        notificationId: insertedData?.id,
        type,
        userId,
        role
      }, {
        targetRoles: [role],
        targetUserIds: [userId]
      })

      return insertedData?.id || null
    } catch (err: any) {
      console.error('[Notification] Send error:', err)
      error.value = err.message
      return null
    }
  }


  /**
   * Broadcast notification to multiple roles
   * @param roles - Target roles array
   * @param type - Notification type
   * @param data - Notification data
   * @param options - Send options
   */
  async function sendBroadcast(
    roles: UserRole[],
    type: NotificationType,
    data: NotificationData,
    options: SendNotificationOptions = {}
  ): Promise<{ success: number; failed: number }> {
    const results = { success: 0, failed: 0 }

    // Get users for each role
    for (const role of roles) {
      try {
        // Query users based on role
        let query = supabase.from('users').select('id')
        
        if (role === 'admin') {
          query = query.eq('role', 'admin')
        } else if (role === 'provider') {
          // Get active providers
          const { data: providers } = await supabase
            .from('service_providers')
            .select('user_id')
            .eq('is_available', true)
          
          if (providers) {
            for (const provider of providers) {
              const result = await sendNotification(role, provider.user_id, type, data, options)
              if (result) results.success++
              else results.failed++
            }
          }
          continue
        } else {
          query = query.eq('role', 'customer')
        }

        const { data: users } = await query.limit(1000)
        
        if (users) {
          for (const user of users) {
            const result = await sendNotification(role, user.id, type, data, options)
            if (result) results.success++
            else results.failed++
          }
        }
      } catch (err) {
        console.error(`[Notification] Broadcast error for role ${role}:`, err)
        results.failed++
      }
    }

    return results
  }

  /**
   * Play notification sound based on type
   * @param type - Notification type
   */
  function playNotificationSound(type: NotificationType): void {
    const soundType = soundMapping[type] || 'message'
    playSound(soundType)
    haptic('medium')
  }

  /**
   * Subscribe to realtime notifications from database
   */
  function subscribeToRealtimeNotifications(): void {
    if (!authStore.user?.id) return

    // Unsubscribe from existing channel
    if (realtimeChannel.value) {
      supabase.removeChannel(realtimeChannel.value)
    }

    realtimeChannel.value = supabase
      .channel(`role_notifications:${authStore.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${authStore.user.id}`
        },
        (payload) => {
          handleNewNotification(payload.new as any)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${authStore.user.id}`
        },
        (payload) => {
          handleNotificationUpdate(payload.new as any)
        }
      )
      .subscribe()
  }

  /**
   * Subscribe to event bus notifications
   */
  function subscribeToEventBusNotifications(): void {
    // Listen for all events and convert to notifications
    subscribe('*', (event: CrossRoleEvent) => {
      handleEventBusNotification(event)
    })
  }

  /**
   * Handle new notification from database
   */
  function handleNewNotification(dbNotification: any): void {
    const notification: RoleAwareNotification = {
      id: dbNotification.id,
      type: dbNotification.type as NotificationType,
      title: dbNotification.title,
      message: dbNotification.message,
      icon: notificationTemplates[dbNotification.type as NotificationType]?.icon || '',
      priority: dbNotification.priority || 'normal',
      data: dbNotification.data || {},
      actions: dbNotification.actions || [],
      isRead: dbNotification.is_read || false,
      createdAt: dbNotification.created_at,
      expiresAt: dbNotification.expires_at
    }

    // Add to notifications list
    notifications.value.unshift(notification)

    // Play sound
    playNotificationSound(notification.type)

    // Show browser notification if supported
    showBrowserNotification(notification)
  }

  /**
   * Handle notification update from database
   */
  function handleNotificationUpdate(dbNotification: any): void {
    const index = notifications.value.findIndex(n => n.id === dbNotification.id)
    if (index !== -1) {
      notifications.value[index] = {
        ...notifications.value[index],
        isRead: dbNotification.is_read,
        data: dbNotification.data
      }
    }
  }


  /**
   * Handle event bus notification
   * Converts cross-role events to notifications
   */
  function handleEventBusNotification(event: CrossRoleEvent): void {
    // Map event types to notification types
    const eventToNotificationMap: Partial<Record<CrossRoleEventType, NotificationType>> = {
      'request:created': 'request_created',
      'request:matched': 'request_matched',
      'request:completed': 'request_completed',
      'request:cancelled': 'request_cancelled',
      'provider:location_updated': 'provider_location_updated',
      'provider:online': 'provider_online',
      'provider:offline': 'provider_offline',
      'customer:payment_completed': 'payment_completed',
      'customer:rating_submitted': 'rating_received'
    }

    const notificationType = eventToNotificationMap[event.type]
    if (!notificationType) return

    // Check if this notification is for current role
    const template = getNotificationTemplate(notificationType)
    if (!template) return

    // Create local notification (not persisted)
    const notification: RoleAwareNotification = {
      id: `event_${event.metadata.correlationId}`,
      type: notificationType,
      title: language.value === 'th' 
        ? parseTemplate(template.titleTh, event.payload)
        : parseTemplate(template.titleEn, event.payload),
      message: language.value === 'th'
        ? parseTemplate(template.messageTh, event.payload)
        : parseTemplate(template.messageEn, event.payload),
      icon: template.icon,
      priority: template.priority,
      data: event.payload,
      actions: template.actions || [],
      isRead: false,
      createdAt: event.metadata.timestamp
    }

    // Add to notifications (avoid duplicates)
    if (!notifications.value.find(n => n.id === notification.id)) {
      notifications.value.unshift(notification)
      playNotificationSound(notificationType)
    }
  }

  /**
   * Show browser notification
   */
  async function showBrowserNotification(notification: RoleAwareNotification): Promise<void> {
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return

    try {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/pwa-192x192.png',
        tag: notification.id,
        data: notification.data
      })

      browserNotification.onclick = () => {
        window.focus()
        // Handle action URL if available
        const primaryAction = notification.actions.find(a => a.style === 'primary')
        if (primaryAction?.url) {
          window.location.href = primaryAction.url
        }
      }
    } catch (err) {
      console.warn('[Notification] Browser notification error:', err)
    }
  }

  /**
   * Fetch notifications from database
   * @param limit - Maximum number of notifications to fetch
   */
  async function fetchNotifications(limit = 50): Promise<void> {
    if (!authStore.user?.id) {
      notifications.value = []
      return
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', authStore.user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (fetchError) throw fetchError

      notifications.value = (data || []).map(n => ({
        id: n.id,
        type: n.type as NotificationType,
        title: n.title,
        message: n.message,
        icon: notificationTemplates[n.type as NotificationType]?.icon || '',
        priority: (n as any).priority || 'normal',
        data: n.data || {},
        actions: (n as any).actions || [],
        isRead: n.is_read,
        createdAt: n.created_at,
        expiresAt: (n as any).expires_at
      }))
    } catch (err: any) {
      console.error('[Notification] Fetch error:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  /**
   * Mark notification as read
   * @param notificationId - Notification ID
   */
  async function markAsRead(notificationId: string): Promise<boolean> {
    // Update local state
    const notification = notifications.value.find(n => n.id === notificationId)
    if (notification) {
      notification.isRead = true
    }

    // Update database
    try {
      const { error: updateError } = await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      if (updateError) throw updateError
      return true
    } catch (err: any) {
      console.error('[Notification] Mark as read error:', err)
      return false
    }
  }


  /**
   * Mark all notifications as read
   */
  async function markAllAsRead(): Promise<boolean> {
    if (!authStore.user?.id) return false

    // Update local state
    notifications.value.forEach(n => n.isRead = true)

    // Update database
    try {
      const { error: updateError } = await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('user_id', authStore.user.id)
        .eq('is_read', false)

      if (updateError) throw updateError
      return true
    } catch (err: any) {
      console.error('[Notification] Mark all as read error:', err)
      return false
    }
  }

  /**
   * Get unread notification count
   * @param userId - User ID (optional, uses current user if not provided)
   */
  async function getUnreadCount(userId?: string): Promise<number> {
    const targetUserId = userId || authStore.user?.id
    if (!targetUserId) return 0

    try {
      const { count, error: countError } = await supabase
        .from('user_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', targetUserId)
        .eq('is_read', false)

      if (countError) throw countError
      return count || 0
    } catch (err: any) {
      console.error('[Notification] Get unread count error:', err)
      return 0
    }
  }

  /**
   * Delete notification
   * @param notificationId - Notification ID
   */
  async function deleteNotification(notificationId: string): Promise<boolean> {
    // Update local state
    notifications.value = notifications.value.filter(n => n.id !== notificationId)

    // Delete from database
    try {
      const { error: deleteError } = await supabase
        .from('user_notifications')
        .delete()
        .eq('id', notificationId)

      if (deleteError) throw deleteError
      return true
    } catch (err: any) {
      console.error('[Notification] Delete error:', err)
      return false
    }
  }

  /**
   * Clear all notifications
   */
  async function clearAllNotifications(): Promise<boolean> {
    if (!authStore.user?.id) return false

    // Update local state
    notifications.value = []

    // Delete from database
    try {
      const { error: deleteError } = await supabase
        .from('user_notifications')
        .delete()
        .eq('user_id', authStore.user.id)

      if (deleteError) throw deleteError
      return true
    } catch (err: any) {
      console.error('[Notification] Clear all error:', err)
      return false
    }
  }

  // =====================================================
  // Role-Specific Notification Helpers
  // =====================================================

  /**
   * Send notification for new request (to providers)
   */
  async function notifyNewRequest(
    requestId: string,
    trackingId: string,
    serviceType: ServiceType,
    customerId: string,
    customerName: string,
    pickupAddress: string,
    estimatedFare: number
  ): Promise<void> {
    // Get nearby providers
    const { data: providers } = await supabase
      .from('service_providers')
      .select('user_id')
      .eq('is_available', true)
      .eq('status', 'approved')

    if (!providers) return

    for (const provider of providers) {
      await sendNotification('provider', provider.user_id, 'request_created', {
        requestId,
        trackingId,
        serviceType,
        customerId,
        customerName,
        pickupAddress,
        amount: estimatedFare
      })
    }

    // Also notify admin
    const { data: admins } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')

    if (admins) {
      for (const admin of admins) {
        await sendNotification('admin', admin.id, 'request_created', {
          requestId,
          trackingId,
          serviceType,
          customerId,
          customerName,
          pickupAddress,
          amount: estimatedFare
        })
      }
    }
  }

  /**
   * Send notification for request matched (to customer)
   */
  async function notifyRequestMatched(
    requestId: string,
    customerId: string,
    providerId: string,
    providerName: string,
    eta: number,
    serviceType: ServiceType
  ): Promise<void> {
    await sendNotification('customer', customerId, 'request_matched', {
      requestId,
      providerId,
      providerName,
      eta,
      serviceType
    })
  }


  /**
   * Send notification for request completed (to all parties)
   */
  async function notifyRequestCompleted(
    requestId: string,
    customerId: string,
    providerId: string,
    providerName: string,
    customerName: string,
    amount: number,
    serviceType: ServiceType
  ): Promise<void> {
    // Notify customer
    await sendNotification('customer', customerId, 'request_completed', {
      requestId,
      providerId,
      providerName,
      amount,
      serviceType
    })

    // Notify provider
    await sendNotification('provider', providerId, 'request_completed', {
      requestId,
      customerId,
      customerName,
      amount,
      serviceType
    })
  }

  /**
   * Send notification for request cancelled
   */
  async function notifyRequestCancelled(
    requestId: string,
    customerId: string,
    providerId: string | null,
    reason: string,
    cancelledBy: UserRole,
    serviceType: ServiceType
  ): Promise<void> {
    // Notify customer
    await sendNotification('customer', customerId, 'request_cancelled', {
      requestId,
      reason,
      cancelledBy,
      serviceType
    })

    // Notify provider if assigned
    if (providerId) {
      await sendNotification('provider', providerId, 'request_cancelled', {
        requestId,
        reason,
        cancelledBy,
        serviceType
      })
    }
  }

  /**
   * Send notification for provider arrived
   */
  async function notifyProviderArrived(
    requestId: string,
    customerId: string,
    providerId: string,
    providerName: string,
    serviceType: ServiceType
  ): Promise<void> {
    await sendNotification('customer', customerId, 'provider_arrived', {
      requestId,
      providerId,
      providerName,
      serviceType
    })
  }

  /**
   * Send notification for payment completed
   */
  async function notifyPaymentCompleted(
    requestId: string,
    customerId: string,
    providerId: string,
    amount: number,
    serviceType: ServiceType
  ): Promise<void> {
    // Notify customer
    await sendNotification('customer', customerId, 'payment_completed', {
      requestId,
      amount,
      serviceType
    })

    // Notify provider
    await sendNotification('provider', providerId, 'payment_completed', {
      requestId,
      amount,
      serviceType
    })
  }

  /**
   * Send notification for rating received (to provider)
   */
  async function notifyRatingReceived(
    requestId: string,
    providerId: string,
    customerName: string,
    rating: number,
    serviceType: ServiceType
  ): Promise<void> {
    await sendNotification('provider', providerId, 'rating_received', {
      requestId,
      customerName,
      rating,
      serviceType
    })
  }

  /**
   * Send admin alert
   */
  async function sendAdminAlert(
    message: string,
    priority: NotificationPriority = 'high',
    actionUrl?: string
  ): Promise<void> {
    const { data: admins } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')

    if (!admins) return

    for (const admin of admins) {
      await sendNotification('admin', admin.id, 'admin_alert', {
        message,
        actionUrl
      })
    }
  }

  /**
   * Send system notification to all users
   */
  async function sendSystemNotification(
    message: string,
    roles: UserRole[] = ['customer', 'provider', 'admin']
  ): Promise<void> {
    await sendBroadcast(roles, 'system_notification', { message })
  }

  // =====================================================
  // Cleanup
  // =====================================================

  /**
   * Cleanup subscriptions
   */
  function cleanup(): void {
    if (realtimeChannel.value) {
      supabase.removeChannel(realtimeChannel.value)
      realtimeChannel.value = null
    }
  }

  // Lifecycle hooks
  onMounted(() => {
    // Auto-initialize if user is logged in
    if (authStore.user?.id) {
      const role = (authStore.user as any).role || 'customer'
      initialize(role as UserRole)
    }
  })

  onUnmounted(() => {
    cleanup()
  })

  // Watch for auth changes
  watch(() => authStore.user, (newUser) => {
    if (newUser) {
      const role = (newUser as any).role || 'customer'
      initialize(role as UserRole)
    } else {
      cleanup()
      notifications.value = []
    }
  })

  // =====================================================
  // Return
  // =====================================================

  return {
    // State
    notifications,
    loading,
    error,
    currentRole,
    language,
    
    // Computed
    unreadCount,
    unreadNotifications,
    recentNotifications,
    
    // Core Functions
    initialize,
    getNotificationTemplate,
    sendNotification,
    sendBroadcast,
    playNotificationSound,
    subscribeToRealtimeNotifications,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
    deleteNotification,
    clearAllNotifications,
    
    // Role-Specific Helpers
    notifyNewRequest,
    notifyRequestMatched,
    notifyRequestCompleted,
    notifyRequestCancelled,
    notifyProviderArrived,
    notifyPaymentCompleted,
    notifyRatingReceived,
    sendAdminAlert,
    sendSystemNotification,
    
    // Cleanup
    cleanup,
    
    // Templates (for reference)
    templates: notificationTemplates
  }
}

// =====================================================
// Export Types
// =====================================================

export type {
  NotificationType,
  NotificationPriority,
  NotificationAction,
  NotificationTemplate,
  NotificationData,
  RoleAwareNotification,
  SendNotificationOptions
}

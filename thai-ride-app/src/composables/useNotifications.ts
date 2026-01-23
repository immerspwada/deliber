import { ref, computed } from 'vue'

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionLabel?: string
  actionUrl?: string
}

export interface UserNotification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  data?: Record<string, unknown>
  is_read: boolean
  created_at: string
}

export function useNotifications() {
  const notifications = ref<Notification[]>([
    {
      id: '1',
      type: 'success',
      title: 'งานเสร็จสิ้น',
      message: 'คุณได้รับรายได้ ฿150 จากการเดินทางไปสุขุมวิท',
      timestamp: new Date(Date.now() - 300000), // 5 minutes ago
      read: false,
      actionLabel: 'ดูรายละเอียด',
      actionUrl: '/provider/earnings'
    },
    {
      id: '2',
      type: 'info',
      title: 'งานใหม่ในพื้นที่',
      message: 'มีงานใหม่ 3 งานในรัศมี 2 กม. จากตำแหน่งของคุณ',
      timestamp: new Date(Date.now() - 600000), // 10 minutes ago
      read: false
    },
    {
      id: '3',
      type: 'warning',
      title: 'อัปเดตเอกสาร',
      message: 'ใบขับขี่ของคุณจะหมดอายุในอีก 30 วัน กรุณาอัปเดต',
      timestamp: new Date(Date.now() - 86400000), // 1 day ago
      read: true,
      actionLabel: 'อัปเดตเอกสาร',
      actionUrl: '/provider/documents'
    }
  ])

  const unreadCount = computed(() => 
    notifications.value.filter(n => !n.read).length
  )

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>): void => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date()
    }
    notifications.value.unshift(newNotification)
  }

  const markAsRead = (id: string): void => {
    const notification = notifications.value.find(n => n.id === id)
    if (notification) {
      notification.read = true
    }
  }

  const markAllAsRead = (): void => {
    notifications.value.forEach(n => {
      n.read = true
    })
  }

  const clearAll = (): void => {
    notifications.value = []
  }

  const removeNotification = (id: string): void => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  // Simulate real-time notifications
  const simulateJobNotification = (): void => {
    addNotification({
      type: 'info',
      title: 'งานใหม่!',
      message: 'มีงานใหม่รอคุณรับ - เซ็นทรัลเวิลด์ไปสนามบินสุวรรณภูมิ',
      read: false,
      actionLabel: 'ดูงาน',
      actionUrl: '/provider'
    })
  }

  const simulateEarningsNotification = (amount: number): void => {
    addNotification({
      type: 'success',
      title: 'ได้รับรายได้',
      message: `คุณได้รับรายได้ ฿${amount} จากงานที่เสร็จสิ้น`,
      read: false,
      actionLabel: 'ดูรายได้',
      actionUrl: '/provider/earnings'
    })
  }

  const simulateWarningNotification = (message: string): void => {
    addNotification({
      type: 'warning',
      title: 'แจ้งเตือน',
      message,
      read: false
    })
  }

  // Fetch notifications (compatibility function)
  const fetchNotifications = async (limit?: number): Promise<void> => {
    // In a real app, this would fetch from API
    // For now, just simulate some notifications if empty
    if (notifications.value.length === 0) {
      simulateJobNotification()
    }
  }

  // Get notification icon path for SVG
  const getNotificationIcon = (type: string): string => {
    const icons: Record<string, string> = {
      promo: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
      ride: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z',
      delivery: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      shopping: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
      payment: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3v-6a3 3 0 00-3-3H6a3 3 0 00-3 3v6a3 3 0 003 3z',
      system: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
      sos: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
      referral: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
      subscription: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
      rating: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
    }
    return icons[type] || icons.system
  }

  // Get notification URL based on type and data
  const getNotificationUrl = (notification: UserNotification): string => {
    const data = notification.data || {}
    
    switch (notification.type) {
      case 'ride':
        return data.ride_id ? `/customer/rides/${data.ride_id}` : '/customer/rides'
      case 'delivery':
        return data.order_id ? `/customer/orders/${data.order_id}` : '/customer/orders'
      case 'shopping':
        return data.order_id ? `/customer/orders/${data.order_id}` : '/customer/orders'
      case 'payment':
        return '/customer/wallet'
      case 'promo':
        return '/customer/promotions'
      case 'referral':
        return '/customer/referral'
      case 'subscription':
        return '/customer/subscription'
      default:
        return '/customer/notifications'
    }
  }

  // Delete notification
  const deleteNotification = async (id: string): Promise<void> => {
    removeNotification(id)
  }

  // Loading state
  const loading = ref(false)

  return {
    notifications: computed(() => notifications.value),
    unreadCount,
    loading,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
    deleteNotification,
    simulateJobNotification,
    simulateEarningsNotification,
    simulateWarningNotification,
    fetchNotifications,
    getNotificationIcon,
    getNotificationUrl
  }
}
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
  const fetchNotifications = async (): Promise<void> => {
    // In a real app, this would fetch from API
    // For now, just simulate some notifications if empty
    if (notifications.value.length === 0) {
      simulateJobNotification()
    }
  }

  return {
    notifications: computed(() => notifications.value),
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
    simulateJobNotification,
    simulateEarningsNotification,
    simulateWarningNotification,
    fetchNotifications
  }
}
/**
 * useNotificationTemplates - Notification Templates Management
 * 
 * Feature: F07 - Push Notification Templates
 * Tables: notification_templates, scheduled_notifications, push_notification_analytics
 * Migration: 128_notification_templates.sql
 * 
 * @syncs-with
 * - Admin: AdminNotificationTemplatesView.vue (CRUD templates)
 * - Admin: AdminPushNotificationsView.vue (use templates for broadcast)
 * - Database: notification_templates → push_notification_queue
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface NotificationTemplate {
  id: string
  name: string
  name_th: string | null
  category: string
  title: string
  body: string
  icon: string
  url: string | null
  variables: string[]
  is_active: boolean
  usage_count: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ScheduledNotification {
  id: string
  template_id: string | null
  title: string
  body: string
  icon: string
  url: string | null
  target_type: 'all' | 'customers' | 'providers' | 'segment'
  target_filter: Record<string, any>
  scheduled_at: string
  status: 'scheduled' | 'processing' | 'completed' | 'cancelled'
  sent_count: number
  failed_count: number
  created_by: string | null
  created_at: string
  processed_at: string | null
}

export interface PushAnalytics {
  date: string
  total_sent: number
  total_delivered: number
  total_clicked: number
  total_failed: number
  delivery_rate: number
  click_rate: number
}

export interface PushDailyStats {
  id: string
  date: string
  total_sent: number
  total_delivered: number
  total_clicked: number
  total_dismissed: number
  total_failed: number
  delivery_rate: number
  click_rate: number
  by_category: Record<string, number>
  by_device: Record<string, number>
}

// Template categories
export const TEMPLATE_CATEGORIES = [
  { value: 'promo', label: 'โปรโมชั่น', icon: '🎁' },
  { value: 'order', label: 'ออเดอร์', icon: '📦' },
  { value: 'provider', label: 'ผู้ให้บริการ', icon: '🚗' },
  { value: 'system', label: 'ระบบ', icon: '⚙️' },
  { value: 'reminder', label: 'เตือนความจำ', icon: '⏰' },
  { value: 'marketing', label: 'การตลาด', icon: '📢' },
  { value: 'general', label: 'ทั่วไป', icon: '📝' }
]

export function useNotificationTemplates() {
  // State
  const templates = ref<NotificationTemplate[]>([])
  const scheduledNotifications = ref<ScheduledNotification[]>([])
  const analytics = ref<PushAnalytics[]>([])
  const dailyStats = ref<PushDailyStats[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // =====================================================
  // Templates CRUD
  // =====================================================

  // Fetch all templates
  const fetchTemplates = async (category?: string) => {
    isLoading.value = true
    error.value = null
    try {
      let query = supabase
        .from('notification_templates')
        .select('*')
        .order('category')
        .order('name')

      if (category && category !== 'all') {
        query = query.eq('category', category)
      }

      const { data, error: err } = await query
      if (err) throw err
      templates.value = data || []
    } catch (err: any) {
      error.value = err.message
      console.error('Failed to fetch templates:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Get single template
  const getTemplate = async (id: string): Promise<NotificationTemplate | null> => {
    try {
      const { data, error: err } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('id', id)
        .single()

      if (err) throw err
      return data
    } catch (err) {
      console.error('Failed to get template:', err)
      return null
    }
  }

  // Create template
  const createTemplate = async (template: Partial<NotificationTemplate>): Promise<NotificationTemplate | null> => {
    isLoading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('notification_templates')
        .insert({
          name: template.name,
          name_th: template.name_th,
          category: template.category || 'general',
          title: template.title,
          body: template.body,
          icon: template.icon || '/pwa-192x192.png',
          url: template.url,
          variables: template.variables || [],
          is_active: template.is_active ?? true
        })
        .select()
        .single()

      if (err) throw err
      
      // Refresh list
      await fetchTemplates()
      return data
    } catch (err: any) {
      error.value = err.message
      console.error('Failed to create template:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Update template
  const updateTemplate = async (id: string, updates: Partial<NotificationTemplate>): Promise<boolean> => {
    isLoading.value = true
    error.value = null
    try {
      const { error: err } = await supabase
        .from('notification_templates')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (err) throw err
      
      // Refresh list
      await fetchTemplates()
      return true
    } catch (err: any) {
      error.value = err.message
      console.error('Failed to update template:', err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Delete template
  const deleteTemplate = async (id: string): Promise<boolean> => {
    isLoading.value = true
    error.value = null
    try {
      const { error: err } = await supabase
        .from('notification_templates')
        .delete()
        .eq('id', id)

      if (err) throw err
      
      // Refresh list
      await fetchTemplates()
      return true
    } catch (err: any) {
      error.value = err.message
      console.error('Failed to delete template:', err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Toggle template active status
  const toggleTemplateActive = async (id: string, isActive: boolean): Promise<boolean> => {
    return updateTemplate(id, { is_active: isActive })
  }

  // =====================================================
  // Template Usage
  // =====================================================

  // Get template with variable substitution
  const getTemplateWithVariables = async (
    templateId: string, 
    variables: Record<string, string>
  ): Promise<{ title: string; body: string; icon: string; url: string | null } | null> => {
    try {
      const { data, error: err } = await supabase.rpc('get_notification_template', {
        p_template_id: templateId,
        p_variables: variables
      })

      if (err) throw err
      return data?.[0] || null
    } catch (err) {
      console.error('Failed to get template with variables:', err)
      return null
    }
  }

  // Preview template with sample variables
  const previewTemplate = (template: NotificationTemplate, sampleValues: Record<string, string> = {}): { title: string; body: string } => {
    let title = template.title
    let body = template.body

    // Replace variables with sample values or placeholder
    for (const variable of template.variables) {
      const value = sampleValues[variable] || `[${variable}]`
      title = title.replace(new RegExp(`{{${variable}}}`, 'g'), value)
      body = body.replace(new RegExp(`{{${variable}}}`, 'g'), value)
    }

    return { title, body }
  }

  // =====================================================
  // Scheduled Notifications
  // =====================================================

  // Fetch scheduled notifications
  const fetchScheduledNotifications = async (status?: string) => {
    isLoading.value = true
    try {
      let query = supabase
        .from('scheduled_notifications')
        .select('*')
        .order('scheduled_at', { ascending: true })

      if (status && status !== 'all') {
        query = query.eq('status', status)
      }

      const { data, error: err } = await query
      if (err) throw err
      scheduledNotifications.value = data || []
    } catch (err: any) {
      error.value = err.message
      console.error('Failed to fetch scheduled notifications:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Schedule notification
  const scheduleNotification = async (notification: {
    templateId?: string
    title: string
    body: string
    url?: string
    targetType: 'all' | 'customers' | 'providers' | 'segment'
    targetFilter?: Record<string, any>
    scheduledAt: string
  }): Promise<ScheduledNotification | null> => {
    isLoading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('scheduled_notifications')
        .insert({
          template_id: notification.templateId,
          title: notification.title,
          body: notification.body,
          url: notification.url,
          target_type: notification.targetType,
          target_filter: notification.targetFilter || {},
          scheduled_at: notification.scheduledAt,
          status: 'scheduled'
        })
        .select()
        .single()

      if (err) throw err
      
      await fetchScheduledNotifications()
      return data
    } catch (err: any) {
      error.value = err.message
      console.error('Failed to schedule notification:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Cancel scheduled notification
  const cancelScheduledNotification = async (id: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('scheduled_notifications')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .eq('status', 'scheduled')

      if (err) throw err
      
      await fetchScheduledNotifications()
      return true
    } catch (err: any) {
      error.value = err.message
      return false
    }
  }

  // =====================================================
  // Analytics
  // =====================================================

  // Fetch push analytics
  const fetchAnalytics = async (startDate?: string, endDate?: string) => {
    isLoading.value = true
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const end = endDate || new Date().toISOString().split('T')[0]

      const { data, error: err } = await supabase.rpc('get_push_stats', {
        p_start_date: start,
        p_end_date: end
      })

      if (err) throw err
      analytics.value = data || []
    } catch (err: any) {
      error.value = err.message
      console.error('Failed to fetch analytics:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Fetch daily stats
  const fetchDailyStats = async (days: number = 30) => {
    isLoading.value = true
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const { data, error: err } = await supabase
        .from('push_notification_daily_stats')
        .select('*')
        .gte('date', startDate)
        .order('date', { ascending: false })

      if (err) throw err
      dailyStats.value = data || []
    } catch (err: any) {
      error.value = err.message
      console.error('Failed to fetch daily stats:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Track push event (called from service worker or app)
  const trackPushEvent = async (
    queueId: string,
    userId: string,
    eventType: 'sent' | 'delivered' | 'clicked' | 'dismissed' | 'failed',
    eventData?: Record<string, any>,
    deviceType?: string
  ): Promise<boolean> => {
    try {
      const { error: err } = await supabase.rpc('track_push_event', {
        p_queue_id: queueId,
        p_user_id: userId,
        p_event_type: eventType,
        p_event_data: eventData || {},
        p_device_type: deviceType
      })

      if (err) throw err
      return true
    } catch (err) {
      console.error('Failed to track push event:', err)
      return false
    }
  }

  // =====================================================
  // Computed
  // =====================================================

  const activeTemplates = computed(() => 
    templates.value.filter(t => t.is_active)
  )

  const templatesByCategory = computed(() => {
    const grouped: Record<string, NotificationTemplate[]> = {}
    for (const template of templates.value) {
      if (!grouped[template.category]) {
        grouped[template.category] = []
      }
      grouped[template.category].push(template)
    }
    return grouped
  })

  const pendingScheduled = computed(() =>
    scheduledNotifications.value.filter(n => n.status === 'scheduled')
  )

  const analyticsOverview = computed(() => {
    if (analytics.value.length === 0) {
      return { totalSent: 0, avgDeliveryRate: 0, avgClickRate: 0 }
    }

    const totalSent = analytics.value.reduce((sum, a) => sum + a.total_sent, 0)
    const avgDeliveryRate = analytics.value.reduce((sum, a) => sum + a.delivery_rate, 0) / analytics.value.length
    const avgClickRate = analytics.value.reduce((sum, a) => sum + a.click_rate, 0) / analytics.value.length

    return {
      totalSent,
      avgDeliveryRate: Math.round(avgDeliveryRate * 100) / 100,
      avgClickRate: Math.round(avgClickRate * 100) / 100
    }
  })

  return {
    // State
    templates,
    scheduledNotifications,
    analytics,
    dailyStats,
    isLoading,
    error,

    // Computed
    activeTemplates,
    templatesByCategory,
    pendingScheduled,
    analyticsOverview,

    // Templates CRUD
    fetchTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleTemplateActive,

    // Template Usage
    getTemplateWithVariables,
    previewTemplate,

    // Scheduled
    fetchScheduledNotifications,
    scheduleNotification,
    cancelScheduledNotification,

    // Analytics
    fetchAnalytics,
    fetchDailyStats,
    trackPushEvent,

    // Constants
    TEMPLATE_CATEGORIES
  }
}

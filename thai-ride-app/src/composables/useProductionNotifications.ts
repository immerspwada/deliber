/**
 * Production Notifications Composable
 * Enhanced notification system with templates and delivery tracking
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { logger } from '../utils/logger'

export interface NotificationTemplate {
  id: string
  template_key: string
  category: string
  title_th: string
  title_en: string
  body_th: string
  body_en: string
  action_url?: string
  icon?: string
  channels: string[]
  variables: string[]
  is_active: boolean
}

export interface NotificationPreference {
  id: string
  user_id: string
  channel: string
  category: string
  enabled: boolean
  quiet_hours_start?: string
  quiet_hours_end?: string
}

export interface NotificationStats {
  total_sent: number
  total_delivered: number
  total_failed: number
  delivery_rate: number
  by_channel: Record<string, { sent: number; delivered: number; failed: number }>
}

export function useProductionNotifications() {
  const templates = ref<NotificationTemplate[]>([])
  const preferences = ref<NotificationPreference[]>([])
  const stats = ref<NotificationStats | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Send notification using template
   */
  const sendWithTemplate = async (
    userId: string,
    templateKey: string,
    variables: Record<string, string> = {},
    data: Record<string, any> = {}
  ): Promise<string | null> => {
    try {
      const { data: notificationId, error: rpcError } = await supabase
        .rpc('send_notification_with_template', {
          p_user_id: userId,
          p_template_key: templateKey,
          p_variables: variables,
          p_data: data
        })

      if (rpcError) throw rpcError
      return notificationId
    } catch (err) {
      logger.error('Failed to send notification:', err)
      return null
    }
  }

  /**
   * Send batch notifications
   */
  const sendBatch = async (
    userIds: string[],
    templateKey: string,
    variables: Record<string, string> = {}
  ): Promise<number> => {
    try {
      const { data: count, error: rpcError } = await supabase
        .rpc('send_batch_notifications', {
          p_user_ids: userIds,
          p_template_key: templateKey,
          p_variables: variables
        })

      if (rpcError) throw rpcError
      return count || 0
    } catch (err) {
      logger.error('Failed to send batch notifications:', err)
      return 0
    }
  }

  /**
   * Fetch notification templates
   */
  const fetchTemplates = async (): Promise<NotificationTemplate[]> => {
    loading.value = true
    try {
      const { data, error: fetchError } = await supabase
        .from('notification_templates_v2')
        .select('*')
        .order('category', { ascending: true })

      if (fetchError) throw fetchError
      templates.value = data || []
      return templates.value
    } catch (err: any) {
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Create/Update template
   */
  const saveTemplate = async (template: Partial<NotificationTemplate>): Promise<boolean> => {
    try {
      if (template.id) {
        const { error: updateError } = await supabase
          .from('notification_templates_v2')
          .update({
            ...template,
            updated_at: new Date().toISOString()
          })
          .eq('id', template.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('notification_templates_v2')
          .insert(template)

        if (insertError) throw insertError
      }

      await fetchTemplates()
      return true
    } catch (err) {
      logger.error('Failed to save template:', err)
      return false
    }
  }

  /**
   * Fetch user preferences
   */
  const fetchPreferences = async (userId: string): Promise<NotificationPreference[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('notification_preferences_v2')
        .select('*')
        .eq('user_id', userId)

      if (fetchError) throw fetchError
      preferences.value = data || []
      return preferences.value
    } catch (err: any) {
      error.value = err.message
      return []
    }
  }

  /**
   * Update preference
   */
  const updatePreference = async (
    userId: string,
    channel: string,
    category: string,
    enabled: boolean
  ): Promise<boolean> => {
    try {
      const { error: upsertError } = await supabase
        .from('notification_preferences_v2')
        .upsert({
          user_id: userId,
          channel,
          category,
          enabled,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,channel,category'
        })

      if (upsertError) throw upsertError
      return true
    } catch (err) {
      logger.error('Failed to update preference:', err)
      return false
    }
  }

  /**
   * Set quiet hours
   */
  const setQuietHours = async (
    userId: string,
    channel: string,
    startTime: string | null,
    endTime: string | null
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('notification_preferences_v2')
        .update({
          quiet_hours_start: startTime,
          quiet_hours_end: endTime
        })
        .eq('user_id', userId)
        .eq('channel', channel)

      if (updateError) throw updateError
      return true
    } catch (err) {
      logger.error('Failed to set quiet hours:', err)
      return false
    }
  }

  /**
   * Fetch notification stats
   */
  const fetchStats = async (hours = 24): Promise<NotificationStats | null> => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_notification_stats', { p_hours: hours })

      if (rpcError) throw rpcError

      if (data && data.length > 0) {
        stats.value = data[0]
        return stats.value
      }
      return null
    } catch (err) {
      logger.error('Failed to fetch notification stats:', err)
      return null
    }
  }

  /**
   * Update delivery status
   */
  const updateDeliveryStatus = async (
    notificationId: string,
    channel: string,
    status: 'sent' | 'delivered' | 'failed',
    providerMessageId?: string,
    errorMessage?: string
  ): Promise<boolean> => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('update_notification_delivery', {
          p_notification_id: notificationId,
          p_channel: channel,
          p_status: status,
          p_provider_message_id: providerMessageId,
          p_error_message: errorMessage
        })

      if (rpcError) throw rpcError
      return data
    } catch (err) {
      logger.error('Failed to update delivery status:', err)
      return false
    }
  }

  // Pre-defined notification helpers
  const notifyRideMatched = (userId: string, driverName: string) =>
    sendWithTemplate(userId, 'ride_matched', { driver_name: driverName })

  const notifyRideArrived = (userId: string) =>
    sendWithTemplate(userId, 'ride_arrived')

  const notifyRideCompleted = (userId: string, fare: number) =>
    sendWithTemplate(userId, 'ride_completed', { fare: fare.toString() })

  const notifyDeliveryMatched = (userId: string, riderName: string) =>
    sendWithTemplate(userId, 'delivery_matched', { rider_name: riderName })

  const notifyDeliveryCompleted = (userId: string) =>
    sendWithTemplate(userId, 'delivery_completed')

  const notifyNewPromo = (userId: string, promoTitle: string, promoCode: string) =>
    sendWithTemplate(userId, 'promo_new', { promo_title: promoTitle, promo_code: promoCode })

  const notifyWalletTopup = (userId: string, amount: number) =>
    sendWithTemplate(userId, 'wallet_topup', { amount: amount.toString() })

  const notifyProviderNewJob = (userId: string, serviceType: string, distance: number) =>
    sendWithTemplate(userId, 'provider_new_job', { 
      service_type: serviceType, 
      distance: distance.toFixed(1) 
    })

  const notifyProviderApproved = (userId: string) =>
    sendWithTemplate(userId, 'provider_approved')

  return {
    // State
    templates,
    preferences,
    stats,
    loading,
    error,

    // Methods
    sendWithTemplate,
    sendBatch,
    fetchTemplates,
    saveTemplate,
    fetchPreferences,
    updatePreference,
    setQuietHours,
    fetchStats,
    updateDeliveryStatus,

    // Helpers
    notifyRideMatched,
    notifyRideArrived,
    notifyRideCompleted,
    notifyDeliveryMatched,
    notifyDeliveryCompleted,
    notifyNewPromo,
    notifyWalletTopup,
    notifyProviderNewJob,
    notifyProviderApproved
  }
}

// @ts-nocheck
/**
 * useNotificationPreferences - Notification Preferences Management
 * 
 * Feature: F07 - Enhanced Notification System
 * Tables: notification_channels, notification_categories, user_notification_preferences
 * Migration: 062_notification_system_v2.sql
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface NotificationChannel {
  name: string
  display_name: string
  display_name_th: string
  channel_type: 'push' | 'sms' | 'email' | 'in_app' | 'line'
  is_active: boolean
}

export interface NotificationCategory {
  category_key: string
  category_name: string
  category_name_th: string
  is_critical: boolean
  channels: string[]
  is_enabled: boolean
}

export interface NotificationPreference {
  category_key: string
  channels: string[]
  is_enabled: boolean
  quiet_hours_start?: string
  quiet_hours_end?: string
}

export function useNotificationPreferences() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // State
  const channels = ref<NotificationChannel[]>([])
  const categories = ref<NotificationCategory[]>([])
  const preferences = ref<NotificationPreference[]>([])
  
  // Quiet hours
  const quietHoursEnabled = ref(false)
  const quietHoursStart = ref('22:00')
  const quietHoursEnd = ref('07:00')

  // Computed
  const enabledCategories = computed(() => 
    categories.value.filter(c => c.is_enabled)
  )

  const criticalCategories = computed(() => 
    categories.value.filter(c => c.is_critical)
  )

  // Fetch available channels
  const fetchChannels = async () => {
    try {
      const { data, error: err } = await supabase
        .from('notification_channels')
        .select('*')
        .eq('is_active', true)
        .order('priority')
      
      if (err) throw err
      channels.value = data || []
    } catch (e: any) {
      error.value = e.message
      // Default channels
      channels.value = [
        { name: 'in_app', display_name: 'In-App', display_name_th: 'ในแอป', channel_type: 'in_app', is_active: true },
        { name: 'push', display_name: 'Push', display_name_th: 'Push', channel_type: 'push', is_active: true },
        { name: 'email', display_name: 'Email', display_name_th: 'อีเมล', channel_type: 'email', is_active: true }
      ]
    }
  }

  // Fetch user preferences
  const fetchPreferences = async () => {
    loading.value = true
    error.value = null
    
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not authenticated')
      
      const { data, error: err } = await supabase.rpc('get_user_notification_preferences', {
        p_user_id: userData.user.id
      })
      
      if (err) throw err
      categories.value = data || []
    } catch (e: any) {
      error.value = e.message
      // Default categories
      categories.value = [
        { category_key: 'ride_updates', category_name: 'Ride Updates', category_name_th: 'อัพเดทการเดินทาง', is_critical: true, channels: ['in_app', 'push'], is_enabled: true },
        { category_key: 'delivery_updates', category_name: 'Delivery Updates', category_name_th: 'อัพเดทการส่งของ', is_critical: true, channels: ['in_app', 'push'], is_enabled: true },
        { category_key: 'payment', category_name: 'Payment', category_name_th: 'การชำระเงิน', is_critical: true, channels: ['in_app', 'push', 'email'], is_enabled: true },
        { category_key: 'promotions', category_name: 'Promotions', category_name_th: 'โปรโมชั่น', is_critical: false, channels: ['in_app', 'push'], is_enabled: true },
        { category_key: 'safety', category_name: 'Safety Alerts', category_name_th: 'แจ้งเตือนความปลอดภัย', is_critical: true, channels: ['in_app', 'push', 'sms'], is_enabled: true },
        { category_key: 'rewards', category_name: 'Rewards', category_name_th: 'รางวัลและแต้ม', is_critical: false, channels: ['in_app', 'push'], is_enabled: true }
      ]
    } finally {
      loading.value = false
    }
  }

  // Update preference for a category
  const updatePreference = async (
    categoryKey: string,
    channels?: string[],
    isEnabled?: boolean
  ) => {
    loading.value = true
    error.value = null
    
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not authenticated')
      
      const { data, error: err } = await supabase.rpc('update_notification_preference', {
        p_user_id: userData.user.id,
        p_category_key: categoryKey,
        p_channels: channels,
        p_is_enabled: isEnabled
      })
      
      if (err) throw err
      
      // Update local state
      const category = categories.value.find(c => c.category_key === categoryKey)
      if (category) {
        if (channels !== undefined) category.channels = channels
        if (isEnabled !== undefined) category.is_enabled = isEnabled
      }
      
      return { success: true }
    } catch (e: any) {
      error.value = e.message
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  // Toggle category enabled/disabled
  const toggleCategory = async (categoryKey: string) => {
    const category = categories.value.find(c => c.category_key === categoryKey)
    if (!category || category.is_critical) return { success: false, error: 'Cannot toggle critical category' }
    
    return await updatePreference(categoryKey, undefined, !category.is_enabled)
  }

  // Toggle channel for a category
  const toggleChannel = async (categoryKey: string, channelName: string) => {
    const category = categories.value.find(c => c.category_key === categoryKey)
    if (!category) return { success: false, error: 'Category not found' }
    
    let newChannels: string[]
    if (category.channels.includes(channelName)) {
      // Remove channel (but keep at least in_app)
      newChannels = category.channels.filter(c => c !== channelName)
      if (newChannels.length === 0) newChannels = ['in_app']
    } else {
      // Add channel
      newChannels = [...category.channels, channelName]
    }
    
    return await updatePreference(categoryKey, newChannels)
  }

  // Check if channel is enabled for category
  const isChannelEnabled = (categoryKey: string, channelName: string): boolean => {
    const category = categories.value.find(c => c.category_key === categoryKey)
    return category?.channels.includes(channelName) ?? false
  }

  // Set quiet hours
  const setQuietHours = async (enabled: boolean, start?: string, end?: string) => {
    quietHoursEnabled.value = enabled
    if (start) quietHoursStart.value = start
    if (end) quietHoursEnd.value = end
    
    // Save to user preferences (could be stored in user_notification_preferences or user settings)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return
      
      // Store in user metadata or separate table
      await supabase.from('users').update({
        notification_settings: {
          quiet_hours_enabled: enabled,
          quiet_hours_start: start || quietHoursStart.value,
          quiet_hours_end: end || quietHoursEnd.value
        }
      }).eq('id', userData.user.id)
    } catch {
      // Silent fail
    }
  }

  // Check if currently in quiet hours
  const isInQuietHours = (): boolean => {
    if (!quietHoursEnabled.value) return false
    
    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()
    
    const [startHour, startMin] = quietHoursStart.value.split(':').map(Number)
    const [endHour, endMin] = quietHoursEnd.value.split(':').map(Number)
    
    const startTime = startHour * 60 + startMin
    const endTime = endHour * 60 + endMin
    
    if (startTime < endTime) {
      return currentTime >= startTime && currentTime < endTime
    } else {
      // Overnight quiet hours (e.g., 22:00 - 07:00)
      return currentTime >= startTime || currentTime < endTime
    }
  }

  // Get channel icon
  const getChannelIcon = (channelType: string): string => {
    const icons: Record<string, string> = {
      in_app: '📱',
      push: '🔔',
      sms: '💬',
      email: '📧',
      line: '💚'
    }
    return icons[channelType] || '📢'
  }

  // Get category icon
  const getCategoryIcon = (categoryKey: string): string => {
    const icons: Record<string, string> = {
      ride_updates: '🚗',
      delivery_updates: '📦',
      payment: '💳',
      promotions: '🎁',
      safety: '🛡️',
      account: '👤',
      rewards: '⭐',
      system: '⚙️'
    }
    return icons[categoryKey] || '📢'
  }

  return {
    // State
    loading,
    error,
    channels,
    categories,
    preferences,
    quietHoursEnabled,
    quietHoursStart,
    quietHoursEnd,
    
    // Computed
    enabledCategories,
    criticalCategories,
    
    // Methods
    fetchChannels,
    fetchPreferences,
    updatePreference,
    toggleCategory,
    toggleChannel,
    isChannelEnabled,
    setQuietHours,
    isInQuietHours,
    getChannelIcon,
    getCategoryIcon
  }
}

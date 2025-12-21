/**
 * useProviderNotificationSettings - Provider Notification Preferences
 * Feature: F07 - Push Notifications (Provider Settings Extension)
 * 
 * ให้ Provider เลือกเปิด/ปิด push notification ตามประเภทงาน
 * 
 * @syncs-with
 * - useProvider.ts: ตรวจสอบ settings ก่อนส่ง push
 * - useSoundNotification.ts: ตรวจสอบ settings ก่อนเล่นเสียง
 * - Admin: AdminPushNotificationsView.vue (ดูสถิติ)
 */

import { ref, computed, watch } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

export interface ProviderNotificationSettings {
  // Push notification settings
  pushEnabled: boolean
  pushRide: boolean
  pushDelivery: boolean
  pushShopping: boolean
  pushQueue: boolean
  pushMoving: boolean
  pushLaundry: boolean
  pushScheduled: boolean
  
  // Sound settings
  soundEnabled: boolean
  soundVolume: number // 0-100
  soundType: 'default' | 'chime' | 'bell' | 'urgent' | 'custom'
  vibrationEnabled: boolean
  
  // Quiet hours
  quietHoursEnabled: boolean
  quietHoursStart: string // HH:mm format
  quietHoursEnd: string // HH:mm format
}

const DEFAULT_SETTINGS: ProviderNotificationSettings = {
  pushEnabled: true,
  pushRide: true,
  pushDelivery: true,
  pushShopping: true,
  pushQueue: true,
  pushMoving: true,
  pushLaundry: true,
  pushScheduled: true,
  
  soundEnabled: true,
  soundVolume: 80,
  soundType: 'default',
  vibrationEnabled: true,
  
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00'
}

const STORAGE_KEY = 'provider_notification_settings'

export function useProviderNotificationSettings() {
  const authStore = useAuthStore()
  const settings = ref<ProviderNotificationSettings>({ ...DEFAULT_SETTINGS })
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Load settings from localStorage (fast) then sync with DB
  const loadSettings = async () => {
    loading.value = true
    error.value = null
    
    try {
      // Load from localStorage first (instant)
      const cached = localStorage.getItem(STORAGE_KEY)
      if (cached) {
        try {
          settings.value = { ...DEFAULT_SETTINGS, ...JSON.parse(cached) }
        } catch {
          settings.value = { ...DEFAULT_SETTINGS }
        }
      }
      
      // Then sync from database if logged in
      if (authStore.user?.id) {
        const { data } = await (supabase
          .from('user_preferences') as any)
          .select('notification_settings')
          .eq('user_id', authStore.user.id)
          .maybeSingle()
        
        if (data?.notification_settings?.provider) {
          settings.value = { ...DEFAULT_SETTINGS, ...data.notification_settings.provider }
          // Update localStorage
          localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value))
        }
      }
    } catch (e: any) {
      console.warn('Error loading notification settings:', e)
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  // Save settings to localStorage and DB
  const saveSettings = async (newSettings: Partial<ProviderNotificationSettings>) => {
    loading.value = true
    error.value = null
    
    try {
      // Merge with current settings
      settings.value = { ...settings.value, ...newSettings }
      
      // Save to localStorage (instant)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value))
      
      // Save to database if logged in
      if (authStore.user?.id) {
        // Get existing preferences
        const { data: existing } = await (supabase
          .from('user_preferences') as any)
          .select('*')
          .eq('user_id', authStore.user.id)
          .maybeSingle()
        
        const notificationSettings = {
          ...(existing?.notification_settings || {}),
          provider: settings.value
        }
        
        if (existing) {
          await (supabase
            .from('user_preferences') as any)
            .update({ notification_settings: notificationSettings })
            .eq('user_id', authStore.user.id)
        } else {
          await (supabase
            .from('user_preferences') as any)
            .insert({
              user_id: authStore.user.id,
              notification_settings: notificationSettings
            })
        }
      }
      
      return true
    } catch (e: any) {
      console.warn('Error saving notification settings:', e)
      error.value = e.message
      return false
    } finally {
      loading.value = false
    }
  }

  // Check if push notification should be sent for job type
  const shouldSendPush = (jobType: 'ride' | 'delivery' | 'shopping' | 'queue' | 'moving' | 'laundry' | 'scheduled'): boolean => {
    if (!settings.value.pushEnabled) return false
    
    // Check quiet hours
    if (settings.value.quietHoursEnabled && isQuietHours()) return false
    
    // Check job type setting
    switch (jobType) {
      case 'ride': return settings.value.pushRide
      case 'delivery': return settings.value.pushDelivery
      case 'shopping': return settings.value.pushShopping
      case 'queue': return settings.value.pushQueue
      case 'moving': return settings.value.pushMoving
      case 'laundry': return settings.value.pushLaundry
      case 'scheduled': return settings.value.pushScheduled
      default: return true
    }
  }

  // Check if sound should play for job type
  const shouldPlaySound = (): boolean => {
    if (!settings.value.soundEnabled) return false
    if (settings.value.quietHoursEnabled && isQuietHours()) return false
    return true
  }

  // Check if vibration should trigger
  const shouldVibrate = (): boolean => {
    if (!settings.value.vibrationEnabled) return false
    if (settings.value.quietHoursEnabled && isQuietHours()) return false
    return true
  }

  // Check if currently in quiet hours
  const isQuietHours = (): boolean => {
    if (!settings.value.quietHoursEnabled) return false
    
    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()
    
    const [startH, startM] = settings.value.quietHoursStart.split(':').map(Number)
    const [endH, endM] = settings.value.quietHoursEnd.split(':').map(Number)
    
    const startTime = startH * 60 + startM
    const endTime = endH * 60 + endM
    
    // Handle overnight quiet hours (e.g., 22:00 - 07:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime < endTime
    }
    
    return currentTime >= startTime && currentTime < endTime
  }

  // Get sound volume (0-1 for Web Audio API)
  const getSoundVolume = (): number => {
    return settings.value.soundVolume / 100
  }

  // Toggle all push notifications
  const toggleAllPush = async (enabled: boolean) => {
    await saveSettings({
      pushEnabled: enabled,
      pushRide: enabled,
      pushDelivery: enabled,
      pushShopping: enabled,
      pushQueue: enabled,
      pushMoving: enabled,
      pushLaundry: enabled,
      pushScheduled: enabled
    })
  }

  // Reset to defaults
  const resetToDefaults = async () => {
    await saveSettings(DEFAULT_SETTINGS)
  }

  // Computed: count of enabled job types
  const enabledJobTypesCount = computed(() => {
    let count = 0
    if (settings.value.pushRide) count++
    if (settings.value.pushDelivery) count++
    if (settings.value.pushShopping) count++
    if (settings.value.pushQueue) count++
    if (settings.value.pushMoving) count++
    if (settings.value.pushLaundry) count++
    if (settings.value.pushScheduled) count++
    return count
  })

  // Computed: status text
  const statusText = computed(() => {
    if (!settings.value.pushEnabled) return 'ปิดการแจ้งเตือน'
    if (isQuietHours()) return 'โหมดเงียบ'
    return `เปิด ${enabledJobTypesCount.value}/7 ประเภท`
  })

  return {
    // State
    settings,
    loading,
    error,
    
    // Methods
    loadSettings,
    saveSettings,
    shouldSendPush,
    shouldPlaySound,
    shouldVibrate,
    isQuietHours,
    getSoundVolume,
    toggleAllPush,
    resetToDefaults,
    
    // Computed
    enabledJobTypesCount,
    statusText
  }
}

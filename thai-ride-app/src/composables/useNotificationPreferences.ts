/**
 * Notification Preferences Composable
 * Manages provider notification preferences by category
 * 
 * Role Impact:
 * - Provider: Can view and update own preferences
 * - Customer: No access
 * - Admin: Can view all preferences
 */
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

// Notification categories
export type NotificationCategory = 
  | 'new_job'
  | 'job_update'
  | 'earnings'
  | 'promotions'
  | 'system_announcements'

export interface NotificationPreference {
  id: string
  provider_id: string
  category: NotificationCategory
  enabled: boolean
  created_at: string
  updated_at: string
}

// Category metadata for UI
export const NOTIFICATION_CATEGORIES: Record<NotificationCategory, {
  label: string
  description: string
  icon: string
}> = {
  new_job: {
    label: 'งานใหม่',
    description: 'แจ้งเตือนเมื่อมีงานใหม่เข้ามา',
    icon: '🔔'
  },
  job_update: {
    label: 'อัพเดทงาน',
    description: 'แจ้งเตือนเมื่อสถานะงานเปลี่ยนแปลง',
    icon: '📋'
  },
  earnings: {
    label: 'รายได้',
    description: 'แจ้งเตือนเมื่อได้รับเงิน',
    icon: '💰'
  },
  promotions: {
    label: 'โปรโมชั่น',
    description: 'ข่าวสารโปรโมชั่นและส่วนลด',
    icon: '🎁'
  },
  system_announcements: {
    label: 'ประกาศระบบ',
    description: 'ข่าวสารสำคัญจากระบบ',
    icon: '📢'
  }
}

export function useNotificationPreferences() {
  const preferences = ref<NotificationPreference[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const providerId = ref<string | null>(null)

  // Get preference by category
  const getPreference = (category: NotificationCategory): NotificationPreference | undefined => {
    return preferences.value.find(p => p.category === category)
  }

  // Check if category is enabled
  const isEnabled = (category: NotificationCategory): boolean => {
    const pref = getPreference(category)
    // Default to true if no preference exists
    return pref?.enabled ?? true
  }

  // Computed: all categories with their status
  const categoriesWithStatus = computed(() => {
    return Object.entries(NOTIFICATION_CATEGORIES).map(([key, meta]) => ({
      category: key as NotificationCategory,
      ...meta,
      enabled: isEnabled(key as NotificationCategory)
    }))
  })

  // Computed: count of enabled categories
  const enabledCount = computed(() => {
    return categoriesWithStatus.value.filter(c => c.enabled).length
  })

  // Load preferences from database
  async function loadPreferences(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      // Get current user's provider ID
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        error.value = 'กรุณาเข้าสู่ระบบ'
        return
      }

      const { data: provider } = await supabase
        .from('providers_v2')
        .select('id')
        .eq('user_id', user.id)
        .single() as { data: { id: string } | null }

      if (!provider) {
        error.value = 'ไม่พบข้อมูล Provider'
        return
      }

      providerId.value = provider.id

      // Load preferences
      const { data, error: fetchError } = await (supabase
        .from('notification_preferences') as ReturnType<typeof supabase.from>)
        .select('*')
        .eq('provider_id', provider.id)

      if (fetchError) throw fetchError

      preferences.value = data || []

      // Initialize default preferences if none exist
      if (preferences.value.length === 0) {
        await initializeDefaults()
      }

      console.log('[NotificationPreferences] Loaded:', preferences.value.length, 'preferences')
    } catch (err) {
      console.error('[NotificationPreferences] Load error:', err)
      error.value = 'ไม่สามารถโหลดการตั้งค่าได้'
    } finally {
      loading.value = false
    }
  }

  // Initialize default preferences for new providers
  async function initializeDefaults(): Promise<void> {
    if (!providerId.value) return

    try {
      // Call the database function to initialize defaults
      const { error: initError } = await supabase
        .rpc('initialize_notification_preferences', {
          p_provider_id: providerId.value
        })

      if (initError) {
        // Fallback: insert manually if function doesn't exist
        const defaultPrefs = Object.keys(NOTIFICATION_CATEGORIES).map(category => ({
          provider_id: providerId.value,
          category,
          enabled: true
        }))

        await (supabase
          .from('notification_preferences') as ReturnType<typeof supabase.from>)
          .upsert(defaultPrefs, { onConflict: 'provider_id,category' })
      }

      // Reload preferences
      const { data } = await (supabase
        .from('notification_preferences') as ReturnType<typeof supabase.from>)
        .select('*')
        .eq('provider_id', providerId.value)

      preferences.value = data || []
      
      console.log('[NotificationPreferences] Initialized defaults')
    } catch (err) {
      console.warn('[NotificationPreferences] Failed to initialize defaults:', err)
    }
  }

  // Toggle a category on/off
  async function toggleCategory(category: NotificationCategory): Promise<boolean> {
    if (!providerId.value) {
      error.value = 'ไม่พบข้อมูล Provider'
      return false
    }

    const currentPref = getPreference(category)
    const newEnabled = !(currentPref?.enabled ?? true)

    loading.value = true
    error.value = null

    try {
      if (currentPref) {
        // Update existing preference
        const { error: updateError } = await (supabase
          .from('notification_preferences') as ReturnType<typeof supabase.from>)
          .update({ enabled: newEnabled, updated_at: new Date().toISOString() })
          .eq('id', currentPref.id)

        if (updateError) throw updateError

        // Update local state
        currentPref.enabled = newEnabled
      } else {
        // Insert new preference
        const { data, error: insertError } = await (supabase
          .from('notification_preferences') as ReturnType<typeof supabase.from>)
          .insert({
            provider_id: providerId.value,
            category,
            enabled: newEnabled
          })
          .select()
          .single()

        if (insertError) throw insertError

        preferences.value.push(data)
      }

      console.log(`[NotificationPreferences] ${category} set to ${newEnabled}`)
      return true
    } catch (err) {
      console.error('[NotificationPreferences] Toggle error:', err)
      error.value = 'ไม่สามารถบันทึกการตั้งค่าได้'
      return false
    } finally {
      loading.value = false
    }
  }

  // Set multiple categories at once
  async function setCategories(settings: Partial<Record<NotificationCategory, boolean>>): Promise<boolean> {
    if (!providerId.value) {
      error.value = 'ไม่พบข้อมูล Provider'
      return false
    }

    loading.value = true
    error.value = null

    try {
      const updates = Object.entries(settings).map(([category, enabled]) => ({
        provider_id: providerId.value,
        category,
        enabled,
        updated_at: new Date().toISOString()
      }))

      const { error: upsertError } = await (supabase
        .from('notification_preferences') as ReturnType<typeof supabase.from>)
        .upsert(updates, { onConflict: 'provider_id,category' })

      if (upsertError) throw upsertError

      // Reload preferences
      await loadPreferences()

      console.log('[NotificationPreferences] Bulk update successful')
      return true
    } catch (err) {
      console.error('[NotificationPreferences] Bulk update error:', err)
      error.value = 'ไม่สามารถบันทึกการตั้งค่าได้'
      return false
    } finally {
      loading.value = false
    }
  }

  // Enable all categories
  async function enableAll(): Promise<boolean> {
    const allEnabled = Object.keys(NOTIFICATION_CATEGORIES).reduce((acc, key) => {
      acc[key as NotificationCategory] = true
      return acc
    }, {} as Record<NotificationCategory, boolean>)

    return setCategories(allEnabled)
  }

  // Disable all categories
  async function disableAll(): Promise<boolean> {
    const allDisabled = Object.keys(NOTIFICATION_CATEGORIES).reduce((acc, key) => {
      acc[key as NotificationCategory] = false
      return acc
    }, {} as Record<NotificationCategory, boolean>)

    return setCategories(allDisabled)
  }

  // Load on mount
  onMounted(() => {
    loadPreferences()
  })

  return {
    preferences,
    loading,
    error,
    providerId,
    categoriesWithStatus,
    enabledCount,
    isEnabled,
    loadPreferences,
    toggleCategory,
    setCategories,
    enableAll,
    disableAll
  }
}

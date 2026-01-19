/**
 * System Settings Composable
 * ==========================
 * Manage system-wide settings with validation and audit logging
 */

import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

export interface SystemSetting {
  id: string
  category: string
  setting_key: string
  setting_value: string
  data_type: 'string' | 'number' | 'boolean' | 'json'
  display_name: string
  display_name_th?: string
  description?: string
  description_th?: string
  is_public: boolean
  is_editable: boolean
  validation_rules?: {
    min?: number
    max?: number
    pattern?: string
    options?: string[]
  }
  display_order: number
}

export interface SettingCategory {
  category: string
  setting_count: number
}

export interface AuditLogEntry {
  id: string
  setting_key: string
  category: string
  old_value: string
  new_value: string
  changed_by: string
  changed_at: string
}

export function useSystemSettings() {
  const settings = ref<SystemSetting[]>([])
  const categories = ref<SettingCategory[]>([])
  const auditLog = ref<AuditLogEntry[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Get all setting categories
   */
  async function fetchCategories(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const { data, error: rpcError } = await supabase.rpc('get_settings_categories')

      if (rpcError) throw rpcError

      categories.value = data || []
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch categories'
      console.error('[useSystemSettings] fetchCategories error:', e)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get settings by category
   */
  async function fetchSettingsByCategory(category: string): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const { data, error: rpcError } = await supabase.rpc('get_settings_by_category', {
        p_category: category
      })

      if (rpcError) throw rpcError

      settings.value = data || []
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch settings'
      console.error('[useSystemSettings] fetchSettingsByCategory error:', e)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get all settings
   */
  async function fetchAllSettings(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const { data, error: queryError } = await supabase
        .from('system_settings')
        .select('*')
        .order('category')
        .order('display_order')

      if (queryError) throw queryError

      settings.value = data || []
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch all settings'
      console.error('[useSystemSettings] fetchAllSettings error:', e)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Update a setting value
   */
  async function updateSetting(
    settingKey: string,
    newValue: string,
    category?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Validate the setting exists and is editable
      const setting = settings.value.find(
        s => s.setting_key === settingKey && (!category || s.category === category)
      )

      if (!setting) {
        return { success: false, message: 'Setting not found' }
      }

      if (!setting.is_editable) {
        return { success: false, message: 'Setting is not editable' }
      }

      // Validate value based on data type
      const validationResult = validateSettingValue(setting, newValue)
      if (!validationResult.valid) {
        return { success: false, message: validationResult.message || 'Invalid value' }
      }

      // Call RPC function to update with audit logging
      const { data, error: rpcError } = await supabase.rpc('update_setting', {
        p_setting_key: settingKey,
        p_new_value: newValue,
        p_category: category || null
      })

      if (rpcError) throw rpcError

      if (data === true) {
        // Update local state
        const index = settings.value.findIndex(
          s => s.setting_key === settingKey && (!category || s.category === category)
        )
        if (index !== -1) {
          settings.value[index].setting_value = newValue
        }

        return { success: true, message: 'Setting updated successfully' }
      }

      return { success: false, message: 'Failed to update setting' }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to update setting'
      console.error('[useSystemSettings] updateSetting error:', e)
      return { success: false, message }
    }
  }

  /**
   * Validate setting value based on data type and rules
   */
  function validateSettingValue(
    setting: SystemSetting,
    value: string
  ): { valid: boolean; message?: string } {
    // Type validation
    switch (setting.data_type) {
      case 'number':
        if (isNaN(Number(value))) {
          return { valid: false, message: 'Value must be a number' }
        }
        break

      case 'boolean':
        if (value !== 'true' && value !== 'false') {
          return { valid: false, message: 'Value must be true or false' }
        }
        break

      case 'json':
        try {
          JSON.parse(value)
        } catch {
          return { valid: false, message: 'Value must be valid JSON' }
        }
        break
    }

    // Validation rules
    if (setting.validation_rules) {
      const rules = setting.validation_rules

      // Min/Max for numbers
      if (setting.data_type === 'number') {
        const numValue = Number(value)
        if (rules.min !== undefined && numValue < rules.min) {
          return { valid: false, message: `Value must be at least ${rules.min}` }
        }
        if (rules.max !== undefined && numValue > rules.max) {
          return { valid: false, message: `Value must be at most ${rules.max}` }
        }
      }

      // Pattern for strings
      if (rules.pattern && setting.data_type === 'string') {
        const regex = new RegExp(rules.pattern)
        if (!regex.test(value)) {
          return { valid: false, message: 'Value does not match required pattern' }
        }
      }

      // Options (enum)
      if (rules.options && !rules.options.includes(value)) {
        return { valid: false, message: `Value must be one of: ${rules.options.join(', ')}` }
      }
    }

    return { valid: true }
  }

  /**
   * Get audit log for settings changes
   */
  async function fetchAuditLog(limit = 50): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const { data, error: queryError } = await supabase
        .from('settings_audit_log')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(limit)

      if (queryError) throw queryError

      auditLog.value = data || []
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch audit log'
      console.error('[useSystemSettings] fetchAuditLog error:', e)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get setting value by key
   */
  function getSettingValue(key: string, category?: string): string | null {
    const setting = settings.value.find(
      s => s.setting_key === key && (!category || s.category === category)
    )
    return setting?.setting_value || null
  }

  /**
   * Get typed setting value
   */
  function getTypedValue<T = string>(key: string, category?: string): T | null {
    const value = getSettingValue(key, category)
    if (value === null) return null

    const setting = settings.value.find(
      s => s.setting_key === key && (!category || s.category === category)
    )

    if (!setting) return null

    switch (setting.data_type) {
      case 'number':
        return Number(value) as T
      case 'boolean':
        return (value === 'true') as T
      case 'json':
        try {
          return JSON.parse(value) as T
        } catch {
          return null
        }
      default:
        return value as T
    }
  }

  /**
   * Group settings by category
   */
  const settingsByCategory = computed(() => {
    const grouped: Record<string, SystemSetting[]> = {}
    
    settings.value.forEach(setting => {
      if (!grouped[setting.category]) {
        grouped[setting.category] = []
      }
      grouped[setting.category].push(setting)
    })

    return grouped
  })

  /**
   * Get category display name
   */
  function getCategoryDisplayName(category: string): string {
    const names: Record<string, string> = {
      general: 'General Settings',
      ride: 'Ride Settings',
      payment: 'Payment Settings',
      provider: 'Provider Settings',
      notification: 'Notification Settings',
      security: 'Security Settings',
      features: 'Feature Flags',
      map: 'Map Settings',
      analytics: 'Analytics Settings'
    }
    return names[category] || category
  }

  /**
   * Get category icon
   */
  function getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      general: '⚙️',
      ride: '🚗',
      payment: '💳',
      provider: '👤',
      notification: '🔔',
      security: '🔒',
      features: '🎯',
      map: '🗺️',
      analytics: '📊'
    }
    return icons[category] || '📋'
  }

  return {
    // State
    settings,
    categories,
    auditLog,
    isLoading,
    error,

    // Computed
    settingsByCategory,

    // Methods
    fetchCategories,
    fetchSettingsByCategory,
    fetchAllSettings,
    updateSetting,
    fetchAuditLog,
    getSettingValue,
    getTypedValue,
    getCategoryDisplayName,
    getCategoryIcon,
    validateSettingValue
  }
}

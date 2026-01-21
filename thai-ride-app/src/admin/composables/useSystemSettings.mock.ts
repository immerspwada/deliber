/**
 * Mock System Settings for Development
 * =====================================
 * Use this when Supabase is not running
 */

import { ref, computed } from 'vue'
import type { SystemSetting, SettingCategory } from './useSystemSettings'

// Mock settings data
const mockSettings: SystemSetting[] = [
  // General Settings
  {
    id: '1',
    category: 'general',
    setting_key: 'app_name',
    setting_value: 'Thai Ride App',
    data_type: 'string',
    display_name: 'Application Name',
    display_name_th: 'ชื่อแอปพลิเคชัน',
    description: 'Main application name',
    description_th: 'ชื่อหลักของแอปพลิเคชัน',
    is_public: true,
    is_editable: true,
    display_order: 1
  },
  {
    id: '2',
    category: 'general',
    setting_key: 'app_version',
    setting_value: '2.0.0',
    data_type: 'string',
    display_name: 'App Version',
    display_name_th: 'เวอร์ชันแอป',
    description: 'Current application version',
    description_th: 'เวอร์ชันปัจจุบันของแอป',
    is_public: true,
    is_editable: false,
    display_order: 2
  },
  {
    id: '3',
    category: 'general',
    setting_key: 'maintenance_mode',
    setting_value: 'false',
    data_type: 'boolean',
    display_name: 'Maintenance Mode',
    display_name_th: 'โหมดปิดปรับปรุง',
    description: 'Enable maintenance mode',
    description_th: 'เปิดโหมดปิดปรับปรุงระบบ',
    is_public: true,
    is_editable: true,
    display_order: 3
  },
  {
    id: '4',
    category: 'general',
    setting_key: 'support_phone',
    setting_value: '02-123-4567',
    data_type: 'string',
    display_name: 'Support Phone',
    display_name_th: 'เบอร์ติดต่อ',
    description: 'Customer support phone number',
    description_th: 'เบอร์โทรศัพท์ฝ่ายสนับสนุน',
    is_public: true,
    is_editable: true,
    display_order: 4
  },
  
  // Ride Settings
  {
    id: '10',
    category: 'ride',
    setting_key: 'base_fare',
    setting_value: '35',
    data_type: 'number',
    display_name: 'Base Fare',
    display_name_th: 'ค่าโดยสารขั้นต่ำ',
    description: 'Minimum ride fare in THB',
    description_th: 'ค่าโดยสารขั้นต่ำ (บาท)',
    is_public: true,
    is_editable: true,
    validation_rules: { min: 10, max: 100 },
    display_order: 10
  },
  {
    id: '11',
    category: 'ride',
    setting_key: 'per_km_rate',
    setting_value: '8',
    data_type: 'number',
    display_name: 'Per KM Rate',
    display_name_th: 'ค่าระยะทางต่อกม.',
    description: 'Rate per kilometer in THB',
    description_th: 'ค่าระยะทางต่อกิโลเมตร (บาท)',
    is_public: true,
    is_editable: true,
    validation_rules: { min: 1, max: 50 },
    display_order: 11
  },
  {
    id: '12',
    category: 'ride',
    setting_key: 'per_minute_rate',
    setting_value: '2',
    data_type: 'number',
    display_name: 'Per Minute Rate',
    display_name_th: 'ค่าเวลาต่อนาที',
    description: 'Rate per minute in THB',
    description_th: 'ค่าเวลาต่อนาที (บาท)',
    is_public: true,
    is_editable: true,
    validation_rules: { min: 0, max: 10 },
    display_order: 12
  },
  {
    id: '13',
    category: 'ride',
    setting_key: 'cancellation_fee',
    setting_value: '20',
    data_type: 'number',
    display_name: 'Cancellation Fee',
    display_name_th: 'ค่ายกเลิก',
    description: 'Fee for cancelling after match',
    description_th: 'ค่าธรรมเนียมการยกเลิกหลังจับคู่',
    is_public: true,
    is_editable: true,
    validation_rules: { min: 0, max: 100 },
    display_order: 13
  },
  
  // Payment Settings
  {
    id: '20',
    category: 'payment',
    setting_key: 'commission_rate',
    setting_value: '15',
    data_type: 'number',
    display_name: 'Commission Rate %',
    display_name_th: 'ค่าคอมมิชชั่น %',
    description: 'Platform commission percentage',
    description_th: 'เปอร์เซ็นต์ค่าคอมมิชชั่นแพลตฟอร์ม',
    is_public: false,
    is_editable: true,
    validation_rules: { min: 0, max: 50 },
    display_order: 20
  },
  {
    id: '21',
    category: 'payment',
    setting_key: 'min_topup_amount',
    setting_value: '50',
    data_type: 'number',
    display_name: 'Min Top-up Amount',
    display_name_th: 'ยอดเติมเงินขั้นต่ำ',
    description: 'Minimum wallet top-up amount',
    description_th: 'ยอดเติมเงินขั้นต่ำ (บาท)',
    is_public: true,
    is_editable: true,
    validation_rules: { min: 10, max: 1000 },
    display_order: 21
  },
  {
    id: '22',
    category: 'payment',
    setting_key: 'max_topup_amount',
    setting_value: '10000',
    data_type: 'number',
    display_name: 'Max Top-up Amount',
    display_name_th: 'ยอดเติมเงินสูงสุด',
    description: 'Maximum wallet top-up amount',
    description_th: 'ยอดเติมเงินสูงสุด (บาท)',
    is_public: true,
    is_editable: true,
    validation_rules: { min: 1000, max: 100000 },
    display_order: 22
  },
  
  // Provider Settings
  {
    id: '30',
    category: 'provider',
    setting_key: 'approval_required',
    setting_value: 'true',
    data_type: 'boolean',
    display_name: 'Approval Required',
    display_name_th: 'ต้องอนุมัติ',
    description: 'Require admin approval for new providers',
    description_th: 'ต้องการการอนุมัติจากแอดมินสำหรับผู้ให้บริการใหม่',
    is_public: false,
    is_editable: true,
    display_order: 30
  },
  {
    id: '31',
    category: 'provider',
    setting_key: 'max_active_jobs',
    setting_value: '3',
    data_type: 'number',
    display_name: 'Max Active Jobs',
    display_name_th: 'งานพร้อมกันสูงสุด',
    description: 'Maximum concurrent active jobs',
    description_th: 'จำนวนงานที่ทำพร้อมกันได้สูงสุด',
    is_public: false,
    is_editable: true,
    validation_rules: { min: 1, max: 10 },
    display_order: 31
  },
  
  // Security Settings
  {
    id: '40',
    category: 'security',
    setting_key: 'max_login_attempts',
    setting_value: '5',
    data_type: 'number',
    display_name: 'Max Login Attempts',
    display_name_th: 'จำนวนครั้งเข้าสู่ระบบสูงสุด',
    description: 'Maximum failed login attempts before lockout',
    description_th: 'จำนวนครั้งที่พยายามเข้าสู่ระบบล้มเหลวก่อนล็อค',
    is_public: false,
    is_editable: true,
    validation_rules: { min: 3, max: 10 },
    display_order: 40
  },
  {
    id: '41',
    category: 'security',
    setting_key: 'session_timeout_hours',
    setting_value: '24',
    data_type: 'number',
    display_name: 'Session Timeout',
    display_name_th: 'หมดเวลาเซสชัน',
    description: 'Session timeout in hours',
    description_th: 'เวลาหมดอายุเซสชัน (ชั่วโมง)',
    is_public: false,
    is_editable: true,
    validation_rules: { min: 1, max: 168 },
    display_order: 41
  },
  
  // Feature Flags
  {
    id: '50',
    category: 'features',
    setting_key: 'delivery_enabled',
    setting_value: 'true',
    data_type: 'boolean',
    display_name: 'Delivery Service',
    display_name_th: 'บริการส่งของ',
    description: 'Enable delivery service',
    description_th: 'เปิดใช้งานบริการส่งของ',
    is_public: true,
    is_editable: true,
    display_order: 50
  },
  {
    id: '51',
    category: 'features',
    setting_key: 'shopping_enabled',
    setting_value: 'true',
    data_type: 'boolean',
    display_name: 'Shopping Service',
    display_name_th: 'บริการช้อปปิ้ง',
    description: 'Enable shopping service',
    description_th: 'เปิดใช้งานบริการช้อปปิ้ง',
    is_public: true,
    is_editable: true,
    display_order: 51
  },
  
  // Notification Settings
  {
    id: '60',
    category: 'notification',
    setting_key: 'push_enabled',
    setting_value: 'true',
    data_type: 'boolean',
    display_name: 'Push Notifications',
    display_name_th: 'การแจ้งเตือนแบบพุช',
    description: 'Enable push notifications',
    description_th: 'เปิดใช้งานการแจ้งเตือนแบบพุช',
    is_public: false,
    is_editable: true,
    display_order: 60
  },
  
  // Map Settings
  {
    id: '70',
    category: 'map',
    setting_key: 'default_zoom',
    setting_value: '13',
    data_type: 'number',
    display_name: 'Default Zoom Level',
    display_name_th: 'ระดับซูมเริ่มต้น',
    description: 'Default map zoom level',
    description_th: 'ระดับซูมแผนที่เริ่มต้น',
    is_public: true,
    is_editable: true,
    validation_rules: { min: 1, max: 20 },
    display_order: 70
  },
  
  // Analytics Settings
  {
    id: '80',
    category: 'analytics',
    setting_key: 'tracking_enabled',
    setting_value: 'true',
    data_type: 'boolean',
    display_name: 'Analytics Tracking',
    display_name_th: 'ติดตามการใช้งาน',
    description: 'Enable analytics tracking',
    description_th: 'เปิดใช้งานการติดตามการใช้งาน',
    is_public: false,
    is_editable: true,
    display_order: 80
  }
]

export function useSystemSettingsMock() {
  const settings = ref<SystemSetting[]>([...mockSettings])
  const categories = ref<SettingCategory[]>([])
  const auditLog = ref<any[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Group settings by category
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

  // Fetch categories
  async function fetchCategories(): Promise<void> {
    isLoading.value = true
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const cats = Object.keys(settingsByCategory.value).map(cat => ({
      category: cat,
      setting_count: settingsByCategory.value[cat].length
    }))
    
    categories.value = cats
    isLoading.value = false
  }

  // Fetch settings by category
  async function fetchSettingsByCategory(category: string): Promise<void> {
    isLoading.value = true
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // Filter is already done by computed property
    isLoading.value = false
  }

  // Fetch all settings
  async function fetchAllSettings(): Promise<void> {
    isLoading.value = true
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // Settings are already loaded
    isLoading.value = false
  }

  // Update setting
  async function updateSetting(
    settingKey: string,
    newValue: string,
    category?: string
  ): Promise<{ success: boolean; message: string }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const index = settings.value.findIndex(
      s => s.setting_key === settingKey && (!category || s.category === category)
    )
    
    if (index === -1) {
      return { success: false, message: 'Setting not found' }
    }
    
    const setting = settings.value[index]
    
    if (!setting.is_editable) {
      return { success: false, message: 'Setting is not editable' }
    }
    
    // Validate
    const validationResult = validateSettingValue(setting, newValue)
    if (!validationResult.valid) {
      return { success: false, message: validationResult.message || 'Invalid value' }
    }
    
    // Update
    const oldValue = setting.setting_value
    settings.value[index].setting_value = newValue
    
    // Add to audit log
    auditLog.value.unshift({
      id: Date.now().toString(),
      setting_key: settingKey,
      category: setting.category,
      old_value: oldValue,
      new_value: newValue,
      changed_by: 'mock-admin',
      changed_at: new Date().toISOString()
    })
    
    return { success: true, message: 'Setting updated successfully' }
  }

  // Validate setting value
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
    }

    // Validation rules
    if (setting.validation_rules) {
      const rules = setting.validation_rules

      if (setting.data_type === 'number') {
        const numValue = Number(value)
        if (rules.min !== undefined && numValue < rules.min) {
          return { valid: false, message: `Value must be at least ${rules.min}` }
        }
        if (rules.max !== undefined && numValue > rules.max) {
          return { valid: false, message: `Value must be at most ${rules.max}` }
        }
      }
    }

    return { valid: true }
  }

  // Fetch audit log
  async function fetchAuditLog(limit = 50): Promise<void> {
    isLoading.value = true
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // Audit log is already populated
    isLoading.value = false
  }

  // Get setting value
  function getSettingValue(key: string, category?: string): string | null {
    const setting = settings.value.find(
      s => s.setting_key === key && (!category || s.category === category)
    )
    return setting?.setting_value || null
  }

  // Get typed value
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
      default:
        return value as T
    }
  }

  // Get category display name
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

  // Get category icon
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
    settings,
    categories,
    auditLog,
    isLoading,
    error,
    settingsByCategory,
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

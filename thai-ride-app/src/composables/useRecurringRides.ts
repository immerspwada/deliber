/**
 * Feature: F15 - Recurring Scheduled Rides
 * Tables: recurring_ride_templates, scheduled_ride_reminders
 * Migration: 050_recurring_rides_and_notifications.sql
 */
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

// Type assertion helper for Supabase
const db = supabase as any

export interface RecurringTemplate {
  id: string
  user_id: string
  pickup_lat: number
  pickup_lng: number
  pickup_address: string
  destination_lat: number
  destination_lng: number
  destination_address: string
  ride_type: 'standard' | 'premium' | 'shared'
  passenger_count: number
  special_requests?: string
  schedule_type: 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'custom'
  schedule_time: string // HH:MM format
  schedule_days?: number[] // 0=Sun, 1=Mon, ..., 6=Sat
  is_active: boolean
  last_generated_at?: string
  next_scheduled_at?: string
  name?: string
  created_at: string
  updated_at: string
}

export interface CreateRecurringTemplateInput {
  pickup_lat: number
  pickup_lng: number
  pickup_address: string
  destination_lat: number
  destination_lng: number
  destination_address: string
  ride_type?: 'standard' | 'premium' | 'shared'
  passenger_count?: number
  special_requests?: string
  schedule_type: 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'custom'
  schedule_time: string
  schedule_days?: number[]
  name?: string
}

export function useRecurringRides() {
  const authStore = useAuthStore()
  const templates = ref<RecurringTemplate[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Schedule type labels
  const scheduleTypeLabels: Record<string, string> = {
    daily: 'ทุกวัน',
    weekdays: 'วันจันทร์-ศุกร์',
    weekends: 'วันเสาร์-อาทิตย์',
    weekly: 'รายสัปดาห์',
    custom: 'กำหนดเอง'
  }

  // Day labels
  const dayLabels = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

  // Active templates
  const activeTemplates = computed(() => 
    templates.value.filter(t => t.is_active)
  )

  // Fetch user's recurring templates
  const fetchTemplates = async () => {
    if (!authStore.user?.id) return

    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await db
        .from('recurring_ride_templates')
        .select('*')
        .eq('user_id', authStore.user.id)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      templates.value = data || []
    } catch (err: any) {
      console.error('Error fetching recurring templates:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  // Create new recurring template
  const createTemplate = async (input: CreateRecurringTemplateInput): Promise<RecurringTemplate | null> => {
    if (!authStore.user?.id) {
      error.value = 'กรุณาเข้าสู่ระบบ'
      return null
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: insertError } = await db
        .from('recurring_ride_templates')
        .insert({
          user_id: authStore.user.id,
          ...input,
          is_active: true
        })
        .select()
        .single()

      if (insertError) throw insertError

      templates.value.unshift(data as RecurringTemplate)
      return data as RecurringTemplate
    } catch (err: any) {
      console.error('Error creating recurring template:', err)
      error.value = err.message
      return null
    } finally {
      loading.value = false
    }
  }

  // Update template
  const updateTemplate = async (
    templateId: string, 
    updates: Partial<CreateRecurringTemplateInput & { is_active: boolean }>
  ): Promise<boolean> => {
    loading.value = true
    error.value = null

    try {
      const { error: updateError } = await db
        .from('recurring_ride_templates')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId)
        .eq('user_id', authStore.user?.id || '')

      if (updateError) throw updateError

      // Update local state
      const index = templates.value.findIndex(t => t.id === templateId)
      if (index !== -1) {
        templates.value[index] = { ...templates.value[index], ...updates } as RecurringTemplate
      }

      return true
    } catch (err: any) {
      console.error('Error updating recurring template:', err)
      error.value = err.message
      return false
    } finally {
      loading.value = false
    }
  }

  // Toggle template active status
  const toggleTemplate = async (templateId: string): Promise<boolean> => {
    const template = templates.value.find(t => t.id === templateId)
    if (!template) return false

    return updateTemplate(templateId, { is_active: !template.is_active })
  }

  // Delete template
  const deleteTemplate = async (templateId: string): Promise<boolean> => {
    loading.value = true
    error.value = null

    try {
      const { error: deleteError } = await db
        .from('recurring_ride_templates')
        .delete()
        .eq('id', templateId)
        .eq('user_id', authStore.user?.id || '')

      if (deleteError) throw deleteError

      templates.value = templates.value.filter(t => t.id !== templateId)
      return true
    } catch (err: any) {
      console.error('Error deleting recurring template:', err)
      error.value = err.message
      return false
    } finally {
      loading.value = false
    }
  }

  // Format schedule description
  const formatSchedule = (template: RecurringTemplate): string => {
    const timeStr = template.schedule_time.slice(0, 5) // HH:MM
    const typeLabel = scheduleTypeLabels[template.schedule_type] || template.schedule_type

    if (template.schedule_type === 'weekly' || template.schedule_type === 'custom') {
      if (template.schedule_days && template.schedule_days.length > 0) {
        const days = template.schedule_days.map(d => dayLabels[d]).join(', ')
        return `${days} เวลา ${timeStr}`
      }
    }

    return `${typeLabel} เวลา ${timeStr}`
  }

  // Get next scheduled time display
  const getNextScheduleDisplay = (template: RecurringTemplate): string => {
    if (!template.next_scheduled_at) return 'ยังไม่กำหนด'

    const nextDate = new Date(template.next_scheduled_at)
    const now = new Date()
    const diffMs = nextDate.getTime() - now.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffMs < 0) return 'รอสร้างรอบถัดไป'
    if (diffHours < 1) return 'ภายใน 1 ชั่วโมง'
    if (diffHours < 24) return `อีก ${diffHours} ชั่วโมง`
    if (diffDays === 1) return 'พรุ่งนี้'
    return `อีก ${diffDays} วัน`
  }

  return {
    templates,
    activeTemplates,
    loading,
    error,
    scheduleTypeLabels,
    dayLabels,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    toggleTemplate,
    deleteTemplate,
    formatSchedule,
    getNextScheduleDisplay
  }
}

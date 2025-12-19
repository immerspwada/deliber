// @ts-nocheck
/**
 * useScheduledRidesV2 - Enhanced Scheduled Rides
 * 
 * Feature: F15 - Scheduled Rides Enhancement V2
 * Tables: scheduled_ride_templates, scheduled_ride_reminders, scheduled_auto_match
 * Migration: 071_scheduled_rides_v2.sql
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

export interface RideTemplate {
  id: string
  user_id: string
  template_name: string
  pickup_lat: number
  pickup_lng: number
  pickup_address: string
  destination_lat: number
  destination_lng: number
  destination_address: string
  vehicle_type: string
  payment_method: string
  notes?: string
  is_recurring: boolean
  recurrence_pattern?: 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'custom'
  recurrence_days: number[]
  recurrence_time?: string
  recurrence_end_date?: string
  auto_book: boolean
  auto_book_minutes_before: number
  preferred_provider_id?: string
  is_active: boolean
}

export interface ScheduledRide {
  id: string
  user_id: string
  template_id?: string
  scheduled_datetime: string
  pickup_address: string
  destination_address: string
  vehicle_type: string
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
  reminder_sent: boolean
  auto_booked: boolean
}

export function useScheduledRidesV2() {
  const authStore = useAuthStore()
  const loading = ref(false)
  const error = ref<string | null>(null)

  const templates = ref<RideTemplate[]>([])
  const scheduledRides = ref<ScheduledRide[]>([])

  const activeTemplates = computed(() => templates.value.filter(t => t.is_active))
  const recurringTemplates = computed(() => templates.value.filter(t => t.is_recurring))
  const upcomingRides = computed(() => 
    scheduledRides.value
      .filter(r => r.status === 'scheduled' && new Date(r.scheduled_datetime) > new Date())
      .sort((a, b) => new Date(a.scheduled_datetime).getTime() - new Date(b.scheduled_datetime).getTime())
  )

  const fetchTemplates = async () => {
    if (!authStore.user?.id) return
    try {
      const { data, error: err } = await supabase
        .from('scheduled_ride_templates')
        .select('*')
        .eq('user_id', authStore.user.id)
        .order('created_at', { ascending: false })
      if (err) throw err
      templates.value = data || []
    } catch (e: any) {
      console.error('Fetch templates error:', e)
    }
  }

  const createTemplate = async (template: Partial<RideTemplate>): Promise<RideTemplate | null> => {
    if (!authStore.user?.id) return null
    try {
      const { data, error: err } = await supabase
        .from('scheduled_ride_templates')
        .insert({ ...template, user_id: authStore.user.id })
        .select()
        .single()
      if (err) throw err
      templates.value.unshift(data)
      return data
    } catch (e: any) {
      console.error('Create template error:', e)
      return null
    }
  }

  const updateTemplate = async (id: string, updates: Partial<RideTemplate>): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('scheduled_ride_templates')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (err) throw err
      await fetchTemplates()
      return true
    } catch (e: any) {
      console.error('Update template error:', e)
      return false
    }
  }

  const deleteTemplate = async (id: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('scheduled_ride_templates')
        .delete()
        .eq('id', id)
      if (err) throw err
      templates.value = templates.value.filter(t => t.id !== id)
      return true
    } catch (e: any) {
      console.error('Delete template error:', e)
      return false
    }
  }

  const createRideFromTemplate = async (templateId: string, datetime: Date): Promise<string | null> => {
    try {
      const { data, error: err } = await supabase
        .rpc('create_ride_from_template', {
          p_template_id: templateId,
          p_scheduled_datetime: datetime.toISOString()
        })
      if (err) throw err
      await fetchScheduledRides()
      return data
    } catch (e: any) {
      console.error('Create ride from template error:', e)
      return null
    }
  }

  const generateRecurringRides = async (templateId: string, daysAhead = 7): Promise<number> => {
    try {
      const { data, error: err } = await supabase
        .rpc('generate_recurring_rides', {
          p_template_id: templateId,
          p_days_ahead: daysAhead
        })
      if (err) throw err
      await fetchScheduledRides()
      return data || 0
    } catch (e: any) {
      console.error('Generate recurring rides error:', e)
      return 0
    }
  }

  const fetchScheduledRides = async () => {
    if (!authStore.user?.id) return
    try {
      const { data, error: err } = await supabase
        .from('scheduled_rides')
        .select('*')
        .eq('user_id', authStore.user.id)
        .order('scheduled_datetime')
      if (err) throw err
      scheduledRides.value = data || []
    } catch (e: any) {
      console.error('Fetch scheduled rides error:', e)
    }
  }

  const cancelScheduledRide = async (id: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('scheduled_rides')
        .update({ status: 'cancelled' })
        .eq('id', id)
      if (err) throw err
      await fetchScheduledRides()
      return true
    } catch (e: any) {
      console.error('Cancel scheduled ride error:', e)
      return false
    }
  }

  const init = async () => {
    loading.value = true
    try {
      await Promise.all([fetchTemplates(), fetchScheduledRides()])
    } finally {
      loading.value = false
    }
  }

  return {
    loading, error, templates, scheduledRides,
    activeTemplates, recurringTemplates, upcomingRides,
    fetchTemplates, createTemplate, updateTemplate, deleteTemplate,
    createRideFromTemplate, generateRecurringRides,
    fetchScheduledRides, cancelScheduledRide, init
  }
}

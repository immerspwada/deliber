/**
 * useDriverSchedule - Driver Schedule Management
 * Feature: F230 - Driver Schedule
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface ScheduleSlot {
  id: string
  provider_id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
}

export function useDriverSchedule() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const slots = ref<ScheduleSlot[]>([])

  const activeSlots = computed(() => slots.value.filter(s => s.is_active))

  const fetchSchedule = async (providerId: string) => {
    loading.value = true
    try {
      const { data, error: err } = await supabase.from('provider_schedules').select('*').eq('provider_id', providerId).order('day_of_week')
      if (err) throw err
      slots.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const addSlot = async (slot: Partial<ScheduleSlot>): Promise<boolean> => {
    try {
      const { data, error: err } = await supabase.from('provider_schedules').insert({ ...slot, is_active: true } as never).select().single()
      if (err) throw err
      slots.value.push(data)
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const removeSlot = async (id: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('provider_schedules').delete().eq('id', id)
      if (err) throw err
      slots.value = slots.value.filter(s => s.id !== id)
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const getDayText = (day: number) => ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'][day] || ''

  return { loading, error, slots, activeSlots, fetchSchedule, addSlot, removeSlot, getDayText }
}

/**
 * useEmergencyResponse - Emergency Response System
 * Feature: F235 - Emergency Response
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface EmergencyAlert {
  id: string
  ride_id: string
  user_id: string
  provider_id?: string
  alert_type: 'sos' | 'accident' | 'threat' | 'medical'
  location_lat: number
  location_lng: number
  status: 'active' | 'responding' | 'resolved'
  created_at: string
  resolved_at?: string
}

export function useEmergencyResponse() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const alerts = ref<EmergencyAlert[]>([])

  const activeAlerts = computed(() => alerts.value.filter(a => a.status === 'active' || a.status === 'responding'))

  const fetchAlerts = async (status?: string) => {
    loading.value = true
    try {
      let query = supabase.from('emergency_alerts').select('*').order('created_at', { ascending: false })
      if (status) query = query.eq('status', status)
      const { data, error: err } = await query
      if (err) throw err
      alerts.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const triggerSOS = async (rideId: string, userId: string, lat: number, lng: number, alertType: string = 'sos'): Promise<EmergencyAlert | null> => {
    try {
      const { data, error: err } = await supabase.from('emergency_alerts').insert({ ride_id: rideId, user_id: userId, alert_type: alertType, location_lat: lat, location_lng: lng, status: 'active' } as never).select().single()
      if (err) throw err
      alerts.value.unshift(data)
      return data
    } catch (e: any) { error.value = e.message; return null }
  }

  const updateStatus = async (id: string, status: string): Promise<boolean> => {
    try {
      const updates: any = { status }
      if (status === 'resolved') updates.resolved_at = new Date().toISOString()
      const { error: err } = await supabase.from('emergency_alerts').update(updates).eq('id', id)
      if (err) throw err
      const idx = alerts.value.findIndex(a => a.id === id)
      if (idx !== -1) alerts.value[idx].status = status as any
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const getAlertTypeText = (t: string) => ({ sos: 'SOS ฉุกเฉิน', accident: 'อุบัติเหตุ', threat: 'ถูกคุกคาม', medical: 'เจ็บป่วย' }[t] || t)
  const getStatusColor = (s: string) => ({ active: '#E53935', responding: '#F5A623', resolved: '#00A86B' }[s] || '#666')

  return { loading, error, alerts, activeAlerts, fetchAlerts, triggerSOS, updateStatus, getAlertTypeText, getStatusColor }
}

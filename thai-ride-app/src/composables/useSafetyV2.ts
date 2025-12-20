// @ts-nocheck
/**
 * useSafetyV2 - Enhanced Safety Features
 * 
 * Feature: F13 - Safety Features Enhancement V2
 * Tables: safety_profiles, trusted_contacts, safety_alerts, 
 *         live_tracking_sessions, route_monitoring, safety_checkins
 * Migration: 069_safety_v2.sql
 * 
 * @syncs-with
 * - Customer: SOS, live tracking, trusted contacts
 * - Provider: Safety alerts, route monitoring
 * - Admin: Monitor alerts, resolve incidents
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

// Types
export interface SafetyProfile {
  id: string
  user_id: string
  auto_share_rides: boolean
  auto_share_after_minutes: number
  share_with_contacts: boolean
  preferred_gender_driver: 'any' | 'male' | 'female'
  night_mode_enabled: boolean
  night_mode_start: string
  night_mode_end: string
  require_driver_photo_match: boolean
  require_vehicle_photo_match: boolean
  emergency_contact_primary?: string
  emergency_message: string
}

export interface TrustedContact {
  id: string
  user_id: string
  contact_name: string
  contact_phone: string
  contact_email?: string
  relationship?: string
  can_track_live: boolean
  can_receive_alerts: boolean
  can_receive_trip_summary: boolean
  is_verified: boolean
  is_primary: boolean
  sort_order: number
}

export interface SafetyAlert {
  id: string
  user_id: string
  alert_type: 'sos' | 'panic' | 'route_deviation' | 'long_stop' | 'speed_alert' | 'geofence_exit' | 'no_movement' | 'manual'
  lat?: number
  lng?: number
  address?: string
  ride_id?: string
  delivery_id?: string
  provider_id?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  message?: string
  auto_generated: boolean
  status: 'active' | 'acknowledged' | 'resolved' | 'false_alarm'
  contacts_notified: any[]
  authorities_notified: boolean
  created_at: string
}

export interface LiveTrackingSession {
  id: string
  user_id: string
  session_type: 'ride' | 'delivery' | 'manual'
  ride_id?: string
  delivery_id?: string
  share_token: string
  share_url: string
  expires_at: string
  shared_with_contacts: string[]
  is_active: boolean
  started_at: string
  view_count: number
}

export interface SafetySummary {
  total_alerts: number
  active_alerts: number
  trusted_contacts_count: number
  has_safety_profile: boolean
  last_checkin?: string
}

export function useSafetyV2() {
  const authStore = useAuthStore()
  const loading = ref(false)
  const error = ref<string | null>(null)

  // State
  const profile = ref<SafetyProfile | null>(null)
  const contacts = ref<TrustedContact[]>([])
  const alerts = ref<SafetyAlert[]>([])
  const activeSession = ref<LiveTrackingSession | null>(null)
  const summary = ref<SafetySummary | null>(null)

  // Computed
  const primaryContact = computed(() => 
    contacts.value.find(c => c.is_primary)
  )

  const activeAlerts = computed(() => 
    alerts.value.filter(a => a.status === 'active')
  )

  const criticalAlerts = computed(() => 
    alerts.value.filter(a => a.severity === 'critical' && a.status === 'active')
  )

  const isNightMode = computed(() => {
    if (!profile.value?.night_mode_enabled) return false
    const now = new Date()
    const hours = now.getHours()
    const startHour = parseInt(profile.value.night_mode_start?.split(':')[0] || '22')
    const endHour = parseInt(profile.value.night_mode_end?.split(':')[0] || '6')
    return hours >= startHour || hours < endHour
  })

  // =====================================================
  // PROFILE FUNCTIONS
  // =====================================================

  /**
   * Fetch safety profile
   */
  const fetchProfile = async () => {
    if (!authStore.user?.id) return

    try {
      // Use maybeSingle() to avoid 406 error when profile doesn't exist
      const { data, error: err } = await supabase
        .from('safety_profiles')
        .select('*')
        .eq('user_id', authStore.user.id)
        .maybeSingle()

      if (err) throw err
      profile.value = data
    } catch (e: any) {
      console.error('Fetch profile error:', e)
    }
  }

  /**
   * Update safety profile
   */
  const updateProfile = async (updates: Partial<SafetyProfile>): Promise<boolean> => {
    if (!authStore.user?.id) return false

    try {
      const { error: err } = await supabase
        .from('safety_profiles')
        .upsert({
          user_id: authStore.user.id,
          ...updates,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })

      if (err) throw err
      await fetchProfile()
      return true
    } catch (e: any) {
      console.error('Update profile error:', e)
      return false
    }
  }

  // =====================================================
  // TRUSTED CONTACTS FUNCTIONS
  // =====================================================

  /**
   * Fetch trusted contacts
   */
  const fetchContacts = async () => {
    if (!authStore.user?.id) return

    try {
      const { data, error: err } = await supabase
        .from('trusted_contacts')
        .select('*')
        .eq('user_id', authStore.user.id)
        .order('sort_order')

      if (err) throw err
      contacts.value = data || []
    } catch (e: any) {
      console.error('Fetch contacts error:', e)
    }
  }

  /**
   * Add trusted contact
   */
  const addContact = async (contact: Partial<TrustedContact>): Promise<TrustedContact | null> => {
    if (!authStore.user?.id) return null

    try {
      const { data, error: err } = await supabase
        .from('trusted_contacts')
        .insert({
          user_id: authStore.user.id,
          ...contact
        })
        .select()
        .single()

      if (err) throw err
      contacts.value.push(data)
      return data
    } catch (e: any) {
      console.error('Add contact error:', e)
      return null
    }
  }

  /**
   * Update trusted contact
   */
  const updateContact = async (id: string, updates: Partial<TrustedContact>): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('trusted_contacts')
        .update(updates)
        .eq('id', id)

      if (err) throw err

      const idx = contacts.value.findIndex(c => c.id === id)
      if (idx !== -1) {
        contacts.value[idx] = { ...contacts.value[idx], ...updates }
      }
      return true
    } catch (e: any) {
      console.error('Update contact error:', e)
      return false
    }
  }

  /**
   * Remove trusted contact
   */
  const removeContact = async (id: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('trusted_contacts')
        .delete()
        .eq('id', id)

      if (err) throw err
      contacts.value = contacts.value.filter(c => c.id !== id)
      return true
    } catch (e: any) {
      console.error('Remove contact error:', e)
      return false
    }
  }

  /**
   * Set primary contact
   */
  const setPrimaryContact = async (id: string): Promise<boolean> => {
    if (!authStore.user?.id) return false

    try {
      // Clear existing primary
      await supabase
        .from('trusted_contacts')
        .update({ is_primary: false })
        .eq('user_id', authStore.user.id)

      // Set new primary
      await supabase
        .from('trusted_contacts')
        .update({ is_primary: true })
        .eq('id', id)

      await fetchContacts()
      return true
    } catch (e: any) {
      console.error('Set primary contact error:', e)
      return false
    }
  }

  // =====================================================
  // SOS & ALERTS FUNCTIONS
  // =====================================================

  /**
   * Trigger SOS alert
   */
  const triggerSOS = async (
    lat: number,
    lng: number,
    rideId?: string,
    message?: string
  ): Promise<string | null> => {
    if (!authStore.user?.id) return null

    loading.value = true
    try {
      const { data, error: err } = await supabase
        .rpc('trigger_sos_alert', {
          p_user_id: authStore.user.id,
          p_lat: lat,
          p_lng: lng,
          p_ride_id: rideId,
          p_message: message
        })

      if (err) throw err
      
      // Refresh alerts
      await fetchAlerts()
      
      return data
    } catch (e: any) {
      error.value = e.message
      console.error('Trigger SOS error:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch safety alerts
   */
  const fetchAlerts = async () => {
    if (!authStore.user?.id) return

    try {
      const { data, error: err } = await supabase
        .from('safety_alerts')
        .select('*')
        .eq('user_id', authStore.user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (err) throw err
      alerts.value = data || []
    } catch (e: any) {
      console.error('Fetch alerts error:', e)
    }
  }

  /**
   * Create manual alert
   */
  const createAlert = async (
    alertType: SafetyAlert['alert_type'],
    lat: number,
    lng: number,
    message?: string,
    severity: SafetyAlert['severity'] = 'medium'
  ): Promise<string | null> => {
    if (!authStore.user?.id) return null

    try {
      const { data, error: err } = await supabase
        .from('safety_alerts')
        .insert({
          user_id: authStore.user.id,
          alert_type: alertType,
          lat,
          lng,
          message,
          severity,
          auto_generated: false
        })
        .select()
        .single()

      if (err) throw err
      alerts.value.unshift(data)
      return data.id
    } catch (e: any) {
      console.error('Create alert error:', e)
      return null
    }
  }

  // =====================================================
  // LIVE TRACKING FUNCTIONS
  // =====================================================

  /**
   * Start live tracking session
   */
  const startLiveTracking = async (
    sessionType: 'ride' | 'delivery' | 'manual',
    rideId?: string,
    durationHours = 24
  ): Promise<LiveTrackingSession | null> => {
    if (!authStore.user?.id) return null

    try {
      const { data, error: err } = await supabase
        .rpc('create_live_tracking', {
          p_user_id: authStore.user.id,
          p_session_type: sessionType,
          p_ride_id: rideId,
          p_duration_hours: durationHours
        })

      if (err) throw err

      // Fetch full session
      const { data: session } = await supabase
        .from('live_tracking_sessions')
        .select('*')
        .eq('id', data[0].session_id)
        .single()

      activeSession.value = session
      return session
    } catch (e: any) {
      console.error('Start live tracking error:', e)
      return null
    }
  }

  /**
   * Share tracking with contacts
   */
  const shareWithContacts = async (
    sessionId: string,
    contactIds: string[]
  ): Promise<boolean> => {
    try {
      const { data, error: err } = await supabase
        .rpc('share_tracking_with_contacts', {
          p_session_id: sessionId,
          p_contact_ids: contactIds
        })

      if (err) throw err
      return data || false
    } catch (e: any) {
      console.error('Share tracking error:', e)
      return false
    }
  }

  /**
   * Stop live tracking
   */
  const stopLiveTracking = async (sessionId: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('live_tracking_sessions')
        .update({
          is_active: false,
          ended_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      if (err) throw err
      activeSession.value = null
      return true
    } catch (e: any) {
      console.error('Stop live tracking error:', e)
      return false
    }
  }

  /**
   * Get tracking by token (public)
   */
  const getTrackingByToken = async (token: string): Promise<LiveTrackingSession | null> => {
    try {
      const { data, error: err } = await supabase
        .from('live_tracking_sessions')
        .select('*')
        .eq('share_token', token)
        .eq('is_active', true)
        .single()

      if (err) throw err

      // Increment view count
      await supabase
        .from('live_tracking_sessions')
        .update({
          view_count: (data.view_count || 0) + 1,
          last_viewed_at: new Date().toISOString()
        })
        .eq('id', data.id)

      return data
    } catch (e: any) {
      console.error('Get tracking error:', e)
      return null
    }
  }

  // =====================================================
  // SAFETY CHECK-IN FUNCTIONS
  // =====================================================

  /**
   * Submit safety check-in
   */
  const submitCheckin = async (
    status: 'ok' | 'help_needed',
    lat: number,
    lng: number,
    rideId?: string
  ): Promise<boolean> => {
    if (!authStore.user?.id) return false

    try {
      const { error: err } = await supabase
        .from('safety_checkins')
        .insert({
          user_id: authStore.user.id,
          ride_id: rideId,
          checkin_type: 'manual',
          status,
          lat,
          lng,
          responded_at: new Date().toISOString()
        })

      if (err) throw err

      // If help needed, trigger alert
      if (status === 'help_needed') {
        await createAlert('manual', lat, lng, 'User requested help via check-in', 'high')
      }

      return true
    } catch (e: any) {
      console.error('Submit checkin error:', e)
      return false
    }
  }

  // =====================================================
  // SUMMARY & INIT
  // =====================================================

  /**
   * Fetch safety summary
   */
  const fetchSummary = async () => {
    if (!authStore.user?.id) return

    try {
      const { data, error: err } = await supabase
        .rpc('get_safety_summary', { p_user_id: authStore.user.id })

      if (err) throw err
      summary.value = data?.[0] || null
    } catch (e: any) {
      console.error('Fetch summary error:', e)
    }
  }

  /**
   * Initialize safety features
   */
  const init = async () => {
    await Promise.all([
      fetchProfile(),
      fetchContacts(),
      fetchAlerts(),
      fetchSummary()
    ])
  }

  // =====================================================
  // ADMIN FUNCTIONS
  // =====================================================

  /**
   * Fetch all alerts (admin)
   */
  const fetchAllAlerts = async (filter?: { status?: string; severity?: string }) => {
    try {
      let query = supabase
        .from('safety_alerts')
        .select('*, user:users(name, phone_number)')

      if (filter?.status) query = query.eq('status', filter.status)
      if (filter?.severity) query = query.eq('severity', filter.severity)

      const { data, error: err } = await query.order('created_at', { ascending: false })
      if (err) throw err
      return data || []
    } catch (e: any) {
      console.error('Fetch all alerts error:', e)
      return []
    }
  }

  /**
   * Resolve alert (admin)
   */
  const resolveAlert = async (
    alertId: string,
    status: 'resolved' | 'false_alarm',
    notes?: string
  ): Promise<boolean> => {
    if (!authStore.user?.id) return false

    try {
      const { data, error: err } = await supabase
        .rpc('resolve_safety_alert', {
          p_alert_id: alertId,
          p_resolver_id: authStore.user.id,
          p_status: status,
          p_notes: notes
        })

      if (err) throw err
      return data || false
    } catch (e: any) {
      console.error('Resolve alert error:', e)
      return false
    }
  }

  return {
    // State
    loading,
    error,
    profile,
    contacts,
    alerts,
    activeSession,
    summary,

    // Computed
    primaryContact,
    activeAlerts,
    criticalAlerts,
    isNightMode,

    // Profile functions
    fetchProfile,
    updateProfile,

    // Contact functions
    fetchContacts,
    addContact,
    updateContact,
    removeContact,
    setPrimaryContact,

    // SOS & Alert functions
    triggerSOS,
    fetchAlerts,
    createAlert,

    // Live tracking functions
    startLiveTracking,
    shareWithContacts,
    stopLiveTracking,
    getTrackingByToken,

    // Check-in functions
    submitCheckin,

    // Summary & Init
    fetchSummary,
    init,

    // Admin functions
    fetchAllAlerts,
    resolveAlert
  }
}

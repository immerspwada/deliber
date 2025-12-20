/**
 * Incident Management Composable
 * Track and manage production incidents
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { logger } from '../utils/logger'

export interface Incident {
  id: string
  incident_number: number
  title: string
  description?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'investigating' | 'identified' | 'monitoring' | 'resolved'
  impact?: string
  affected_services?: string[]
  started_at: string
  identified_at?: string
  resolved_at?: string
  duration_minutes?: number
  root_cause?: string
  resolution?: string
  assigned_to?: string
}

export interface TimelineEvent {
  id: string
  incident_id: string
  event_type: string
  description: string
  created_by?: string
  created_at: string
}

export interface OnCallPerson {
  user_id: string
  user_name: string
  user_email: string
  is_primary: boolean
  shift_end: string
}

export interface IncidentStats {
  total_incidents: number
  open_incidents: number
  resolved_incidents: number
  avg_resolution_minutes: number
  mttr_minutes: number
  by_severity: Record<string, number>
}

export function useIncidentManagement() {
  const incidents = ref<Incident[]>([])
  const currentIncident = ref<Incident | null>(null)
  const timeline = ref<TimelineEvent[]>([])
  const onCallTeam = ref<OnCallPerson[]>([])
  const stats = ref<IncidentStats | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Fetch all incidents
   */
  const fetchIncidents = async (status?: string): Promise<Incident[]> => {
    loading.value = true
    try {
      let query = supabase
        .from('incidents')
        .select('*')
        .order('started_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error: fetchError } = await query.limit(100)
      if (fetchError) throw fetchError
      incidents.value = data || []
      return incidents.value
    } catch (err: any) {
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Create new incident
   */
  const createIncident = async (params: {
    title: string
    description?: string
    severity: Incident['severity']
    affectedServices?: string[]
    createdBy: string
  }): Promise<string | null> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('create_incident', {
        p_title: params.title,
        p_description: params.description || null,
        p_severity: params.severity,
        p_affected_services: params.affectedServices || [],
        p_created_by: params.createdBy
      })

      if (rpcError) throw rpcError
      await fetchIncidents()
      return data
    } catch (err) {
      logger.error('Failed to create incident:', err)
      return null
    }
  }

  /**
   * Update incident status
   */
  const updateStatus = async (
    incidentId: string,
    status: Incident['status'],
    description: string,
    updatedBy: string
  ): Promise<boolean> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('update_incident_status', {
        p_incident_id: incidentId,
        p_status: status,
        p_description: description,
        p_updated_by: updatedBy
      })

      if (rpcError) throw rpcError
      await fetchIncidents()
      return data
    } catch (err) {
      logger.error('Failed to update incident status:', err)
      return false
    }
  }

  /**
   * Fetch incident timeline
   */
  const fetchTimeline = async (incidentId: string): Promise<TimelineEvent[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('incident_timeline')
        .select('*')
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: true })

      if (fetchError) throw fetchError
      timeline.value = data || []
      return timeline.value
    } catch (err: any) {
      error.value = err.message
      return []
    }
  }

  /**
   * Add timeline event
   */
  const addTimelineEvent = async (
    incidentId: string,
    eventType: string,
    description: string,
    createdBy: string
  ): Promise<boolean> => {
    try {
      const { error: insertError } = await supabase
        .from('incident_timeline')
        .insert({
          incident_id: incidentId,
          event_type: eventType,
          description,
          created_by: createdBy
        })

      if (insertError) throw insertError
      await fetchTimeline(incidentId)
      return true
    } catch (err) {
      logger.error('Failed to add timeline event:', err)
      return false
    }
  }

  /**
   * Get current on-call team
   */
  const fetchOnCall = async (): Promise<OnCallPerson[]> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('get_current_oncall')
      if (rpcError) throw rpcError
      onCallTeam.value = data || []
      return onCallTeam.value
    } catch (err: any) {
      error.value = err.message
      return []
    }
  }

  /**
   * Fetch incident statistics
   */
  const fetchStats = async (days = 30): Promise<IncidentStats | null> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('get_incident_statistics', {
        p_days: days
      })

      if (rpcError) throw rpcError
      stats.value = data?.[0] || null
      return stats.value
    } catch (err: any) {
      error.value = err.message
      return null
    }
  }

  /**
   * Update incident details
   */
  const updateIncident = async (
    incidentId: string,
    updates: Partial<Incident>
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('incidents')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', incidentId)

      if (updateError) throw updateError
      await fetchIncidents()
      return true
    } catch (err) {
      logger.error('Failed to update incident:', err)
      return false
    }
  }

  // Computed
  const openIncidents = computed(() => 
    incidents.value.filter(i => i.status !== 'resolved')
  )

  const criticalIncidents = computed(() => 
    incidents.value.filter(i => i.severity === 'critical' && i.status !== 'resolved')
  )

  const hasActiveIncidents = computed(() => openIncidents.value.length > 0)

  const mttr = computed(() => stats.value?.mttr_minutes || 0)

  return {
    incidents,
    currentIncident,
    timeline,
    onCallTeam,
    stats,
    loading,
    error,
    openIncidents,
    criticalIncidents,
    hasActiveIncidents,
    mttr,
    fetchIncidents,
    createIncident,
    updateStatus,
    fetchTimeline,
    addTimelineEvent,
    fetchOnCall,
    fetchStats,
    updateIncident
  }
}

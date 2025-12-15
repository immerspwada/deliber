import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import type { 
  TrackingLookupResult,
  ChatSession,
  SupportTicket,
  Complaint,
  Refund,
  SafetyIncident
} from '../types/database'

// Tracking ID utilities
export function useTracking() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Parse tracking ID to get type and info
  const parseTrackingId = (trackingId: string) => {
    const parts = trackingId.split('-')
    if (parts.length !== 3) return null
    
    const [prefix, dateStr, sequenceStr] = parts
    const typeMap: Record<string, string> = {
      'CUS': 'customer',
      'RDR': 'rider',
      'DRV': 'driver',
      'ORD': 'order',
      'RID': 'ride',
      'DEL': 'delivery',
      'SHP': 'shopping',
      'PAY': 'payment',
      'TXN': 'transaction',
      'CHT': 'chat',
      'SUP': 'support',
      'CMP': 'complaint',
      'RFD': 'refund',
      'PRM': 'promo',
      'NTF': 'notification',
      'SES': 'session'
    }
    
    return {
      prefix: prefix || '',
      type: prefix ? (typeMap[prefix] || 'unknown') : 'unknown',
      date: dateStr ? `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}` : '',
      sequence: sequenceStr ? parseInt(sequenceStr, 10) : 0
    }
  }

  // Lookup entity by tracking ID
  const lookupByTrackingId = async (trackingId: string): Promise<TrackingLookupResult[]> => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: err } = await (supabase.rpc as any)('lookup_by_tracking_id', { 
        p_tracking_id: trackingId 
      })
      
      if (err) throw err
      return data || []
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Lookup failed'
      return []
    } finally {
      loading.value = false
    }
  }

  // Format tracking ID for display
  const formatTrackingId = (trackingId: string): string => {
    const parsed = parseTrackingId(trackingId)
    if (!parsed) return trackingId
    return `${parsed.prefix}-${parsed.date.replace(/-/g, '')}-${String(parsed.sequence).padStart(6, '0')}`
  }

  // Get entity type label in Thai
  const getEntityTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'customer': 'ลูกค้า',
      'rider': 'ไรเดอร์',
      'driver': 'คนขับ',
      'order': 'คำสั่งซื้อ',
      'ride': 'การเดินทาง',
      'delivery': 'การจัดส่ง',
      'shopping': 'ซื้อของ',
      'payment': 'การชำระเงิน',
      'transaction': 'ธุรกรรม',
      'chat': 'แชท',
      'support': 'ตั๋วช่วยเหลือ',
      'complaint': 'ข้อร้องเรียน',
      'refund': 'การคืนเงิน',
      'promo': 'โปรโมชั่น',
      'notification': 'การแจ้งเตือน',
      'session': 'เซสชัน'
    }
    return labels[type] || type
  }

  return {
    loading,
    error,
    parseTrackingId,
    lookupByTrackingId,
    formatTrackingId,
    getEntityTypeLabel
  }
}

// Chat management
export function useChatSessions() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const sessions = ref<ChatSession[]>([])

  const createChatSession = async (
    userId: string,
    providerId: string,
    requestType: 'ride' | 'delivery' | 'shopping',
    requestId: string
  ): Promise<ChatSession | null> => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: err } = await (supabase
        .from('chat_sessions') as any)
        .insert({
          user_id: userId,
          provider_id: providerId,
          request_type: requestType,
          request_id: requestId
        })
        .select()
        .single()
      
      if (err) throw err
      return data
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to create chat'
      return null
    } finally {
      loading.value = false
    }
  }

  const getChatSessions = async (userId: string): Promise<ChatSession[]> => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: err } = await (supabase
        .from('chat_sessions') as any)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (err) throw err
      sessions.value = data || []
      return sessions.value
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to load chats'
      return []
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    sessions,
    createChatSession,
    getChatSessions
  }
}

// Support tickets
export function useSupport() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const tickets = ref<SupportTicket[]>([])

  const createTicket = async (ticket: {
    user_id: string
    related_request_type?: 'ride' | 'delivery' | 'shopping' | null
    related_request_id?: string | null
    category: 'payment' | 'service' | 'driver' | 'app' | 'safety' | 'other'
    subject: string
    description: string
    priority?: 'low' | 'normal' | 'high' | 'urgent'
  }): Promise<SupportTicket | null> => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: err } = await (supabase
        .from('support_tickets') as any)
        .insert(ticket)
        .select()
        .single()
      
      if (err) throw err
      return data
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to create ticket'
      return null
    } finally {
      loading.value = false
    }
  }

  const getTickets = async (userId: string): Promise<SupportTicket[]> => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: err } = await (supabase
        .from('support_tickets') as any)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (err) throw err
      tickets.value = data || []
      return tickets.value
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to load tickets'
      return []
    } finally {
      loading.value = false
    }
  }

  const getTicketByTrackingId = async (trackingId: string): Promise<SupportTicket | null> => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: err } = await (supabase
        .from('support_tickets') as any)
        .select('*')
        .eq('tracking_id', trackingId)
        .single()
      
      if (err) throw err
      return data
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Ticket not found'
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    tickets,
    createTicket,
    getTickets,
    getTicketByTrackingId
  }
}

// Complaints
export function useComplaints() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const complaints = ref<Complaint[]>([])

  const createComplaint = async (complaint: {
    user_id: string
    provider_id?: string | null
    request_type: 'ride' | 'delivery' | 'shopping'
    request_id: string
    complaint_type: 'behavior' | 'safety' | 'pricing' | 'quality' | 'delay' | 'damage' | 'other'
    description: string
    evidence_urls?: string[]
  }): Promise<Complaint | null> => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: err } = await (supabase
        .from('complaints') as any)
        .insert(complaint)
        .select()
        .single()
      
      if (err) throw err
      return data
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to create complaint'
      return null
    } finally {
      loading.value = false
    }
  }

  const getComplaints = async (userId: string): Promise<Complaint[]> => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: err } = await (supabase
        .from('complaints') as any)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (err) throw err
      complaints.value = data || []
      return complaints.value
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to load complaints'
      return []
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    complaints,
    createComplaint,
    getComplaints
  }
}

// Refunds
export function useRefunds() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const refunds = ref<Refund[]>([])

  const requestRefund = async (refund: {
    payment_id: string
    user_id: string
    amount: number
    reason: string
    description?: string | null
  }): Promise<Refund | null> => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: err } = await (supabase
        .from('refunds') as any)
        .insert(refund)
        .select()
        .single()
      
      if (err) throw err
      return data
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to request refund'
      return null
    } finally {
      loading.value = false
    }
  }

  const getRefunds = async (userId: string): Promise<Refund[]> => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: err } = await (supabase
        .from('refunds') as any)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (err) throw err
      refunds.value = data || []
      return refunds.value
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to load refunds'
      return []
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    refunds,
    requestRefund,
    getRefunds
  }
}

// Safety incidents
export function useSafetyIncidents() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const incidents = ref<SafetyIncident[]>([])

  const reportIncident = async (incident: {
    user_id: string
    provider_id?: string | null
    request_type: 'ride' | 'delivery' | 'shopping'
    request_id: string
    incident_type: 'sos' | 'accident' | 'harassment' | 'theft' | 'other'
    description?: string | null
    location_lat?: number | null
    location_lng?: number | null
  }): Promise<SafetyIncident | null> => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: err } = await (supabase
        .from('safety_incidents') as any)
        .insert(incident)
        .select()
        .single()
      
      if (err) throw err
      return data
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to report incident'
      return null
    } finally {
      loading.value = false
    }
  }

  const getIncidents = async (userId: string): Promise<SafetyIncident[]> => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: err } = await (supabase
        .from('safety_incidents') as any)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (err) throw err
      incidents.value = data || []
      return incidents.value
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to load incidents'
      return []
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    incidents,
    reportIncident,
    getIncidents
  }
}

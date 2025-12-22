/**
 * useCustomerSupport - Customer Support Tickets
 * Feature: F233 - Customer Support
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface SupportTicket {
  id: string
  user_id: string
  subject: string
  category: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  assigned_to?: string
  created_at: string
  resolved_at?: string
}

export function useCustomerSupport() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const tickets = ref<SupportTicket[]>([])

  const openTickets = computed(() => tickets.value.filter(t => t.status === 'open' || t.status === 'in_progress'))
  const urgentTickets = computed(() => tickets.value.filter(t => t.priority === 'urgent' && t.status !== 'closed'))

  const fetchTickets = async (status?: string) => {
    loading.value = true
    try {
      let query = supabase.from('support_tickets').select('*').order('created_at', { ascending: false })
      if (status) query = query.eq('status', status)
      const { data, error: err } = await query
      if (err) throw err
      tickets.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const createTicket = async (ticket: Partial<SupportTicket>): Promise<SupportTicket | null> => {
    try {
      const { data, error: err } = await supabase.from('support_tickets').insert({ ...ticket, status: 'open' } as never).select().single()
      if (err) throw err
      tickets.value.unshift(data)
      return data
    } catch (e: any) { error.value = e.message; return null }
  }

  const updateStatus = async (id: string, status: string): Promise<boolean> => {
    try {
      const updates: any = { status }
      if (status === 'resolved' || status === 'closed') updates.resolved_at = new Date().toISOString()
      const { error: err } = await supabase.from('support_tickets').update(updates).eq('id', id)
      if (err) throw err
      const idx = tickets.value.findIndex(t => t.id === id)
      if (idx !== -1) tickets.value[idx].status = status as any
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const getPriorityColor = (p: string) => ({ low: '#00A86B', medium: '#F5A623', high: '#E53935', urgent: '#B71C1C' }[p] || '#666')
  const getStatusText = (s: string) => ({ open: 'เปิด', in_progress: 'กำลังดำเนินการ', resolved: 'แก้ไขแล้ว', closed: 'ปิด' }[s] || s)

  return { loading, error, tickets, openTickets, urgentTickets, fetchTickets, createTicket, updateStatus, getPriorityColor, getStatusText }
}

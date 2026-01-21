/**
 * useSupportChatV2 - Customer Support Chat
 * Feature: F223 - Support Chat
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface SupportTicket {
  id: string
  user_id: string
  subject: string
  category: 'ride' | 'payment' | 'account' | 'technical' | 'other'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed'
  assigned_to?: string
  created_at: string
}

export interface SupportMessage {
  id: string
  ticket_id: string
  sender_id: string
  sender_type: 'customer' | 'agent' | 'system'
  message: string
  created_at: string
}

export function useSupportChatV2() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const tickets = ref<SupportTicket[]>([])
  const messages = ref<SupportMessage[]>([])
  const currentTicket = ref<SupportTicket | null>(null)

  const openTickets = computed(() => tickets.value.filter(t => t.status !== 'closed' && t.status !== 'resolved'))

  const fetchTickets = async (userId: string) => {
    loading.value = true
    try {
      const { data, error: err } = await supabase.from('support_tickets').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      if (err) throw err
      tickets.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const createTicket = async (userId: string, subject: string, category: string, message: string): Promise<SupportTicket | null> => {
    try {
      const { data: ticket, error: err1 } = await supabase.from('support_tickets').insert({ user_id: userId, subject, category, priority: 'medium', status: 'open' } as never).select().single()
      if (err1) throw err1
      await supabase.from('support_messages').insert({ ticket_id: ticket.id, sender_id: userId, sender_type: 'customer', message } as never)
      tickets.value.unshift(ticket)
      return ticket
    } catch (e: any) { error.value = e.message; return null }
  }

  const loadTicket = async (ticketId: string) => {
    loading.value = true
    try {
      const { data: ticket, error: err1 } = await supabase.from('support_tickets').select('*').eq('id', ticketId).single()
      if (err1) throw err1
      currentTicket.value = ticket
      const { data: msgs, error: err2 } = await supabase.from('support_messages').select('*').eq('ticket_id', ticketId).order('created_at')
      if (err2) throw err2
      messages.value = msgs || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const sendMessage = async (senderId: string, message: string): Promise<boolean> => {
    if (!currentTicket.value) return false
    try {
      const { error: err } = await supabase.from('support_messages').insert({ ticket_id: currentTicket.value.id, sender_id: senderId, sender_type: 'customer', message } as never)
      if (err) throw err
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const getCategoryText = (c: string) => ({ ride: 'การเดินทาง', payment: 'การชำระเงิน', account: 'บัญชี', technical: 'เทคนิค', other: 'อื่นๆ' }[c] || c)
  const getStatusText = (s: string) => ({ open: 'เปิด', in_progress: 'กำลังดำเนินการ', waiting: 'รอตอบกลับ', resolved: 'แก้ไขแล้ว', closed: 'ปิด' }[s] || s)

  return { loading, error, tickets, messages, currentTicket, openTickets, fetchTickets, createTicket, loadTicket, sendMessage, getCategoryText, getStatusText }
}

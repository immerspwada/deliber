/**
 * useAutomatedRefunds - Automated Refunds System
 * Feature: F217 - Automated Refunds
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface RefundRequest {
  id: string
  ride_id: string
  user_id: string
  amount: number
  reason: string
  reason_type: 'cancellation' | 'overcharge' | 'service_issue' | 'promo_error' | 'other'
  status: 'pending' | 'approved' | 'rejected' | 'processed'
  auto_approved: boolean
  processed_at?: string
  created_at: string
}

export function useAutomatedRefunds() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const requests = ref<RefundRequest[]>([])

  const pendingRequests = computed(() => requests.value.filter(r => r.status === 'pending'))
  const autoApprovedCount = computed(() => requests.value.filter(r => r.auto_approved).length)

  const fetchRequests = async (status?: string) => {
    loading.value = true
    try {
      let query = supabase.from('refund_requests').select('*').order('created_at', { ascending: false }).limit(200)
      if (status) query = query.eq('status', status)
      const { data, error: err } = await query
      if (err) throw err
      requests.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const submitRefund = async (rideId: string, userId: string, amount: number, reason: string, reasonType: string): Promise<RefundRequest | null> => {
    try {
      const { data, error: err } = await supabase.from('refund_requests').insert({ ride_id: rideId, user_id: userId, amount, reason, reason_type: reasonType, status: 'pending', auto_approved: false } as never).select().single()
      if (err) throw err
      requests.value.unshift(data)
      return data
    } catch (e: any) { error.value = e.message; return null }
  }

  const processRefund = async (id: string, status: 'approved' | 'rejected'): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('refund_requests').update({ status, processed_at: new Date().toISOString() } as never).eq('id', id)
      if (err) throw err
      const idx = requests.value.findIndex(r => r.id === id)
      if (idx !== -1) requests.value[idx].status = status
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const getReasonTypeText = (t: string) => ({ cancellation: 'ยกเลิก', overcharge: 'คิดเกิน', service_issue: 'ปัญหาบริการ', promo_error: 'โปรโมผิดพลาด', other: 'อื่นๆ' }[t] || t)
  const getStatusText = (s: string) => ({ pending: 'รอดำเนินการ', approved: 'อนุมัติ', rejected: 'ปฏิเสธ', processed: 'ดำเนินการแล้ว' }[s] || s)

  return { loading, error, requests, pendingRequests, autoApprovedCount, fetchRequests, submitRefund, processRefund, getReasonTypeText, getStatusText }
}

/**
 * usePaymentReconciliation - Payment Reconciliation System
 * Feature: F187 - Payment Reconciliation
 * Tables: payment_reconciliations, payment_discrepancies
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface Reconciliation {
  id: string
  reconciliation_date: string
  total_transactions: number
  total_amount: number
  matched_count: number
  matched_amount: number
  discrepancy_count: number
  discrepancy_amount: number
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  notes?: string
  created_at: string
  completed_at?: string
}

export interface Discrepancy {
  id: string
  reconciliation_id: string
  transaction_id: string
  expected_amount: number
  actual_amount: number
  difference: number
  discrepancy_type: 'missing' | 'duplicate' | 'amount_mismatch' | 'status_mismatch'
  status: 'open' | 'investigating' | 'resolved' | 'written_off'
  resolution_notes?: string
  resolved_at?: string
  created_at: string
}

export function usePaymentReconciliation() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const reconciliations = ref<Reconciliation[]>([])
  const discrepancies = ref<Discrepancy[]>([])

  const pendingReconciliations = computed(() => reconciliations.value.filter(r => r.status === 'pending'))
  const openDiscrepancies = computed(() => discrepancies.value.filter(d => d.status === 'open'))
  const totalDiscrepancyAmount = computed(() => discrepancies.value.filter(d => d.status !== 'resolved').reduce((sum, d) => sum + Math.abs(d.difference), 0))

  const fetchReconciliations = async (startDate?: string, endDate?: string) => {
    loading.value = true
    try {
      let query = supabase.from('payment_reconciliations').select('*').order('reconciliation_date', { ascending: false })
      if (startDate) query = query.gte('reconciliation_date', startDate)
      if (endDate) query = query.lte('reconciliation_date', endDate)
      const { data, error: err } = await query.limit(100)
      if (err) throw err
      reconciliations.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const fetchDiscrepancies = async (reconciliationId?: string) => {
    try {
      let query = supabase.from('payment_discrepancies').select('*').order('created_at', { ascending: false })
      if (reconciliationId) query = query.eq('reconciliation_id', reconciliationId)
      const { data, error: err } = await query.limit(200)
      if (err) throw err
      discrepancies.value = data || []
    } catch (e: any) { error.value = e.message }
  }

  const startReconciliation = async (date: string): Promise<Reconciliation | null> => {
    try {
      const { data, error: err } = await supabase.from('payment_reconciliations').insert({ reconciliation_date: date, status: 'pending', total_transactions: 0, total_amount: 0, matched_count: 0, matched_amount: 0, discrepancy_count: 0, discrepancy_amount: 0 } as never).select().single()
      if (err) throw err
      reconciliations.value.unshift(data)
      return data
    } catch (e: any) { error.value = e.message; return null }
  }

  const resolveDiscrepancy = async (id: string, notes: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('payment_discrepancies').update({ status: 'resolved', resolution_notes: notes, resolved_at: new Date().toISOString() } as never).eq('id', id)
      if (err) throw err
      const idx = discrepancies.value.findIndex(d => d.id === id)
      if (idx !== -1) discrepancies.value[idx].status = 'resolved'
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const getDiscrepancyTypeText = (type: string) => ({ missing: 'ไม่พบรายการ', duplicate: 'รายการซ้ำ', amount_mismatch: 'จำนวนไม่ตรง', status_mismatch: 'สถานะไม่ตรง' }[type] || type)
  const getStatusText = (status: string) => ({ pending: 'รอดำเนินการ', in_progress: 'กำลังดำเนินการ', completed: 'เสร็จสิ้น', failed: 'ล้มเหลว', open: 'เปิด', investigating: 'กำลังตรวจสอบ', resolved: 'แก้ไขแล้ว', written_off: 'ตัดจำหน่าย' }[status] || status)

  return { loading, error, reconciliations, discrepancies, pendingReconciliations, openDiscrepancies, totalDiscrepancyAmount, fetchReconciliations, fetchDiscrepancies, startReconciliation, resolveDiscrepancy, getDiscrepancyTypeText, getStatusText }
}

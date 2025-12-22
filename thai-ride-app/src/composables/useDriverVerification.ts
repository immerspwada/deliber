/**
 * useDriverVerification - Driver Verification Workflow
 * Feature: F213 - Driver Verification
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface VerificationStep {
  id: string
  provider_id: string
  step_type: 'identity' | 'license' | 'vehicle' | 'background' | 'training'
  status: 'pending' | 'submitted' | 'approved' | 'rejected'
  documents?: string[]
  notes?: string
  reviewed_at?: string
}

export function useDriverVerification() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const steps = ref<VerificationStep[]>([])

  const pendingSteps = computed(() => steps.value.filter(s => s.status === 'pending' || s.status === 'submitted'))
  const completedSteps = computed(() => steps.value.filter(s => s.status === 'approved'))
  const progress = computed(() => steps.value.length ? (completedSteps.value.length / steps.value.length) * 100 : 0)

  const fetchSteps = async (providerId: string) => {
    loading.value = true
    try {
      const { data, error: err } = await supabase.from('verification_steps').select('*').eq('provider_id', providerId).order('created_at')
      if (err) throw err
      steps.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const submitStep = async (providerId: string, stepType: string, documents: string[]): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('verification_steps').upsert({ provider_id: providerId, step_type: stepType, status: 'submitted', documents } as never)
      if (err) throw err
      await fetchSteps(providerId)
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const reviewStep = async (stepId: string, status: 'approved' | 'rejected', notes?: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('verification_steps').update({ status, notes, reviewed_at: new Date().toISOString() } as never).eq('id', stepId)
      if (err) throw err
      const idx = steps.value.findIndex(s => s.id === stepId)
      if (idx !== -1) steps.value[idx].status = status
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const getStepTypeText = (t: string) => ({ identity: 'ยืนยันตัวตน', license: 'ใบขับขี่', vehicle: 'ข้อมูลรถ', background: 'ประวัติอาชญากรรม', training: 'การอบรม' }[t] || t)
  const getStatusText = (s: string) => ({ pending: 'รอดำเนินการ', submitted: 'ส่งแล้ว', approved: 'อนุมัติ', rejected: 'ปฏิเสธ' }[s] || s)

  return { loading, error, steps, pendingSteps, completedSteps, progress, fetchSteps, submitStep, reviewStep, getStepTypeText, getStatusText }
}

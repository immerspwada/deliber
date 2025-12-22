/**
 * useFraudDetection - Fraud Detection System
 * Feature: F210 - Fraud Detection
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface FraudAlert {
  id: string
  alert_type: 'suspicious_location' | 'multiple_accounts' | 'payment_fraud' | 'fake_rides' | 'promo_abuse'
  severity: 'low' | 'medium' | 'high' | 'critical'
  user_id?: string
  provider_id?: string
  ride_id?: string
  description: string
  evidence: any
  status: 'new' | 'investigating' | 'confirmed' | 'dismissed'
  created_at: string
}

export interface FraudRule {
  id: string
  name: string
  rule_type: string
  conditions: any
  action: 'alert' | 'block' | 'flag'
  is_active: boolean
}

export function useFraudDetection() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const alerts = ref<FraudAlert[]>([])
  const rules = ref<FraudRule[]>([])

  const criticalAlerts = computed(() => alerts.value.filter(a => a.severity === 'critical' && a.status === 'new'))
  const newAlerts = computed(() => alerts.value.filter(a => a.status === 'new'))

  const fetchAlerts = async (status?: string) => {
    loading.value = true
    try {
      let query = supabase.from('fraud_alerts').select('*').order('created_at', { ascending: false }).limit(200)
      if (status) query = query.eq('status', status)
      const { data, error: err } = await query
      if (err) throw err
      alerts.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const fetchRules = async () => {
    try {
      const { data, error: err } = await supabase.from('fraud_rules').select('*').order('name')
      if (err) throw err
      rules.value = data || []
    } catch (e: any) { error.value = e.message }
  }

  const updateAlertStatus = async (id: string, status: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('fraud_alerts').update({ status } as never).eq('id', id)
      if (err) throw err
      const idx = alerts.value.findIndex(a => a.id === id)
      if (idx !== -1) alerts.value[idx].status = status as any
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const getSeverityColor = (s: string) => ({ low: '#00A86B', medium: '#F5A623', high: '#E53935', critical: '#B71C1C' }[s] || '#666')
  const getSeverityText = (s: string) => ({ low: 'ต่ำ', medium: 'ปานกลาง', high: 'สูง', critical: 'วิกฤต' }[s] || s)
  const getAlertTypeText = (t: string) => ({ suspicious_location: 'ตำแหน่งผิดปกติ', multiple_accounts: 'หลายบัญชี', payment_fraud: 'การชำระเงินผิดปกติ', fake_rides: 'เที่ยวปลอม', promo_abuse: 'ใช้โปรโมผิดปกติ' }[t] || t)

  return { loading, error, alerts, rules, criticalAlerts, newAlerts, fetchAlerts, fetchRules, updateAlertStatus, getSeverityColor, getSeverityText, getAlertTypeText }
}

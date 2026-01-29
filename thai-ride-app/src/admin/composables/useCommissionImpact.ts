/**
 * Commission Impact Calculator
 * คำนวณผลกระทบจากการเปลี่ยนอัตราคอมมิชชั่นต่อทุก Role
 */

import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { CommissionRates, CommissionImpact } from '@/types/financial-settings'

interface ServiceImpact {
  service_type: keyof CommissionRates
  affected_providers: number
  current_rate: number
  new_rate: number
  rate_change_percent: number
  estimated_monthly_transactions: number
  estimated_monthly_revenue_change: number
  provider_earnings_change: number
}

interface ImpactAnalysis {
  total_affected_providers: number
  services: ServiceImpact[]
  platform_revenue_change: number
  provider_earnings_change: number
  effective_date: string
}

export function useCommissionImpact() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const impactData = ref<ImpactAnalysis | null>(null)

  /**
   * คำนวณผลกระทบจากการเปลี่ยนอัตราคอมมิชชั่น
   */
  async function calculateImpact(
    currentRates: CommissionRates,
    newRates: CommissionRates
  ): Promise<ImpactAnalysis> {
    loading.value = true
    error.value = null

    try {
      // 1. ดึงข้อมูล Provider ที่ได้รับผลกระทบ
      const { data: providers, error: providerError } = await supabase
        .from('providers_v2')
        .select('id, service_types, status, is_online')
        .eq('status', 'approved')

      if (providerError) throw providerError

      // 2. ดึงข้อมูลธุรกรรมย้อนหลัง 30 วัน
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: transactions, error: txError } = await supabase
        .from('ride_requests')
        .select('service_type, total_fare, status')
        .eq('status', 'completed')
        .gte('created_at', thirtyDaysAgo.toISOString())

      if (txError) throw txError

      // 3. คำนวณผลกระทบแต่ละบริการ
      const services: ServiceImpact[] = []
      let totalPlatformChange = 0
      let totalProviderChange = 0

      for (const serviceType of Object.keys(currentRates) as Array<keyof CommissionRates>) {
        const currentRate = currentRates[serviceType]
        const newRate = newRates[serviceType]

        if (currentRate === newRate) continue

        // นับ Provider ที่ได้รับผลกระทบ
        const affectedProviders = providers?.filter(p => 
          p.service_types?.includes(serviceType)
        ).length || 0

        // คำนวณธุรกรรมเฉลี่ย
        const serviceTxs = transactions?.filter(t => 
          t.service_type === serviceType
        ) || []

        const totalRevenue = serviceTxs.reduce((sum, tx) => sum + (tx.total_fare || 0), 0)
        const avgMonthlyRevenue = totalRevenue // Already 30 days

        // คำนวณการเปลี่ยนแปลง
        const oldCommission = avgMonthlyRevenue * currentRate
        const newCommission = avgMonthlyRevenue * newRate
        const commissionChange = newCommission - oldCommission

        const oldProviderEarnings = avgMonthlyRevenue * (1 - currentRate)
        const newProviderEarnings = avgMonthlyRevenue * (1 - newRate)
        const providerChange = newProviderEarnings - oldProviderEarnings

        totalPlatformChange += commissionChange
        totalProviderChange += providerChange

        services.push({
          service_type: serviceType,
          affected_providers: affectedProviders,
          current_rate: currentRate,
          new_rate: newRate,
          rate_change_percent: ((newRate - currentRate) / currentRate) * 100,
          estimated_monthly_transactions: serviceTxs.length,
          estimated_monthly_revenue_change: commissionChange,
          provider_earnings_change: providerChange
        })
      }

      const analysis: ImpactAnalysis = {
        total_affected_providers: new Set(
          services.flatMap(s => 
            providers?.filter(p => p.service_types?.includes(s.service_type)).map(p => p.id) || []
          )
        ).size,
        services,
        platform_revenue_change: totalPlatformChange,
        provider_earnings_change: totalProviderChange,
        effective_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // +1 day
      }

      impactData.value = analysis
      return analysis

    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * ส่ง notification ไปยัง Provider ที่ได้รับผลกระทบ
   */
  async function notifyAffectedProviders(
    serviceType: keyof CommissionRates,
    oldRate: number,
    newRate: number,
    effectiveDate: string
  ): Promise<void> {
    try {
      // ดึง Provider ที่ได้รับผลกระทบ
      const { data: providers, error: providerError } = await supabase
        .from('providers_v2')
        .select('id, user_id')
        .eq('status', 'approved')
        .contains('service_types', [serviceType])

      if (providerError) throw providerError

      if (!providers || providers.length === 0) return

      // สร้าง notification
      const notifications = providers.map(provider => ({
        user_id: provider.user_id,
        type: 'commission_change',
        title: 'แจ้งเตือน: อัตราคอมมิชชั่นเปลี่ยนแปลง',
        message: `อัตราคอมมิชชั่นสำหรับบริการ ${getServiceLabel(serviceType)} จะเปลี่ยนจาก ${(oldRate * 100).toFixed(1)}% เป็น ${(newRate * 100).toFixed(1)}% ตั้งแต่วันที่ ${formatDate(effectiveDate)}`,
        data: {
          service_type: serviceType,
          old_rate: oldRate,
          new_rate: newRate,
          effective_date: effectiveDate,
          rate_change: ((newRate - oldRate) / oldRate) * 100
        },
        created_at: new Date().toISOString()
      }))

      // บันทึก notifications
      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications)

      if (notifError) throw notifError

      // ส่ง realtime notification
      await supabase
        .channel('commission-changes')
        .send({
          type: 'broadcast',
          event: 'commission_change',
          payload: {
            service_type: serviceType,
            old_rate: oldRate,
            new_rate: newRate,
            effective_date: effectiveDate
          }
        })

    } catch (e) {
      console.error('Failed to notify providers:', e)
      throw e
    }
  }

  /**
   * บันทึก audit log พร้อมผลกระทบ
   */
  async function logCommissionChange(
    serviceType: keyof CommissionRates,
    oldRate: number,
    newRate: number,
    reason: string,
    impact: ServiceImpact
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('settings_audit_log')
        .insert({
          category: 'commission',
          key: serviceType,
          old_value: { rate: oldRate },
          new_value: { rate: newRate },
          change_reason: reason,
          changed_by: user.id,
          metadata: {
            affected_providers: impact.affected_providers,
            estimated_monthly_impact: impact.estimated_monthly_revenue_change,
            provider_earnings_change: impact.provider_earnings_change,
            effective_date: impactData.value?.effective_date
          }
        })

      if (error) throw error
    } catch (e) {
      console.error('Failed to log commission change:', e)
      throw e
    }
  }

  // Helper functions
  function getServiceLabel(serviceType: keyof CommissionRates): string {
    const labels: Record<keyof CommissionRates, string> = {
      ride: 'เรียกรถ',
      delivery: 'จัดส่ง',
      shopping: 'ช้อปปิ้ง',
      moving: 'ขนย้าย',
      queue: 'จองคิว',
      laundry: 'ซักรีด'
    }
    return labels[serviceType]
  }

  function formatDate(dateString: string): string {
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(dateString))
  }

  return {
    loading,
    error,
    impactData,
    calculateImpact,
    notifyAffectedProviders,
    logCommissionChange
  }
}

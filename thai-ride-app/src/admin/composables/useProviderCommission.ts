/**
 * useProviderCommission Composable
 * =================================
 * จัดการการตั้งค่าคอมมิชชั่นของ Provider
 */
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type {
  CommissionType,
  UpdateCommissionParams,
  UpdateCommissionResponse,
  CommissionCalculation
} from '@/types/commission'
import { calculateCommission, validateCommissionValue } from '@/types/commission'

export function useProviderCommission() {
  const loading = ref(false)
  const error = ref<Error | null>(null)

  /**
   * อัพเดทค่าคอมมิชชั่นของ Provider
   */
  async function updateCommission(
    providerId: string,
    commissionType: CommissionType,
    commissionValue: number,
    commissionNotes?: string
  ): Promise<UpdateCommissionResponse> {
    loading.value = true
    error.value = null

    try {
      // Validate
      const validation = validateCommissionValue(commissionType, commissionValue)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      const { data, error: rpcError } = await supabase.rpc(
        'admin_update_provider_commission',
        {
          p_provider_id: providerId,
          p_commission_type: commissionType,
          p_commission_value: commissionValue,
          p_commission_notes: commissionNotes || null
        } as UpdateCommissionParams
      )

      if (rpcError) throw rpcError

      return data as UpdateCommissionResponse
    } catch (e) {
      error.value = e as Error
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * คำนวณค่าคอมมิชชั่นตัวอย่าง
   */
  function calculateExample(
    fareAmount: number,
    commissionType: CommissionType,
    commissionValue: number
  ): CommissionCalculation {
    return calculateCommission(fareAmount, commissionType, commissionValue)
  }

  /**
   * ดึงข้อมูลคอมมิชชั่นของ Provider
   */
  async function getProviderCommission(providerId: string) {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('providers_v2')
        .select('commission_type, commission_value, commission_notes, commission_updated_at, commission_updated_by')
        .eq('id', providerId)
        .single()

      if (fetchError) throw fetchError

      return data
    } catch (e) {
      error.value = e as Error
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * ดึงประวัติการเปลี่ยนแปลงคอมมิชชั่น (จาก audit logs)
   */
  async function getCommissionHistory(providerId: string) {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .eq('resource_type', 'provider')
        .eq('resource_id', providerId)
        .eq('action', 'update_commission')
        .order('created_at', { ascending: false })
        .limit(10)

      if (fetchError) throw fetchError

      return data
    } catch (e) {
      error.value = e as Error
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    updateCommission,
    calculateExample,
    getProviderCommission,
    getCommissionHistory
  }
}

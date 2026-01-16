/**
 * Tip System Composable
 * 
 * Role Impact:
 * - Customer: Give tips after ride completion (within 24h)
 * - Provider: View received tips and stats
 * - Admin: View tip analytics (use separate admin composable)
 */

import { ref, computed, readonly } from 'vue'
import { supabase } from '../lib/supabase'
import type {
  GiveTipRequest,
  GiveTipResponse,
  CanGiveTipResponse,
  ProviderTipsResponse,
  TipWithDetails,
  TIP_PRESETS
} from '../types/tip'

export function useTip() {
  // State
  const loading = ref(false)
  const error = ref<string | null>(null)
  const canTipStatus = ref<CanGiveTipResponse | null>(null)
  
  // Provider state
  const providerTips = ref<TipWithDetails[]>([])
  const totalTips = ref(0)
  const tipCount = ref(0)

  // =====================================================
  // CUSTOMER FUNCTIONS
  // =====================================================

  /**
   * Check if customer can give tip for a ride
   */
  async function checkCanTip(rideId: string): Promise<CanGiveTipResponse> {
    loading.value = true
    error.value = null

    try {
      const { data, error: rpcError } = await (supabase.rpc as any)('can_give_tip', {
        p_ride_id: rideId
      })

      if (rpcError) throw rpcError

      canTipStatus.value = data as CanGiveTipResponse
      return canTipStatus.value

    } catch (err) {
      console.error('[useTip] checkCanTip error:', err)
      error.value = 'ไม่สามารถตรวจสอบสถานะทิปได้'
      return { can_tip: false, reason: 'ERROR' }
    } finally {
      loading.value = false
    }
  }

  /**
   * Give tip to provider
   */
  async function giveTip(request: GiveTipRequest): Promise<GiveTipResponse> {
    loading.value = true
    error.value = null

    try {
      // Validate amount
      if (request.amount <= 0) {
        return { success: false, error: 'จำนวนเงินไม่ถูกต้อง' }
      }

      if (request.amount > 10000) {
        return { success: false, error: 'จำนวนเงินสูงเกินไป (สูงสุด ฿10,000)' }
      }

      const { data, error: rpcError } = await (supabase.rpc as any)('give_tip', {
        p_ride_id: request.ride_id,
        p_amount: request.amount,
        p_message: request.message || null
      })

      if (rpcError) throw rpcError

      const result = data as GiveTipResponse

      if (result.success) {
        // Clear can tip status
        canTipStatus.value = null
      } else {
        error.value = getErrorMessage(result.error || 'UNKNOWN')
      }

      return result

    } catch (err) {
      console.error('[useTip] giveTip error:', err)
      error.value = 'ไม่สามารถให้ทิปได้'
      return { success: false, error: 'SYSTEM_ERROR' }
    } finally {
      loading.value = false
    }
  }

  // =====================================================
  // PROVIDER FUNCTIONS
  // =====================================================

  /**
   * Load provider's received tips
   */
  async function loadProviderTips(limit = 20, offset = 0): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const { data, error: rpcError } = await (supabase.rpc as any)('get_provider_tips', {
        p_limit: limit,
        p_offset: offset
      })

      if (rpcError) throw rpcError

      const result = data as ProviderTipsResponse

      if (result.success) {
        providerTips.value = result.tips || []
        totalTips.value = result.total_tips || 0
        tipCount.value = result.tip_count || 0
      } else {
        error.value = result.error || 'ไม่สามารถโหลดข้อมูลทิปได้'
      }

    } catch (err) {
      console.error('[useTip] loadProviderTips error:', err)
      error.value = 'ไม่สามารถโหลดข้อมูลทิปได้'
    } finally {
      loading.value = false
    }
  }

  // =====================================================
  // HELPERS
  // =====================================================

  /**
   * Get user-friendly error message
   */
  function getErrorMessage(code: string): string {
    const messages: Record<string, string> = {
      'NOT_AUTHENTICATED': 'กรุณาเข้าสู่ระบบ',
      'INVALID_AMOUNT': 'จำนวนเงินไม่ถูกต้อง',
      'AMOUNT_TOO_HIGH': 'จำนวนเงินสูงเกินไป (สูงสุด ฿10,000)',
      'RIDE_NOT_FOUND': 'ไม่พบข้อมูลการเดินทาง',
      'ALREADY_TIPPED': 'คุณได้ให้ทิปไปแล้ว',
      'TIP_WINDOW_EXPIRED': 'หมดเวลาให้ทิป (ภายใน 24 ชม.)',
      'NO_PROVIDER': 'ไม่พบข้อมูลคนขับ',
      'INSUFFICIENT_BALANCE': 'ยอดเงินในกระเป๋าไม่เพียงพอ',
      'RIDE_NOT_COMPLETED': 'การเดินทางยังไม่เสร็จสิ้น',
      'NOT_A_PROVIDER': 'คุณไม่ใช่ผู้ให้บริการ',
      'NOT_ADMIN': 'คุณไม่มีสิทธิ์เข้าถึง'
    }
    return messages[code] || 'เกิดข้อผิดพลาด'
  }

  /**
   * Format tip amount for display
   */
  function formatTipAmount(amount: number): string {
    return `฿${amount.toLocaleString()}`
  }

  /**
   * Calculate time remaining to tip
   */
  function getTimeRemaining(expiresAt: string): string {
    const expires = new Date(expiresAt)
    const now = new Date()
    const diff = expires.getTime() - now.getTime()

    if (diff <= 0) return 'หมดเวลาแล้ว'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `เหลือเวลา ${hours} ชม. ${minutes} นาที`
    }
    return `เหลือเวลา ${minutes} นาที`
  }

  // =====================================================
  // COMPUTED
  // =====================================================

  const canTip = computed(() => canTipStatus.value?.can_tip ?? false)
  const walletBalance = computed(() => canTipStatus.value?.wallet_balance ?? 0)

  // =====================================================
  // RETURN
  // =====================================================

  return {
    // State
    loading: readonly(loading),
    error: readonly(error),
    canTipStatus: readonly(canTipStatus),
    providerTips: readonly(providerTips),
    totalTips: readonly(totalTips),
    tipCount: readonly(tipCount),

    // Computed
    canTip,
    walletBalance,

    // Customer methods
    checkCanTip,
    giveTip,

    // Provider methods
    loadProviderTips,

    // Helpers
    formatTipAmount,
    getTimeRemaining,
    getErrorMessage
  }
}

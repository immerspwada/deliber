/**
 * Feature: Provider Access Control
 * Composable for checking and managing provider route access
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

export interface ProviderAccessStatus {
  can_access: boolean
  provider_id: string | null
  is_verified: boolean
  status: string | null
  message: string
}

export interface RedirectCheckResult {
  should_redirect: boolean
  provider_id: string | null
  is_verified: boolean
  status: string | null
  reason: string
}

export function useProviderAccess() {
  const authStore = useAuthStore()
  const router = useRouter()
  const loading = ref(false)
  const error = ref<string | null>(null)
  const accessStatus = ref<ProviderAccessStatus | null>(null)
  const redirectCheck = ref<RedirectCheckResult | null>(null)

  // Check if user can access provider routes
  const checkAccess = async (): Promise<ProviderAccessStatus | null> => {
    if (!authStore.user?.id) {
      error.value = 'กรุณาเข้าสู่ระบบก่อน'
      return null
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: rpcError } = await supabase.rpc('can_access_provider_routes', {
        p_user_id: authStore.user.id
      })

      if (rpcError) throw rpcError

      const result = Array.isArray(data) ? data[0] : data
      accessStatus.value = result
      
      if (!result?.can_access) {
        error.value = result?.message || 'ไม่สามารถเข้าใช้งานได้'
      }

      return result
    } catch (err: any) {
      error.value = err.message
      return null
    } finally {
      loading.value = false
    }
  }

  // Navigate to provider dashboard with access check
  const navigateToProvider = async () => {
    const status = await checkAccess()
    
    if (!status) {
      router.push('/login')
      return false
    }

    if (!status.can_access) {
      if (!status.provider_id) {
        // No provider account
        router.push('/customer/become-provider')
      } else if (!status.is_verified || status.status !== 'approved') {
        // Provider exists but not approved
        router.push('/provider/onboarding')
      } else {
        // Other issues
        router.push('/customer/become-provider')
      }
      return false
    }

    // Access granted
    router.push('/provider')
    return true
  }

  // Check if user should be redirected from customer routes
  const checkRedirectFromCustomer = async (): Promise<RedirectCheckResult | null> => {
    if (!authStore.user?.id) {
      return null
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: rpcError } = await supabase.rpc('should_redirect_to_provider_onboarding', {
        p_user_id: authStore.user.id
      })

      if (rpcError) throw rpcError

      const result = Array.isArray(data) ? data[0] : data
      redirectCheck.value = result

      return result
    } catch (err: any) {
      error.value = err.message
      return null
    } finally {
      loading.value = false
    }
  }

  // Get user-friendly status message
  const getStatusMessage = computed(() => {
    if (!accessStatus.value) return null

    const status = accessStatus.value
    
    if (status.can_access) {
      return {
        type: 'success',
        title: 'พร้อมใช้งาน',
        message: 'คุณสามารถเข้าใช้งานระบบผู้ให้บริการได้'
      }
    }

    if (!status.provider_id) {
      return {
        type: 'info',
        title: 'ยังไม่ได้สมัคร',
        message: 'คุณยังไม่ได้สมัครเป็นผู้ให้บริการ กรุณาสมัครก่อนใช้งาน',
        action: 'สมัครเป็นผู้ให้บริการ',
        actionPath: '/customer/become-provider'
      }
    }

    if (!status.is_verified) {
      return {
        type: 'warning',
        title: 'รอการยืนยัน',
        message: 'บัญชีของคุณยังไม่ได้รับการยืนยัน กรุณาอัพโหลดเอกสารและรอการอนุมัติ',
        action: 'อัพโหลดเอกสาร',
        actionPath: '/provider/documents'
      }
    }

    if (status.status === 'pending') {
      return {
        type: 'warning',
        title: 'รอการอนุมัติ',
        message: 'บัญชีของคุณอยู่ระหว่างการพิจารณา กรุณารอการอนุมัติจากแอดมิน',
        action: 'ดูสถานะ',
        actionPath: '/provider/onboarding'
      }
    }

    if (status.status === 'rejected') {
      return {
        type: 'error',
        title: 'ถูกปฏิเสธ',
        message: 'บัญชีของคุณถูกปฏิเสธ กรุณาติดต่อแอดมินเพื่อขอข้อมูลเพิ่มเติม',
        action: 'ติดต่อแอดมิน',
        actionPath: '/customer/help'
      }
    }

    if (status.status === 'suspended') {
      return {
        type: 'error',
        title: 'ถูกระงับ',
        message: 'บัญชีของคุณถูกระงับ กรุณาติดต่อแอดมินเพื่อขอข้อมูลเพิ่มเติม',
        action: 'ติดต่อแอดมิน',
        actionPath: '/customer/help'
      }
    }

    return {
      type: 'error',
      title: 'ไม่สามารถเข้าใช้งานได้',
      message: status.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
    }
  })

  return {
    loading,
    error,
    accessStatus,
    redirectCheck,
    checkAccess,
    checkRedirectFromCustomer,
    navigateToProvider,
    getStatusMessage
  }
}

/**
 * Feature: F14 - Provider Dashboard (Dual-Role Onboarding)
 * Composable: useProviderOnboarding
 * Description: Handle provider onboarding flow for existing users
 */

import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

export type ProviderOnboardingStatus = 
  | 'DRAFT' 
  | 'PENDING' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'SUSPENDED'

export interface ProviderOnboardingState {
  hasProviderProfile: boolean
  providerId: string | null
  onboardingStatus: ProviderOnboardingStatus | null
  canAccessDashboard: boolean
  rejectionReason: string | null
  canReapply: boolean
  canReapplyAt: string | null
}

export function useProviderOnboarding() {
  const authStore = useAuthStore()
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  const onboardingState = ref<ProviderOnboardingState>({
    hasProviderProfile: false,
    providerId: null,
    onboardingStatus: null,
    canAccessDashboard: false,
    rejectionReason: null,
    canReapply: true,
    canReapplyAt: null
  })

  /**
   * Get current onboarding status for logged-in user
   */
  const getOnboardingStatus = async () => {
    if (!authStore.user?.id) {
      error.value = 'User not authenticated'
      return null
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_provider_onboarding_status', {
          p_user_id: authStore.user.id
        })

      if (rpcError) throw rpcError

      if (data && data.length > 0) {
        const status = data[0]
        onboardingState.value = {
          hasProviderProfile: status.has_provider_profile,
          providerId: status.provider_id,
          onboardingStatus: status.onboarding_status,
          canAccessDashboard: status.can_access_dashboard,
          rejectionReason: status.rejection_reason,
          canReapply: status.can_reapply,
          canReapplyAt: status.can_reapply_at
        }
        return onboardingState.value
      }

      return null
    } catch (err: any) {
      error.value = err.message
      console.error('Error getting onboarding status:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Start provider onboarding (create DRAFT profile)
   */
  const startOnboarding = async (serviceType: string = 'ride') => {
    if (!authStore.user?.id) {
      error.value = 'User not authenticated'
      return null
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: rpcError } = await supabase
        .rpc('start_provider_onboarding', {
          p_user_id: authStore.user.id,
          p_service_type: serviceType
        })

      if (rpcError) throw rpcError

      // Refresh status
      await getOnboardingStatus()

      return data
    } catch (err: any) {
      error.value = err.message
      console.error('Error starting onboarding:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Submit application for review
   */
  const submitApplication = async () => {
    if (!authStore.user?.id || !onboardingState.value.providerId) {
      error.value = 'Invalid state for submission'
      return false
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: rpcError } = await supabase
        .rpc('submit_provider_application', {
          p_provider_id: onboardingState.value.providerId,
          p_user_id: authStore.user.id
        })

      if (rpcError) throw rpcError

      // Refresh status
      await getOnboardingStatus()

      return data
    } catch (err: any) {
      error.value = err.message
      console.error('Error submitting application:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Update provider profile (DRAFT/REJECTED only)
   */
  const updateProviderProfile = async (updates: any) => {
    if (!onboardingState.value.providerId) {
      error.value = 'No provider profile found'
      return false
    }

    loading.value = true
    error.value = null

    try {
      const { error: updateError } = await supabase
        .from('service_providers')
        .update(updates)
        .eq('id', onboardingState.value.providerId)
        .eq('user_id', authStore.user?.id)

      if (updateError) throw updateError

      return true
    } catch (err: any) {
      error.value = err.message
      console.error('Error updating provider profile:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Get onboarding history
   */
  const getOnboardingHistory = async () => {
    if (!onboardingState.value.providerId) {
      return []
    }

    try {
      const { data, error: queryError } = await supabase
        .from('provider_onboarding_history')
        .select('*')
        .eq('provider_id', onboardingState.value.providerId)
        .order('changed_at', { ascending: false })

      if (queryError) throw queryError

      return data || []
    } catch (err: any) {
      console.error('Error getting onboarding history:', err)
      return []
    }
  }

  // Computed properties
  const shouldRedirectToOnboarding = computed(() => {
    const status = onboardingState.value.onboardingStatus
    return status === null || status === 'DRAFT' || status === 'PENDING' || status === 'REJECTED'
  })

  const canEditProfile = computed(() => {
    const status = onboardingState.value.onboardingStatus
    return status === 'DRAFT' || status === 'REJECTED'
  })

  const isWaitingApproval = computed(() => {
    return onboardingState.value.onboardingStatus === 'PENDING'
  })

  const isRejected = computed(() => {
    return onboardingState.value.onboardingStatus === 'REJECTED'
  })

  const isApproved = computed(() => {
    return onboardingState.value.onboardingStatus === 'APPROVED'
  })

  const isSuspended = computed(() => {
    return onboardingState.value.onboardingStatus === 'SUSPENDED'
  })

  return {
    // State
    loading,
    error,
    onboardingState,
    
    // Methods
    getOnboardingStatus,
    startOnboarding,
    submitApplication,
    updateProviderProfile,
    getOnboardingHistory,
    
    // Computed
    shouldRedirectToOnboarding,
    canEditProfile,
    isWaitingApproval,
    isRejected,
    isApproved,
    isSuspended
  }
}

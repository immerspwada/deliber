/**
 * Feature: F14 - Provider Dashboard (Dual-Role Onboarding)
 * Middleware: Provider Onboarding Guard
 * Description: Route guard to handle provider onboarding flow
 * 
 * Business Logic:
 * - Case A (No Provider Profile): Redirect to /provider/onboarding (Start Application)
 * - Case B (Status = PENDING): Redirect to /provider/onboarding (Show "Waiting for Approval")
 * - Case C (Status = REJECTED): Redirect to /provider/onboarding (Show "Rejected" + Re-apply)
 * - Case D (Status = APPROVED): Allow access to /provider (Provider Dashboard)
 * - Case E (Status = SUSPENDED): Redirect to /provider/onboarding (Show "Suspended")
 */

import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { useProviderOnboarding } from '@/composables/useProviderOnboarding'
import { useAuthStore } from '@/stores/auth'

/**
 * Provider Onboarding Guard
 * Checks provider status and redirects accordingly
 */
export async function providerOnboardingGuard(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) {
  const authStore = useAuthStore()
  const { getOnboardingStatus, onboardingState } = useProviderOnboarding()

  // Only apply to provider routes (excluding onboarding pages)
  if (!to.meta.isProviderRoute) {
    return next()
  }

  // Allow access to onboarding/registration pages without checks
  const allowedWithoutCheck = [
    '/provider/onboarding',
    '/provider/register',
    '/provider/documents'
  ]
  
  if (allowedWithoutCheck.includes(to.path)) {
    return next()
  }

  // Ensure user is authenticated
  if (!authStore.isAuthenticated || !authStore.user?.id) {
    console.warn('[ProviderGuard] User not authenticated')
    return next('/login')
  }

  try {
    // Get current onboarding status
    await getOnboardingStatus()

    // Case A: No Provider Profile
    if (!onboardingState.value.hasProviderProfile) {
      console.log('[ProviderGuard] No provider profile - redirect to onboarding')
      return next({
        path: '/provider/onboarding',
        query: { step: 'start' }
      })
    }

    // Case B: Status = PENDING
    if (onboardingState.value.onboardingStatus === 'PENDING') {
      console.log('[ProviderGuard] Application pending - redirect to onboarding')
      return next({
        path: '/provider/onboarding',
        query: { step: 'pending' }
      })
    }

    // Case C: Status = REJECTED
    if (onboardingState.value.onboardingStatus === 'REJECTED') {
      console.log('[ProviderGuard] Application rejected - redirect to onboarding')
      return next({
        path: '/provider/onboarding',
        query: { step: 'rejected' }
      })
    }

    // Case E: Status = SUSPENDED
    if (onboardingState.value.onboardingStatus === 'SUSPENDED') {
      console.log('[ProviderGuard] Account suspended - redirect to onboarding')
      return next({
        path: '/provider/onboarding',
        query: { step: 'suspended' }
      })
    }

    // Case D: Status = APPROVED
    if (onboardingState.value.onboardingStatus === 'APPROVED') {
      console.log('[ProviderGuard] Application approved - allow access')
      return next()
    }

    // Default: Redirect to onboarding for any other status
    console.warn('[ProviderGuard] Unknown status - redirect to onboarding')
    return next('/provider/onboarding')

  } catch (error) {
    console.error('[ProviderGuard] Error checking onboarding status:', error)
    return next('/provider/onboarding')
  }
}

/**
 * Helper function to determine redirect path based on status
 */
export function getProviderRedirectPath(status: string | null): string {
  switch (status) {
    case null:
      return '/provider/onboarding?step=start'
    case 'DRAFT':
      return '/provider/onboarding?step=draft'
    case 'PENDING':
      return '/provider/onboarding?step=pending'
    case 'REJECTED':
      return '/provider/onboarding?step=rejected'
    case 'SUSPENDED':
      return '/provider/onboarding?step=suspended'
    case 'APPROVED':
      return '/provider'
    default:
      return '/provider/onboarding'
  }
}

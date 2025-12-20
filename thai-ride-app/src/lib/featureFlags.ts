/**
 * Feature Flags Client
 * Client-side feature flag management
 */

import { ref, computed } from 'vue'
import { supabase } from './supabase'
import { logger } from '../utils/logger'

export interface FeatureFlag {
  key: string
  name: string
  enabled: boolean
  rollout_percentage: number
  target_users?: string[]
  target_roles?: string[]
}

const flags = ref<Map<string, FeatureFlag>>(new Map())
const loading = ref(false)
const initialized = ref(false)

/**
 * Initialize feature flags
 */
export async function initFeatureFlags(userId?: string, userRole?: string): Promise<void> {
  if (initialized.value) return
  
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .eq('enabled', true)

    if (error) throw error

    const flagMap = new Map<string, FeatureFlag>()
    
    for (const flag of data || []) {
      // Check if user is targeted
      const isTargeted = checkTargeting(flag, userId, userRole)
      
      // Check rollout percentage
      const inRollout = checkRollout(flag.rollout_percentage, userId || 'anonymous')
      
      flagMap.set(flag.key, {
        ...flag,
        enabled: flag.enabled && (isTargeted || inRollout)
      })
    }
    
    flags.value = flagMap
    initialized.value = true
    
    logger.info(`Feature flags initialized: ${flagMap.size} flags loaded`)
  } catch (err) {
    logger.error('Failed to initialize feature flags:', err)
  } finally {
    loading.value = false
  }
}

/**
 * Check if user is targeted by flag
 */
function checkTargeting(flag: FeatureFlag, userId?: string, userRole?: string): boolean {
  // Check user targeting
  if (flag.target_users?.length && userId) {
    if (flag.target_users.includes(userId)) return true
  }
  
  // Check role targeting
  if (flag.target_roles?.length && userRole) {
    if (flag.target_roles.includes(userRole)) return true
  }
  
  return false
}

/**
 * Check rollout percentage using consistent hashing
 */
function checkRollout(percentage: number, userId: string): boolean {
  if (percentage >= 100) return true
  if (percentage <= 0) return false
  
  // Simple hash function for consistent rollout
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  
  const bucket = Math.abs(hash) % 100
  return bucket < percentage
}

/**
 * Check if feature is enabled
 */
export function isFeatureEnabled(key: string): boolean {
  const flag = flags.value.get(key)
  return flag?.enabled ?? false
}

/**
 * Get feature flag
 */
export function getFeatureFlag(key: string): FeatureFlag | undefined {
  return flags.value.get(key)
}

/**
 * Get all feature flags
 */
export function getAllFeatureFlags(): FeatureFlag[] {
  return Array.from(flags.value.values())
}

/**
 * Refresh feature flags
 */
export async function refreshFeatureFlags(userId?: string, userRole?: string): Promise<void> {
  initialized.value = false
  await initFeatureFlags(userId, userRole)
}

/**
 * Feature flag composable
 */
export function useFeatureFlags() {
  return {
    flags: computed(() => Array.from(flags.value.values())),
    loading,
    initialized,
    isEnabled: isFeatureEnabled,
    getFlag: getFeatureFlag,
    refresh: refreshFeatureFlags
  }
}

/**
 * Feature flag directive value
 */
export function featureFlagDirective(key: string): boolean {
  return isFeatureEnabled(key)
}

// Common feature flag keys
export const FEATURE_FLAGS = {
  NEW_BOOKING_FLOW: 'new_booking_flow',
  DARK_MODE: 'dark_mode',
  PUSH_NOTIFICATIONS: 'push_notifications',
  REALTIME_TRACKING: 'realtime_tracking',
  LOYALTY_PROGRAM: 'loyalty_program',
  SCHEDULED_RIDES: 'scheduled_rides',
  MULTI_STOP: 'multi_stop',
  FARE_SPLITTING: 'fare_splitting',
  VOICE_CALLS: 'voice_calls',
  INSURANCE: 'insurance',
  CORPORATE_ACCOUNTS: 'corporate_accounts',
  QUEUE_BOOKING: 'queue_booking',
  MOVING_SERVICE: 'moving_service',
  LAUNDRY_SERVICE: 'laundry_service'
} as const

/**
 * URL Tracking Composable (Standardized)
 * ระบบติดตาม URL แบบมาตรฐาน - Clean URLs with minimal query parameters
 * 
 * Features:
 * - Clean URL structure (ใช้ step เดียว แทน status + step)
 * - Type-safe query parameters
 * - Automatic validation
 * - Analytics tracking (ไม่แสดงใน URL)
 * 
 * Standard URL Format:
 * /provider/job/{id}?step={step}&action={action}
 * 
 * Example:
 * - /provider/job/xxx?step=matched
 * - /customer/ride/xxx?step=in-progress
 */
import { useRoute, useRouter } from 'vue-router'

// Valid step values (type-safe)
// Note: Database uses underscore format (in_progress), URL uses hyphen format (in-progress)
export type ProviderJobStep = 'pending' | 'matched' | 'pickup' | 'in-progress' | 'completed' | 'cancelled'
export type CustomerRideStep = 'pickup' | 'dropoff' | 'confirm' | 'searching' | 'matched' | 'in-progress' | 'completed' | 'cancelled'
export type AdminStep = 'view' | 'edit' | 'approve' | 'done'

export type URLStep = ProviderJobStep | CustomerRideStep | AdminStep

export interface URLTrackingParams {
  step?: URLStep
  action?: string
  // Removed: status (redundant with step)
  // Removed: timestamp (moved to analytics)
  [key: string]: string | undefined
}

/**
 * Valid steps for each context (type-safe validation)
 * Maps database status values to clean URL steps
 * Note: Accepts both underscore (database) and hyphen (URL) formats
 */
const VALID_STEPS: Record<string, readonly string[]> = {
  provider_job: ['pending', 'matched', 'pickup', 'in-progress', 'in_progress', 'completed', 'cancelled'] as const,
  customer_ride: ['pickup', 'dropoff', 'confirm', 'searching', 'matched', 'in-progress', 'in_progress', 'completed', 'cancelled'] as const,
  admin: ['view', 'edit', 'approve', 'done'] as const
}

/**
 * Step display names (Thai)
 */
const STEP_NAMES: Record<string, string> = {
  // Provider job steps
  'pending': 'รอดำเนินการ',
  'matched': 'จับคู่แล้ว',
  'pickup': 'ถึงจุดรับ',
  'in-progress': 'กำลังเดินทาง',
  'completed': 'เสร็จสิ้น',
  'cancelled': 'ยกเลิก',
  
  // Customer ride steps
  'dropoff': 'เลือกจุดส่ง',
  'confirm': 'ยืนยัน',
  'searching': 'กำลังหาคนขับ',
  
  // Admin steps
  'view': 'ดูข้อมูล',
  'edit': 'แก้ไข',
  'approve': 'อนุมัติ',
  'done': 'เสร็จสิ้น'
}

export function useURLTracking() {
  const route = useRoute()
  const router = useRouter()

  /**
   * Validate step for context
   */
  function isValidStep(step: string, context: keyof typeof VALID_STEPS): boolean {
    return VALID_STEPS[context].includes(step)
  }

  /**
   * Update URL with tracking parameters (Standardized)
   * @param params - Tracking parameters (step, action)
   * @param context - Context type (provider_job, customer_ride, admin)
   */
  function updateURL(params: URLTrackingParams, context: keyof typeof VALID_STEPS = 'provider_job'): void {
    // Normalize step (convert underscore to hyphen for URL)
    const normalizedStep = params.step?.replace(/_/g, '-')
    
    // Validate step
    if (normalizedStep && !isValidStep(normalizedStep, context)) {
      console.warn(`[URLTracking] Invalid step "${normalizedStep}" for context "${context}"`)
      return
    }
    
    // Build clean query (only essential params)
    const newQuery: Record<string, string> = {}
    
    // Add step (primary tracking parameter) - always use hyphen format in URL
    if (normalizedStep) {
      newQuery.step = normalizedStep
    }
    
    // Add action (optional)
    if (params.action) {
      newQuery.action = params.action
    }
    
    // Add any additional custom params (but not status/timestamp)
    Object.keys(params).forEach(key => {
      if (!['step', 'action', 'status', 'timestamp'].includes(key) && params[key]) {
        newQuery[key] = params[key]!
      }
    })
    
    // Track analytics separately (not in URL)
    if (typeof window !== 'undefined' && normalizedStep) {
      trackAnalytics({
        event: 'url_update',
        context,
        step: normalizedStep,
        action: params.action,
        timestamp: Date.now(),
        path: route.path
      })
    }
    
    // Update URL without navigation
    router.replace({
      name: route.name || undefined,
      params: route.params,
      query: newQuery
    }).catch(() => {
      // Ignore navigation duplicated error
    })
    
    console.log('[URLTracking] Updated:', {
      context,
      step: normalizedStep,
      action: params.action,
      url: `${route.path}?${new URLSearchParams(newQuery).toString()}`
    })
  }

  /**
   * Update URL with step only (most common use case)
   * @param step - Step value (validated)
   * @param context - Context type
   */
  function updateStep(step: URLStep, context: keyof typeof VALID_STEPS = 'provider_job'): void {
    updateURL({ step }, context)
  }

  /**
   * Update URL with action
   * @param action - Action being performed
   */
  function updateAction(action: string): void {
    const currentStep = route.query.step as string | undefined
    updateURL({ step: currentStep as URLStep, action })
  }

  /**
   * Clear tracking parameters from URL
   */
  function clearTracking(): void {
    router.replace({
      name: route.name || undefined,
      params: route.params,
      query: {}
    }).catch(() => {})
  }

  /**
   * Get current tracking info from URL
   */
  function getCurrentTracking(): URLTrackingParams {
    return {
      step: route.query.step as URLStep | undefined,
      action: route.query.action as string | undefined
    }
  }

  /**
   * Get human-readable step name
   */
  function getStepName(step: string): string {
    return STEP_NAMES[step] || step
  }

  /**
   * Build full tracking URL (standardized)
   */
  function buildTrackingURL(path: string, params: URLTrackingParams): string {
    const query = new URLSearchParams()
    
    if (params.step) query.set('step', params.step)
    if (params.action) query.set('action', params.action)
    
    // Add custom params (excluding deprecated ones)
    Object.keys(params).forEach(key => {
      if (!['step', 'action', 'status', 'timestamp'].includes(key) && params[key]) {
        query.set(key, params[key]!)
      }
    })
    
    const queryString = query.toString()
    return queryString ? `${path}?${queryString}` : path
  }

  /**
   * Track analytics (separate from URL)
   */
  function trackAnalytics(data: {
    event: string
    context: string
    step?: string
    action?: string
    timestamp: number
    path: string
  }): void {
    // Send to analytics service (e.g., Google Analytics, Mixpanel)
    if (import.meta.env.DEV) {
      console.log('[Analytics]', data)
    }
    
    // Store in localStorage for debugging
    try {
      const history = JSON.parse(localStorage.getItem('url_tracking_history') || '[]')
      history.push(data)
      // Keep last 50 entries
      if (history.length > 50) history.shift()
      localStorage.setItem('url_tracking_history', JSON.stringify(history))
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  /**
   * Migrate old URL format to new format
   * Converts: ?status=matched&step=1-matched&timestamp=xxx
   * To: ?step=matched
   */
  function migrateOldURL(): void {
    const query = route.query
    
    // Check if using old format
    if (query.status && query.step && typeof query.step === 'string' && query.step.includes('-')) {
      const newStep = query.status as string
      
      // Update to new format
      router.replace({
        name: route.name || undefined,
        params: route.params,
        query: {
          step: newStep,
          ...(query.action && { action: query.action as string })
        }
      }).catch(() => {})
      
      console.log('[URLTracking] Migrated old URL format to new format')
    }
  }

  return {
    updateURL,
    updateStep,
    updateAction,
    clearTracking,
    getCurrentTracking,
    getStepName,
    buildTrackingURL,
    migrateOldURL,
    isValidStep
  }
}

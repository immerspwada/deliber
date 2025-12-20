/**
 * Analytics Client
 * Client-side analytics tracking
 */

import { supabase } from './supabase'
import { logger } from '../utils/logger'
import { isProduction } from './envValidation'

export interface AnalyticsEvent {
  event_name: string
  event_category: string
  properties?: Record<string, any>
  page_url?: string
  session_id?: string
  user_id?: string
}

let sessionId: string | null = null
let userId: string | null = null

/**
 * Generate session ID
 */
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Initialize analytics
 */
export function initAnalytics(uid?: string): void {
  sessionId = sessionStorage.getItem('analytics_session') || generateSessionId()
  sessionStorage.setItem('analytics_session', sessionId)
  
  if (uid) {
    userId = uid
  }
  
  // Track page views
  trackPageView()
  
  // Listen for route changes
  window.addEventListener('popstate', trackPageView)
  
  logger.info('Analytics initialized', { sessionId })
}

/**
 * Set user ID
 */
export function setAnalyticsUser(uid: string): void {
  userId = uid
}

/**
 * Track event
 */
export async function trackEvent(
  eventName: string,
  category: string,
  properties?: Record<string, any>
): Promise<void> {
  const event: AnalyticsEvent = {
    event_name: eventName,
    event_category: category,
    properties,
    page_url: window.location.href,
    session_id: sessionId || undefined,
    user_id: userId || undefined
  }

  // Log in development
  if (!isProduction()) {
    logger.debug('Analytics event:', event)
  }

  // Send to database
  try {
    await supabase.from('analytics_events').insert({
      session_id: event.session_id,
      event_name: event.event_name,
      event_category: event.event_category,
      properties: event.properties,
      page_url: event.page_url,
      user_id: event.user_id,
      device_type: getDeviceType()
    })
  } catch (err) {
    logger.error('Failed to track event:', err)
  }
}

/**
 * Track page view
 */
export function trackPageView(pageName?: string): void {
  trackEvent('page_view', 'navigation', {
    page_name: pageName || document.title,
    page_path: window.location.pathname,
    referrer: document.referrer
  })
}

/**
 * Track user action
 */
export function trackAction(action: string, properties?: Record<string, any>): void {
  trackEvent(action, 'user_action', properties)
}

/**
 * Track conversion
 */
export function trackConversion(conversionType: string, value?: number, properties?: Record<string, any>): void {
  trackEvent('conversion', 'conversion', {
    conversion_type: conversionType,
    value,
    ...properties
  })
}

/**
 * Track error
 */
export function trackError(errorType: string, errorMessage: string, properties?: Record<string, any>): void {
  trackEvent('error', 'error', {
    error_type: errorType,
    error_message: errorMessage,
    ...properties
  })
}

/**
 * Track timing
 */
export function trackTiming(category: string, variable: string, timeMs: number): void {
  trackEvent('timing', 'performance', {
    timing_category: category,
    timing_variable: variable,
    timing_value: timeMs
  })
}

/**
 * Get device type
 */
function getDeviceType(): string {
  const ua = navigator.userAgent
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet'
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile'
  return 'desktop'
}

/**
 * Analytics composable
 */
export function useAnalytics() {
  return {
    trackEvent,
    trackPageView,
    trackAction,
    trackConversion,
    trackError,
    trackTiming,
    setUser: setAnalyticsUser
  }
}

// Pre-defined event names
export const ANALYTICS_EVENTS = {
  // Auth
  LOGIN: 'login',
  LOGOUT: 'logout',
  REGISTER: 'register',
  
  // Booking
  BOOKING_STARTED: 'booking_started',
  BOOKING_COMPLETED: 'booking_completed',
  BOOKING_CANCELLED: 'booking_cancelled',
  
  // Payment
  PAYMENT_INITIATED: 'payment_initiated',
  PAYMENT_COMPLETED: 'payment_completed',
  PAYMENT_FAILED: 'payment_failed',
  
  // Provider
  PROVIDER_ONLINE: 'provider_online',
  PROVIDER_OFFLINE: 'provider_offline',
  JOB_ACCEPTED: 'job_accepted',
  JOB_COMPLETED: 'job_completed',
  
  // Engagement
  PROMO_APPLIED: 'promo_applied',
  RATING_SUBMITTED: 'rating_submitted',
  REFERRAL_SHARED: 'referral_shared'
} as const

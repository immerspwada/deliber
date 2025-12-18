/**
 * useUXTracking - Real-time UX Interaction Tracking
 * 
 * บันทึก UX interactions ลง analytics_events table
 * เพื่อให้ Admin เห็นข้อมูลจริงแทน mock data
 * 
 * @syncs-with
 * - Admin: useAdmin.ts (fetchUXMetrics, fetchTopInteractions)
 * - Database: analytics_events table
 * - Components: customer/* components
 */

import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

// Event categories
export type UXEventCategory = 
  | 'interaction'
  | 'navigation'
  | 'gesture'
  | 'feedback'
  | 'performance'
  | 'error'

// Event names for UX tracking
export type UXEventName =
  | 'haptic_feedback_triggered'
  | 'pull_to_refresh'
  | 'swipe_navigation'
  | 'smart_suggestion_shown'
  | 'smart_suggestion_clicked'
  | 'smart_suggestion_dismissed'
  | 'progressive_loading_started'
  | 'progressive_loading_completed'
  | 'service_card_clicked'
  | 'location_search_started'
  | 'location_search_completed'
  | 'location_selected'
  | 'empty_state_action_clicked'
  | 'page_view'
  | 'session_start'
  | 'session_end'
  | 'feature_enabled'
  | 'feature_disabled'
  | 'error_occurred'
  | 'error_recovered'

interface UXEvent {
  eventName: UXEventName
  eventCategory: UXEventCategory
  properties?: Record<string, any>
  pageUrl?: string
  pageName?: string
}

interface SessionInfo {
  sessionId: string
  startTime: number
  pageViews: number
  interactions: number
  deviceType: string
  browser: string
  os: string
}

// Generate unique session ID
function generateSessionId(): string {
  return `ux_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

// Detect device type
function getDeviceType(): string {
  const ua = navigator.userAgent
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet'
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile'
  return 'desktop'
}

// Detect browser
function getBrowser(): string {
  const ua = navigator.userAgent
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome'
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Edg')) return 'Edge'
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera'
  return 'Unknown'
}

// Detect OS
function getOS(): string {
  const ua = navigator.userAgent
  if (ua.includes('Win')) return 'Windows'
  if (ua.includes('Mac')) return 'macOS'
  if (ua.includes('Linux')) return 'Linux'
  if (ua.includes('Android')) return 'Android'
  if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS'
  return 'Unknown'
}

// Event queue for batching
const eventQueue: UXEvent[] = []
let flushTimeout: ReturnType<typeof setTimeout> | null = null
const FLUSH_INTERVAL = 5000 // 5 seconds
const MAX_QUEUE_SIZE = 20

export function useUXTracking() {
  const authStore = useAuthStore()
  const isTracking = ref(false)
  const session = ref<SessionInfo | null>(null)
  
  // Initialize session
  const initSession = () => {
    const existingSessionId = sessionStorage.getItem('ux_session_id')
    const existingStartTime = sessionStorage.getItem('ux_session_start')
    
    if (existingSessionId && existingStartTime) {
      session.value = {
        sessionId: existingSessionId,
        startTime: parseInt(existingStartTime, 10),
        pageViews: parseInt(sessionStorage.getItem('ux_page_views') || '0', 10),
        interactions: parseInt(sessionStorage.getItem('ux_interactions') || '0', 10),
        deviceType: getDeviceType(),
        browser: getBrowser(),
        os: getOS()
      }
    } else {
      const newSession: SessionInfo = {
        sessionId: generateSessionId(),
        startTime: Date.now(),
        pageViews: 0,
        interactions: 0,
        deviceType: getDeviceType(),
        browser: getBrowser(),
        os: getOS()
      }
      session.value = newSession
      sessionStorage.setItem('ux_session_id', newSession.sessionId)
      sessionStorage.setItem('ux_session_start', newSession.startTime.toString())
      
      // Track session start
      trackEvent({
        eventName: 'session_start',
        eventCategory: 'navigation',
        properties: {
          deviceType: newSession.deviceType,
          browser: newSession.browser,
          os: newSession.os
        }
      })
    }
    
    isTracking.value = true
  }

  // Track event
  const trackEvent = async (event: UXEvent) => {
    if (!session.value) return
    
    // Update session stats
    session.value.interactions++
    sessionStorage.setItem('ux_interactions', session.value.interactions.toString())
    
    // Add to queue
    eventQueue.push({
      ...event,
      pageUrl: event.pageUrl || window.location.pathname,
      pageName: event.pageName || document.title
    })
    
    // Flush if queue is full
    if (eventQueue.length >= MAX_QUEUE_SIZE) {
      await flushEvents()
    } else if (!flushTimeout) {
      // Schedule flush
      flushTimeout = setTimeout(() => flushEvents(), FLUSH_INTERVAL)
    }
  }
  
  // Flush events to database
  const flushEvents = async () => {
    if (flushTimeout) {
      clearTimeout(flushTimeout)
      flushTimeout = null
    }
    
    if (eventQueue.length === 0 || !session.value) return
    
    const eventsToFlush = [...eventQueue]
    eventQueue.length = 0
    
    try {
      const records = eventsToFlush.map(event => ({
        session_id: session.value!.sessionId,
        user_id: authStore.user?.id || null,
        event_name: event.eventName,
        event_category: event.eventCategory,
        properties: event.properties || {},
        page_url: event.pageUrl,
        page_name: event.pageName,
        device_type: session.value!.deviceType,
        browser: session.value!.browser,
        os: session.value!.os,
        created_at: new Date().toISOString()
      }))
      
      await (supabase.from('analytics_events') as any).insert(records)
    } catch (error) {
      // Re-add events to queue on failure
      eventQueue.push(...eventsToFlush)
      console.warn('Failed to flush UX events:', error)
    }
  }
  
  // Track page view
  const trackPageView = (pageName?: string) => {
    if (!session.value) return
    
    session.value.pageViews++
    sessionStorage.setItem('ux_page_views', session.value.pageViews.toString())
    
    trackEvent({
      eventName: 'page_view',
      eventCategory: 'navigation',
      pageName,
      properties: {
        pageNumber: session.value.pageViews,
        referrer: document.referrer
      }
    })
  }
  
  // Specific tracking methods for UX components
  const trackHapticFeedback = (type: string) => {
    trackEvent({
      eventName: 'haptic_feedback_triggered',
      eventCategory: 'interaction',
      properties: { hapticType: type }
    })
  }
  
  const trackPullToRefresh = (success: boolean, duration: number) => {
    trackEvent({
      eventName: 'pull_to_refresh',
      eventCategory: 'gesture',
      properties: { success, durationMs: duration }
    })
  }
  
  const trackSwipeNavigation = (direction: string, target?: string) => {
    trackEvent({
      eventName: 'swipe_navigation',
      eventCategory: 'gesture',
      properties: { direction, target }
    })
  }
  
  const trackSmartSuggestion = (action: 'shown' | 'clicked' | 'dismissed', suggestionId?: string, suggestionType?: string) => {
    const eventName = action === 'shown' ? 'smart_suggestion_shown' 
      : action === 'clicked' ? 'smart_suggestion_clicked' 
      : 'smart_suggestion_dismissed'
    
    trackEvent({
      eventName,
      eventCategory: 'interaction',
      properties: { suggestionId, suggestionType }
    })
  }
  
  const trackProgressiveLoading = (action: 'started' | 'completed', stepCount?: number, totalDuration?: number) => {
    trackEvent({
      eventName: action === 'started' ? 'progressive_loading_started' : 'progressive_loading_completed',
      eventCategory: 'performance',
      properties: { stepCount, totalDurationMs: totalDuration }
    })
  }
  
  const trackServiceCardClick = (serviceId: string, serviceName: string) => {
    trackEvent({
      eventName: 'service_card_clicked',
      eventCategory: 'interaction',
      properties: { serviceId, serviceName }
    })
  }
  
  const trackLocationSearch = (action: 'started' | 'completed', query?: string, resultsCount?: number) => {
    trackEvent({
      eventName: action === 'started' ? 'location_search_started' : 'location_search_completed',
      eventCategory: 'interaction',
      properties: { query, resultsCount }
    })
  }
  
  const trackLocationSelected = (locationType: string, source: string) => {
    trackEvent({
      eventName: 'location_selected',
      eventCategory: 'interaction',
      properties: { locationType, source }
    })
  }
  
  const trackFeatureToggle = (featureName: string, enabled: boolean) => {
    trackEvent({
      eventName: enabled ? 'feature_enabled' : 'feature_disabled',
      eventCategory: 'interaction',
      properties: { featureName }
    })
  }
  
  const trackError = (errorType: string, errorMessage: string, recovered: boolean = false) => {
    trackEvent({
      eventName: recovered ? 'error_recovered' : 'error_occurred',
      eventCategory: 'error',
      properties: { errorType, errorMessage }
    })
  }

  // Get session duration in minutes
  const getSessionDuration = (): number => {
    if (!session.value) return 0
    return Math.round((Date.now() - session.value.startTime) / 60000)
  }
  
  // End session
  const endSession = async () => {
    if (!session.value) return
    
    trackEvent({
      eventName: 'session_end',
      eventCategory: 'navigation',
      properties: {
        durationMinutes: getSessionDuration(),
        pageViews: session.value.pageViews,
        interactions: session.value.interactions
      }
    })
    
    await flushEvents()
    
    // Clear session storage
    sessionStorage.removeItem('ux_session_id')
    sessionStorage.removeItem('ux_session_start')
    sessionStorage.removeItem('ux_page_views')
    sessionStorage.removeItem('ux_interactions')
    
    session.value = null
    isTracking.value = false
  }
  
  // Lifecycle hooks
  onMounted(() => {
    initSession()
    
    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      flushEvents()
    })
    
    // Flush on visibility change (tab switch)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        flushEvents()
      }
    })
  })
  
  onUnmounted(() => {
    flushEvents()
  })
  
  return {
    isTracking,
    session,
    trackEvent,
    trackPageView,
    trackHapticFeedback,
    trackPullToRefresh,
    trackSwipeNavigation,
    trackSmartSuggestion,
    trackProgressiveLoading,
    trackServiceCardClick,
    trackLocationSearch,
    trackLocationSelected,
    trackFeatureToggle,
    trackError,
    getSessionDuration,
    endSession,
    flushEvents
  }
}

// Singleton instance for global tracking
let globalTracker: ReturnType<typeof useUXTracking> | null = null

export function getUXTracker() {
  if (!globalTracker) {
    globalTracker = useUXTracking()
  }
  return globalTracker
}

// Quick track functions for use without composable
export async function quickTrack(eventName: UXEventName, category: UXEventCategory, properties?: Record<string, any>) {
  const authStore = useAuthStore()
  const sessionId = sessionStorage.getItem('ux_session_id') || generateSessionId()
  
  try {
    await (supabase.from('analytics_events') as any).insert({
      session_id: sessionId,
      user_id: authStore.user?.id || null,
      event_name: eventName,
      event_category: category,
      properties: properties || {},
      page_url: window.location.pathname,
      page_name: document.title,
      device_type: getDeviceType(),
      browser: getBrowser(),
      os: getOS(),
      created_at: new Date().toISOString()
    })
  } catch (error) {
    console.warn('Quick track failed:', error)
  }
}

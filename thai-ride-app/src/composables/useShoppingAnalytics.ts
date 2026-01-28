/**
 * Shopping Analytics Composable
 * Track user behavior and shopping flow metrics
 */
import { ref } from 'vue'

export interface ShoppingAnalyticsEvent {
  event: string
  timestamp: number
  data?: Record<string, unknown>
}

export function useShoppingAnalytics() {
  const events = ref<ShoppingAnalyticsEvent[]>([])
  const sessionStartTime = ref<number>(Date.now())

  // Track event
  const track = (event: string, data?: Record<string, unknown>) => {
    const analyticsEvent: ShoppingAnalyticsEvent = {
      event,
      timestamp: Date.now(),
      data
    }

    events.value.push(analyticsEvent)

    // Log in development
    if (import.meta.env.DEV) {
      console.log('[Analytics]', event, data)
    }

    // TODO: Send to analytics service in production
    // if (import.meta.env.PROD) {
    //   gtag('event', event, data)
    // }
  }

  // Shopping flow events
  const trackStepView = (step: string) => {
    track('shopping_step_view', { step })
  }

  const trackStepComplete = (step: string, duration: number) => {
    track('shopping_step_complete', { step, duration })
  }

  const trackLocationSelect = (type: 'store' | 'delivery', method: 'search' | 'map' | 'current' | 'saved') => {
    track('shopping_location_select', { type, method })
  }

  const trackItemsInput = (itemCount: number, hasImages: boolean) => {
    track('shopping_items_input', { itemCount, hasImages })
  }

  const trackBudgetSelect = (amount: number, method: 'quick' | 'manual') => {
    track('shopping_budget_select', { amount, method })
  }

  const trackFavoriteUsed = (favoriteId: string) => {
    track('shopping_favorite_used', { favoriteId })
  }

  const trackFavoriteSaved = (favoriteId: string) => {
    track('shopping_favorite_saved', { favoriteId })
  }

  const trackImageUpload = (imageCount: number, totalSize: number) => {
    track('shopping_image_upload', { imageCount, totalSize })
  }

  const trackOrderSubmit = (data: {
    serviceFee: number
    budgetLimit: number
    itemCount: number
    distance: number
    hasImages: boolean
    duration: number
  }) => {
    track('shopping_order_submit', {
      ...data,
      sessionDuration: Date.now() - sessionStartTime.value
    })
  }

  const trackOrderSuccess = (orderId: string, trackingId: string) => {
    track('shopping_order_success', {
      orderId,
      trackingId,
      totalDuration: Date.now() - sessionStartTime.value
    })
  }

  const trackOrderError = (error: string, step: string) => {
    track('shopping_order_error', { error, step })
  }

  const trackSwipeGesture = (direction: 'next' | 'prev', fromStep: string) => {
    track('shopping_swipe_gesture', { direction, fromStep })
  }

  const trackExit = (hasData: boolean, currentStep: string) => {
    track('shopping_exit', {
      hasData,
      currentStep,
      sessionDuration: Date.now() - sessionStartTime.value
    })
  }

  // Get session summary
  const getSessionSummary = () => {
    return {
      events: events.value,
      duration: Date.now() - sessionStartTime.value,
      eventCount: events.value.length
    }
  }

  // Reset session
  const resetSession = () => {
    events.value = []
    sessionStartTime.value = Date.now()
  }

  return {
    track,
    trackStepView,
    trackStepComplete,
    trackLocationSelect,
    trackItemsInput,
    trackBudgetSelect,
    trackFavoriteUsed,
    trackFavoriteSaved,
    trackImageUpload,
    trackOrderSubmit,
    trackOrderSuccess,
    trackOrderError,
    trackSwipeGesture,
    trackExit,
    getSessionSummary,
    resetSession
  }
}

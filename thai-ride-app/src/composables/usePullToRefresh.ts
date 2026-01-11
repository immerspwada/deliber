/**
 * Composable: usePullToRefresh
 * Pull-to-refresh functionality for mobile-like experience
 * 
 * Features:
 * - Touch-based pull detection
 * - Visual feedback with progress indicator
 * - Haptic feedback on trigger
 * - Configurable threshold and resistance
 */
import { ref, onMounted, onUnmounted, type Ref } from 'vue'

interface PullToRefreshOptions {
  /** Element to attach pull-to-refresh (default: window) */
  containerRef?: Ref<HTMLElement | null>
  /** Distance to pull before triggering refresh (default: 80px) */
  threshold?: number
  /** Resistance factor for pull (default: 2.5) */
  resistance?: number
  /** Maximum pull distance (default: 150px) */
  maxPull?: number
  /** Callback when refresh is triggered */
  onRefresh: () => Promise<void>
  /** Enable/disable the feature */
  enabled?: Ref<boolean>
}

interface PullToRefreshReturn {
  /** Current pull distance (0 to maxPull) */
  pullDistance: Ref<number>
  /** Whether currently refreshing */
  isRefreshing: Ref<boolean>
  /** Whether pull is active (user is pulling) */
  isPulling: Ref<boolean>
  /** Progress percentage (0 to 100) */
  progress: Ref<number>
  /** Whether threshold is reached */
  canRelease: Ref<boolean>
}

export function usePullToRefresh(options: PullToRefreshOptions): PullToRefreshReturn {
  const {
    containerRef,
    threshold = 80,
    resistance = 2.5,
    maxPull = 150,
    onRefresh,
    enabled
  } = options

  const pullDistance = ref(0)
  const isRefreshing = ref(false)
  const isPulling = ref(false)
  const progress = ref(0)
  const canRelease = ref(false)

  let startY = 0
  let currentY = 0

  // Haptic feedback helper
  function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'light'): void {
    if ('vibrate' in navigator) {
      const patterns = { light: 10, medium: 20, heavy: 30 }
      navigator.vibrate(patterns[style])
    }
  }

  function getScrollTop(): number {
    if (containerRef?.value) {
      return containerRef.value.scrollTop
    }
    return window.scrollY || document.documentElement.scrollTop
  }

  function handleTouchStart(e: TouchEvent): void {
    if (enabled?.value === false) return
    if (isRefreshing.value) return
    if (getScrollTop() > 0) return

    startY = e.touches[0].clientY
    isPulling.value = true
  }

  function handleTouchMove(e: TouchEvent): void {
    if (!isPulling.value) return
    if (enabled?.value === false) return
    if (isRefreshing.value) return

    currentY = e.touches[0].clientY
    const diff = currentY - startY

    // Only allow pulling down
    if (diff < 0) {
      pullDistance.value = 0
      return
    }

    // Check if we're at the top of the scroll
    if (getScrollTop() > 0) {
      pullDistance.value = 0
      return
    }

    // Apply resistance
    const adjustedDiff = diff / resistance
    pullDistance.value = Math.min(adjustedDiff, maxPull)
    progress.value = Math.min((pullDistance.value / threshold) * 100, 100)

    // Check if threshold reached
    const wasCanRelease = canRelease.value
    canRelease.value = pullDistance.value >= threshold

    // Haptic feedback when threshold is reached
    if (canRelease.value && !wasCanRelease) {
      triggerHaptic('medium')
    }

    // Prevent default scroll when pulling
    if (pullDistance.value > 0) {
      e.preventDefault()
    }
  }

  async function handleTouchEnd(): Promise<void> {
    if (!isPulling.value) return

    isPulling.value = false

    if (canRelease.value && !isRefreshing.value) {
      // Trigger refresh
      isRefreshing.value = true
      triggerHaptic('heavy')

      try {
        await onRefresh()
      } catch (error) {
        console.error('[PullToRefresh] Refresh failed:', error)
      } finally {
        isRefreshing.value = false
      }
    }

    // Reset
    pullDistance.value = 0
    progress.value = 0
    canRelease.value = false
  }

  function handleTouchCancel(): void {
    isPulling.value = false
    pullDistance.value = 0
    progress.value = 0
    canRelease.value = false
  }

  onMounted(() => {
    const target = containerRef?.value || document

    target.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true })
    target.addEventListener('touchmove', handleTouchMove as EventListener, { passive: false })
    target.addEventListener('touchend', handleTouchEnd as EventListener, { passive: true })
    target.addEventListener('touchcancel', handleTouchCancel as EventListener, { passive: true })
  })

  onUnmounted(() => {
    const target = containerRef?.value || document

    target.removeEventListener('touchstart', handleTouchStart as EventListener)
    target.removeEventListener('touchmove', handleTouchMove as EventListener)
    target.removeEventListener('touchend', handleTouchEnd as EventListener)
    target.removeEventListener('touchcancel', handleTouchCancel as EventListener)
  })

  return {
    pullDistance,
    isRefreshing,
    isPulling,
    progress,
    canRelease
  }
}

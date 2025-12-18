/**
 * useSwipeGestures - Swipe Gesture Detection Composable
 * 
 * ตรวจจับ gesture การ swipe สำหรับ navigation และ actions
 * ทำให้การใช้งานบนมือถือสะดวกและเป็นธรรมชาติมากขึ้น
 */

import { ref, onMounted, onUnmounted } from 'vue'
import { useHapticFeedback } from './useHapticFeedback'

export type SwipeDirection = 'left' | 'right' | 'up' | 'down' | null

export interface SwipeState {
  direction: SwipeDirection
  distance: number
  velocity: number
  isActive: boolean
}

export interface SwipeOptions {
  threshold?: number // minimum distance to trigger swipe
  velocityThreshold?: number // minimum velocity to trigger swipe
  preventScroll?: boolean
  hapticFeedback?: boolean
}

export interface SwipeHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onSwipeStart?: (direction: SwipeDirection) => void
  onSwipeMove?: (state: SwipeState) => void
  onSwipeEnd?: (state: SwipeState) => void
}

export function useSwipeGestures(
  elementRef: { value: HTMLElement | null },
  handlers: SwipeHandlers = {},
  options: SwipeOptions = {}
) {
  const {
    threshold = 50,
    velocityThreshold = 0.3,
    preventScroll = false,
    hapticFeedback = true
  } = options
  
  const haptic = useHapticFeedback()
  
  const startX = ref(0)
  const startY = ref(0)
  const startTime = ref(0)
  const currentX = ref(0)
  const currentY = ref(0)
  const isActive = ref(false)
  const direction = ref<SwipeDirection>(null)
  
  const state = ref<SwipeState>({
    direction: null,
    distance: 0,
    velocity: 0,
    isActive: false
  })
  
  const getDirection = (deltaX: number, deltaY: number): SwipeDirection => {
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)
    
    if (absX > absY) {
      return deltaX > 0 ? 'right' : 'left'
    } else if (absY > absX) {
      return deltaY > 0 ? 'down' : 'up'
    }
    
    return null
  }
  
  const getDistance = (deltaX: number, deltaY: number): number => {
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY)
  }
  
  const getVelocity = (distance: number, time: number): number => {
    return time > 0 ? distance / time : 0
  }
  
  const handleTouchStart = (e: TouchEvent) => {
    if (!e.touches[0]) return
    
    startX.value = e.touches[0].clientX
    startY.value = e.touches[0].clientY
    startTime.value = Date.now()
    currentX.value = startX.value
    currentY.value = startY.value
    isActive.value = true
    direction.value = null
    
    state.value = {
      direction: null,
      distance: 0,
      velocity: 0,
      isActive: true
    }
  }
  
  const handleTouchMove = (e: TouchEvent) => {
    if (!isActive.value || !e.touches[0]) return
    
    currentX.value = e.touches[0].clientX
    currentY.value = e.touches[0].clientY
    
    const deltaX = currentX.value - startX.value
    const deltaY = currentY.value - startY.value
    const newDirection = getDirection(deltaX, deltaY)
    const distance = getDistance(deltaX, deltaY)
    const elapsed = Date.now() - startTime.value
    const velocity = getVelocity(distance, elapsed)
    
    // Detect direction change
    if (direction.value !== newDirection && distance > 10) {
      direction.value = newDirection
      handlers.onSwipeStart?.(newDirection)
      
      if (hapticFeedback) {
        haptic.light()
      }
    }
    
    state.value = {
      direction: newDirection,
      distance,
      velocity,
      isActive: true
    }
    
    handlers.onSwipeMove?.(state.value)
    
    // Prevent scroll if horizontal swipe
    if (preventScroll && (newDirection === 'left' || newDirection === 'right')) {
      e.preventDefault()
    }
  }
  
  const handleTouchEnd = () => {
    if (!isActive.value) return
    
    const deltaX = currentX.value - startX.value
    const deltaY = currentY.value - startY.value
    const distance = getDistance(deltaX, deltaY)
    const elapsed = Date.now() - startTime.value
    const velocity = getVelocity(distance, elapsed)
    const finalDirection = getDirection(deltaX, deltaY)
    
    state.value = {
      direction: finalDirection,
      distance,
      velocity,
      isActive: false
    }
    
    // Check if swipe meets threshold
    const meetsThreshold = distance >= threshold || velocity >= velocityThreshold
    
    if (meetsThreshold && finalDirection) {
      if (hapticFeedback) {
        haptic.medium()
      }
      
      switch (finalDirection) {
        case 'left':
          handlers.onSwipeLeft?.()
          break
        case 'right':
          handlers.onSwipeRight?.()
          break
        case 'up':
          handlers.onSwipeUp?.()
          break
        case 'down':
          handlers.onSwipeDown?.()
          break
      }
    }
    
    handlers.onSwipeEnd?.(state.value)
    
    // Reset
    isActive.value = false
    direction.value = null
  }
  
  const handleTouchCancel = () => {
    isActive.value = false
    direction.value = null
    state.value = {
      direction: null,
      distance: 0,
      velocity: 0,
      isActive: false
    }
  }
  
  // Attach/detach event listeners
  const attach = () => {
    const el = elementRef.value
    if (!el) return
    
    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: !preventScroll })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })
    el.addEventListener('touchcancel', handleTouchCancel, { passive: true })
  }
  
  const detach = () => {
    const el = elementRef.value
    if (!el) return
    
    el.removeEventListener('touchstart', handleTouchStart)
    el.removeEventListener('touchmove', handleTouchMove)
    el.removeEventListener('touchend', handleTouchEnd)
    el.removeEventListener('touchcancel', handleTouchCancel)
  }
  
  onMounted(() => {
    attach()
  })
  
  onUnmounted(() => {
    detach()
  })
  
  return {
    state,
    isActive,
    direction,
    attach,
    detach
  }
}

/**
 * useSwipeNavigation - Swipe-based navigation helper
 */
export function useSwipeNavigation(
  elementRef: { value: HTMLElement | null },
  options: {
    onBack?: () => void
    onForward?: () => void
    onNext?: () => void
    onPrevious?: () => void
    threshold?: number
    hapticFeedback?: boolean
  } = {}
) {
  const {
    onBack,
    onForward,
    onNext,
    onPrevious,
    threshold = 80,
    hapticFeedback = true
  } = options
  
  return useSwipeGestures(
    elementRef,
    {
      onSwipeRight: onBack,
      onSwipeLeft: onForward,
      onSwipeUp: onNext,
      onSwipeDown: onPrevious
    },
    {
      threshold,
      hapticFeedback,
      preventScroll: false
    }
  )
}

/**
 * useSwipeToAction - Swipe to reveal action buttons
 */
export function useSwipeToAction(
  elementRef: { value: HTMLElement | null },
  options: {
    onRevealLeft?: () => void
    onRevealRight?: () => void
    revealThreshold?: number
    maxReveal?: number
  } = {}
) {
  const {
    onRevealLeft,
    onRevealRight,
    revealThreshold = 60,
    maxReveal = 100
  } = options
  
  const revealOffset = ref(0)
  const isRevealed = ref<'left' | 'right' | null>(null)
  
  const { state } = useSwipeGestures(
    elementRef,
    {
      onSwipeMove: (s) => {
        if (s.direction === 'left' || s.direction === 'right') {
          const offset = s.direction === 'left' ? -s.distance : s.distance
          revealOffset.value = Math.max(-maxReveal, Math.min(maxReveal, offset))
        }
      },
      onSwipeEnd: (s) => {
        if (Math.abs(revealOffset.value) >= revealThreshold) {
          if (revealOffset.value < 0) {
            isRevealed.value = 'left'
            onRevealLeft?.()
          } else {
            isRevealed.value = 'right'
            onRevealRight?.()
          }
        } else {
          revealOffset.value = 0
          isRevealed.value = null
        }
      }
    },
    {
      preventScroll: true,
      hapticFeedback: true
    }
  )
  
  const reset = () => {
    revealOffset.value = 0
    isRevealed.value = null
  }
  
  return {
    state,
    revealOffset,
    isRevealed,
    reset
  }
}

export default useSwipeGestures

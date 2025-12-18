/**
 * useHapticFeedback - Haptic Feedback Composable
 * 
 * ให้ feedback การสั่นเบาๆ เมื่อผู้ใช้ interact กับ UI
 * ทำให้ app รู้สึก "มีชีวิต" และตอบสนองมากขึ้น
 * 
 * @syncs-with
 * - UX Tracking: useUXTracking.ts (haptic_feedback_triggered events)
 * - Admin: AdminUXAnalyticsView.vue
 */

import { ref } from 'vue'
import { quickTrack } from './useUXTracking'

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection'

interface HapticPattern {
  pattern: number | number[]
  description: string
}

const hapticPatterns: Record<HapticType, HapticPattern> = {
  light: { pattern: 10, description: 'แตะเบาๆ' },
  medium: { pattern: 25, description: 'แตะปานกลาง' },
  heavy: { pattern: 50, description: 'แตะหนัก' },
  success: { pattern: [10, 50, 10], description: 'สำเร็จ' },
  warning: { pattern: [30, 30, 30], description: 'เตือน' },
  error: { pattern: [50, 100, 50], description: 'ผิดพลาด' },
  selection: { pattern: 5, description: 'เลือก' }
}

export function useHapticFeedback() {
  const isSupported = ref(typeof navigator !== 'undefined' && 'vibrate' in navigator)
  const isEnabled = ref(true)
  
  /**
   * ตรวจสอบว่า device รองรับ haptic feedback หรือไม่
   */
  const checkSupport = (): boolean => {
    return isSupported.value
  }
  
  /**
   * เปิด/ปิด haptic feedback
   */
  const setEnabled = (enabled: boolean) => {
    isEnabled.value = enabled
  }
  
  /**
   * Trigger haptic feedback
   */
  const trigger = (type: HapticType = 'light'): boolean => {
    if (!isSupported.value || !isEnabled.value) return false
    
    try {
      const pattern = hapticPatterns[type]?.pattern || 10
      const result = navigator.vibrate(pattern)
      
      // Track haptic feedback (debounced to avoid spam)
      if (result && shouldTrackHaptic(type)) {
        quickTrack('haptic_feedback_triggered', 'interaction', { 
          hapticType: type,
          pattern: Array.isArray(pattern) ? pattern.join(',') : pattern.toString()
        })
      }
      
      return result
    } catch {
      return false
    }
  }
  
  // Debounce tracking to avoid spam (track max once per second per type)
  const lastTrackedTime: Record<string, number> = {}
  const shouldTrackHaptic = (type: HapticType): boolean => {
    const now = Date.now()
    const lastTime = lastTrackedTime[type] || 0
    if (now - lastTime > 1000) {
      lastTrackedTime[type] = now
      return true
    }
    return false
  }
  
  /**
   * Custom vibration pattern
   */
  const triggerCustom = (pattern: number | number[]): boolean => {
    if (!isSupported.value || !isEnabled.value) return false
    
    try {
      return navigator.vibrate(pattern)
    } catch {
      return false
    }
  }
  
  /**
   * หยุด vibration
   */
  const stop = (): boolean => {
    if (!isSupported.value) return false
    
    try {
      return navigator.vibrate(0)
    } catch {
      return false
    }
  }
  
  // Shortcut functions
  const light = () => trigger('light')
  const medium = () => trigger('medium')
  const heavy = () => trigger('heavy')
  const success = () => trigger('success')
  const warning = () => trigger('warning')
  const error = () => trigger('error')
  const selection = () => trigger('selection')
  
  /**
   * Haptic feedback สำหรับ button press
   */
  const onButtonPress = () => trigger('light')
  
  /**
   * Haptic feedback สำหรับ toggle switch
   */
  const onToggle = () => trigger('selection')
  
  /**
   * Haptic feedback สำหรับ form submit
   */
  const onSubmit = () => trigger('medium')
  
  /**
   * Haptic feedback สำหรับ action success
   */
  const onSuccess = () => trigger('success')
  
  /**
   * Haptic feedback สำหรับ action error
   */
  const onError = () => trigger('error')
  
  /**
   * Haptic feedback สำหรับ pull-to-refresh threshold
   */
  const onPullThreshold = () => trigger('medium')
  
  /**
   * Haptic feedback สำหรับ swipe action
   */
  const onSwipe = () => trigger('light')
  
  /**
   * Haptic feedback สำหรับ long press
   */
  const onLongPress = () => trigger('heavy')
  
  return {
    // State
    isSupported,
    isEnabled,
    
    // Core functions
    checkSupport,
    setEnabled,
    trigger,
    triggerCustom,
    stop,
    
    // Shortcuts
    light,
    medium,
    heavy,
    success,
    warning,
    error,
    selection,
    
    // Context-specific
    onButtonPress,
    onToggle,
    onSubmit,
    onSuccess,
    onError,
    onPullThreshold,
    onSwipe,
    onLongPress
  }
}

export default useHapticFeedback

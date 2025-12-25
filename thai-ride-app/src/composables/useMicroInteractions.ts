/**
 * Micro-Interactions Library
 * Feature: F260 - Professional Micro-Interactions
 * 
 * Provides delightful micro-interactions for common UI elements
 * Following MUNEEF Style guidelines with green accent
 */

import { useAnimationUtils } from './useAnimationUtils'
import { useHapticFeedback } from './useHapticFeedback'

export function useMicroInteractions() {
  const { fadeIn, scale, shake, ripple } = useAnimationUtils()
  const haptic = useHapticFeedback()

  /**
   * Button press interaction
   * Combines scale animation + haptic feedback
   */
  const buttonPress = (element: HTMLElement, event?: MouseEvent) => {
    // Scale down then up
    const animation = element.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(0.95)' },
        { transform: 'scale(1)' }
      ],
      {
        duration: 150,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
      }
    )

    // Ripple effect if event provided
    if (event) {
      ripple(element, event)
    }

    // Haptic feedback
    haptic.vibrate('light')

    return animation
  }

  /**
   * Card tap interaction
   * Subtle scale + shadow change
   */
  const cardTap = (element: HTMLElement) => {
    const animation = element.animate(
      [
        { 
          transform: 'scale(1)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        },
        { 
          transform: 'scale(0.98)',
          boxShadow: '0 4px 12px rgba(0, 168, 107, 0.15)'
        },
        { 
          transform: 'scale(1)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }
      ],
      {
        duration: 200,
        easing: 'ease-out'
      }
    )

    haptic.vibrate('light')

    return animation
  }

  /**
   * Toggle switch interaction
   * Smooth slide + color change
   */
  const toggleSwitch = (element: HTMLElement, isOn: boolean) => {
    const thumb = element.querySelector('.toggle-thumb') as HTMLElement
    if (!thumb) return

    const animation = thumb.animate(
      [
        { 
          transform: isOn ? 'translateX(0)' : 'translateX(20px)',
          backgroundColor: isOn ? '#E8E8E8' : '#00A86B'
        },
        { 
          transform: isOn ? 'translateX(20px)' : 'translateX(0)',
          backgroundColor: isOn ? '#00A86B' : '#E8E8E8'
        }
      ],
      {
        duration: 200,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        fill: 'forwards'
      }
    )

    haptic.vibrate('medium')

    return animation
  }

  /**
   * Checkbox check interaction
   * Scale + checkmark draw
   */
  const checkboxCheck = (element: HTMLElement, isChecked: boolean) => {
    const animation = element.animate(
      [
        { 
          transform: 'scale(1)',
          opacity: isChecked ? 0 : 1
        },
        { 
          transform: 'scale(1.2)',
          opacity: 0.5
        },
        { 
          transform: 'scale(1)',
          opacity: isChecked ? 1 : 0
        }
      ],
      {
        duration: 250,
        easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
      }
    )

    haptic.vibrate('light')

    return animation
  }

  /**
   * Radio button select interaction
   * Ripple + scale
   */
  const radioSelect = (element: HTMLElement) => {
    const dot = element.querySelector('.radio-dot') as HTMLElement
    if (!dot) return

    const animation = dot.animate(
      [
        { transform: 'scale(0)', opacity: 0 },
        { transform: 'scale(1.2)', opacity: 1 },
        { transform: 'scale(1)', opacity: 1 }
      ],
      {
        duration: 200,
        easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        fill: 'forwards'
      }
    )

    haptic.vibrate('light')

    return animation
  }

  /**
   * Input focus interaction
   * Border glow + label float
   */
  const inputFocus = (element: HTMLElement, isFocused: boolean) => {
    const animation = element.animate(
      [
        { 
          borderColor: isFocused ? '#E8E8E8' : '#00A86B',
          boxShadow: isFocused ? 'none' : '0 0 0 3px rgba(0, 168, 107, 0.1)'
        },
        { 
          borderColor: isFocused ? '#00A86B' : '#E8E8E8',
          boxShadow: isFocused ? '0 0 0 3px rgba(0, 168, 107, 0.1)' : 'none'
        }
      ],
      {
        duration: 200,
        easing: 'ease-out',
        fill: 'forwards'
      }
    )

    return animation
  }

  /**
   * Success checkmark animation
   * Draw checkmark path
   */
  const successCheckmark = (element: HTMLElement) => {
    const path = element.querySelector('path') as SVGPathElement
    if (!path) return

    const length = path.getTotalLength()
    path.style.strokeDasharray = `${length}`
    path.style.strokeDashoffset = `${length}`

    const animation = path.animate(
      [
        { strokeDashoffset: length },
        { strokeDashoffset: 0 }
      ],
      {
        duration: 400,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        fill: 'forwards'
      }
    )

    haptic.feedback('success')

    return animation
  }

  /**
   * Error shake animation
   * Shake + red flash
   */
  const errorShake = (element: HTMLElement) => {
    const animation = shake(element)
    
    // Flash red border
    element.animate(
      [
        { borderColor: 'currentColor' },
        { borderColor: '#E53935' },
        { borderColor: 'currentColor' }
      ],
      {
        duration: 500,
        easing: 'ease-in-out'
      }
    )

    haptic.feedback('error')

    return animation
  }

  /**
   * Loading pulse animation
   * Continuous pulse
   */
  const loadingPulse = (element: HTMLElement) => {
    const animation = element.animate(
      [
        { opacity: 1, transform: 'scale(1)' },
        { opacity: 0.6, transform: 'scale(0.95)' },
        { opacity: 1, transform: 'scale(1)' }
      ],
      {
        duration: 1500,
        easing: 'ease-in-out',
        iterations: Infinity
      }
    )

    return animation
  }

  /**
   * Swipe gesture feedback
   * Slide + fade
   */
  const swipeGesture = (element: HTMLElement, direction: 'left' | 'right') => {
    const distance = direction === 'left' ? -100 : 100

    const animation = element.animate(
      [
        { transform: 'translateX(0)', opacity: 1 },
        { transform: `translateX(${distance}px)`, opacity: 0 }
      ],
      {
        duration: 300,
        easing: 'cubic-bezier(0.4, 0, 1, 1)',
        fill: 'forwards'
      }
    )

    haptic.vibrate('medium')

    return animation
  }

  /**
   * Pull to refresh interaction
   * Rotate + scale
   */
  const pullToRefresh = (element: HTMLElement, progress: number) => {
    const rotation = progress * 360
    const scale = 0.8 + (progress * 0.2)

    element.style.transform = `rotate(${rotation}deg) scale(${scale})`
    element.style.opacity = String(progress)

    if (progress >= 1) {
      haptic.vibrate('success')
    }
  }

  /**
   * Badge bounce animation
   * Attention-grabbing bounce
   */
  const badgeBounce = (element: HTMLElement) => {
    const animation = element.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.3)' },
        { transform: 'scale(0.9)' },
        { transform: 'scale(1.1)' },
        { transform: 'scale(1)' }
      ],
      {
        duration: 500,
        easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
      }
    )

    return animation
  }

  /**
   * Floating action button (FAB) interaction
   * Scale + rotate
   */
  const fabPress = (element: HTMLElement, isOpen: boolean) => {
    const animation = element.animate(
      [
        { 
          transform: isOpen ? 'scale(1) rotate(0deg)' : 'scale(1) rotate(45deg)',
          backgroundColor: isOpen ? '#00A86B' : '#008F5B'
        },
        { 
          transform: isOpen ? 'scale(1) rotate(45deg)' : 'scale(1) rotate(0deg)',
          backgroundColor: isOpen ? '#008F5B' : '#00A86B'
        }
      ],
      {
        duration: 300,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        fill: 'forwards'
      }
    )

    haptic.vibrate('medium')

    return animation
  }

  /**
   * Toast notification slide in
   * Slide from top + fade
   */
  const toastSlideIn = (element: HTMLElement) => {
    const animation = element.animate(
      [
        { 
          transform: 'translateY(-100%)',
          opacity: 0
        },
        { 
          transform: 'translateY(0)',
          opacity: 1
        }
      ],
      {
        duration: 300,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        fill: 'forwards'
      }
    )

    return animation
  }

  /**
   * Modal backdrop fade
   * Smooth fade in/out
   */
  const modalBackdrop = (element: HTMLElement, isOpen: boolean) => {
    const animation = element.animate(
      [
        { opacity: isOpen ? 0 : 0.5 },
        { opacity: isOpen ? 0.5 : 0 }
      ],
      {
        duration: 200,
        easing: 'ease-out',
        fill: 'forwards'
      }
    )

    return animation
  }

  return {
    // Button interactions
    buttonPress,
    cardTap,
    fabPress,

    // Form interactions
    toggleSwitch,
    checkboxCheck,
    radioSelect,
    inputFocus,

    // Feedback interactions
    successCheckmark,
    errorShake,
    loadingPulse,

    // Gesture interactions
    swipeGesture,
    pullToRefresh,

    // UI element interactions
    badgeBounce,
    toastSlideIn,
    modalBackdrop
  }
}

/**
 * Usage Example:
 * 
 * ```vue
 * <script setup>
 * import { useMicroInteractions } from '@/composables/useMicroInteractions'
 * 
 * const micro = useMicroInteractions()
 * const buttonRef = ref<HTMLElement>()
 * 
 * const handleClick = (event: MouseEvent) => {
 *   if (buttonRef.value) {
 *     micro.buttonPress(buttonRef.value, event)
 *   }
 *   // Perform action
 * }
 * </script>
 * 
 * <template>
 *   <button 
 *     ref="buttonRef"
 *     @click="handleClick"
 *     class="btn-primary"
 *   >
 *     Click me
 *   </button>
 * </template>
 * ```
 */

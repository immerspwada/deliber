/**
 * Page Transitions Composable
 * Feature: F261 - Page Transitions System
 * 
 * Smooth page transitions for Vue Router navigation
 * Following MUNEEF Style guidelines
 */

import { ref, onMounted } from 'vue'
import { useRouter, type RouteLocationNormalized } from 'vue-router'

type TransitionType = 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'scale' | 'none'

interface TransitionConfig {
  enter: string
  leave: string
  duration: number
}

export function usePageTransitions() {
  const router = useRouter()
  const isTransitioning = ref(false)
  const transitionName = ref<TransitionType>('fade')
  const prefersReducedMotion = ref(false)

  // Check user's motion preference
  onMounted(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion.value = mediaQuery.matches

    mediaQuery.addEventListener('change', (e) => {
      prefersReducedMotion.value = e.matches
    })
  })

  /**
   * Transition configurations
   */
  const transitions: Record<TransitionType, TransitionConfig> = {
    fade: {
      enter: 'fade-enter',
      leave: 'fade-leave',
      duration: 300
    },
    'slide-left': {
      enter: 'slide-left-enter',
      leave: 'slide-left-leave',
      duration: 400
    },
    'slide-right': {
      enter: 'slide-right-enter',
      leave: 'slide-right-leave',
      duration: 400
    },
    'slide-up': {
      enter: 'slide-up-enter',
      leave: 'slide-up-leave',
      duration: 400
    },
    'slide-down': {
      enter: 'slide-down-enter',
      leave: 'slide-down-leave',
      duration: 400
    },
    scale: {
      enter: 'scale-enter',
      leave: 'scale-leave',
      duration: 300
    },
    none: {
      enter: '',
      leave: '',
      duration: 0
    }
  }

  /**
   * Determine transition based on route navigation
   */
  const getTransitionForRoute = (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized
  ): TransitionType => {
    // No transition if user prefers reduced motion
    if (prefersReducedMotion.value) return 'none'

    // Admin routes - fade
    if (to.path.startsWith('/admin') && from.path.startsWith('/admin')) {
      return 'fade'
    }

    // Provider routes - slide
    if (to.path.startsWith('/provider') && from.path.startsWith('/provider')) {
      return 'slide-left'
    }

    // Customer routes - determine direction
    if (to.path.startsWith('/customer') && from.path.startsWith('/customer')) {
      // Going deeper (e.g., /customer -> /customer/ride)
      if (to.path.length > from.path.length) {
        return 'slide-left'
      }
      // Going back (e.g., /customer/ride -> /customer)
      if (to.path.length < from.path.length) {
        return 'slide-right'
      }
      return 'fade'
    }

    // Modal/overlay routes - slide up
    if (to.meta.modal) {
      return 'slide-up'
    }

    // Default - fade
    return 'fade'
  }

  /**
   * Setup router navigation guards
   */
  const setupTransitions = () => {
    router.beforeEach((to, from, next) => {
      isTransitioning.value = true
      transitionName.value = getTransitionForRoute(to, from)
      next()
    })

    router.afterEach(() => {
      // Reset transition state after navigation
      setTimeout(() => {
        isTransitioning.value = false
      }, transitions[transitionName.value].duration)
    })
  }

  /**
   * Manual transition trigger
   */
  const setTransition = (type: TransitionType) => {
    transitionName.value = type
  }

  /**
   * Get CSS classes for current transition
   */
  const getTransitionClasses = () => {
    const config = transitions[transitionName.value]
    return {
      enterActiveClass: `${config.enter}-active`,
      enterFromClass: `${config.enter}-from`,
      enterToClass: `${config.enter}-to`,
      leaveActiveClass: `${config.leave}-active`,
      leaveFromClass: `${config.leave}-from`,
      leaveToClass: `${config.leave}-to`
    }
  }

  return {
    isTransitioning,
    transitionName,
    prefersReducedMotion,
    setupTransitions,
    setTransition,
    getTransitionClasses
  }
}

/**
 * CSS Transitions (add to global styles)
 * 
 * ```css
 * // Fade
 * .fade-enter-active,
 * .fade-leave-active {
 *   transition: opacity 300ms ease;
 * }
 * .fade-enter-from,
 * .fade-leave-to {
 *   opacity: 0;
 * }
 * 
 * // Slide Left
 * .slide-left-enter-active,
 * .slide-left-leave-active {
 *   transition: all 400ms cubic-bezier(0.4, 0, 0.2, 1);
 * }
 * .slide-left-enter-from {
 *   transform: translateX(100%);
 *   opacity: 0;
 * }
 * .slide-left-leave-to {
 *   transform: translateX(-30%);
 *   opacity: 0;
 * }
 * 
 * // Slide Right
 * .slide-right-enter-active,
 * .slide-right-leave-active {
 *   transition: all 400ms cubic-bezier(0.4, 0, 0.2, 1);
 * }
 * .slide-right-enter-from {
 *   transform: translateX(-100%);
 *   opacity: 0;
 * }
 * .slide-right-leave-to {
 *   transform: translateX(30%);
 *   opacity: 0;
 * }
 * 
 * // Slide Up
 * .slide-up-enter-active,
 * .slide-up-leave-active {
 *   transition: all 400ms cubic-bezier(0.4, 0, 0.2, 1);
 * }
 * .slide-up-enter-from {
 *   transform: translateY(100%);
 *   opacity: 0;
 * }
 * .slide-up-leave-to {
 *   transform: translateY(-30%);
 *   opacity: 0;
 * }
 * 
 * // Scale
 * .scale-enter-active,
 * .scale-leave-active {
 *   transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
 * }
 * .scale-enter-from {
 *   transform: scale(0.9);
 *   opacity: 0;
 * }
 * .scale-leave-to {
 *   transform: scale(1.1);
 *   opacity: 0;
 * }
 * ```
 */

/**
 * Usage Example:
 * 
 * In main.ts or App.vue:
 * ```typescript
 * import { usePageTransitions } from '@/composables/usePageTransitions'
 * 
 * const { setupTransitions } = usePageTransitions()
 * setupTransitions()
 * ```
 * 
 * In router view:
 * ```vue
 * <script setup>
 * import { usePageTransitions } from '@/composables/usePageTransitions'
 * 
 * const { transitionName } = usePageTransitions()
 * </script>
 * 
 * <template>
 *   <router-view v-slot="{ Component }">
 *     <transition :name="transitionName" mode="out-in">
 *       <component :is="Component" />
 *     </transition>
 *   </router-view>
 * </template>
 * ```
 */

/**
 * Accessibility Utilities
 * Feature: F253 - Professional Accessibility Support
 * 
 * Provides utilities for WCAG 2.1 Level AA compliance
 */

import { ref, onMounted, onUnmounted } from 'vue'

export function useAccessibility() {
  const announcements = ref<string[]>([])
  let liveRegion: HTMLElement | null = null

  /**
   * Announce message to screen readers
   */
  const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!liveRegion) {
      createLiveRegion()
    }

    announcements.value.push(message)
    
    if (liveRegion) {
      liveRegion.setAttribute('aria-live', priority)
      liveRegion.textContent = message
      
      // Clear after announcement
      setTimeout(() => {
        if (liveRegion) {
          liveRegion.textContent = ''
        }
      }, 1000)
    }
  }

  /**
   * Create ARIA live region for announcements
   */
  const createLiveRegion = () => {
    if (typeof document === 'undefined') return

    liveRegion = document.createElement('div')
    liveRegion.setAttribute('role', 'status')
    liveRegion.setAttribute('aria-live', 'polite')
    liveRegion.setAttribute('aria-atomic', 'true')
    liveRegion.className = 'sr-only'
    document.body.appendChild(liveRegion)
  }

  /**
   * Trap focus within an element (for modals, dialogs)
   */
  const trapFocus = (element: HTMLElement) => {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    const firstFocusable = focusableElements[0] as HTMLElement
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          lastFocusable.focus()
          e.preventDefault()
        }
      } else {
        if (document.activeElement === lastFocusable) {
          firstFocusable.focus()
          e.preventDefault()
        }
      }
    }

    element.addEventListener('keydown', handleTabKey)
    
    // Focus first element
    firstFocusable?.focus()

    return () => {
      element.removeEventListener('keydown', handleTabKey)
    }
  }

  /**
   * Manage focus on route change
   */
  const manageFocus = (targetSelector: string = 'h1, [role="main"]') => {
    setTimeout(() => {
      const target = document.querySelector(targetSelector) as HTMLElement
      if (target) {
        target.setAttribute('tabindex', '-1')
        target.focus()
        target.addEventListener('blur', () => {
          target.removeAttribute('tabindex')
        }, { once: true })
      }
    }, 100)
  }

  /**
   * Check if element is visible to screen readers
   */
  const isVisibleToScreenReader = (element: HTMLElement): boolean => {
    return (
      element.getAttribute('aria-hidden') !== 'true' &&
      !element.hasAttribute('hidden') &&
      element.style.display !== 'none' &&
      element.style.visibility !== 'hidden'
    )
  }

  /**
   * Get accessible name of element
   */
  const getAccessibleName = (element: HTMLElement): string => {
    return (
      element.getAttribute('aria-label') ||
      element.getAttribute('aria-labelledby') ||
      element.textContent ||
      ''
    ).trim()
  }

  /**
   * Add keyboard navigation to list
   */
  const addKeyboardNavigation = (
    listElement: HTMLElement,
    itemSelector: string = '[role="option"], [role="menuitem"]'
  ) => {
    const items = Array.from(listElement.querySelectorAll(itemSelector)) as HTMLElement[]
    let currentIndex = 0

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          currentIndex = (currentIndex + 1) % items.length
          items[currentIndex].focus()
          break
        case 'ArrowUp':
          e.preventDefault()
          currentIndex = (currentIndex - 1 + items.length) % items.length
          items[currentIndex].focus()
          break
        case 'Home':
          e.preventDefault()
          currentIndex = 0
          items[0].focus()
          break
        case 'End':
          e.preventDefault()
          currentIndex = items.length - 1
          items[currentIndex].focus()
          break
      }
    }

    listElement.addEventListener('keydown', handleKeyDown)

    return () => {
      listElement.removeEventListener('keydown', handleKeyDown)
    }
  }

  /**
   * Check color contrast ratio
   */
  const checkColorContrast = (foreground: string, background: string): {
    ratio: number
    passesAA: boolean
    passesAAA: boolean
  } => {
    // Simplified contrast calculation
    // In production, use a proper color contrast library
    const getLuminance = (color: string): number => {
      // This is a simplified version
      // Real implementation should parse RGB values properly
      return 0.5 // Placeholder
    }

    const l1 = getLuminance(foreground)
    const l2 = getLuminance(background)
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)

    return {
      ratio,
      passesAA: ratio >= 4.5,
      passesAAA: ratio >= 7
    }
  }

  /**
   * Add skip link for keyboard navigation
   */
  const addSkipLink = (targetId: string, label: string = 'Skip to main content') => {
    if (typeof document === 'undefined') return

    const skipLink = document.createElement('a')
    skipLink.href = `#${targetId}`
    skipLink.textContent = label
    skipLink.className = 'skip-link'
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 0;
      background: var(--color-primary);
      color: white;
      padding: 8px;
      text-decoration: none;
      z-index: 100;
    `

    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '0'
    })

    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px'
    })

    document.body.insertBefore(skipLink, document.body.firstChild)
  }

  // Cleanup on unmount
  onUnmounted(() => {
    if (liveRegion && liveRegion.parentNode) {
      liveRegion.parentNode.removeChild(liveRegion)
    }
  })

  return {
    announceToScreenReader,
    trapFocus,
    manageFocus,
    isVisibleToScreenReader,
    getAccessibleName,
    addKeyboardNavigation,
    checkColorContrast,
    addSkipLink,
    announcements
  }
}

/**
 * Screen reader only CSS class
 * Add this to your global styles
 */
export const srOnlyStyles = `
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.sr-only-focusable:focus {
  position: static;
  width: auto;
  height: auto;
  padding: inherit;
  margin: inherit;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
`

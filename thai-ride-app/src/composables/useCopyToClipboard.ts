/**
 * Composable: useCopyToClipboard
 * คัดลอกข้อความไปยัง clipboard พร้อม feedback
 * 
 * Role: ทุก role สามารถใช้ได้
 */
import { ref } from 'vue'

export interface CopyResult {
  success: boolean
  error?: string
}

export function useCopyToClipboard() {
  const isCopied = ref(false)
  const copyError = ref<string | null>(null)
  let resetTimeout: ReturnType<typeof setTimeout> | null = null

  /**
   * Copy text to clipboard
   */
  async function copyToClipboard(text: string): Promise<CopyResult> {
    copyError.value = null
    
    // Clear previous timeout
    if (resetTimeout) {
      clearTimeout(resetTimeout)
    }

    try {
      // Modern clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        
        const success = document.execCommand('copy')
        document.body.removeChild(textArea)
        
        if (!success) {
          throw new Error('Copy command failed')
        }
      }

      isCopied.value = true
      
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50)
      }

      // Reset after 2 seconds
      resetTimeout = setTimeout(() => {
        isCopied.value = false
      }, 2000)

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'คัดลอกไม่สำเร็จ'
      copyError.value = message
      isCopied.value = false
      console.error('[Clipboard] Copy error:', err)
      return { success: false, error: message }
    }
  }

  /**
   * Copy order number with formatting
   */
  async function copyOrderNumber(orderNumber: string): Promise<CopyResult> {
    // Remove # prefix if present
    const cleanNumber = orderNumber.replace(/^#/, '')
    return copyToClipboard(cleanNumber)
  }

  return {
    isCopied,
    copyError,
    copyToClipboard,
    copyOrderNumber
  }
}

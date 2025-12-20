/**
 * Network Status Monitor
 * Monitor network connectivity and quality
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { logger } from '../utils/logger'

export interface NetworkInfo {
  online: boolean
  effectiveType?: string // slow-2g, 2g, 3g, 4g
  downlink?: number // Mbps
  rtt?: number // Round trip time in ms
  saveData?: boolean
}

const networkInfo = ref<NetworkInfo>({
  online: navigator.onLine
})

const listeners: Set<(info: NetworkInfo) => void> = new Set()

/**
 * Update network info
 */
function updateNetworkInfo(): void {
  const connection = (navigator as any).connection || 
                     (navigator as any).mozConnection || 
                     (navigator as any).webkitConnection

  networkInfo.value = {
    online: navigator.onLine,
    effectiveType: connection?.effectiveType,
    downlink: connection?.downlink,
    rtt: connection?.rtt,
    saveData: connection?.saveData
  }

  // Notify listeners
  listeners.forEach(listener => listener(networkInfo.value))
  
  logger.debug('Network status updated:', networkInfo.value)
}

/**
 * Initialize network monitoring
 */
export function initNetworkMonitoring(): void {
  // Initial update
  updateNetworkInfo()

  // Listen for online/offline events
  window.addEventListener('online', updateNetworkInfo)
  window.addEventListener('offline', updateNetworkInfo)

  // Listen for connection changes
  const connection = (navigator as any).connection
  if (connection) {
    connection.addEventListener('change', updateNetworkInfo)
  }
}

/**
 * Cleanup network monitoring
 */
export function cleanupNetworkMonitoring(): void {
  window.removeEventListener('online', updateNetworkInfo)
  window.removeEventListener('offline', updateNetworkInfo)

  const connection = (navigator as any).connection
  if (connection) {
    connection.removeEventListener('change', updateNetworkInfo)
  }
}

/**
 * Subscribe to network changes
 */
export function onNetworkChange(callback: (info: NetworkInfo) => void): () => void {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

/**
 * Check if online
 */
export function isOnline(): boolean {
  return networkInfo.value.online
}

/**
 * Check if on slow connection
 */
export function isSlowConnection(): boolean {
  const type = networkInfo.value.effectiveType
  return type === 'slow-2g' || type === '2g'
}

/**
 * Check if data saver is enabled
 */
export function isDataSaverEnabled(): boolean {
  return networkInfo.value.saveData || false
}

/**
 * Get connection quality score (0-100)
 */
export function getConnectionQuality(): number {
  if (!networkInfo.value.online) return 0
  
  const type = networkInfo.value.effectiveType
  switch (type) {
    case '4g': return 100
    case '3g': return 70
    case '2g': return 40
    case 'slow-2g': return 20
    default: return 50
  }
}

/**
 * Network status composable
 */
export function useNetworkStatus() {
  onMounted(() => {
    initNetworkMonitoring()
  })

  onUnmounted(() => {
    cleanupNetworkMonitoring()
  })

  return {
    networkInfo: computed(() => networkInfo.value),
    isOnline: computed(() => networkInfo.value.online),
    isSlowConnection: computed(() => isSlowConnection()),
    connectionQuality: computed(() => getConnectionQuality()),
    effectiveType: computed(() => networkInfo.value.effectiveType)
  }
}

/**
 * Wait for online status
 */
export function waitForOnline(timeoutMs = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (navigator.onLine) {
      resolve()
      return
    }

    const timeout = setTimeout(() => {
      window.removeEventListener('online', handler)
      reject(new Error('Network timeout'))
    }, timeoutMs)

    const handler = () => {
      clearTimeout(timeout)
      window.removeEventListener('online', handler)
      resolve()
    }

    window.addEventListener('online', handler)
  })
}

/**
 * Execute with network check
 */
export async function withNetworkCheck<T>(
  fn: () => Promise<T>,
  offlineMessage = 'No internet connection'
): Promise<T> {
  if (!navigator.onLine) {
    throw new Error(offlineMessage)
  }
  return fn()
}

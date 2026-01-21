/**
 * useConnectionHealth - Database Connection Health Monitor
 * ตรวจสอบสถานะการเชื่อมต่อ Database และจัดการ Fallback Mode
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabase'

export type ConnectionStatus = 'connected' | 'disconnected' | 'checking' | 'fallback'

export interface HealthCheck {
  database: boolean
  realtime: boolean
  timestamp: number
  latency: number
  error?: string
}

export function useConnectionHealth() {
  const status = ref<ConnectionStatus>('checking')
  const lastCheck = ref<HealthCheck | null>(null)
  const isOnline = ref(navigator.onLine)
  const retryCount = ref(0)
  const maxRetries = 3
  
  let healthCheckInterval: ReturnType<typeof setInterval> | null = null
  let realtimeChannel: ReturnType<typeof supabase.channel> | null = null

  // Computed
  const isHealthy = computed(() => 
    status.value === 'connected' && 
    lastCheck.value?.database === true
  )
  
  const shouldUseFallback = computed(() => 
    status.value === 'fallback' || 
    status.value === 'disconnected'
  )
  
  const statusColor = computed(() => {
    switch (status.value) {
      case 'connected': return '#10b981' // green
      case 'checking': return '#f59e0b' // yellow
      case 'disconnected': return '#ef4444' // red
      case 'fallback': return '#8b5cf6' // purple
      default: return '#6b7280' // gray
    }
  })
  
  const statusText = computed(() => {
    switch (status.value) {
      case 'connected': return 'เชื่อมต่อแล้ว'
      case 'checking': return 'กำลังตรวจสอบ...'
      case 'disconnected': return 'ไม่สามารถเชื่อมต่อได้'
      case 'fallback': return 'โหมดสำรอง'
      default: return 'ไม่ทราบสถานะ'
    }
  })

  // Health check function
  async function performHealthCheck(): Promise<HealthCheck> {
    const startTime = performance.now()
    
    try {
      console.log('[Health] Performing health check...')
      
      // Test database connection
      const { data, error } = await supabase
        .from('ride_requests')
        .select('count')
        .limit(1)
        .maybeSingle()
      
      const latency = performance.now() - startTime
      
      if (error) {
        console.warn('[Health] Database check failed:', error.message)
        throw new Error(`Database error: ${error.message}`)
      }
      
      // Test realtime connection
      let realtimeHealthy = false
      try {
        if (realtimeChannel) {
          await supabase.removeChannel(realtimeChannel)
        }
        
        realtimeChannel = supabase
          .channel('health_check')
          .subscribe((status) => {
            realtimeHealthy = status === 'SUBSCRIBED'
          })
        
        // Wait a bit for subscription
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (realtimeError) {
        console.warn('[Health] Realtime check failed:', realtimeError)
      }
      
      const healthCheck: HealthCheck = {
        database: true,
        realtime: realtimeHealthy,
        timestamp: Date.now(),
        latency: Math.round(latency)
      }
      
      console.log('[Health] ✅ Health check passed:', healthCheck)
      return healthCheck
      
    } catch (error: any) {
      const latency = performance.now() - startTime
      
      const healthCheck: HealthCheck = {
        database: false,
        realtime: false,
        timestamp: Date.now(),
        latency: Math.round(latency),
        error: error.message
      }
      
      console.error('[Health] ❌ Health check failed:', healthCheck)
      return healthCheck
    }
  }

  // Update connection status
  async function updateStatus(): Promise<void> {
    if (!isOnline.value) {
      status.value = 'disconnected'
      return
    }
    
    status.value = 'checking'
    
    try {
      const health = await performHealthCheck()
      lastCheck.value = health
      
      if (health.database) {
        status.value = 'connected'
        retryCount.value = 0
        console.log('[Health] ✅ Connection healthy')
      } else {
        retryCount.value++
        
        if (retryCount.value >= maxRetries) {
          status.value = 'fallback'
          console.log('[Health] 🔄 Switching to fallback mode after', maxRetries, 'retries')
          
          // Notify user about fallback mode
          showFallbackNotification()
        } else {
          status.value = 'disconnected'
          console.log('[Health] ⚠️ Connection failed, retry', retryCount.value, 'of', maxRetries)
        }
      }
    } catch (error) {
      console.error('[Health] Status update failed:', error)
      status.value = 'disconnected'
    }
  }

  // Show fallback notification
  function showFallbackNotification(): void {
    // Create notification element
    const notification = document.createElement('div')
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #8b5cf6;
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      max-width: 320px;
      animation: slideIn 0.3s ease-out;
    `
    
    notification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px;">🔄 โหมดสำรอง</div>
      <div style="font-size: 12px; opacity: 0.9;">
        ไม่สามารถเชื่อมต่อฐานข้อมูลได้<br>
        ระบบจะใช้ข้อมูลจำลองชั่วคราว
      </div>
    `
    
    document.body.appendChild(notification)
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      notification.remove()
    }, 5000)
  }

  // Force fallback mode
  function enableFallbackMode(): void {
    status.value = 'fallback'
    retryCount.value = maxRetries
    console.log('[Health] 🔄 Fallback mode enabled manually')
    showFallbackNotification()
  }

  // Force reconnect
  async function forceReconnect(): Promise<void> {
    retryCount.value = 0
    await updateStatus()
  }

  // Start monitoring
  function startMonitoring(): void {
    console.log('[Health] Starting connection monitoring...')
    
    // Initial check
    updateStatus()
    
    // Periodic health checks every 30 seconds
    healthCheckInterval = setInterval(() => {
      updateStatus()
    }, 30000)
    
    // Listen to online/offline events
    window.addEventListener('online', () => {
      console.log('[Health] Network came online')
      isOnline.value = true
      updateStatus()
    })
    
    window.addEventListener('offline', () => {
      console.log('[Health] Network went offline')
      isOnline.value = false
      status.value = 'disconnected'
    })
  }

  // Stop monitoring
  function stopMonitoring(): void {
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval)
      healthCheckInterval = null
    }
    
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
    }
    
    console.log('[Health] Connection monitoring stopped')
  }

  // Get diagnostic info
  function getDiagnostics() {
    return {
      status: status.value,
      isOnline: isOnline.value,
      retryCount: retryCount.value,
      lastCheck: lastCheck.value,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    }
  }

  // Lifecycle
  onMounted(() => {
    startMonitoring()
  })

  onUnmounted(() => {
    stopMonitoring()
  })

  return {
    // State
    status,
    lastCheck,
    isOnline,
    retryCount,
    
    // Computed
    isHealthy,
    shouldUseFallback,
    statusColor,
    statusText,
    
    // Methods
    performHealthCheck,
    updateStatus,
    enableFallbackMode,
    forceReconnect,
    startMonitoring,
    stopMonitoring,
    getDiagnostics
  }
}
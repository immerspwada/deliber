/**
 * Service Worker Push Notification Handler
 * Feature: F07 - Push Notifications
 * 
 * ไฟล์นี้จะถูก register แยกจาก Workbox SW เพื่อจัดการ Push Notification
 * รองรับทั้ง visible notifications และ silent push สำหรับ background sync
 */

// Cache names for background sync
const CACHE_JOBS = 'gobear-jobs-v1'
const CACHE_EARNINGS = 'gobear-earnings-v1'

// Push event - รับ push notification จาก server
self.addEventListener('push', (event) => {
  console.log('[SW Push] Push event received:', event)
  
  if (!event.data) {
    console.warn('[SW Push] No data in push event')
    return
  }

  let data
  try {
    data = event.data.json()
  } catch (e) {
    console.error('[SW Push] Failed to parse push data:', e)
    data = {
      title: 'GOBEAR',
      body: event.data.text() || 'คุณมีการแจ้งเตือนใหม่'
    }
  }

  // Handle silent push for background sync
  if (data.silent === true || data.type === 'silent_sync') {
    console.log('[SW Push] Silent push received - triggering background sync')
    event.waitUntil(handleSilentPush(data))
    return
  }

  const options = {
    body: data.body || 'คุณมีการแจ้งเตือนใหม่',
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    tag: data.tag || `notification-${Date.now()}`,
    data: data.data || {},
    vibrate: data.vibrate || [200, 100, 200],
    requireInteraction: data.requireInteraction !== false,
    renotify: true,
    silent: false,
    actions: data.actions || [
      { action: 'view', title: 'ดูรายละเอียด' },
      { action: 'dismiss', title: 'ปิด' }
    ]
  }

  // Add URL to data for click handling
  if (data.url) {
    options.data.url = data.url
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'GOBEAR', options)
  )
})

/**
 * Handle silent push for background sync
 * Syncs jobs and earnings data without showing notification
 */
async function handleSilentPush(data) {
  const syncTasks = []

  // Sync jobs if requested
  if (data.sync?.includes('jobs') || data.syncAll) {
    syncTasks.push(syncJobs())
  }

  // Sync earnings if requested
  if (data.sync?.includes('earnings') || data.syncAll) {
    syncTasks.push(syncEarnings())
  }

  // Default: sync all if no specific sync requested
  if (syncTasks.length === 0) {
    syncTasks.push(syncJobs(), syncEarnings())
  }

  try {
    await Promise.all(syncTasks)
    
    // Notify app if open
    await notifyAppOfSync(data)
    
    console.log('[SW Push] Background sync completed')
  } catch (error) {
    console.error('[SW Push] Background sync failed:', error)
  }
}

/**
 * Sync jobs data in background
 */
async function syncJobs() {
  try {
    // Get Supabase URL from cache or use default
    const supabaseUrl = await getSupabaseUrl()
    if (!supabaseUrl) {
      console.warn('[SW Push] Supabase URL not available for sync')
      return
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_available_jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': await getAnonKey()
      },
      body: JSON.stringify({ limit: 20 })
    })

    if (response.ok) {
      const jobs = await response.json()
      
      // Cache the jobs data
      const cache = await caches.open(CACHE_JOBS)
      await cache.put(
        new Request('/api/cached-jobs'),
        new Response(JSON.stringify({
          jobs,
          timestamp: Date.now()
        }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
      
      console.log('[SW Push] Jobs synced:', jobs.length)
    }
  } catch (error) {
    console.error('[SW Push] Jobs sync error:', error)
  }
}

/**
 * Sync earnings data in background
 */
async function syncEarnings() {
  try {
    const supabaseUrl = await getSupabaseUrl()
    if (!supabaseUrl) return

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_provider_earnings_summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': await getAnonKey()
      },
      body: JSON.stringify({})
    })

    if (response.ok) {
      const earnings = await response.json()
      
      // Cache the earnings data
      const cache = await caches.open(CACHE_EARNINGS)
      await cache.put(
        new Request('/api/cached-earnings'),
        new Response(JSON.stringify({
          earnings,
          timestamp: Date.now()
        }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
      
      console.log('[SW Push] Earnings synced')
    }
  } catch (error) {
    console.error('[SW Push] Earnings sync error:', error)
  }
}

/**
 * Get Supabase URL from IndexedDB or environment
 */
async function getSupabaseUrl() {
  // Try to get from cached config
  try {
    const cache = await caches.open('gobear-config')
    const response = await cache.match('/config/supabase')
    if (response) {
      const config = await response.json()
      return config.url
    }
  } catch (e) {
    // Ignore cache errors
  }
  
  // Fallback to hardcoded local URL (will be replaced in production)
  return null
}

/**
 * Get Supabase anon key
 */
async function getAnonKey() {
  try {
    const cache = await caches.open('gobear-config')
    const response = await cache.match('/config/supabase')
    if (response) {
      const config = await response.json()
      return config.anonKey
    }
  } catch (e) {
    // Ignore cache errors
  }
  return ''
}

/**
 * Notify app windows about sync completion
 */
async function notifyAppOfSync(data) {
  const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true })
  
  for (const client of clientList) {
    client.postMessage({
      type: 'BACKGROUND_SYNC_COMPLETE',
      syncedAt: Date.now(),
      data: data
    })
  }
}

// Notification click event - เมื่อ user คลิกที่ notification
self.addEventListener('notificationclick', (event) => {
  console.log('[SW Push] Notification clicked:', event)
  
  event.notification.close()

  const notificationData = event.notification.data || {}
  let targetUrl = notificationData.url || '/'

  // Handle action clicks
  if (event.action === 'dismiss') {
    return // Just close notification
  }

  // Handle new job notifications - navigate to provider dashboard
  if (notificationData.type === 'new_job') {
    targetUrl = '/provider'
  }

  // Focus existing window or open new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus existing window
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus().then(() => {
              if (targetUrl && targetUrl !== '/') {
                return client.navigate(targetUrl)
              }
            })
          }
        }
        // Open new window if no existing window found
        if (clients.openWindow) {
          return clients.openWindow(targetUrl)
        }
      })
  )
})

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('[SW Push] Notification closed:', event.notification.tag)
})

// Push subscription change event
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW Push] Subscription changed:', event)
  
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: event.oldSubscription?.options?.applicationServerKey
    }).then((subscription) => {
      // Notify app about new subscription
      return clients.matchAll().then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({
            type: 'PUSH_SUBSCRIPTION_CHANGED',
            subscription: subscription.toJSON()
          })
        })
      })
    }).catch((error) => {
      console.error('[SW Push] Failed to resubscribe:', error)
    })
  )
})

// Message handler
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

console.log('[SW Push] Push notification handler loaded')

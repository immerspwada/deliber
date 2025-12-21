/**
 * Service Worker Push Notification Handler
 * Feature: F07 - Push Notifications
 * 
 * ไฟล์นี้จะถูก register แยกจาก Workbox SW เพื่อจัดการ Push Notification
 */

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

/**
 * Service Worker Manager
 * PWA support, offline caching, background sync
 */

// ========================================
// Types
// ========================================

export interface ServiceWorkerStatus {
  supported: boolean
  registered: boolean
  active: boolean
  waiting: boolean
  updateAvailable: boolean
}

export interface CacheStats {
  name: string
  size: number
  entries: number
}

// ========================================
// Service Worker Manager
// ========================================

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null
  private updateCallback: (() => void) | null = null

  /**
   * Check if service workers are supported
   */
  get isSupported(): boolean {
    return 'serviceWorker' in navigator
  }

  /**
   * Get current status
   */
  getStatus(): ServiceWorkerStatus {
    return {
      supported: this.isSupported,
      registered: !!this.registration,
      active: !!this.registration?.active,
      waiting: !!this.registration?.waiting,
      updateAvailable: !!this.registration?.waiting
    }
  }

  /**
   * Register service worker
   */
  async register(swPath = '/sw.js'): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('[SW] Service workers not supported')
      return false
    }

    try {
      this.registration = await navigator.serviceWorker.register(swPath)
      console.log('[SW] Registered:', this.registration.scope)

      // Listen for updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration?.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] Update available')
              this.updateCallback?.()
            }
          })
        }
      })

      return true
    } catch (error) {
      console.error('[SW] Registration failed:', error)
      return false
    }
  }

  /**
   * Unregister service worker
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) return false

    try {
      const success = await this.registration.unregister()
      if (success) {
        this.registration = null
        console.log('[SW] Unregistered')
      }
      return success
    } catch (error) {
      console.error('[SW] Unregister failed:', error)
      return false
    }
  }

  /**
   * Check for updates
   */
  async checkForUpdates(): Promise<boolean> {
    if (!this.registration) return false

    try {
      await this.registration.update()
      return !!this.registration.waiting
    } catch (error) {
      console.error('[SW] Update check failed:', error)
      return false
    }
  }

  /**
   * Apply pending update
   */
  applyUpdate(): void {
    if (this.registration?.waiting) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    }
  }

  /**
   * Set update callback
   */
  onUpdateAvailable(callback: () => void): void {
    this.updateCallback = callback
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<CacheStats[]> {
    if (!('caches' in window)) return []

    const cacheNames = await caches.keys()
    const stats: CacheStats[] = []

    for (const name of cacheNames) {
      const cache = await caches.open(name)
      const keys = await cache.keys()
      stats.push({
        name,
        entries: keys.length,
        size: 0 // Size calculation would require fetching all responses
      })
    }

    return stats
  }

  /**
   * Clear all caches
   */
  async clearCaches(): Promise<void> {
    if (!('caches' in window)) return

    const cacheNames = await caches.keys()
    await Promise.all(cacheNames.map(name => caches.delete(name)))
    console.log('[SW] All caches cleared')
  }

  /**
   * Clear specific cache
   */
  async clearCache(name: string): Promise<boolean> {
    if (!('caches' in window)) return false
    return caches.delete(name)
  }
}

// ========================================
// Background Sync Manager
// ========================================

interface SyncTask {
  id: string
  tag: string
  data: unknown
  createdAt: number
  retries: number
}

class BackgroundSyncManager {
  private tasks: Map<string, SyncTask> = new Map()
  private storageKey = 'bg_sync_tasks'

  constructor() {
    this.loadTasks()
  }

  /**
   * Check if background sync is supported
   */
  get isSupported(): boolean {
    return 'serviceWorker' in navigator && 'SyncManager' in window
  }

  /**
   * Register sync task
   */
  async register(tag: string, data: unknown): Promise<string> {
    const id = `${tag}_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const task: SyncTask = {
      id,
      tag,
      data,
      createdAt: Date.now(),
      retries: 0
    }

    this.tasks.set(id, task)
    this.saveTasks()

    // Try to register with service worker
    if (this.isSupported) {
      try {
        const registration = await navigator.serviceWorker.ready
        await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register(tag)
      } catch (error) {
        console.warn('[Sync] Registration failed, will retry manually:', error)
      }
    }

    return id
  }

  /**
   * Get pending tasks
   */
  getPendingTasks(tag?: string): SyncTask[] {
    const tasks = Array.from(this.tasks.values())
    return tag ? tasks.filter(t => t.tag === tag) : tasks
  }

  /**
   * Mark task as completed
   */
  complete(id: string): void {
    this.tasks.delete(id)
    this.saveTasks()
  }

  /**
   * Retry task
   */
  retry(id: string): void {
    const task = this.tasks.get(id)
    if (task) {
      task.retries++
      this.saveTasks()
    }
  }

  /**
   * Clear all tasks
   */
  clear(): void {
    this.tasks.clear()
    this.saveTasks()
  }

  private loadTasks(): void {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const tasks = JSON.parse(stored) as SyncTask[]
        tasks.forEach(t => this.tasks.set(t.id, t))
      }
    } catch {
      // Ignore errors
    }
  }

  private saveTasks(): void {
    try {
      const tasks = Array.from(this.tasks.values())
      localStorage.setItem(this.storageKey, JSON.stringify(tasks))
    } catch {
      // Ignore errors
    }
  }
}

// ========================================
// Singleton Instances
// ========================================

export const serviceWorker = new ServiceWorkerManager()
export const backgroundSync = new BackgroundSyncManager()

// ========================================
// PWA Install Prompt
// ========================================

let deferredPrompt: BeforeInstallPromptEvent | null = null

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Check if app can be installed
 */
export function canInstall(): boolean {
  return deferredPrompt !== null
}

/**
 * Prompt user to install PWA
 */
export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false

  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  deferredPrompt = null

  return outcome === 'accepted'
}

/**
 * Check if app is installed
 */
export function isInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}

// Listen for install prompt
window.addEventListener('beforeinstallprompt', (e) => {
  // Only prevent default if we have a custom install flow
  if (window.location.pathname.includes('/install') || document.querySelector('[data-pwa-install]')) {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
  }
})

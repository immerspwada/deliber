/**
 * useOfflineSyncV2 - Enhanced Offline Sync System
 * 
 * Feature: F157 - Offline Mode Improvements
 * Tables: sync_queue, device_sync_state, sync_versions, offline_cache_metadata
 * Migration: 068_offline_sync.sql
 * 
 * @syncs-with
 * - Customer: Offline operations, sync queue
 * - Provider: Offline operations
 * - Admin: Monitor sync status
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

// Types
export interface SyncQueueItem {
  id: string
  user_id: string
  device_id: string
  operation_type: 'create' | 'update' | 'delete'
  entity_type: string
  entity_id?: string
  payload: any
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'conflict'
  retry_count: number
  created_at: string
  error_message?: string
  conflict_data?: any
}

export interface DeviceSyncState {
  id: string
  user_id: string
  device_id: string
  device_name?: string
  device_type?: string
  last_sync_at?: string
  last_sync_version: number
  pending_changes: number
  is_online: boolean
}

export interface SyncConflict {
  queueId: string
  entityType: string
  entityId: string
  clientData: any
  serverData: any
}

// Generate device ID
const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('device_id')
  if (!deviceId) {
    deviceId = `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('device_id', deviceId)
  }
  return deviceId
}

export function useOfflineSyncV2() {
  const authStore = useAuthStore()
  const deviceId = getDeviceId()

  // State
  const isOnline = ref(navigator.onLine)
  const isSyncing = ref(false)
  const syncQueue = ref<SyncQueueItem[]>([])
  const conflicts = ref<SyncConflict[]>([])
  const deviceState = ref<DeviceSyncState | null>(null)
  const lastSyncAt = ref<Date | null>(null)
  const error = ref<string | null>(null)

  // Computed
  const pendingCount = computed(() => 
    syncQueue.value.filter(q => q.status === 'pending').length
  )

  const failedCount = computed(() => 
    syncQueue.value.filter(q => q.status === 'failed').length
  )

  const conflictCount = computed(() => conflicts.value.length)

  const hasPendingChanges = computed(() => pendingCount.value > 0)

  const syncStatus = computed(() => {
    if (isSyncing.value) return 'syncing'
    if (!isOnline.value) return 'offline'
    if (conflictCount.value > 0) return 'conflict'
    if (failedCount.value > 0) return 'error'
    if (pendingCount.value > 0) return 'pending'
    return 'synced'
  })

  // =====================================================
  // CORE FUNCTIONS
  // =====================================================

  /**
   * Initialize offline sync
   */
  const init = async () => {
    if (!authStore.user?.id) return

    // Register device
    await registerDevice()

    // Load pending queue from IndexedDB
    await loadLocalQueue()

    // Setup online/offline listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial sync if online
    if (isOnline.value) {
      await sync()
    }
  }

  /**
   * Cleanup
   */
  const cleanup = () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }

  /**
   * Handle online event
   */
  const handleOnline = async () => {
    isOnline.value = true
    await updateDeviceStatus(true)
    await sync()
  }

  /**
   * Handle offline event
   */
  const handleOffline = async () => {
    isOnline.value = false
    await updateDeviceStatus(false)
  }

  /**
   * Register device with server
   */
  const registerDevice = async () => {
    if (!authStore.user?.id) return

    try {
      const { data, error: err } = await supabase
        .rpc('register_device', {
          p_user_id: authStore.user.id,
          p_device_id: deviceId,
          p_device_name: navigator.userAgent.substring(0, 100),
          p_device_type: 'web'
        })

      if (err) throw err

      // Fetch device state
      const { data: stateData } = await supabase
        .from('device_sync_state')
        .select('*')
        .eq('user_id', authStore.user.id)
        .eq('device_id', deviceId)
        .single()

      deviceState.value = stateData
    } catch (e: any) {
      console.error('Register device error:', e)
    }
  }

  /**
   * Update device online status
   */
  const updateDeviceStatus = async (online: boolean) => {
    if (!authStore.user?.id) return

    try {
      await supabase.rpc('update_device_status', {
        p_user_id: authStore.user.id,
        p_device_id: deviceId,
        p_is_online: online
      })
    } catch (e: any) {
      console.error('Update device status error:', e)
    }
  }

  /**
   * Queue operation for sync
   */
  const queueOperation = async (
    operationType: 'create' | 'update' | 'delete',
    entityType: string,
    entityId: string | null,
    payload: any
  ): Promise<string | null> => {
    if (!authStore.user?.id) return null

    const item: Partial<SyncQueueItem> = {
      user_id: authStore.user.id,
      device_id: deviceId,
      operation_type: operationType,
      entity_type: entityType,
      entity_id: entityId || undefined,
      payload: { ...payload, _version: deviceState.value?.last_sync_version || 0 },
      status: 'pending',
      retry_count: 0,
      created_at: new Date().toISOString()
    }

    // Save to local storage first
    await saveToLocalQueue(item)

    // If online, try to sync immediately
    if (isOnline.value) {
      try {
        const { data, error: err } = await supabase
          .rpc('queue_offline_operation', {
            p_user_id: authStore.user.id,
            p_device_id: deviceId,
            p_operation: operationType,
            p_entity_type: entityType,
            p_entity_id: entityId,
            p_payload: payload
          })

        if (err) throw err

        // Process immediately
        await processQueueItem(data)
        return data
      } catch (e: any) {
        console.error('Queue operation error:', e)
      }
    }

    return null
  }

  /**
   * Process single queue item
   */
  const processQueueItem = async (queueId: string): Promise<boolean> => {
    try {
      const { data, error: err } = await supabase
        .rpc('process_sync_item', { p_queue_id: queueId })

      if (err) throw err

      const result = data?.[0]
      if (result?.conflict) {
        // Add to conflicts
        const queueItem = syncQueue.value.find(q => q.id === queueId)
        if (queueItem) {
          conflicts.value.push({
            queueId,
            entityType: queueItem.entity_type,
            entityId: queueItem.entity_id || '',
            clientData: queueItem.payload,
            serverData: result.server_data
          })
        }
        return false
      }

      return result?.success || false
    } catch (e: any) {
      console.error('Process queue item error:', e)
      return false
    }
  }

  /**
   * Sync all pending items
   */
  const sync = async () => {
    if (!authStore.user?.id || isSyncing.value || !isOnline.value) return

    isSyncing.value = true
    error.value = null

    try {
      // Fetch pending items from server
      const { data: pendingItems, error: err } = await supabase
        .from('sync_queue')
        .select('*')
        .eq('user_id', authStore.user.id)
        .eq('device_id', deviceId)
        .in('status', ['pending', 'failed'])
        .order('created_at')

      if (err) throw err

      syncQueue.value = pendingItems || []

      // Process each item
      for (const item of syncQueue.value) {
        if (item.status === 'failed' && item.retry_count >= 3) continue
        await processQueueItem(item.id)
      }

      // Update last sync time
      lastSyncAt.value = new Date()

      // Refresh device state
      await registerDevice()
    } catch (e: any) {
      error.value = e.message
      console.error('Sync error:', e)
    } finally {
      isSyncing.value = false
    }
  }

  /**
   * Resolve conflict
   */
  const resolveConflict = async (
    queueId: string,
    resolution: 'client_wins' | 'server_wins' | 'merged',
    mergedData?: any
  ): Promise<boolean> => {
    try {
      const { data, error: err } = await supabase
        .rpc('resolve_sync_conflict', {
          p_queue_id: queueId,
          p_resolution: resolution,
          p_merged_data: mergedData
        })

      if (err) throw err

      // Remove from conflicts
      conflicts.value = conflicts.value.filter(c => c.queueId !== queueId)

      return data || false
    } catch (e: any) {
      console.error('Resolve conflict error:', e)
      return false
    }
  }

  /**
   * Retry failed items
   */
  const retryFailed = async () => {
    const failedItems = syncQueue.value.filter(
      q => q.status === 'failed' && q.retry_count < 3
    )

    for (const item of failedItems) {
      await processQueueItem(item.id)
    }
  }

  /**
   * Clear completed items
   */
  const clearCompleted = async () => {
    if (!authStore.user?.id) return

    try {
      await supabase
        .from('sync_queue')
        .delete()
        .eq('user_id', authStore.user.id)
        .eq('status', 'completed')

      syncQueue.value = syncQueue.value.filter(q => q.status !== 'completed')
    } catch (e: any) {
      console.error('Clear completed error:', e)
    }
  }

  // =====================================================
  // LOCAL STORAGE FUNCTIONS
  // =====================================================

  const LOCAL_QUEUE_KEY = 'offline_sync_queue'

  /**
   * Save to local queue (IndexedDB fallback to localStorage)
   */
  const saveToLocalQueue = async (item: Partial<SyncQueueItem>) => {
    try {
      const queue = JSON.parse(localStorage.getItem(LOCAL_QUEUE_KEY) || '[]')
      queue.push({ ...item, id: `local_${Date.now()}` })
      localStorage.setItem(LOCAL_QUEUE_KEY, JSON.stringify(queue))
    } catch (e) {
      console.error('Save to local queue error:', e)
    }
  }

  /**
   * Load local queue
   */
  const loadLocalQueue = async () => {
    try {
      const queue = JSON.parse(localStorage.getItem(LOCAL_QUEUE_KEY) || '[]')
      // Merge with server queue
      syncQueue.value = [...syncQueue.value, ...queue]
    } catch (e) {
      console.error('Load local queue error:', e)
    }
  }

  /**
   * Clear local queue
   */
  const clearLocalQueue = () => {
    localStorage.removeItem(LOCAL_QUEUE_KEY)
  }

  // =====================================================
  // CACHE FUNCTIONS
  // =====================================================

  /**
   * Cache data for offline use
   */
  const cacheData = async (key: string, entityType: string, data: any) => {
    if (!authStore.user?.id) return

    try {
      // Save to localStorage
      localStorage.setItem(`cache_${key}`, JSON.stringify({
        data,
        cachedAt: new Date().toISOString()
      }))

      // Save metadata to server
      await supabase
        .from('offline_cache_metadata')
        .upsert({
          user_id: authStore.user.id,
          cache_key: key,
          entity_type: entityType,
          cached_at: new Date().toISOString(),
          size_bytes: JSON.stringify(data).length
        }, { onConflict: 'user_id,cache_key' })
    } catch (e: any) {
      console.error('Cache data error:', e)
    }
  }

  /**
   * Get cached data
   */
  const getCachedData = <T>(key: string): T | null => {
    try {
      const cached = localStorage.getItem(`cache_${key}`)
      if (!cached) return null
      return JSON.parse(cached).data as T
    } catch {
      return null
    }
  }

  /**
   * Clear cache
   */
  const clearCache = (key?: string) => {
    if (key) {
      localStorage.removeItem(`cache_${key}`)
    } else {
      // Clear all cache
      Object.keys(localStorage)
        .filter(k => k.startsWith('cache_'))
        .forEach(k => localStorage.removeItem(k))
    }
  }

  // Lifecycle
  onMounted(() => {
    init()
  })

  onUnmounted(() => {
    cleanup()
  })

  return {
    // State
    isOnline,
    isSyncing,
    syncQueue,
    conflicts,
    deviceState,
    lastSyncAt,
    error,

    // Computed
    pendingCount,
    failedCount,
    conflictCount,
    hasPendingChanges,
    syncStatus,

    // Core functions
    init,
    cleanup,
    queueOperation,
    sync,
    resolveConflict,
    retryFailed,
    clearCompleted,

    // Cache functions
    cacheData,
    getCachedData,
    clearCache
  }
}

/**
 * Feature: Background Sync
 * Sync ข้อมูลที่ค้างอยู่เมื่อกลับมา online อัตโนมัติ
 */

import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { useToast } from './useToast'

// Storage keys
const SYNC_QUEUE_KEY = 'thairide_sync_queue'
const SYNC_HISTORY_KEY = 'thairide_sync_history'
const CONFLICT_QUEUE_KEY = 'thairide_conflict_queue'

// Sync item types
type SyncType = 'rating' | 'saved_place' | 'recent_place' | 'notification_read'

interface SyncItem {
  id: string
  type: SyncType
  data: any
  createdAt: number
  retryCount: number
  maxRetries: number
}

interface SyncResult {
  success: boolean
  itemId: string
  error?: string
  conflict?: ConflictItem
}

// Sync History
interface SyncHistoryEntry {
  id: string
  timestamp: number
  type: SyncType
  status: 'success' | 'failed' | 'conflict'
  message: string
  details?: string
}

// Conflict Resolution
interface ConflictItem {
  id: string
  type: SyncType
  localData: any
  serverData: any
  createdAt: number
  resolved: boolean
}

type ConflictResolution = 'local' | 'server' | 'merge'

export function useBackgroundSync() {
  const authStore = useAuthStore()
  const toast = useToast()
  const isOnline = ref(navigator.onLine)
  const isSyncing = ref(false)
  const pendingCount = ref(0)
  const lastSyncResult = ref<{ success: number; failed: number } | null>(null)
  const lastSyncTime = ref<Date | null>(null)
  const syncHistory = ref<SyncHistoryEntry[]>([])
  const conflicts = ref<ConflictItem[]>([])

  // Load sync history from localStorage
  const loadSyncHistory = (): void => {
    try {
      const stored = localStorage.getItem(SYNC_HISTORY_KEY)
      syncHistory.value = stored ? JSON.parse(stored) : []
    } catch {
      syncHistory.value = []
    }
  }

  // Save sync history to localStorage (keep last 50 entries)
  const saveSyncHistory = (): void => {
    try {
      const trimmed = syncHistory.value.slice(-50)
      localStorage.setItem(SYNC_HISTORY_KEY, JSON.stringify(trimmed))
    } catch (err) {
      console.warn('Failed to save sync history:', err)
    }
  }

  // Add entry to sync history
  const addToHistory = (type: SyncType, status: 'success' | 'failed' | 'conflict', message: string, details?: string): void => {
    const entry: SyncHistoryEntry = {
      id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      type,
      status,
      message,
      details
    }
    syncHistory.value.push(entry)
    saveSyncHistory()
  }

  // Clear sync history
  const clearSyncHistory = (): void => {
    syncHistory.value = []
    localStorage.removeItem(SYNC_HISTORY_KEY)
  }

  // Load conflicts from localStorage
  const loadConflicts = (): void => {
    try {
      const stored = localStorage.getItem(CONFLICT_QUEUE_KEY)
      conflicts.value = stored ? JSON.parse(stored) : []
    } catch {
      conflicts.value = []
    }
  }

  // Save conflicts to localStorage
  const saveConflicts = (): void => {
    try {
      localStorage.setItem(CONFLICT_QUEUE_KEY, JSON.stringify(conflicts.value))
    } catch (err) {
      console.warn('Failed to save conflicts:', err)
    }
  }

  // Add conflict
  const addConflict = (type: SyncType, localData: any, serverData: any): string => {
    const id = `conflict_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const conflict: ConflictItem = {
      id,
      type,
      localData,
      serverData,
      createdAt: Date.now(),
      resolved: false
    }
    conflicts.value.push(conflict)
    saveConflicts()
    addToHistory(type, 'conflict', 'พบข้อมูลขัดแย้ง รอการตัดสินใจ')
    return id
  }

  // Resolve conflict
  const resolveConflict = async (conflictId: string, resolution: ConflictResolution): Promise<boolean> => {
    const conflict = conflicts.value.find(c => c.id === conflictId)
    if (!conflict) return false

    try {
      let dataToSync: any
      
      if (resolution === 'local') {
        dataToSync = conflict.localData
      } else if (resolution === 'server') {
        // Just mark as resolved, server data is already there
        conflict.resolved = true
        conflicts.value = conflicts.value.filter(c => c.id !== conflictId)
        saveConflicts()
        addToHistory(conflict.type, 'success', 'แก้ไขข้อขัดแย้ง: ใช้ข้อมูลจาก server')
        toast.success('ใช้ข้อมูลจาก server')
        return true
      } else {
        // Merge: combine local and server (use local for newer fields)
        dataToSync = { ...conflict.serverData, ...conflict.localData }
      }

      // Sync the resolved data
      const syncItem: SyncItem = {
        id: `resolved_${conflictId}`,
        type: conflict.type,
        data: dataToSync,
        createdAt: Date.now(),
        retryCount: 0,
        maxRetries: 1
      }

      const result = await processSyncItem(syncItem)
      
      if (result.success) {
        conflict.resolved = true
        conflicts.value = conflicts.value.filter(c => c.id !== conflictId)
        saveConflicts()
        addToHistory(conflict.type, 'success', `แก้ไขข้อขัดแย้ง: ใช้ข้อมูล ${resolution === 'local' ? 'local' : 'รวม'}`)
        toast.success('แก้ไขข้อขัดแย้งสำเร็จ')
        return true
      } else {
        addToHistory(conflict.type, 'failed', 'แก้ไขข้อขัดแย้งล้มเหลว', result.error)
        toast.error('แก้ไขข้อขัดแย้งล้มเหลว')
        return false
      }
    } catch (err: any) {
      addToHistory(conflict.type, 'failed', 'แก้ไขข้อขัดแย้งล้มเหลว', err.message)
      return false
    }
  }

  // Dismiss conflict (ignore it)
  const dismissConflict = (conflictId: string): void => {
    conflicts.value = conflicts.value.filter(c => c.id !== conflictId)
    saveConflicts()
  }

  // Format last sync time
  const formatLastSyncTime = (): string => {
    if (!lastSyncTime.value) return 'ยังไม่เคยซิงค์'
    const now = new Date()
    const diff = now.getTime() - lastSyncTime.value.getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'เมื่อสักครู่'
    if (minutes < 60) return `${minutes} นาทีที่แล้ว`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`
    return lastSyncTime.value.toLocaleDateString('th-TH')
  }

  // Get queue from localStorage
  const getQueue = (): SyncItem[] => {
    try {
      const stored = localStorage.getItem(SYNC_QUEUE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  // Save queue to localStorage
  const saveQueue = (queue: SyncItem[]): void => {
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue))
      pendingCount.value = queue.length
    } catch (err) {
      console.warn('Failed to save sync queue:', err)
    }
  }

  // Add item to sync queue
  const addToQueue = (type: SyncType, data: any): string => {
    const queue = getQueue()
    const id = `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    
    const item: SyncItem = {
      id,
      type,
      data,
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: 3
    }
    
    queue.push(item)
    saveQueue(queue)
    
    // Try to sync immediately if online
    if (isOnline.value) {
      processQueue()
    }
    
    return id
  }

  // Remove item from queue
  const removeFromQueue = (itemId: string): void => {
    const queue = getQueue().filter(item => item.id !== itemId)
    saveQueue(queue)
  }

  // Process single sync item
  const processSyncItem = async (item: SyncItem): Promise<SyncResult> => {
    try {
      switch (item.type) {
        case 'rating':
          return await syncRating(item)
        case 'saved_place':
          return await syncSavedPlace(item)
        case 'recent_place':
          return await syncRecentPlace(item)
        case 'notification_read':
          return await syncNotificationRead(item)
        default:
          return { success: false, itemId: item.id, error: 'Unknown sync type' }
      }
    } catch (err: any) {
      return { success: false, itemId: item.id, error: err.message }
    }
  }

  // Sync rating
  const syncRating = async (item: SyncItem): Promise<SyncResult> => {
    const { rideId, rating, tipAmount, comment, serviceType } = item.data
    
    let table = 'ride_ratings'
    if (serviceType === 'delivery') table = 'delivery_ratings'
    else if (serviceType === 'shopping') table = 'shopping_ratings'
    
    const { error } = await (supabase.from(table) as any).insert({
      ride_id: rideId,
      user_id: authStore.user?.id,
      rating,
      tip_amount: tipAmount,
      comment
    })
    
    if (error) throw error
    return { success: true, itemId: item.id }
  }

  // Sync saved place
  const syncSavedPlace = async (item: SyncItem): Promise<SyncResult> => {
    const { error } = await (supabase.from('saved_places') as any).insert({
      ...item.data,
      user_id: authStore.user?.id
    })
    
    if (error) throw error
    return { success: true, itemId: item.id }
  }

  // Sync recent place
  const syncRecentPlace = async (item: SyncItem): Promise<SyncResult> => {
    const { error } = await (supabase.from('recent_places') as any).upsert({
      ...item.data,
      user_id: authStore.user?.id
    })
    
    if (error) throw error
    return { success: true, itemId: item.id }
  }

  // Sync notification read status
  const syncNotificationRead = async (item: SyncItem): Promise<SyncResult> => {
    const { notificationId } = item.data
    
    const { error } = await (supabase.from('user_notifications') as any)
      .update({ is_read: true })
      .eq('id', notificationId)
    
    if (error) throw error
    return { success: true, itemId: item.id }
  }

  // Process entire queue
  const processQueue = async (): Promise<void> => {
    if (isSyncing.value || !isOnline.value) return
    
    const queue = getQueue()
    if (queue.length === 0) return
    
    isSyncing.value = true
    let successCount = 0
    let failedCount = 0
    
    for (const item of queue) {
      const result = await processSyncItem(item)
      
      if (result.success) {
        removeFromQueue(item.id)
        successCount++
      } else {
        // Increment retry count
        item.retryCount++
        
        if (item.retryCount >= item.maxRetries) {
          // Remove after max retries
          removeFromQueue(item.id)
          failedCount++
          console.warn(`Sync item ${item.id} failed after ${item.maxRetries} retries`)
        } else {
          // Update retry count in queue
          const updatedQueue = getQueue().map(q => 
            q.id === item.id ? { ...q, retryCount: item.retryCount } : q
          )
          saveQueue(updatedQueue)
        }
      }
    }
    
    lastSyncResult.value = { success: successCount, failed: failedCount }
    lastSyncTime.value = new Date()
    isSyncing.value = false
    
    // Add to history
    if (successCount > 0) {
      addToHistory('rating', 'success', `ซิงค์สำเร็จ ${successCount} รายการ`)
    }
    if (failedCount > 0) {
      addToHistory('rating', 'failed', `ซิงค์ล้มเหลว ${failedCount} รายการ`)
    }
    
    // Show notification
    if (successCount > 0 && failedCount === 0) {
      toast.success(`ซิงค์สำเร็จ ${successCount} รายการ`)
    } else if (failedCount > 0 && successCount === 0) {
      toast.error(`ซิงค์ล้มเหลว ${failedCount} รายการ`)
    } else if (successCount > 0 && failedCount > 0) {
      toast.info(`ซิงค์สำเร็จ ${successCount} รายการ, ล้มเหลว ${failedCount} รายการ`)
    }
  }

  // Queue helpers for specific types
  const queueRating = (rideId: string, rating: number, tipAmount: number, comment?: string, serviceType: 'ride' | 'delivery' | 'shopping' = 'ride') => {
    return addToQueue('rating', { rideId, rating, tipAmount, comment, serviceType })
  }

  const queueSavedPlace = (place: { name: string; address: string; lat: number; lng: number; place_type: string }) => {
    return addToQueue('saved_place', place)
  }

  const queueRecentPlace = (place: { name: string; address: string; lat: number; lng: number }) => {
    return addToQueue('recent_place', place)
  }

  const queueNotificationRead = (notificationId: string) => {
    return addToQueue('notification_read', { notificationId })
  }

  // Clear all pending items
  const clearQueue = (): void => {
    localStorage.removeItem(SYNC_QUEUE_KEY)
    pendingCount.value = 0
  }

  // Online/offline handlers
  const handleOnline = () => {
    isOnline.value = true
    // Auto-sync when back online
    setTimeout(() => processQueue(), 1000)
  }

  const handleOffline = () => {
    isOnline.value = false
  }

  // Setup listeners
  onMounted(() => {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Load data
    loadSyncHistory()
    loadConflicts()
    
    // Update pending count
    pendingCount.value = getQueue().length
    
    // Try to sync on mount if online
    if (isOnline.value && pendingCount.value > 0) {
      processQueue()
    }
  })

  onUnmounted(() => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  })

  return {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncResult,
    lastSyncTime,
    formatLastSyncTime,
    addToQueue,
    removeFromQueue,
    processQueue,
    clearQueue,
    // Specific queue helpers
    queueRating,
    queueSavedPlace,
    queueRecentPlace,
    queueNotificationRead,
    // Sync history
    syncHistory,
    clearSyncHistory,
    // Conflict resolution
    conflicts,
    addConflict,
    resolveConflict,
    dismissConflict
  }
}

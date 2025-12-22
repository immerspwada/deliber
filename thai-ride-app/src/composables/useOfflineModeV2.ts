/**
 * useOfflineModeV2 - Offline Mode Enhancements
 * Feature: F227 - Offline Mode
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'

export interface QueuedAction {
  id: string
  type: 'create' | 'update' | 'delete'
  table: string
  data: any
  timestamp: number
  retries: number
}

export function useOfflineModeV2() {
  const isOnline = ref(navigator.onLine)
  const queuedActions = ref<QueuedAction[]>([])
  const syncInProgress = ref(false)
  const lastSyncTime = ref<Date | null>(null)

  const pendingCount = computed(() => queuedActions.value.length)
  const canSync = computed(() => isOnline.value && pendingCount.value > 0 && !syncInProgress.value)

  const loadQueue = () => {
    const saved = localStorage.getItem('offline_queue')
    if (saved) queuedActions.value = JSON.parse(saved)
  }

  const saveQueue = () => {
    localStorage.setItem('offline_queue', JSON.stringify(queuedActions.value))
  }

  const addToQueue = (action: Omit<QueuedAction, 'id' | 'timestamp' | 'retries'>) => {
    const newAction: QueuedAction = { ...action, id: crypto.randomUUID(), timestamp: Date.now(), retries: 0 }
    queuedActions.value.push(newAction)
    saveQueue()
    return newAction.id
  }

  const removeFromQueue = (id: string) => {
    queuedActions.value = queuedActions.value.filter(a => a.id !== id)
    saveQueue()
  }

  const syncQueue = async (syncFn: (action: QueuedAction) => Promise<boolean>) => {
    if (!canSync.value) return
    syncInProgress.value = true
    const toSync = [...queuedActions.value]
    
    for (const action of toSync) {
      try {
        const success = await syncFn(action)
        if (success) removeFromQueue(action.id)
        else { action.retries++; if (action.retries >= 3) removeFromQueue(action.id) }
      } catch { action.retries++ }
    }
    
    lastSyncTime.value = new Date()
    syncInProgress.value = false
    saveQueue()
  }

  const clearQueue = () => { queuedActions.value = []; saveQueue() }

  const handleOnline = () => { isOnline.value = true }
  const handleOffline = () => { isOnline.value = false }

  onMounted(() => {
    loadQueue()
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
  })

  onUnmounted(() => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  })

  return { isOnline, queuedActions, syncInProgress, lastSyncTime, pendingCount, canSync, addToQueue, removeFromQueue, syncQueue, clearQueue }
}

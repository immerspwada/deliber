/**
 * Shopping Offline Support Composable
 * Handle offline mode and sync when back online
 */
import { ref, watch } from 'vue'
import { useOnline } from '@vueuse/core'

interface DraftShoppingOrder {
  id: string
  storeName?: string
  storeAddress?: string
  storeLocation?: { lat: number; lng: number; address: string }
  deliveryAddress?: string
  deliveryLocation?: { lat: number; lng: number; address: string }
  itemList?: string
  budgetLimit?: string
  specialInstructions?: string
  images?: string[]
  timestamp: number
}

const STORAGE_KEY = 'shopping_draft'
const SYNC_QUEUE_KEY = 'shopping_sync_queue'

export function useShoppingOffline() {
  const isOnline = useOnline()
  const hasDraft = ref(false)
  const syncQueue = ref<DraftShoppingOrder[]>([])

  // Save draft to localStorage
  const saveDraft = (draft: Partial<DraftShoppingOrder>) => {
    try {
      const draftData: DraftShoppingOrder = {
        id: crypto.randomUUID(),
        ...draft,
        timestamp: Date.now()
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draftData))
      hasDraft.value = true
      
      console.log('[Offline] Draft saved:', draftData.id)
      return true
    } catch (error) {
      console.error('[Offline] Failed to save draft:', error)
      return false
    }
  }

  // Load draft from localStorage
  const loadDraft = (): DraftShoppingOrder | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        hasDraft.value = false
        return null
      }

      const draft = JSON.parse(stored) as DraftShoppingOrder
      
      // Check if draft is not too old (24 hours)
      const age = Date.now() - draft.timestamp
      if (age > 24 * 60 * 60 * 1000) {
        clearDraft()
        return null
      }

      hasDraft.value = true
      console.log('[Offline] Draft loaded:', draft.id)
      return draft
    } catch (error) {
      console.error('[Offline] Failed to load draft:', error)
      return null
    }
  }

  // Clear draft
  const clearDraft = () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      hasDraft.value = false
      console.log('[Offline] Draft cleared')
      return true
    } catch (error) {
      console.error('[Offline] Failed to clear draft:', error)
      return false
    }
  }

  // Add to sync queue (for offline submissions)
  const addToSyncQueue = (order: DraftShoppingOrder) => {
    try {
      const queue = getSyncQueue()
      queue.push(order)
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue))
      syncQueue.value = queue
      
      console.log('[Offline] Added to sync queue:', order.id)
      return true
    } catch (error) {
      console.error('[Offline] Failed to add to sync queue:', error)
      return false
    }
  }

  // Get sync queue
  const getSyncQueue = (): DraftShoppingOrder[] => {
    try {
      const stored = localStorage.getItem(SYNC_QUEUE_KEY)
      if (!stored) return []
      
      const queue = JSON.parse(stored) as DraftShoppingOrder[]
      syncQueue.value = queue
      return queue
    } catch (error) {
      console.error('[Offline] Failed to get sync queue:', error)
      return []
    }
  }

  // Clear sync queue
  const clearSyncQueue = () => {
    try {
      localStorage.removeItem(SYNC_QUEUE_KEY)
      syncQueue.value = []
      console.log('[Offline] Sync queue cleared')
      return true
    } catch (error) {
      console.error('[Offline] Failed to clear sync queue:', error)
      return false
    }
  }

  // Remove from sync queue
  const removeFromSyncQueue = (orderId: string) => {
    try {
      const queue = getSyncQueue()
      const filtered = queue.filter(item => item.id !== orderId)
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered))
      syncQueue.value = filtered
      
      console.log('[Offline] Removed from sync queue:', orderId)
      return true
    } catch (error) {
      console.error('[Offline] Failed to remove from sync queue:', error)
      return false
    }
  }

  // Auto-sync when back online
  watch(isOnline, async (online) => {
    if (online) {
      console.log('[Offline] Back online, checking sync queue...')
      const queue = getSyncQueue()
      
      if (queue.length > 0) {
        console.log(`[Offline] Found ${queue.length} orders to sync`)
        // TODO: Implement actual sync logic
        // for (const order of queue) {
        //   try {
        //     await submitOrder(order)
        //     removeFromSyncQueue(order.id)
        //   } catch (error) {
        //     console.error('[Offline] Failed to sync order:', order.id, error)
        //   }
        // }
      }
    } else {
      console.log('[Offline] Connection lost')
    }
  })

  // Initialize
  const init = () => {
    const draft = loadDraft()
    const queue = getSyncQueue()
    
    return {
      hasDraft: !!draft,
      draft,
      queueLength: queue.length
    }
  }

  return {
    isOnline,
    hasDraft,
    syncQueue,
    saveDraft,
    loadDraft,
    clearDraft,
    addToSyncQueue,
    getSyncQueue,
    clearSyncQueue,
    removeFromSyncQueue,
    init
  }
}

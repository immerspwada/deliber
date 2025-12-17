/**
 * Feature: F157 - Offline Mode for History and Wallet
 * เก็บข้อมูลประวัติและ wallet ไว้ใน IndexedDB เพื่อดูได้แม้ไม่มีอินเทอร์เน็ต
 */

import { ref, onMounted } from 'vue'

const DB_NAME = 'thairide_offline'
const DB_VERSION = 1

// OfflineData interface for type reference
// interface OfflineData {
//   history: any[]
//   wallet: { balance: number; total_earned: number; total_spent: number; transactions: any[] }
//   loyalty: { current_points: number; lifetime_points: number; tier: any }
//   lastSync: string
// }

let db: IDBDatabase | null = null

// Initialize IndexedDB
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db)
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result
      
      // Create stores
      if (!database.objectStoreNames.contains('cache')) {
        database.createObjectStore('cache', { keyPath: 'key' })
      }
    }
  })
}

export function useOfflineStorage() {
  const isOnline = ref(navigator.onLine)
  const lastSyncTime = ref<string | null>(null)
  const isSyncing = ref(false)

  // Listen for online/offline events
  onMounted(() => {
    window.addEventListener('online', () => { isOnline.value = true })
    window.addEventListener('offline', () => { isOnline.value = false })
    loadLastSyncTime()
  })

  // Load last sync time
  const loadLastSyncTime = async () => {
    try {
      const data = await getData<string>('lastSync')
      lastSyncTime.value = data || null
    } catch (e) {
      console.warn('Error loading last sync time:', e)
    }
  }

  // Save data to IndexedDB
  const saveData = async (key: string, data: any): Promise<void> => {
    try {
      const database = await initDB()
      return new Promise((resolve, reject) => {
        const transaction = database.transaction(['cache'], 'readwrite')
        const store = transaction.objectStore('cache')
        const request = store.put({ key, data, timestamp: new Date().toISOString() })
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (e) {
      console.warn('Error saving to IndexedDB:', e)
      // Fallback to localStorage
      try {
        localStorage.setItem(`offline_${key}`, JSON.stringify(data))
      } catch (le) {
        console.warn('LocalStorage fallback failed:', le)
      }
    }
  }

  // Get data from IndexedDB
  const getData = async <T>(key: string): Promise<T | null> => {
    try {
      const database = await initDB()
      return new Promise((resolve, reject) => {
        const transaction = database.transaction(['cache'], 'readonly')
        const store = transaction.objectStore('cache')
        const request = store.get(key)
        request.onsuccess = () => {
          resolve(request.result?.data || null)
        }
        request.onerror = () => reject(request.error)
      })
    } catch (e) {
      console.warn('Error reading from IndexedDB:', e)
      // Fallback to localStorage
      try {
        const data = localStorage.getItem(`offline_${key}`)
        return data ? JSON.parse(data) : null
      } catch (le) {
        return null
      }
    }
  }

  // Save history data
  const saveHistory = async (history: any[]) => {
    await saveData('history', history)
    await saveData('lastSync', new Date().toISOString())
    lastSyncTime.value = new Date().toISOString()
  }

  // Get cached history
  const getCachedHistory = async (): Promise<any[]> => {
    return (await getData<any[]>('history')) || []
  }

  // Save wallet data
  const saveWallet = async (wallet: any) => {
    await saveData('wallet', wallet)
    await saveData('lastSync', new Date().toISOString())
    lastSyncTime.value = new Date().toISOString()
  }

  // Get cached wallet
  const getCachedWallet = async () => {
    return await getData<any>('wallet')
  }

  // Save wallet transactions
  const saveWalletTransactions = async (transactions: any[]) => {
    await saveData('walletTransactions', transactions)
  }

  // Get cached wallet transactions
  const getCachedWalletTransactions = async (): Promise<any[]> => {
    return (await getData<any[]>('walletTransactions')) || []
  }

  // Save loyalty data
  const saveLoyalty = async (loyalty: any) => {
    await saveData('loyalty', loyalty)
  }

  // Get cached loyalty
  const getCachedLoyalty = async () => {
    return await getData<any>('loyalty')
  }

  // Save loyalty transactions
  const saveLoyaltyTransactions = async (transactions: any[]) => {
    await saveData('loyaltyTransactions', transactions)
  }

  // Get cached loyalty transactions
  const getCachedLoyaltyTransactions = async (): Promise<any[]> => {
    return (await getData<any[]>('loyaltyTransactions')) || []
  }

  // Clear all cached data
  const clearCache = async () => {
    try {
      const database = await initDB()
      return new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(['cache'], 'readwrite')
        const store = transaction.objectStore('cache')
        const request = store.clear()
        request.onsuccess = () => {
          lastSyncTime.value = null
          resolve()
        }
        request.onerror = () => reject(request.error)
      })
    } catch (e) {
      // Clear localStorage fallback
      const keys = Object.keys(localStorage).filter(k => k.startsWith('offline_'))
      keys.forEach(k => localStorage.removeItem(k))
    }
  }

  // Format last sync time
  const formatLastSync = (): string => {
    if (!lastSyncTime.value) return 'ยังไม่เคยซิงค์'
    
    const date = new Date(lastSyncTime.value)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) return 'เมื่อสักครู่'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} นาทีที่แล้ว`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ชั่วโมงที่แล้ว`
    
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return {
    isOnline,
    lastSyncTime,
    isSyncing,
    saveData,
    getData,
    saveHistory,
    getCachedHistory,
    saveWallet,
    getCachedWallet,
    saveWalletTransactions,
    getCachedWalletTransactions,
    saveLoyalty,
    getCachedLoyalty,
    saveLoyaltyTransactions,
    getCachedLoyaltyTransactions,
    clearCache,
    formatLastSync
  }
}

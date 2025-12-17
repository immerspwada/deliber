/**
 * Feature: F62 - Search History
 * Tables: recent_places
 * 
 * ระบบประวัติการค้นหา
 * - บันทึกสถานที่ที่ค้นหา
 * - แสดงประวัติล่าสุด
 * - ลบประวัติ
 */

import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

export interface SearchHistoryItem {
  id: string
  address: string
  name?: string
  lat: number
  lng: number
  type: 'pickup' | 'destination' | 'search'
  searchedAt: Date
}

const MAX_HISTORY_ITEMS = 10
const STORAGE_KEY = 'search_history'

export function useSearchHistory() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const history = ref<SearchHistoryItem[]>([])

  const authStore = useAuthStore()
  const isDemoMode = () => localStorage.getItem('demo_mode') === 'true'

  // Load history from localStorage
  const loadFromStorage = (): SearchHistoryItem[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const items = JSON.parse(stored)
        return items.map((item: any) => ({
          ...item,
          searchedAt: new Date(item.searchedAt)
        }))
      }
    } catch {
      // Ignore parse errors
    }
    return []
  }

  // Save history to localStorage
  const saveToStorage = (items: SearchHistoryItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Ignore storage errors
    }
  }

  // Fetch search history
  const fetchHistory = async () => {
    loading.value = true
    error.value = null

    try {
      // Always load from localStorage first
      history.value = loadFromStorage()

      if (isDemoMode() || !authStore.user) {
        return history.value
      }

      // Also fetch from database
      const { data, error: fetchError } = await supabase
        .from('recent_places')
        .select('*')
        .eq('user_id', authStore.user.id)
        .order('created_at', { ascending: false })
        .limit(MAX_HISTORY_ITEMS)

      if (fetchError) throw fetchError

      if (data && data.length > 0) {
        const dbItems: SearchHistoryItem[] = data.map((item: any) => ({
          id: item.id,
          address: item.address,
          name: item.name,
          lat: item.lat,
          lng: item.lng,
          type: item.place_type || 'search',
          searchedAt: new Date(item.created_at)
        }))

        // Merge with localStorage, removing duplicates
        const merged = [...dbItems]
        history.value.forEach(localItem => {
          if (!merged.some(dbItem => 
            dbItem.lat === localItem.lat && dbItem.lng === localItem.lng
          )) {
            merged.push(localItem)
          }
        })

        history.value = merged.slice(0, MAX_HISTORY_ITEMS)
        saveToStorage(history.value)
      }

      return history.value
    } catch (e: any) {
      error.value = e.message
      return history.value
    } finally {
      loading.value = false
    }
  }

  // Add to search history
  const addToHistory = async (item: Omit<SearchHistoryItem, 'id' | 'searchedAt'>) => {
    const newItem: SearchHistoryItem = {
      ...item,
      id: `local_${Date.now()}`,
      searchedAt: new Date()
    }

    // Remove duplicate if exists
    history.value = history.value.filter(h => 
      !(h.lat === item.lat && h.lng === item.lng)
    )

    // Add to beginning
    history.value.unshift(newItem)

    // Limit to max items
    if (history.value.length > MAX_HISTORY_ITEMS) {
      history.value = history.value.slice(0, MAX_HISTORY_ITEMS)
    }

    // Save to localStorage
    saveToStorage(history.value)

    // Save to database if logged in
    if (!isDemoMode() && authStore.user) {
      try {
        await (supabase.from('recent_places') as any).upsert({
          user_id: authStore.user.id,
          address: item.address,
          name: item.name,
          lat: item.lat,
          lng: item.lng,
          place_type: item.type,
          created_at: new Date().toISOString()
        })
      } catch {
        // Ignore database errors
      }
    }

    return newItem
  }

  // Remove from history
  const removeFromHistory = async (id: string) => {
    history.value = history.value.filter(h => h.id !== id)
    saveToStorage(history.value)

    // Remove from database if not local
    if (!id.startsWith('local_') && !isDemoMode() && authStore.user) {
      try {
        await supabase
          .from('recent_places')
          .delete()
          .eq('id', id)
      } catch {
        // Ignore database errors
      }
    }
  }

  // Clear all history
  const clearHistory = async () => {
    history.value = []
    localStorage.removeItem(STORAGE_KEY)

    if (!isDemoMode() && authStore.user) {
      try {
        await supabase
          .from('recent_places')
          .delete()
          .eq('user_id', authStore.user.id)
      } catch {
        // Ignore database errors
      }
    }
  }

  // Get recent pickups
  const getRecentPickups = () => {
    return history.value.filter(h => h.type === 'pickup').slice(0, 5)
  }

  // Get recent destinations
  const getRecentDestinations = () => {
    return history.value.filter(h => h.type === 'destination').slice(0, 5)
  }

  // Format time ago
  const formatTimeAgo = (date: Date): string => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'เมื่อสักครู่'
    if (minutes < 60) return `${minutes} นาทีที่แล้ว`
    if (hours < 24) return `${hours} ชม.ที่แล้ว`
    if (days < 7) return `${days} วันที่แล้ว`
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
  }

  return {
    loading,
    error,
    history,
    fetchHistory,
    addToHistory,
    removeFromHistory,
    clearHistory,
    getRecentPickups,
    getRecentDestinations,
    formatTimeAgo
  }
}

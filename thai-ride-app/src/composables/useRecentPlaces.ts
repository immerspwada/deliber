/**
 * useRecentPlaces Composable
 * จัดการประวัติสถานที่ที่ใช้ล่าสุด (pickup/destination)
 * - Local storage caching for offline access
 * - Database sync when online
 * - Deduplication within ~11 meters
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import type { SupabaseClient } from '@supabase/supabase-js'

// Use untyped client for flexibility with new columns
const db = supabase as SupabaseClient<any>

// Types
export interface RecentPlace {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  placeType: 'pickup' | 'destination'
  useCount: number
  lastUsedAt: Date
}

interface RecentPlaceDB {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  place_type: string
  use_count: number
  last_used_at: string
}

// Storage keys
const STORAGE_KEY = 'gobear_recent_places'
const SYNC_KEY = 'gobear_recent_places_sync'

// Constants
const MAX_RECENT_PLACES = 10
const DEDUP_PRECISION = 4 // ~11 meters precision

export function useRecentPlaces() {
  const authStore = useAuthStore()
  
  // State
  const recentPickups = ref<RecentPlace[]>([])
  const recentDestinations = ref<RecentPlace[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastSyncAt = ref<number>(0)

  // Computed
  const allRecentPlaces = computed(() => [
    ...recentPickups.value,
    ...recentDestinations.value
  ])

  // ============================================
  // Local Storage Operations
  // ============================================

  function loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        recentPickups.value = (data.pickups || []).map(parseStoredPlace)
        recentDestinations.value = (data.destinations || []).map(parseStoredPlace)
      }
      
      const syncTime = localStorage.getItem(SYNC_KEY)
      if (syncTime) {
        lastSyncAt.value = parseInt(syncTime, 10)
      }
    } catch (err) {
      console.warn('[useRecentPlaces] Failed to load from storage:', err)
    }
  }

  function saveToStorage(): void {
    try {
      const data = {
        pickups: recentPickups.value,
        destinations: recentDestinations.value
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      localStorage.setItem(SYNC_KEY, Date.now().toString())
    } catch (err) {
      console.warn('[useRecentPlaces] Failed to save to storage:', err)
    }
  }

  function parseStoredPlace(place: any): RecentPlace {
    return {
      ...place,
      lastUsedAt: new Date(place.lastUsedAt)
    }
  }

  // ============================================
  // Deduplication Logic
  // ============================================

  function roundCoord(coord: number): number {
    return Math.round(coord * Math.pow(10, DEDUP_PRECISION)) / Math.pow(10, DEDUP_PRECISION)
  }

  function findDuplicate(
    places: RecentPlace[],
    lat: number,
    lng: number
  ): RecentPlace | undefined {
    const roundedLat = roundCoord(lat)
    const roundedLng = roundCoord(lng)
    
    return places.find(p => 
      roundCoord(p.lat) === roundedLat && 
      roundCoord(p.lng) === roundedLng
    )
  }

  // ============================================
  // Core Operations
  // ============================================

  async function addToHistory(
    place: { name: string; address: string; lat: number; lng: number },
    type: 'pickup' | 'destination'
  ): Promise<void> {
    const targetList = type === 'pickup' ? recentPickups : recentDestinations
    
    // Check for duplicate
    const existing = findDuplicate(targetList.value, place.lat, place.lng)
    
    if (existing) {
      // Update existing place
      existing.useCount += 1
      existing.lastUsedAt = new Date()
      existing.name = place.name
      existing.address = place.address
    } else {
      // Add new place
      const newPlace: RecentPlace = {
        id: crypto.randomUUID(),
        name: place.name,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        placeType: type,
        useCount: 1,
        lastUsedAt: new Date()
      }
      
      targetList.value.unshift(newPlace)
      
      // Enforce limit
      if (targetList.value.length > MAX_RECENT_PLACES) {
        targetList.value = targetList.value.slice(0, MAX_RECENT_PLACES)
      }
    }
    
    // Sort by last used
    targetList.value.sort((a, b) => 
      b.lastUsedAt.getTime() - a.lastUsedAt.getTime()
    )
    
    // Save locally
    saveToStorage()
    
    // Sync to database if online and authenticated
    if (navigator.onLine && authStore.user?.id) {
      syncPlaceToDatabase(place, type).catch(console.warn)
    }
  }

  async function getRecentPlaces(
    type: 'pickup' | 'destination',
    limit = MAX_RECENT_PLACES
  ): Promise<RecentPlace[]> {
    const targetList = type === 'pickup' ? recentPickups : recentDestinations
    return targetList.value.slice(0, limit)
  }

  async function clearHistory(type?: 'pickup' | 'destination'): Promise<void> {
    if (!type || type === 'pickup') {
      recentPickups.value = []
    }
    if (!type || type === 'destination') {
      recentDestinations.value = []
    }
    
    saveToStorage()
    
    // Clear from database if authenticated
    if (authStore.user?.id) {
      await clearHistoryFromDatabase(type)
    }
  }

  // ============================================
  // Database Sync Operations
  // ============================================

  async function syncPlaceToDatabase(
    place: { name: string; address: string; lat: number; lng: number },
    type: 'pickup' | 'destination'
  ): Promise<void> {
    if (!authStore.user?.id) return
    
    try {
      // Use the upsert_recent_place function if available
      const { error: rpcError } = await db.rpc('upsert_recent_place', {
        p_user_id: authStore.user.id,
        p_name: place.name,
        p_address: place.address,
        p_lat: place.lat,
        p_lng: place.lng,
        p_place_type: type
      })
      
      if (rpcError) {
        // Fallback to direct insert/update if function doesn't exist
        await fallbackUpsert(place, type)
      }
    } catch (err) {
      console.warn('[useRecentPlaces] Database sync failed:', err)
    }
  }

  async function fallbackUpsert(
    place: { name: string; address: string; lat: number; lng: number },
    type: 'pickup' | 'destination'
  ): Promise<void> {
    if (!authStore.user?.id) return
    
    // Try to find existing - use type assertion for flexibility
    const { data: existing } = await db
      .from('recent_places')
      .select('id, search_count')
      .eq('user_id', authStore.user.id)
      .gte('lat', roundCoord(place.lat) - 0.0001)
      .lte('lat', roundCoord(place.lat) + 0.0001)
      .gte('lng', roundCoord(place.lng) - 0.0001)
      .lte('lng', roundCoord(place.lng) + 0.0001)
      .limit(1)
      .single()
    
    if (existing) {
      // Update existing
      const existingData = existing as { id: string; search_count: number | null }
      await db
        .from('recent_places')
        .update({
          name: place.name,
          address: place.address,
          search_count: (existingData.search_count || 0) + 1,
          last_used_at: new Date().toISOString()
        })
        .eq('id', existingData.id)
    } else {
      // Insert new
      await db
        .from('recent_places')
        .insert({
          user_id: authStore.user.id,
          name: place.name,
          address: place.address,
          lat: place.lat,
          lng: place.lng,
          search_count: 1,
          last_used_at: new Date().toISOString()
        })
    }
  }

  async function syncWithDatabase(): Promise<void> {
    if (!authStore.user?.id || !navigator.onLine) return
    
    loading.value = true
    error.value = null
    
    try {
      // Fetch from database using RPC or direct query
      const { data, error: fetchError } = await db
        .from('recent_places')
        .select('*')
        .eq('user_id', authStore.user.id)
        .order('last_used_at', { ascending: false })
        .limit(MAX_RECENT_PLACES * 2) // Get both types
      
      if (fetchError) throw fetchError
      
      if (data) {
        // Separate by type
        const pickups: RecentPlace[] = []
        const destinations: RecentPlace[] = []
        
        for (const row of data as RecentPlaceDB[]) {
          const place: RecentPlace = {
            id: row.id,
            name: row.name,
            address: row.address,
            lat: row.lat,
            lng: row.lng,
            placeType: row.place_type as 'pickup' | 'destination',
            useCount: row.use_count || 1,
            lastUsedAt: new Date(row.last_used_at)
          }
          
          if (row.place_type === 'pickup') {
            pickups.push(place)
          } else {
            destinations.push(place)
          }
        }
        
        // Merge with local data (server wins for conflicts)
        recentPickups.value = mergeWithLocal(pickups, recentPickups.value)
        recentDestinations.value = mergeWithLocal(destinations, recentDestinations.value)
        
        saveToStorage()
        lastSyncAt.value = Date.now()
      }
    } catch (err: any) {
      error.value = err.message || 'ไม่สามารถซิงค์ข้อมูลได้'
      console.error('[useRecentPlaces] Sync failed:', err)
    } finally {
      loading.value = false
    }
  }

  function mergeWithLocal(
    serverPlaces: RecentPlace[],
    localPlaces: RecentPlace[]
  ): RecentPlace[] {
    const merged = new Map<string, RecentPlace>()
    
    // Add server places first (they take priority)
    for (const place of serverPlaces) {
      const key = `${roundCoord(place.lat)}_${roundCoord(place.lng)}`
      merged.set(key, place)
    }
    
    // Add local places that don't exist on server
    for (const place of localPlaces) {
      const key = `${roundCoord(place.lat)}_${roundCoord(place.lng)}`
      if (!merged.has(key)) {
        merged.set(key, place)
      }
    }
    
    // Sort by last used and limit
    return Array.from(merged.values())
      .sort((a, b) => b.lastUsedAt.getTime() - a.lastUsedAt.getTime())
      .slice(0, MAX_RECENT_PLACES)
  }

  async function clearHistoryFromDatabase(
    type?: 'pickup' | 'destination'
  ): Promise<void> {
    if (!authStore.user?.id) return
    
    try {
      let query = db
        .from('recent_places')
        .delete()
        .eq('user_id', authStore.user.id)
      
      if (type) {
        query = query.eq('place_type', type)
      }
      
      await query
    } catch (err) {
      console.warn('[useRecentPlaces] Failed to clear from database:', err)
    }
  }

  // ============================================
  // Initialization
  // ============================================

  // Load from storage on init
  loadFromStorage()

  // Sync with database when user is authenticated
  if (authStore.user?.id && navigator.onLine) {
    syncWithDatabase()
  }

  return {
    // State
    recentPickups,
    recentDestinations,
    allRecentPlaces,
    loading,
    error,
    lastSyncAt,
    
    // Operations
    addToHistory,
    getRecentPlaces,
    clearHistory,
    syncWithDatabase,
    
    // Constants
    MAX_RECENT_PLACES
  }
}

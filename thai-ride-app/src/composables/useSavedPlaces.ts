/**
 * useSavedPlaces Composable
 * จัดการสถานที่บันทึก (บ้าน, ที่ทำงาน, โปรด)
 * - CRUD operations with optimistic updates
 * - Limit enforcement (1 home, 1 work, 10 favorites)
 * - Offline support with pending changes queue
 */

import { ref, computed, watch } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import type { SupabaseClient } from '@supabase/supabase-js'

// Use untyped client for flexibility with new columns
const db = supabase as SupabaseClient<any>

// Types
export type PlaceType = 'home' | 'work' | 'other'

export interface SavedPlace {
  id: string
  userId: string
  name: string
  address: string
  lat: number
  lng: number
  placeType: PlaceType
  customName?: string
  icon?: string
  createdAt: Date
  updatedAt: Date
}

interface SavedPlaceDB {
  id: string
  user_id: string
  name: string
  address: string
  lat: number
  lng: number
  place_type: string
  custom_name?: string
  icon?: string
  created_at: string
  updated_at: string
}

interface PendingChange {
  action: 'create' | 'update' | 'delete'
  data: Partial<SavedPlace> & { id: string }
  timestamp: number
}

// Storage keys
const STORAGE_KEY = 'gobear_saved_places'
const PENDING_KEY = 'gobear_saved_places_pending'

// Limits
const MAX_FAVORITES = 10

export function useSavedPlaces() {
  const authStore = useAuthStore()
  
  // State
  const savedPlaces = ref<SavedPlace[]>([])
  const pendingChanges = ref<PendingChange[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const homePlace = computed(() => 
    savedPlaces.value.find(p => p.placeType === 'home') || null
  )
  
  const workPlace = computed(() => 
    savedPlaces.value.find(p => p.placeType === 'work') || null
  )
  
  const favoritePlaces = computed(() => 
    savedPlaces.value.filter(p => p.placeType === 'other')
  )
  
  const favoritesCount = computed(() => favoritePlaces.value.length)
  
  const canAddFavorite = computed(() => favoritesCount.value < MAX_FAVORITES)

  // ============================================
  // Local Storage Operations
  // ============================================

  function loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Ensure it's an array with valid structure
        if (Array.isArray(parsed) && parsed.every(item => 
          item && typeof item === 'object' && 'id' in item && 'name' in item
        )) {
          savedPlaces.value = parsed.map(parseStoredPlace)
        } else {
          // Silently clear invalid data without warning (expected on first load)
          localStorage.removeItem(STORAGE_KEY)
          savedPlaces.value = []
        }
      }
      
      const pending = localStorage.getItem(PENDING_KEY)
      if (pending) {
        const parsedPending = JSON.parse(pending)
        if (Array.isArray(parsedPending) && parsedPending.every(item =>
          item && typeof item === 'object' && 'action' in item && 'data' in item
        )) {
          pendingChanges.value = parsedPending
        } else {
          // Silently clear invalid data
          localStorage.removeItem(PENDING_KEY)
          pendingChanges.value = []
        }
      }
    } catch (err) {
      // Silently handle parse errors (expected on first load or corrupted data)
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(PENDING_KEY)
      savedPlaces.value = []
      pendingChanges.value = []
    }
  }

  function saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPlaces.value))
      localStorage.setItem(PENDING_KEY, JSON.stringify(pendingChanges.value))
    } catch (err) {
      console.warn('[useSavedPlaces] Failed to save to storage:', err)
    }
  }

  function parseStoredPlace(place: any): SavedPlace {
    return {
      ...place,
      createdAt: new Date(place.createdAt),
      updatedAt: new Date(place.updatedAt)
    }
  }

  // ============================================
  // Database Operations
  // ============================================

  function mapDBToPlace(row: SavedPlaceDB): SavedPlace {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      address: row.address,
      lat: row.lat,
      lng: row.lng,
      placeType: row.place_type as PlaceType,
      customName: row.custom_name,
      icon: row.icon,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }
  }

  function mapPlaceToDB(place: Partial<SavedPlace>): Partial<SavedPlaceDB> {
    const db: Partial<SavedPlaceDB> = {}
    
    if (place.name !== undefined) db.name = place.name
    if (place.address !== undefined) db.address = place.address
    if (place.lat !== undefined) db.lat = place.lat
    if (place.lng !== undefined) db.lng = place.lng
    if (place.placeType !== undefined) db.place_type = place.placeType
    if (place.customName !== undefined) db.custom_name = place.customName
    if (place.icon !== undefined) db.icon = place.icon
    
    return db
  }

  // ============================================
  // CRUD Operations
  // ============================================

  async function fetchSavedPlaces(): Promise<void> {
    if (!authStore.user?.id) {
      // Load from storage if not authenticated
      loadFromStorage()
      return
    }
    
    loading.value = true
    error.value = null
    
    try {
      const { data, error: fetchError } = await db
        .from('saved_places')
        .select('*')
        .eq('user_id', authStore.user.id)
        .order('created_at', { ascending: true })
      
      if (fetchError) throw fetchError
      
      if (data) {
        savedPlaces.value = (data as SavedPlaceDB[]).map(mapDBToPlace)
        saveToStorage()
      }
      
      // Process pending changes
      await processPendingChanges()
    } catch (err: any) {
      error.value = err.message || 'ไม่สามารถโหลดสถานที่บันทึกได้'
      console.error('[useSavedPlaces] Fetch failed:', err)
      // Fallback to local storage
      loadFromStorage()
    } finally {
      loading.value = false
    }
  }

  async function savePlace(
    place: Omit<SavedPlace, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<SavedPlace> {
    // Validate limits
    if (place.placeType === 'home' && homePlace.value) {
      throw new Error('คุณมีบ้านบันทึกไว้แล้ว กรุณาแก้ไขแทน')
    }
    if (place.placeType === 'work' && workPlace.value) {
      throw new Error('คุณมีที่ทำงานบันทึกไว้แล้ว กรุณาแก้ไขแทน')
    }
    if (place.placeType === 'other' && !canAddFavorite.value) {
      throw new Error(`สถานที่โปรดเต็มแล้ว (สูงสุด ${MAX_FAVORITES} แห่ง)`)
    }
    
    const now = new Date()
    const newPlace: SavedPlace = {
      id: crypto.randomUUID(),
      userId: authStore.user?.id || '',
      ...place,
      createdAt: now,
      updatedAt: now
    }
    
    // Optimistic update
    savedPlaces.value.push(newPlace)
    saveToStorage()
    
      // Sync to database
      if (authStore.user?.id && navigator.onLine) {
        try {
          const { data, error: insertError } = await db
            .from('saved_places')
            .insert({
              id: newPlace.id,
              user_id: authStore.user.id,
              name: place.name,
              address: place.address,
              lat: place.lat,
              lng: place.lng,
              place_type: place.placeType,
              custom_name: place.customName,
              icon: place.icon
            })
            .select()
            .single()
          
          if (insertError) throw insertError
          
          // Update with server response
          if (data) {
            const index = savedPlaces.value.findIndex(p => p.id === newPlace.id)
            if (index !== -1) {
              savedPlaces.value[index] = mapDBToPlace(data as SavedPlaceDB)
            }
          }
        } catch (err: any) {
          // Rollback on error
          savedPlaces.value = savedPlaces.value.filter(p => p.id !== newPlace.id)
          saveToStorage()
          throw new Error(err.message || 'ไม่สามารถบันทึกสถานที่ได้')
        }
      } else {
        // Queue for later sync
        addPendingChange('create', newPlace)
      }
    
    return newPlace
  }

  async function updatePlace(
    id: string,
    updates: Partial<Omit<SavedPlace, 'id' | 'userId' | 'createdAt'>>
  ): Promise<SavedPlace> {
    const index = savedPlaces.value.findIndex(p => p.id === id)
    if (index === -1) {
      throw new Error('ไม่พบสถานที่ที่ต้องการแก้ไข')
    }
    
    const original = { ...savedPlaces.value[index] }
    
    // Optimistic update
    savedPlaces.value[index] = {
      ...original,
      ...updates,
      updatedAt: new Date()
    }
    saveToStorage()
    
    // Sync to database
    if (authStore.user?.id && navigator.onLine) {
      try {
        const { data, error: updateError } = await db
          .from('saved_places')
          .update({
            ...mapPlaceToDB(updates),
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .eq('user_id', authStore.user.id)
          .select()
          .single()
        
        if (updateError) throw updateError
        
        if (data) {
          savedPlaces.value[index] = mapDBToPlace(data as SavedPlaceDB)
        }
      } catch (err: any) {
        // Rollback on error
        savedPlaces.value[index] = original
        saveToStorage()
        throw new Error(err.message || 'ไม่สามารถแก้ไขสถานที่ได้')
      }
    } else {
      // Queue for later sync
      addPendingChange('update', { id, ...updates })
    }
    
    return savedPlaces.value[index]!
  }

  async function deletePlace(id: string): Promise<void> {
    const index = savedPlaces.value.findIndex(p => p.id === id)
    if (index === -1) {
      throw new Error('ไม่พบสถานที่ที่ต้องการลบ')
    }
    
    const original = savedPlaces.value[index]
    
    // Optimistic update
    savedPlaces.value.splice(index, 1)
    saveToStorage()
    
    // Sync to database
    if (authStore.user?.id && navigator.onLine) {
      try {
        const { error: deleteError } = await db
          .from('saved_places')
          .delete()
          .eq('id', id)
          .eq('user_id', authStore.user.id)
        
        if (deleteError) throw deleteError
      } catch (err: any) {
        // Rollback on error
        savedPlaces.value.splice(index, 0, original!)
        saveToStorage()
        throw new Error(err.message || 'ไม่สามารถลบสถานที่ได้')
      }
    } else {
      // Queue for later sync
      addPendingChange('delete', { id })
    }
  }

  // ============================================
  // Pending Changes Queue
  // ============================================

  function addPendingChange(
    action: PendingChange['action'],
    data: Partial<SavedPlace> & { id: string }
  ): void {
    // Remove any existing pending change for this id
    pendingChanges.value = pendingChanges.value.filter(
      c => c.data.id !== data.id
    )
    
    // Add new pending change (unless it's a delete after create)
    const wasCreated = pendingChanges.value.some(
      c => c.data.id === data.id && c.action === 'create'
    )
    
    if (action === 'delete' && wasCreated) {
      // Just remove the create, don't add delete
      return
    }
    
    pendingChanges.value.push({
      action,
      data,
      timestamp: Date.now()
    })
    
    saveToStorage()
  }

  async function processPendingChanges(): Promise<void> {
    if (!authStore.user?.id || !navigator.onLine || pendingChanges.value.length === 0) {
      return
    }
    
    const changes = [...pendingChanges.value]
    pendingChanges.value = []
    
    for (const change of changes) {
      try {
        switch (change.action) {
          case 'create':
            await db
              .from('saved_places')
              .insert({
                id: change.data.id,
                user_id: authStore.user.id,
                name: change.data.name,
                address: change.data.address,
                lat: change.data.lat,
                lng: change.data.lng,
                place_type: change.data.placeType,
                custom_name: change.data.customName,
                icon: change.data.icon
              })
            break
            
          case 'update':
            await db
              .from('saved_places')
              .update(mapPlaceToDB(change.data))
              .eq('id', change.data.id)
              .eq('user_id', authStore.user.id)
            break
            
          case 'delete':
            await db
              .from('saved_places')
              .delete()
              .eq('id', change.data.id)
              .eq('user_id', authStore.user.id)
            break
        }
      } catch (err) {
        console.warn('[useSavedPlaces] Failed to process pending change:', err)
        // Re-add failed change
        pendingChanges.value.push(change)
      }
    }
    
    saveToStorage()
  }

  // ============================================
  // Helper Functions
  // ============================================

  function getPlaceIcon(placeType: PlaceType): string {
    switch (placeType) {
      case 'home':
        return '🏠'
      case 'work':
        return '💼'
      default:
        return '⭐'
    }
  }

  function getPlaceLabel(placeType: PlaceType): string {
    switch (placeType) {
      case 'home':
        return 'บ้าน'
      case 'work':
        return 'ที่ทำงาน'
      default:
        return 'สถานที่โปรด'
    }
  }

  // ============================================
  // Initialization & Watchers
  // ============================================

  // Load from storage on init
  loadFromStorage()

  // Fetch from database when user is authenticated
  if (authStore.user?.id) {
    fetchSavedPlaces()
  }

  // Watch for online status to process pending changes
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      if (authStore.user?.id) {
        processPendingChanges()
      }
    })
  }

  return {
    // State
    savedPlaces,
    homePlace,
    workPlace,
    favoritePlaces,
    favoritesCount,
    canAddFavorite,
    loading,
    error,
    pendingChanges,
    
    // Operations
    fetchSavedPlaces,
    savePlace,
    updatePlace,
    deletePlace,
    processPendingChanges,
    
    // Helpers
    getPlaceIcon,
    getPlaceLabel,
    
    // Constants
    MAX_FAVORITES
  }
}

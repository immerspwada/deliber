/**
 * Feature: F158a - Queue Favorite Places & Estimated Wait Time
 * Tables: queue_favorite_places, queue_place_stats
 * Migration: 054_queue_favorites_and_wait_time.sql
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

// Types
export interface QueueFavoritePlace {
  id: string
  user_id: string
  category: 'hospital' | 'bank' | 'government' | 'restaurant' | 'salon' | 'other'
  place_name: string
  place_address: string | null
  place_phone: string | null
  default_details: string | null
  avg_wait_time_minutes: number | null
  last_visit_at: string | null
  visit_count: number
  is_favorite: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface QueueFavoriteWithStats {
  id: string
  category: string
  place_name: string
  place_address: string | null
  place_phone: string | null
  default_details: string | null
  visit_count: number
  last_visit_at: string | null
  avg_wait_time: number
  confidence: 'low' | 'medium' | 'high'
}

export interface EstimatedWaitTime {
  avg_wait: number
  min_wait: number
  max_wait: number
  time_based_wait: number
  confidence: 'low' | 'medium' | 'high'
}

export interface SaveFavoritePlaceInput {
  category: QueueFavoritePlace['category']
  place_name: string
  place_address?: string
  place_phone?: string
  default_details?: string
  notes?: string
}

export function useQueueFavorites() {
  // Check if demo mode
  const isDemoMode = () => localStorage.getItem('demo_mode') === 'true'
  
  // State
  const favorites = ref<QueueFavoriteWithStats[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const favoritesByCategory = computed(() => {
    const grouped: Record<string, QueueFavoriteWithStats[]> = {}
    for (const fav of favorites.value) {
      if (!grouped[fav.category]) {
        grouped[fav.category] = []
      }
      grouped[fav.category]!.push(fav)
    }
    return grouped
  })

  const topFavorites = computed(() => 
    [...favorites.value]
      .sort((a, b) => b.visit_count - a.visit_count)
      .slice(0, 5)
  )

  // Fetch favorites with stats
  async function fetchFavorites(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      // Skip API call in demo mode
      if (isDemoMode()) {
        favorites.value = []
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        error.value = 'กรุณาเข้าสู่ระบบ'
        return
      }

      const { data, error: fetchError } = await (supabase
        .rpc as any)('get_queue_favorites_with_stats', { p_user_id: user.id })

      if (fetchError) throw fetchError

      favorites.value = (data || []) as QueueFavoriteWithStats[]
    } catch (err: any) {
      // Silently handle in demo mode
      if (isDemoMode()) {
        favorites.value = []
        return
      }
      error.value = err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
    } finally {
      loading.value = false
    }
  }

  // Save favorite place
  async function saveFavoritePlace(input: SaveFavoritePlaceInput): Promise<string | null> {
    loading.value = true
    error.value = null

    try {
      // Demo mode - create mock favorite
      if (isDemoMode()) {
        const mockId = `demo-fav-${Date.now()}`
        const mockFavorite: QueueFavoriteWithStats = {
          id: mockId,
          category: input.category,
          place_name: input.place_name,
          place_address: input.place_address || null,
          place_phone: input.place_phone || null,
          default_details: input.default_details || null,
          visit_count: 1,
          last_visit_at: new Date().toISOString(),
          avg_wait_time: 30,
          confidence: 'low'
        }
        favorites.value.push(mockFavorite)
        return mockId
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        error.value = 'กรุณาเข้าสู่ระบบ'
        return null
      }

      const { data, error: saveError } = await (supabase
        .rpc as any)('save_queue_favorite_place', {
          p_user_id: user.id,
          p_category: input.category,
          p_place_name: input.place_name,
          p_place_address: input.place_address || null,
          p_place_phone: input.place_phone || null,
          p_default_details: input.default_details || null,
          p_notes: input.notes || null
        })

      if (saveError) throw saveError

      // Refresh favorites
      await fetchFavorites()
      
      return data as string
    } catch (err: any) {
      error.value = err.message || 'เกิดข้อผิดพลาดในการบันทึก'
      return null
    } finally {
      loading.value = false
    }
  }

  // Remove favorite
  async function removeFavorite(favoriteId: string): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      // Demo mode - just update local state
      if (isDemoMode()) {
        favorites.value = favorites.value.filter(f => f.id !== favoriteId)
        return true
      }

      const { error: deleteError } = await (supabase
        .from('queue_favorite_places') as any)
        .update({ is_favorite: false, updated_at: new Date().toISOString() })
        .eq('id', favoriteId)

      if (deleteError) throw deleteError

      // Update local state
      favorites.value = favorites.value.filter(f => f.id !== favoriteId)
      
      return true
    } catch (err: any) {
      error.value = err.message || 'เกิดข้อผิดพลาดในการลบ'
      return false
    } finally {
      loading.value = false
    }
  }

  // Delete favorite permanently
  async function deleteFavorite(favoriteId: string): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      // Demo mode - just update local state
      if (isDemoMode()) {
        favorites.value = favorites.value.filter(f => f.id !== favoriteId)
        return true
      }

      const { error: deleteError } = await supabase
        .from('queue_favorite_places')
        .delete()
        .eq('id', favoriteId)

      if (deleteError) throw deleteError

      favorites.value = favorites.value.filter(f => f.id !== favoriteId)
      
      return true
    } catch (err: any) {
      error.value = err.message || 'เกิดข้อผิดพลาดในการลบ'
      return false
    } finally {
      loading.value = false
    }
  }

  // Get estimated wait time
  async function getEstimatedWaitTime(
    placeName: string,
    category: string,
    scheduledTime?: string
  ): Promise<EstimatedWaitTime | null> {
    try {
      // Demo mode - return mock estimate
      if (isDemoMode()) {
        return {
          avg_wait: 30,
          min_wait: 15,
          max_wait: 45,
          time_based_wait: 30,
          confidence: 'low'
        }
      }

      const { data, error: fetchError } = await (supabase
        .rpc as any)('get_estimated_wait_time', {
          p_place_name: placeName,
          p_category: category,
          p_scheduled_time: scheduledTime || null
        })

      if (fetchError) throw fetchError

      if (data && Array.isArray(data) && data.length > 0) {
        return data[0] as EstimatedWaitTime
      }
      
      return null
    } catch (err: any) {
      console.error('Error getting wait time:', err)
      return null
    }
  }

  // Get favorites by category
  function getFavoritesByCategory(category: string): QueueFavoriteWithStats[] {
    return favorites.value.filter(f => f.category === category)
  }

  // Check if place is favorite
  function isFavorite(placeName: string, category: string): boolean {
    return favorites.value.some(
      f => f.place_name === placeName && f.category === category
    )
  }

  // Get favorite by place name
  function getFavoriteByPlace(placeName: string, category: string): QueueFavoriteWithStats | undefined {
    return favorites.value.find(
      f => f.place_name === placeName && f.category === category
    )
  }

  // Format wait time for display
  function formatWaitTime(minutes: number): string {
    if (minutes < 60) {
      return `~${minutes} นาที`
    }
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (mins === 0) {
      return `~${hours} ชม.`
    }
    return `~${hours} ชม. ${mins} นาที`
  }

  // Get confidence label
  function getConfidenceLabel(confidence: string): string {
    const labels: Record<string, string> = {
      high: 'แม่นยำสูง',
      medium: 'แม่นยำปานกลาง',
      low: 'ประมาณการ'
    }
    return labels[confidence] || 'ประมาณการ'
  }

  // Get confidence color
  function getConfidenceColor(confidence: string): string {
    const colors: Record<string, string> = {
      high: '#00A86B',
      medium: '#F5A623',
      low: '#999999'
    }
    return colors[confidence] || '#999999'
  }

  // Clear error
  function clearError(): void {
    error.value = null
  }

  // Category labels
  const categoryLabels: Record<string, string> = {
    hospital: 'โรงพยาบาล',
    bank: 'ธนาคาร',
    government: 'หน่วยงานราชการ',
    restaurant: 'ร้านอาหาร',
    salon: 'ร้านเสริมสวย',
    other: 'อื่นๆ'
  }

  return {
    // State
    favorites,
    loading,
    error,

    // Computed
    favoritesByCategory,
    topFavorites,

    // Methods
    fetchFavorites,
    saveFavoritePlace,
    removeFavorite,
    deleteFavorite,
    getEstimatedWaitTime,
    getFavoritesByCategory,
    isFavorite,
    getFavoriteByPlace,
    clearError,

    // Helpers
    formatWaitTime,
    getConfidenceLabel,
    getConfidenceColor,
    categoryLabels
  }
}

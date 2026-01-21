/**
 * useFavoriteServices - จัดการบริการโปรดของผู้ใช้
 * Production-ready: ใช้ database เท่านั้น ไม่มี localStorage fallback
 */
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

interface FavoriteService {
  service_id: string
  display_order: number
}

const favoriteServices = ref<FavoriteService[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function useFavoriteServices() {
  const authStore = useAuthStore()

  const favoriteServiceIds = computed(() => 
    favoriteServices.value.map(f => f.service_id)
  )

  const isFavorite = (serviceId: string) => 
    favoriteServiceIds.value.includes(serviceId)

  async function fetchFavorites() {
    if (!authStore.user?.id) return

    loading.value = true
    error.value = null

    try {
      // Try using RPC function first (production) - no parameters needed
      const { data, error: fetchError } = await supabase
        .rpc('get_user_favorite_services')

      if (fetchError) {
        // If RPC function doesn't exist, use direct table query
        if (fetchError.code === 'PGRST202') {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('user_favorite_services')
            .select('service_id, display_order')
            .eq('user_id', authStore.user.id)
            .order('display_order')

          if (fallbackError) {
            console.error('[FavoriteServices] Database error:', fallbackError)
            throw new Error('Database schema not ready. Please apply migration 242.')
          }
          favoriteServices.value = fallbackData || []
          return
        }
        throw fetchError
      }
      
      favoriteServices.value = data || []
    } catch (err) {
      console.error('Error fetching favorites:', err)
      error.value = 'ไม่สามารถโหลดบริการโปรดได้'
      favoriteServices.value = []
    } finally {
      loading.value = false
    }
  }

  async function toggleFavorite(serviceId: string): Promise<boolean> {
    if (!authStore.user?.id) return false

    try {
      // Try using RPC function first (production) - no user_id parameter needed
      const { data, error: toggleError } = await supabase
        .rpc('toggle_favorite_service', {
          p_service_id: serviceId
        })

      if (toggleError) {
        // If RPC function doesn't exist, use direct table operations
        if (toggleError.code === 'PGRST202') {
          const exists = favoriteServices.value.some(f => f.service_id === serviceId)
          
          if (exists) {
            // Remove from favorites
            const { error: deleteError } = await supabase
              .from('user_favorite_services')
              .delete()
              .eq('user_id', authStore.user.id)
              .eq('service_id', serviceId)
            
            if (deleteError) {
              console.error('[FavoriteServices] Delete error:', deleteError)
              throw new Error('Database schema not ready. Please apply migration 242.')
            }
            
            favoriteServices.value = favoriteServices.value.filter(
              f => f.service_id !== serviceId
            )
            return false
          } else {
            // Add to favorites
            const { error: insertError } = await supabase
              .from('user_favorite_services')
              .insert({
                user_id: authStore.user.id,
                service_id: serviceId,
                display_order: favoriteServices.value.length
              })
            
            if (insertError) {
              console.error('[FavoriteServices] Insert error:', insertError)
              throw new Error('Database schema not ready. Please apply migration 242.')
            }
            
            favoriteServices.value.push({
              service_id: serviceId,
              display_order: favoriteServices.value.length
            })
            return true
          }
        }
        throw toggleError
      }

      // Update local state based on RPC result
      if (data) {
        // Added to favorites
        favoriteServices.value.push({
          service_id: serviceId,
          display_order: favoriteServices.value.length
        })
      } else {
        // Removed from favorites
        favoriteServices.value = favoriteServices.value.filter(
          f => f.service_id !== serviceId
        )
      }

      return data as boolean
    } catch (err) {
      console.error('Error toggling favorite:', err)
      error.value = 'ไม่สามารถอัพเดทบริการโปรดได้'
      return false
    }
  }

  return {
    favoriteServices,
    favoriteServiceIds,
    loading,
    error,
    isFavorite,
    fetchFavorites,
    toggleFavorite
  }
}

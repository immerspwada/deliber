import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { useAuditLog } from './useAuditLog'

type PromoCode = Database['public']['Tables']['promo_codes']['Row']
type PromoCodeInsert = Database['public']['Tables']['promo_codes']['Insert']
type PromoCodeUpdate = Database['public']['Tables']['promo_codes']['Update']

interface PromoFilters {
  status?: 'all' | 'active' | 'inactive' | 'expired' | 'upcoming'
  category?: string
  service_type?: string
  search?: string
}

interface PromoStats {
  total_promos: number
  active_promos: number
  valid_promos: number
  total_usage: number
  total_discount_given: number
  avg_discount_per_use: number
}

export function useAdminPromos() {
  const promos = ref<PromoCode[]>([])
  const stats = ref<PromoStats | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const { logAction } = useAuditLog()

  // Computed filters
  const filteredPromos = computed(() => {
    return promos.value
  })

  // Fetch all promos
  async function fetchPromos(filters: PromoFilters = {}) {
    loading.value = true
    error.value = null

    try {
      let query = supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.status === 'active') {
        query = query.eq('is_active', true)
      } else if (filters.status === 'inactive') {
        query = query.eq('is_active', false)
      } else if (filters.status === 'expired') {
        query = query.lt('valid_until', new Date().toISOString())
      } else if (filters.status === 'upcoming') {
        query = query.gt('valid_from', new Date().toISOString())
      }

      if (filters.category && filters.category !== 'all') {
        query = query.eq('category', filters.category)
      }

      if (filters.search) {
        query = query.or(`code.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      promos.value = data || []
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch promos'
      console.error('Error fetching promos:', err)
    } finally {
      loading.value = false
    }
  }

  // Fetch stats
  async function fetchStats() {
    try {
      const { data, error: statsError } = await supabase
        .from('promo_codes')
        .select('used_count, discount_type, discount_value, is_active, valid_until')

      if (statsError) throw statsError

      const now = new Date()
      const total_promos = data?.length || 0
      const active_promos = data?.filter(p => p.is_active).length || 0
      const valid_promos = data?.filter(p => new Date(p.valid_until || '') > now).length || 0
      const total_usage = data?.reduce((sum, p) => sum + (p.used_count || 0), 0) || 0

      // Estimate total discount given (simplified calculation)
      const total_discount_given = data?.reduce((sum, p) => {
        const usage = p.used_count || 0
        const value = Number(p.discount_value) || 0
        return sum + (usage * value)
      }, 0) || 0

      const avg_discount_per_use = total_usage > 0 ? total_discount_given / total_usage : 0

      stats.value = {
        total_promos,
        active_promos,
        valid_promos,
        total_usage,
        total_discount_given,
        avg_discount_per_use
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  // Create promo
  async function createPromo(promo: PromoCodeInsert) {
    loading.value = true
    error.value = null

    try {
      const { data, error: createError } = await supabase
        .from('promo_codes')
        .insert({
          ...promo,
          used_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) throw createError

      // Log action
      await logAction({
        action: 'create',
        resource_type: 'promo_code',
        resource_id: data.id,
        details: {
          code: promo.code,
          discount_type: promo.discount_type,
          discount_value: promo.discount_value
        }
      })

      await fetchPromos()
      await fetchStats()

      return data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create promo'
      console.error('Error creating promo:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Update promo
  async function updatePromo(id: string, updates: PromoCodeUpdate) {
    loading.value = true
    error.value = null

    try {
      const { data, error: updateError } = await supabase
        .from('promo_codes')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      // Log action
      await logAction({
        action: 'update',
        resource_type: 'promo_code',
        resource_id: id,
        details: updates
      })

      await fetchPromos()
      await fetchStats()

      return data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update promo'
      console.error('Error updating promo:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Delete promo
  async function deletePromo(id: string) {
    loading.value = true
    error.value = null

    try {
      const { error: deleteError } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      // Log action
      await logAction({
        action: 'delete',
        resource_type: 'promo_code',
        resource_id: id,
        details: {}
      })

      await fetchPromos()
      await fetchStats()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete promo'
      console.error('Error deleting promo:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Toggle promo status
  async function togglePromoStatus(id: string, isActive: boolean) {
    return updatePromo(id, { is_active: isActive })
  }

  // Bulk operations
  async function bulkUpdateStatus(ids: string[], isActive: boolean) {
    loading.value = true
    error.value = null

    try {
      const { error: bulkError } = await supabase
        .from('promo_codes')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .in('id', ids)

      if (bulkError) throw bulkError

      // Log action
      await logAction({
        action: 'bulk_update',
        resource_type: 'promo_code',
        resource_id: ids.join(','),
        details: { is_active: isActive, count: ids.length }
      })

      await fetchPromos()
      await fetchStats()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to bulk update'
      console.error('Error bulk updating:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function bulkDelete(ids: string[]) {
    loading.value = true
    error.value = null

    try {
      const { error: bulkError } = await supabase
        .from('promo_codes')
        .delete()
        .in('id', ids)

      if (bulkError) throw bulkError

      // Log action
      await logAction({
        action: 'bulk_delete',
        resource_type: 'promo_code',
        resource_id: ids.join(','),
        details: { count: ids.length }
      })

      await fetchPromos()
      await fetchStats()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to bulk delete'
      console.error('Error bulk deleting:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    promos,
    filteredPromos,
    stats,
    loading,
    error,
    fetchPromos,
    fetchStats,
    createPromo,
    updatePromo,
    deletePromo,
    togglePromoStatus,
    bulkUpdateStatus,
    bulkDelete
  }
}

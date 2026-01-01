/**
 * useAdminPromos - Admin Promo Management Composable
 * 
 * Feature: F10 - Promo Codes (Admin)
 * Tables: promo_codes, promo_campaigns, promo_usage_analytics
 * 
 * @capabilities
 * - CRUD promo codes
 * - Campaign management
 * - Analytics & reporting
 * - Realtime updates
 */

import { ref, computed, readonly } from 'vue'
import { supabase } from '../../lib/supabase'

// Types
export interface AdminPromo {
  id: string
  code: string
  description: string | null
  discount_type: 'fixed' | 'percentage'
  discount_value: number
  max_discount: number | null
  min_order_amount: number | null
  category: string | null
  service_types: string[] | null
  user_type: string | null
  usage_limit: number | null
  used_count: number | null
  per_user_limit: number | null
  valid_from: string | null
  valid_until: string | null
  is_active: boolean
  campaign_id: string | null
  campaign_name: string | null
  total_discount_given: number
  unique_users: number
  created_at: string
  created_by_name: string | null
}

export interface PromoCampaign {
  id: string
  name: string
  description: string | null
  start_date: string
  end_date: string
  budget: number | null
  spent: number
  target_users: number | null
  reached_users: number
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled'
  promo_count: number
  total_uses: number
  created_by_name: string | null
  created_at: string
}

export interface PromoAnalytics {
  date: string
  total_uses: number
  unique_users: number
  total_discount: number
  total_orders: number
  avg_order_value: number
  by_service: Record<string, number>
}

export interface DashboardStats {
  total_promos: number
  active_promos: number
  total_campaigns: number
  active_campaigns: number
  total_uses_today: number
  total_discount_today: number
  total_uses_month: number
  total_discount_month: number
  top_promos: Array<{ code: string; used_count: number; discount_type: string; discount_value: number }>
  recent_usage: Array<{ code: string; discount_amount: number; service_type: string; used_at: string; user_name: string }>
}

export interface CreatePromoInput {
  code: string
  description?: string
  discount_type: 'fixed' | 'percentage'
  discount_value: number
  max_discount?: number
  min_order_amount?: number
  category?: string
  service_types?: string[]
  user_type?: string
  usage_limit?: number
  per_user_limit?: number
  valid_from?: string
  valid_until?: string
  campaign_id?: string
}

export interface CreateCampaignInput {
  name: string
  description?: string
  start_date: string
  end_date: string
  budget?: number
  target_users?: number
}

export function useAdminPromos() {
  // State
  const promos = ref<AdminPromo[]>([])
  const campaigns = ref<PromoCampaign[]>([])
  const analytics = ref<PromoAnalytics[]>([])
  const dashboardStats = ref<DashboardStats | null>(null)
  const totalPromos = ref(0)
  const totalCampaigns = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const activePromos = computed(() => promos.value.filter(p => p.is_active))
  const inactivePromos = computed(() => promos.value.filter(p => !p.is_active))
  const activeCampaigns = computed(() => campaigns.value.filter(c => c.status === 'active'))

  // ============================================
  // PROMO CODES
  // ============================================

  async function fetchPromos(
    filters: { status?: string; category?: string } = {},
    pagination: { page: number; limit: number } = { page: 1, limit: 20 }
  ) {
    loading.value = true
    error.value = null

    try {
      const offset = (pagination.page - 1) * pagination.limit

      const { data, error: err } = await (supabase.rpc as any)('get_all_promos_for_admin', {
        p_status: filters.status || null,
        p_category: filters.category || null,
        p_limit: pagination.limit,
        p_offset: offset
      })

      if (err) throw err
      promos.value = data || []

      // Get total count
      const { data: countData } = await (supabase.rpc as any)('count_promos_for_admin', {
        p_status: filters.status || null,
        p_category: filters.category || null
      })
      totalPromos.value = countData || 0

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch promos'
      console.error('[useAdminPromos] fetchPromos error:', err)
    } finally {
      loading.value = false
    }
  }

  async function createPromo(input: CreatePromoInput): Promise<string | null> {
    loading.value = true
    error.value = null

    try {
      const { data, error: err } = await (supabase.rpc as any)('create_promo_code', {
        p_code: input.code,
        p_description: input.description || null,
        p_discount_type: input.discount_type,
        p_discount_value: input.discount_value,
        p_max_discount: input.max_discount || null,
        p_min_order_amount: input.min_order_amount || 0,
        p_category: input.category || 'all',
        p_service_types: input.service_types || ['ride', 'delivery', 'shopping'],
        p_user_type: input.user_type || 'all',
        p_usage_limit: input.usage_limit || null,
        p_per_user_limit: input.per_user_limit || 1,
        p_valid_from: input.valid_from || new Date().toISOString(),
        p_valid_until: input.valid_until || null,
        p_campaign_id: input.campaign_id || null
      })

      if (err) throw err
      return data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create promo'
      console.error('[useAdminPromos] createPromo error:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  async function updatePromo(id: string, updates: Partial<CreatePromoInput>): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      const { error: err } = await (supabase.from as any)('promo_codes')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (err) throw err
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update promo'
      console.error('[useAdminPromos] updatePromo error:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  async function togglePromoStatus(id: string): Promise<boolean> {
    try {
      const { data, error: err } = await (supabase.rpc as any)('toggle_promo_status', {
        p_promo_id: id
      })

      if (err) throw err

      // Update local state
      const promo = promos.value.find(p => p.id === id)
      if (promo) promo.is_active = !promo.is_active

      return data === true
    } catch (err) {
      console.error('[useAdminPromos] togglePromoStatus error:', err)
      return false
    }
  }

  async function deletePromo(id: string): Promise<boolean> {
    try {
      const { data, error: err } = await (supabase.rpc as any)('delete_promo', {
        p_promo_id: id
      })

      if (err) throw err

      // Remove from local state
      promos.value = promos.value.filter(p => p.id !== id)

      return data === true
    } catch (err) {
      console.error('[useAdminPromos] deletePromo error:', err)
      return false
    }
  }

  // ============================================
  // CAMPAIGNS
  // ============================================

  async function fetchCampaigns(
    filters: { status?: string } = {},
    pagination: { page: number; limit: number } = { page: 1, limit: 20 }
  ) {
    loading.value = true
    error.value = null

    try {
      const offset = (pagination.page - 1) * pagination.limit

      const { data, error: err } = await (supabase.rpc as any)('get_all_campaigns_for_admin', {
        p_status: filters.status || null,
        p_limit: pagination.limit,
        p_offset: offset
      })

      if (err) throw err
      campaigns.value = data || []
      totalCampaigns.value = data?.length || 0

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch campaigns'
      console.error('[useAdminPromos] fetchCampaigns error:', err)
    } finally {
      loading.value = false
    }
  }

  async function createCampaign(input: CreateCampaignInput): Promise<string | null> {
    loading.value = true
    error.value = null

    try {
      const { data, error: err } = await (supabase.rpc as any)('create_promo_campaign', {
        p_name: input.name,
        p_description: input.description || null,
        p_start_date: input.start_date,
        p_end_date: input.end_date,
        p_budget: input.budget || null,
        p_target_users: input.target_users || null
      })

      if (err) throw err
      return data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create campaign'
      console.error('[useAdminPromos] createCampaign error:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateCampaignStatus(id: string, status: string): Promise<boolean> {
    try {
      const { data, error: err } = await (supabase.rpc as any)('update_campaign_status', {
        p_campaign_id: id,
        p_status: status
      })

      if (err) throw err

      // Update local state
      const campaign = campaigns.value.find(c => c.id === id)
      if (campaign) campaign.status = status as any

      return data === true
    } catch (err) {
      console.error('[useAdminPromos] updateCampaignStatus error:', err)
      return false
    }
  }

  async function getCampaignDetails(id: string) {
    try {
      const { data, error: err } = await (supabase.rpc as any)('get_campaign_details', {
        p_campaign_id: id
      })

      if (err) throw err
      return (data as any[])?.[0] || null
    } catch (err) {
      console.error('[useAdminPromos] getCampaignDetails error:', err)
      return null
    }
  }

  // ============================================
  // ANALYTICS
  // ============================================

  async function fetchDashboardStats() {
    loading.value = true
    error.value = null

    try {
      const { data, error: err } = await (supabase.rpc as any)('get_promo_dashboard_stats')

      if (err) throw err
      dashboardStats.value = (data as any[])?.[0] || null

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch dashboard stats'
      console.error('[useAdminPromos] fetchDashboardStats error:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchPromoAnalytics(
    promoId?: string,
    startDate?: string,
    endDate?: string
  ) {
    loading.value = true
    error.value = null

    try {
      const { data, error: err } = await (supabase.rpc as any)('get_promo_analytics', {
        p_promo_id: promoId || null,
        p_start_date: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        p_end_date: endDate || new Date().toISOString()
      })

      if (err) throw err
      analytics.value = data || []

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch analytics'
      console.error('[useAdminPromos] fetchPromoAnalytics error:', err)
    } finally {
      loading.value = false
    }
  }

  // ============================================
  // REALTIME
  // ============================================

  function subscribeToPromoChanges(callback?: () => void) {
    const channel = supabase
      .channel('admin-promo-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'promo_codes' },
        () => {
          callback?.()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'promo_campaigns' },
        () => {
          callback?.()
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'promo_usage_analytics' },
        () => {
          // Refresh stats when new usage
          fetchDashboardStats()
        }
      )
      .subscribe()

    return () => channel.unsubscribe()
  }

  // ============================================
  // HELPERS
  // ============================================

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0
    }).format(amount)
  }

  function formatDiscount(promo: AdminPromo): string {
    if (promo.discount_type === 'fixed') {
      return `฿${promo.discount_value}`
    }
    return `${promo.discount_value}%`
  }

  function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      active: '#10B981',
      draft: '#6B7280',
      paused: '#F59E0B',
      completed: '#3B82F6',
      cancelled: '#EF4444'
    }
    return colors[status] || '#6B7280'
  }

  function getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      all: 'ทั้งหมด',
      ride: 'เรียกรถ',
      delivery: 'ส่งของ',
      shopping: 'ซื้อของ',
      queue: 'จองคิว',
      moving: 'ขนย้าย',
      laundry: 'ซักผ้า'
    }
    return labels[category] || category
  }

  return {
    // State
    promos: readonly(promos),
    campaigns: readonly(campaigns),
    analytics: readonly(analytics),
    dashboardStats: readonly(dashboardStats),
    totalPromos: readonly(totalPromos),
    totalCampaigns: readonly(totalCampaigns),
    loading: readonly(loading),
    error: readonly(error),

    // Computed
    activePromos,
    inactivePromos,
    activeCampaigns,

    // Promo Methods
    fetchPromos,
    createPromo,
    updatePromo,
    togglePromoStatus,
    deletePromo,

    // Campaign Methods
    fetchCampaigns,
    createCampaign,
    updateCampaignStatus,
    getCampaignDetails,

    // Analytics Methods
    fetchDashboardStats,
    fetchPromoAnalytics,

    // Realtime
    subscribeToPromoChanges,

    // Helpers
    formatCurrency,
    formatDiscount,
    getStatusColor,
    getCategoryLabel
  }
}

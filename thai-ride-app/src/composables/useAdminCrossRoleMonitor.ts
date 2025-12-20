/**
 * useAdminCrossRoleMonitor - Admin Cross-Role Monitoring Composable
 * Feature: F174-F177 - Cross-Role Integration
 * Tables: cross_role_events, role_sync_status
 * Migration: 107_cross_role_events.sql
 * 
 * Provides admin functionality to monitor cross-role events,
 * sync status, and service breakdowns across all roles.
 */

import { ref, computed, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabase'
import { SERVICE_REGISTRY, type ServiceType, getAllServiceTypes } from '@/lib/serviceRegistry'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Types
export interface CrossRoleEvent {
  id: string
  event_type: string
  event_category: 'booking' | 'status_change' | 'location' | 'payment' | 'rating' | 'cancellation' | 'notification' | 'system'
  source_role: 'customer' | 'provider' | 'admin' | 'system'
  source_user_id: string | null
  target_role: 'customer' | 'provider' | 'admin' | 'system' | null
  target_user_id: string | null
  service_type: ServiceType | null
  request_id: string | null
  tracking_id: string | null
  event_data: Record<string, any>
  metadata: Record<string, any>
  processed: boolean
  created_at: string
}

export interface RoleSyncStatus {
  id: string
  service_type: ServiceType
  request_id: string
  tracking_id: string | null
  current_status: string
  previous_status: string | null
  customer_synced: boolean
  customer_synced_at: string | null
  customer_user_id: string | null
  provider_synced: boolean
  provider_synced_at: string | null
  provider_user_id: string | null
  admin_notified: boolean
  admin_notified_at: string | null
  last_known_lat: number | null
  last_known_lng: number | null
  location_updated_at: string | null
  sync_attempts: number
  last_sync_error: string | null
  created_at: string
  updated_at: string
}

export interface RoleSyncStats {
  service_type: string
  total_requests: number
  pending_requests: number
  active_requests: number
  completed_requests: number
  cancelled_requests: number
  customer_synced_count: number
  provider_synced_count: number
  admin_notified_count: number
  avg_sync_attempts: number
  sync_error_count: number
}

export interface ServiceBreakdown {
  service_type: string
  status: string
  count: number
  percentage: number
}

export interface OnlineProviderCount {
  service_type: string
  count: number
}

export function useAdminCrossRoleMonitor() {
  // State
  const roleStats = ref<RoleSyncStats[]>([])
  const recentEvents = ref<CrossRoleEvent[]>([])
  const serviceBreakdown = ref<ServiceBreakdown[]>([])
  const onlineProviders = ref<OnlineProviderCount[]>([])
  const syncStatuses = ref<RoleSyncStatus[]>([])
  
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // Realtime subscriptions
  const subscriptions: RealtimeChannel[] = []

  // Computed properties
  const totalActiveRequests = computed(() => {
    return roleStats.value.reduce((sum, stat) => sum + stat.active_requests, 0)
  })

  const totalPendingRequests = computed(() => {
    return roleStats.value.reduce((sum, stat) => sum + stat.pending_requests, 0)
  })

  const totalOnlineProviders = computed(() => {
    return onlineProviders.value.reduce((sum, p) => sum + p.count, 0)
  })

  const totalCompletedToday = computed(() => {
    return roleStats.value.reduce((sum, stat) => sum + stat.completed_requests, 0)
  })

  const totalCancelledToday = computed(() => {
    return roleStats.value.reduce((sum, stat) => sum + stat.cancelled_requests, 0)
  })

  const syncHealthPercentage = computed(() => {
    const total = roleStats.value.reduce((sum, stat) => sum + stat.total_requests, 0)
    const synced = roleStats.value.reduce((sum, stat) => sum + stat.customer_synced_count + stat.provider_synced_count, 0)
    const maxSynced = total * 2 // Both customer and provider should be synced
    return maxSynced > 0 ? Math.round((synced / maxSynced) * 100) : 100
  })

  const errorRate = computed(() => {
    const total = roleStats.value.reduce((sum, stat) => sum + stat.total_requests, 0)
    const errors = roleStats.value.reduce((sum, stat) => sum + stat.sync_error_count, 0)
    return total > 0 ? Math.round((errors / total) * 100) : 0
  })

  // Load role statistics
  async function loadRoleStats(hours: number = 24): Promise<RoleSyncStats[]> {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_role_sync_stats', { p_hours: hours })
      
      if (rpcError) throw rpcError
      
      roleStats.value = data || []
      return roleStats.value
    } catch (err: any) {
      error.value = err.message || 'Failed to load role stats'
      console.error('[CrossRoleMonitor] loadRoleStats error:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  // Load recent events
  async function loadRecentEvents(
    limit: number = 50,
    serviceType?: ServiceType,
    eventCategory?: string
  ): Promise<CrossRoleEvent[]> {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_recent_cross_role_events', {
          p_limit: limit,
          p_service_type: serviceType || null,
          p_event_category: eventCategory || null
        })
      
      if (rpcError) throw rpcError
      
      recentEvents.value = data || []
      return recentEvents.value
    } catch (err: any) {
      error.value = err.message || 'Failed to load recent events'
      console.error('[CrossRoleMonitor] loadRecentEvents error:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  // Get service breakdown
  async function getServiceBreakdown(hours: number = 24): Promise<ServiceBreakdown[]> {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_service_breakdown', { p_hours: hours })
      
      if (rpcError) throw rpcError
      
      serviceBreakdown.value = data || []
      return serviceBreakdown.value
    } catch (err: any) {
      error.value = err.message || 'Failed to load service breakdown'
      console.error('[CrossRoleMonitor] getServiceBreakdown error:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  // Load online providers count by service type
  async function loadOnlineProviders(): Promise<OnlineProviderCount[]> {
    try {
      const { data, error: queryError } = await supabase
        .from('service_providers')
        .select('provider_type')
        .eq('is_available', true)
        .eq('status', 'approved')
      
      if (queryError) throw queryError
      
      // Group by provider type and map to service type
      const counts: Record<string, number> = {}
      const providerTypeToService: Record<string, ServiceType> = {
        'driver': 'ride',
        'rider': 'delivery',
        'shopper': 'shopping',
        'queue_agent': 'queue',
        'mover': 'moving',
        'laundry_provider': 'laundry'
      }
      
      for (const provider of data || []) {
        const serviceType = providerTypeToService[provider.provider_type] || provider.provider_type
        counts[serviceType] = (counts[serviceType] || 0) + 1
      }
      
      onlineProviders.value = Object.entries(counts).map(([service_type, count]) => ({
        service_type,
        count
      }))
      
      return onlineProviders.value
    } catch (err: any) {
      console.error('[CrossRoleMonitor] loadOnlineProviders error:', err)
      return []
    }
  }

  // Load sync statuses for active requests
  async function loadSyncStatuses(
    serviceType?: ServiceType,
    statusFilter?: string
  ): Promise<RoleSyncStatus[]> {
    loading.value = true
    error.value = null
    
    try {
      let query = supabase
        .from('role_sync_status')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(100)
      
      if (serviceType) {
        query = query.eq('service_type', serviceType)
      }
      
      if (statusFilter) {
        query = query.eq('current_status', statusFilter)
      }
      
      const { data, error: queryError } = await query
      
      if (queryError) throw queryError
      
      syncStatuses.value = data || []
      return syncStatuses.value
    } catch (err: any) {
      error.value = err.message || 'Failed to load sync statuses'
      console.error('[CrossRoleMonitor] loadSyncStatuses error:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  // Subscribe to realtime events for all service types
  function subscribeToAllEvents(): void {
    // Unsubscribe from existing subscriptions
    unsubscribeAll()
    
    // Subscribe to cross_role_events
    const eventsChannel = supabase
      .channel('admin-cross-role-events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cross_role_events'
        },
        (payload) => {
          const newEvent = payload.new as CrossRoleEvent
          recentEvents.value = [newEvent, ...recentEvents.value.slice(0, 49)]
        }
      )
      .subscribe()
    
    subscriptions.push(eventsChannel)
    
    // Subscribe to role_sync_status changes
    const syncChannel = supabase
      .channel('admin-role-sync-status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'role_sync_status'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newStatus = payload.new as RoleSyncStatus
            syncStatuses.value = [newStatus, ...syncStatuses.value.slice(0, 99)]
          } else if (payload.eventType === 'UPDATE') {
            const updatedStatus = payload.new as RoleSyncStatus
            const index = syncStatuses.value.findIndex(s => s.id === updatedStatus.id)
            if (index !== -1) {
              syncStatuses.value[index] = updatedStatus
            }
          }
        }
      )
      .subscribe()
    
    subscriptions.push(syncChannel)
    
    // Subscribe to service provider availability changes
    const providerChannel = supabase
      .channel('admin-provider-availability')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'service_providers',
          filter: 'is_available=eq.true'
        },
        () => {
          // Reload online providers count
          loadOnlineProviders()
        }
      )
      .subscribe()
    
    subscriptions.push(providerChannel)
  }

  // Subscribe to specific service type events
  function subscribeToServiceType(serviceType: ServiceType): void {
    const tableName = SERVICE_REGISTRY[serviceType].tableName
    
    const channel = supabase
      .channel(`admin-${serviceType}-requests`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName
        },
        (payload) => {
          // Reload stats when requests change
          loadRoleStats()
          getServiceBreakdown()
        }
      )
      .subscribe()
    
    subscriptions.push(channel)
  }

  // Unsubscribe from all channels
  function unsubscribeAll(): void {
    for (const channel of subscriptions) {
      supabase.removeChannel(channel)
    }
    subscriptions.length = 0
  }

  // Log a cross-role event (for admin actions)
  async function logEvent(
    eventType: string,
    eventCategory: CrossRoleEvent['event_category'],
    eventData: Record<string, any> = {},
    options: {
      targetRole?: CrossRoleEvent['target_role']
      targetUserId?: string
      serviceType?: ServiceType
      requestId?: string
      trackingId?: string
      metadata?: Record<string, any>
    } = {}
  ): Promise<string | null> {
    try {
      const { data: userData } = await supabase.auth.getUser()
      
      const { data, error: rpcError } = await supabase
        .rpc('log_cross_role_event', {
          p_event_type: eventType,
          p_event_category: eventCategory,
          p_source_role: 'admin',
          p_source_user_id: userData.user?.id || null,
          p_target_role: options.targetRole || null,
          p_target_user_id: options.targetUserId || null,
          p_service_type: options.serviceType || null,
          p_request_id: options.requestId || null,
          p_tracking_id: options.trackingId || null,
          p_event_data: eventData,
          p_metadata: options.metadata || {}
        })
      
      if (rpcError) throw rpcError
      
      return data
    } catch (err: any) {
      console.error('[CrossRoleMonitor] logEvent error:', err)
      return null
    }
  }

  // Mark a role as synced
  async function markRoleSynced(
    serviceType: ServiceType,
    requestId: string,
    role: 'customer' | 'provider' | 'admin'
  ): Promise<boolean> {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('mark_role_synced', {
          p_service_type: serviceType,
          p_request_id: requestId,
          p_role: role
        })
      
      if (rpcError) throw rpcError
      
      return data === true
    } catch (err: any) {
      console.error('[CrossRoleMonitor] markRoleSynced error:', err)
      return false
    }
  }

  // Get summary for dashboard
  function getDashboardSummary() {
    return {
      totalActive: totalActiveRequests.value,
      totalPending: totalPendingRequests.value,
      totalOnline: totalOnlineProviders.value,
      completedToday: totalCompletedToday.value,
      cancelledToday: totalCancelledToday.value,
      syncHealth: syncHealthPercentage.value,
      errorRate: errorRate.value,
      byService: roleStats.value.map(stat => ({
        type: stat.service_type,
        displayName: SERVICE_REGISTRY[stat.service_type as ServiceType]?.displayNameTh || stat.service_type,
        color: SERVICE_REGISTRY[stat.service_type as ServiceType]?.color || '#666',
        active: stat.active_requests,
        pending: stat.pending_requests,
        completed: stat.completed_requests,
        cancelled: stat.cancelled_requests
      }))
    }
  }

  // Initialize monitoring
  async function initialize(): Promise<void> {
    await Promise.all([
      loadRoleStats(),
      loadRecentEvents(),
      getServiceBreakdown(),
      loadOnlineProviders()
    ])
    
    subscribeToAllEvents()
  }

  // Cleanup on unmount
  onUnmounted(() => {
    unsubscribeAll()
  })

  return {
    // State
    roleStats,
    recentEvents,
    serviceBreakdown,
    onlineProviders,
    syncStatuses,
    loading,
    error,
    
    // Computed
    totalActiveRequests,
    totalPendingRequests,
    totalOnlineProviders,
    totalCompletedToday,
    totalCancelledToday,
    syncHealthPercentage,
    errorRate,
    
    // Methods
    loadRoleStats,
    loadRecentEvents,
    getServiceBreakdown,
    loadOnlineProviders,
    loadSyncStatuses,
    subscribeToAllEvents,
    subscribeToServiceType,
    unsubscribeAll,
    logEvent,
    markRoleSynced,
    getDashboardSummary,
    initialize
  }
}

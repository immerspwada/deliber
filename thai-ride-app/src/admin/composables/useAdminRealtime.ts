/**
 * Admin Realtime Composable
 * =========================
 * Provides realtime subscriptions for admin views
 * Automatically updates data when changes occur in the database
 */

import { ref, onUnmounted } from 'vue'
import { supabase } from '../../lib/supabase'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

// Use generic type for channel to avoid Supabase type compatibility issues
type RealtimeChannelType = ReturnType<typeof supabase.channel>

export type ServiceTable = 
  | 'ride_requests'
  | 'delivery_requests'
  | 'shopping_requests'
  | 'queue_bookings'
  | 'moving_requests'
  | 'laundry_requests'
  | 'service_providers'
  | 'users'
  | 'user_wallets'
  | 'wallet_transactions'
  | 'topup_requests'
  | 'provider_withdrawals'

export interface RealtimeConfig {
  tables: ServiceTable[]
  onInsert?: (table: string, payload: any) => void
  onUpdate?: (table: string, payload: any) => void
  onDelete?: (table: string, payload: any) => void
  onChange?: (table: string, eventType: string, payload: any) => void
  debounceMs?: number
}

export function useAdminRealtime() {
  const channels = ref<RealtimeChannelType[]>([])
  const isConnected = ref(false)
  const lastUpdate = ref<Date | null>(null)
  const connectionStatus = ref<'connecting' | 'connected' | 'disconnected'>('disconnected')
  
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let pendingCallback: (() => void) | null = null

  /**
   * Subscribe to realtime changes for specified tables
   */
  function subscribe(config: RealtimeConfig): void {
    // Cleanup existing subscriptions
    unsubscribe()
    
    connectionStatus.value = 'connecting'
    const debounceMs = config.debounceMs ?? 500

    config.tables.forEach((tableName, index) => {
      const channelName = `admin_realtime_${tableName}_${Date.now()}_${index}`
      
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: tableName
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            console.log(`[Admin Realtime] ${tableName} ${payload.eventType}:`, payload)
            
            lastUpdate.value = new Date()
            
            // Call specific event handlers
            if (payload.eventType === 'INSERT' && config.onInsert) {
              config.onInsert(tableName, payload.new)
            } else if (payload.eventType === 'UPDATE' && config.onUpdate) {
              config.onUpdate(tableName, payload.new)
            } else if (payload.eventType === 'DELETE' && config.onDelete) {
              config.onDelete(tableName, payload.old)
            }
            
            // Call generic onChange handler with debounce
            if (config.onChange) {
              if (debounceTimer) {
                clearTimeout(debounceTimer)
              }
              
              pendingCallback = () => {
                config.onChange!(tableName, payload.eventType, payload)
              }
              
              debounceTimer = setTimeout(() => {
                if (pendingCallback) {
                  pendingCallback()
                  pendingCallback = null
                }
              }, debounceMs)
            }
          }
        )
        .subscribe((status) => {
          console.log(`[Admin Realtime] ${tableName} subscription:`, status)
          if (status === 'SUBSCRIBED') {
            isConnected.value = true
            connectionStatus.value = 'connected'
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            connectionStatus.value = 'disconnected'
          }
        })

      channels.value.push(channel)
    })

    console.log(`[Admin Realtime] Subscribed to ${config.tables.length} tables`)
  }

  /**
   * Subscribe to all order-related tables
   */
  function subscribeToOrders(onChange: (table: string, eventType: string, payload: any) => void): void {
    subscribe({
      tables: [
        'ride_requests',
        'delivery_requests',
        'shopping_requests',
        'queue_bookings',
        'moving_requests',
        'laundry_requests'
      ],
      onChange,
      debounceMs: 300
    })
  }

  /**
   * Subscribe to provider-related tables
   */
  function subscribeToProviders(onChange: (table: string, eventType: string, payload: any) => void): void {
    subscribe({
      tables: ['service_providers'],
      onChange,
      debounceMs: 500
    })
  }

  /**
   * Subscribe to customer/user-related tables
   */
  function subscribeToCustomers(onChange: (table: string, eventType: string, payload: any) => void): void {
    subscribe({
      tables: ['users'],
      onChange,
      debounceMs: 500
    })
  }

  /**
   * Subscribe to financial tables
   */
  function subscribeToFinancials(onChange: (table: string, eventType: string, payload: any) => void): void {
    subscribe({
      tables: [
        'user_wallets',
        'wallet_transactions',
        'topup_requests',
        'provider_withdrawals'
      ],
      onChange,
      debounceMs: 500
    })
  }

  /**
   * Unsubscribe from all channels
   */
  function unsubscribe(): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    pendingCallback = null
    
    channels.value.forEach(channel => {
      supabase.removeChannel(channel)
    })
    channels.value = []
    isConnected.value = false
    connectionStatus.value = 'disconnected'
    
    console.log('[Admin Realtime] Unsubscribed from all channels')
  }

  /**
   * Get human-readable event label
   */
  function getEventLabel(eventType: string): string {
    const labels: Record<string, string> = {
      INSERT: 'เพิ่มใหม่',
      UPDATE: 'อัพเดท',
      DELETE: 'ลบ'
    }
    return labels[eventType] || eventType
  }

  /**
   * Get human-readable table label
   */
  function getTableLabel(tableName: string): string {
    const labels: Record<string, string> = {
      ride_requests: 'เรียกรถ',
      delivery_requests: 'ส่งของ',
      shopping_requests: 'ซื้อของ',
      queue_bookings: 'จองคิว',
      moving_requests: 'ขนย้าย',
      laundry_requests: 'ซักผ้า',
      service_providers: 'ผู้ให้บริการ',
      users: 'ผู้ใช้',
      user_wallets: 'กระเป๋าเงิน',
      wallet_transactions: 'ธุรกรรม',
      topup_requests: 'เติมเงิน',
      provider_withdrawals: 'ถอนเงิน'
    }
    return labels[tableName] || tableName
  }

  // Auto cleanup on unmount
  onUnmounted(() => {
    unsubscribe()
  })

  return {
    // State
    channels,
    isConnected,
    lastUpdate,
    connectionStatus,
    
    // Methods
    subscribe,
    subscribeToOrders,
    subscribeToProviders,
    subscribeToCustomers,
    subscribeToFinancials,
    unsubscribe,
    
    // Helpers
    getEventLabel,
    getTableLabel
  }
}

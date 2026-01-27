import { ref, onUnmounted } from 'vue';
import { supabase } from '@/lib/supabase';
import { useDebounceFn } from '@vueuse/core';

export interface OrderRealtimeEvent {
  orderId: string;
  trackingId?: string;
  status?: string;
  providerId?: string;
  eventType: 'created' | 'updated' | 'status_changed' | 'provider_assigned' | 'deleted';
}

export interface OrderRealtimeHandlers {
  onOrderCreated?: (order: any) => void;
  onOrderUpdated?: (order: any) => void;
  onOrderStatusChanged?: (orderId: string, newStatus: string, oldStatus?: string) => void;
  onProviderAssigned?: (orderId: string, providerId: string) => void;
  onOrderDeleted?: (orderId: string) => void;
}

export function useRealtimeOrder() {
  const isConnected = ref(false);
  const lastUpdate = ref<Date | null>(null);
  const channel = ref<any>(null);
  const handlers = ref<OrderRealtimeHandlers>({});

  // Debounced event processor to prevent UI thrashing
  const processEvent = useDebounceFn((event: OrderRealtimeEvent) => {
    lastUpdate.value = new Date();

    switch (event.eventType) {
      case 'created':
        handlers.value.onOrderCreated?.(event);
        break;
      case 'updated':
        handlers.value.onOrderUpdated?.(event);
        break;
      case 'status_changed':
        handlers.value.onOrderStatusChanged?.(
          event.orderId,
          event.status || '',
          undefined
        );
        break;
      case 'provider_assigned':
        handlers.value.onProviderAssigned?.(event.orderId, event.providerId || '');
        break;
      case 'deleted':
        handlers.value.onOrderDeleted?.(event.orderId);
        break;
    }
  }, 300);

  /**
   * Subscribe to real-time order updates
   */
  function subscribe(eventHandlers: OrderRealtimeHandlers) {
    handlers.value = eventHandlers;

    // Subscribe to all order-related tables
    channel.value = supabase
      .channel('admin-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_requests',
        },
        (payload) => {
          handleDatabaseChange('ride_requests', payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_requests',
        },
        (payload) => {
          handleDatabaseChange('delivery_requests', payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopping_requests',
        },
        (payload) => {
          handleDatabaseChange('shopping_requests', payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'moving_requests',
        },
        (payload) => {
          handleDatabaseChange('moving_requests', payload);
        }
      )
      .subscribe((status) => {
        isConnected.value = status === 'SUBSCRIBED';
        console.log('[useRealtimeOrder] Subscription status:', status);
      });
  }

  /**
   * Handle database change events
   */
  function handleDatabaseChange(table: string, payload: any) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    console.log('[useRealtimeOrder] Database change:', {
      table,
      eventType,
      recordId: newRecord?.id || oldRecord?.id,
    });

    const record = newRecord || oldRecord;
    if (!record) return;

    // Determine event type
    let realtimeEventType: OrderRealtimeEvent['eventType'] = 'updated';

    if (eventType === 'INSERT') {
      realtimeEventType = 'created';
    } else if (eventType === 'DELETE') {
      realtimeEventType = 'deleted';
    } else if (eventType === 'UPDATE') {
      // Check if status changed
      if (oldRecord && newRecord && oldRecord.status !== newRecord.status) {
        realtimeEventType = 'status_changed';
      }
      // Check if provider assigned
      else if (
        oldRecord &&
        newRecord &&
        !oldRecord.provider_id &&
        newRecord.provider_id
      ) {
        realtimeEventType = 'provider_assigned';
      } else {
        realtimeEventType = 'updated';
      }
    }

    // Process event
    processEvent({
      orderId: record.id,
      trackingId: record.tracking_id,
      status: newRecord?.status,
      providerId: newRecord?.provider_id,
      eventType: realtimeEventType,
    });
  }

  /**
   * Unsubscribe from real-time updates
   */
  function unsubscribe() {
    if (channel.value) {
      supabase.removeChannel(channel.value);
      channel.value = null;
      isConnected.value = false;
      console.log('[useRealtimeOrder] Unsubscribed');
    }
  }

  // Auto cleanup on unmount
  onUnmounted(() => {
    unsubscribe();
  });

  return {
    isConnected,
    lastUpdate,
    subscribe,
    unsubscribe,
  };
}

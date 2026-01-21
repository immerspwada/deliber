import { ref, computed, onUnmounted } from 'vue';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { 
  createAdminError, 
  AdminErrorCode, 
  createErrorContext,
  handleSupabaseError,
  type AdminError 
} from '@/admin/utils/errors';

export interface Provider {
  id: string;
  full_name: string;
  phone: string;
  vehicle_type: string | null;
  vehicle_plate: string | null;
  rating: number | null;
  total_jobs: number;
  status: string;
  is_online: boolean;
  current_location: {
    lat: number | null;
    lng: number | null;
    updated_at: string | null;
  };
}

export interface ReassignmentHistory {
  id: string;
  order_id: string;
  order_type: string;
  old_provider_id: string | null;
  old_provider_name: string | null;
  new_provider_id: string;
  new_provider_name: string;
  reassigned_by: string;
  admin_name: string;
  reason: string | null;
  notes: string | null;
  created_at: string;
}

export interface ReassignmentResult {
  success: boolean;
  order_id?: string;
  order_type?: string;
  old_provider_id?: string | null;
  new_provider_id?: string;
  reassigned_by?: string;
  reassigned_at?: string;
  error?: string;
  error_detail?: string;
}

export function useOrderReassignment() {
  const isLoading = ref(false);
  const error = ref<AdminError | null>(null);
  const availableProviders = ref<Provider[]>([]);
  const reassignmentHistory = ref<ReassignmentHistory[]>([]);
  
  // Realtime subscriptions
  let providersChannel: RealtimeChannel | null = null;
  let reassignmentChannel: RealtimeChannel | null = null;

  // Retry configuration for network resilience
  // Custom retry wrapper that understands AdminError codes
  async function retryWithAdminError<T>(
    fn: () => Promise<T>,
    _context: string
  ): Promise<T> {
    const maxAttempts = 3;
    const initialDelay = 1000;
    const backoffMultiplier = 2;
    const maxDelay = 8000;
    
    let lastError: unknown;
    let delay = initialDelay;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error: unknown) {
        lastError = error;

        // Check if error is retryable (network errors only)
        const isRetryable = 
          error instanceof Error &&
          error.name === 'AdminError' &&
          (
            (error as AdminError).code === AdminErrorCode.NETWORK_TIMEOUT ||
            (error as AdminError).code === AdminErrorCode.NETWORK_UNAVAILABLE
          );

        if (!isRetryable || attempt === maxAttempts) {
          throw error;
        }

        // Log retry attempt
        console.warn(
          `[useOrderReassignment] Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`,
          { context: _context, error: error instanceof Error ? error.message : String(error) }
        );

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay));

        // Calculate next delay with exponential backoff
        delay = Math.min(delay * backoffMultiplier, maxDelay);
      }
    }

    throw lastError;
  }

  /**
   * Get list of available providers for reassignment
   */
  async function getAvailableProviders(serviceType?: string): Promise<Provider[]> {
    isLoading.value = true;
    error.value = null;

    try {
      // Wrap RPC call with retry logic for network resilience
      const data = await retryWithAdminError(async () => {
        const { data, error: rpcError } = await supabase.rpc('get_available_providers', {
          p_service_type: serviceType || null,
          p_limit: 100,
        });

        if (rpcError) {
          throw handleSupabaseError(
            rpcError,
            'get_available_providers',
            { metadata: { serviceType } }
          );
        }

        // Check if no providers available
        if (!data || data.length === 0) {
          throw createAdminError(
            AdminErrorCode.NO_AVAILABLE_PROVIDERS,
            createErrorContext('get_available_providers', {
              metadata: { serviceType }
            })
          );
        }

        return data;
      }, 'get_available_providers');

      availableProviders.value = data || [];
      return availableProviders.value;
    } catch (err) {
      // If it's already an AdminError, use it
      if (err instanceof Error && err.name === 'AdminError') {
        error.value = err as AdminError;
      } else {
        // Otherwise, wrap it in a generic admin error
        error.value = createAdminError(
          AdminErrorCode.ADMIN_DATA_FETCH_FAILED,
          createErrorContext('get_available_providers', {
            metadata: { serviceType }
          }),
          err
        );
      }
      
      console.error('[useOrderReassignment] getAvailableProviders error:', error.value.toJSON());
      return [];
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Reassign an order to a different provider
   */
  async function reassignOrder(
    orderId: string,
    orderType: string,
    newProviderId: string,
    reason?: string,
    notes?: string
  ): Promise<ReassignmentResult> {
    isLoading.value = true;
    error.value = null;

    try {
      // Validate inputs
      if (!orderId || !orderId.trim()) {
        throw createAdminError(
          AdminErrorCode.INVALID_ORDER_ID,
          createErrorContext('reassign_order', {
            orderId,
            providerId: newProviderId,
            metadata: { orderType }
          })
        );
      }

      if (!newProviderId || !newProviderId.trim()) {
        throw createAdminError(
          AdminErrorCode.INVALID_PROVIDER_ID,
          createErrorContext('reassign_order', {
            orderId,
            providerId: newProviderId,
            metadata: { orderType }
          })
        );
      }

      // Wrap RPC call with retry logic for network resilience
      const result = await retryWithAdminError(async () => {
        console.log('[useOrderReassignment] Calling reassign_order with:', {
          p_order_id: orderId,
          p_order_type: orderType,
          p_new_provider_id: newProviderId,
          p_reason: reason || null,
          p_notes: notes || null,
        });

        const { data, error: rpcError } = await supabase.rpc('reassign_order', {
          p_order_id: orderId,
          p_order_type: orderType,
          p_new_provider_id: newProviderId,
          p_reason: reason || null,
          p_notes: notes || null,
        });

        console.log('[useOrderReassignment] RPC response:', { data, error: rpcError });

        if (rpcError) {
          console.error('[useOrderReassignment] RPC error:', rpcError);
          throw handleSupabaseError(
            rpcError,
            'reassign_order',
            {
              orderId,
              providerId: newProviderId,
              metadata: { orderType, reason, notes }
            }
          );
        }

        const result = data as ReassignmentResult;
        console.log('[useOrderReassignment] Parsed result:', result);

        // Check if reassignment failed at business logic level
        if (!result.success) {
          console.error('[useOrderReassignment] Business logic error:', {
            error: result.error,
            error_detail: result.error_detail,
            fullResult: result
          });
          // Map specific business errors
          let errorCode = AdminErrorCode.ORDER_REASSIGNMENT_FAILED;
          
          if (result.error?.toLowerCase().includes('already assigned')) {
            errorCode = AdminErrorCode.PROVIDER_ALREADY_ASSIGNED;
          } else if (result.error?.toLowerCase().includes('invalid status')) {
            errorCode = AdminErrorCode.INVALID_ORDER_STATUS;
          }

          throw createAdminError(
            errorCode,
            createErrorContext('reassign_order', {
              orderId,
              providerId: newProviderId,
              metadata: { 
                orderType, 
                reason, 
                notes,
                businessError: result.error,
                errorDetail: result.error_detail
              }
            })
          );
        }

        return result;
      }, 'reassign_order');

      return result;
    } catch (err) {
      // If it's already an AdminError, use it
      if (err instanceof Error && err.name === 'AdminError') {
        error.value = err as AdminError;
      } else {
        // Otherwise, wrap it in a generic reassignment error
        error.value = createAdminError(
          AdminErrorCode.ORDER_REASSIGNMENT_FAILED,
          createErrorContext('reassign_order', {
            orderId,
            providerId: newProviderId,
            metadata: { orderType, reason, notes }
          }),
          err
        );
      }

      console.error('[useOrderReassignment] reassignOrder error:', error.value.toJSON());
      return {
        success: false,
        error: error.value.getUserMessage(),
        error_detail: error.value.message,
      };
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Get reassignment history for an order or provider
   */
  async function getReassignmentHistory(
    orderId?: string,
    providerId?: string,
    limit = 50,
    offset = 0
  ): Promise<ReassignmentHistory[]> {
    isLoading.value = true;
    error.value = null;

    try {
      const { data, error: rpcError } = await supabase.rpc('get_reassignment_history', {
        p_order_id: orderId || null,
        p_provider_id: providerId || null,
        p_limit: limit,
        p_offset: offset,
      });

      if (rpcError) {
        throw handleSupabaseError(
          rpcError,
          'get_reassignment_history',
          {
            orderId,
            providerId,
            metadata: { limit, offset }
          }
        );
      }

      reassignmentHistory.value = data || [];
      return reassignmentHistory.value;
    } catch (err) {
      // If it's already an AdminError, use it
      if (err instanceof Error && err.name === 'AdminError') {
        error.value = err as AdminError;
      } else {
        // Otherwise, wrap it in a generic admin error
        error.value = createAdminError(
          AdminErrorCode.ADMIN_DATA_FETCH_FAILED,
          createErrorContext('get_reassignment_history', {
            orderId,
            providerId,
            metadata: { limit, offset }
          }),
          err
        );
      }

      console.error('[useOrderReassignment] getReassignmentHistory error:', error.value.toJSON());
      return [];
    } finally {
      isLoading.value = false;
    }
  }

  // Computed properties
  const onlineProviders = computed(() =>
    availableProviders.value.filter((p) => p.is_online)
  );

  const offlineProviders = computed(() =>
    availableProviders.value.filter((p) => !p.is_online)
  );

  const topRatedProviders = computed(() =>
    [...availableProviders.value]
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 10)
  );

  /**
   * Subscribe to realtime provider status updates
   */
  function subscribeToProviderUpdates() {
    // Unsubscribe from existing channel if any
    if (providersChannel) {
      supabase.removeChannel(providersChannel);
    }

    // Subscribe to providers_v2 table changes
    providersChannel = supabase
      .channel('providers-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'providers_v2',
          filter: 'status=eq.approved'
        },
        (payload) => {
          console.log('[useOrderReassignment] Provider update:', payload);
          
          // Handle different event types
          if (payload.eventType === 'UPDATE') {
            const updatedProvider = payload.new as any;
            
            // Update provider in list if exists
            const index = availableProviders.value.findIndex(p => p.id === updatedProvider.id);
            if (index !== -1) {
              // Refresh the provider data
              availableProviders.value[index] = {
                ...availableProviders.value[index],
                is_online: updatedProvider.is_online,
                is_available: updatedProvider.is_available,
                current_location: {
                  lat: updatedProvider.current_lat,
                  lng: updatedProvider.current_lng,
                  updated_at: updatedProvider.location_updated_at
                }
              };
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[useOrderReassignment] Providers subscription status:', status);
      });
  }

  /**
   * Subscribe to realtime reassignment updates
   */
  function subscribeToReassignmentUpdates(orderId?: string) {
    // Unsubscribe from existing channel if any
    if (reassignmentChannel) {
      supabase.removeChannel(reassignmentChannel);
    }

    // Subscribe to job_reassignment_log table changes
    const channelConfig: any = {
      event: 'INSERT',
      schema: 'public',
      table: 'job_reassignment_log'
    };

    // Add filter if orderId provided
    if (orderId) {
      channelConfig.filter = `job_id=eq.${orderId}`;
    }

    reassignmentChannel = supabase
      .channel('reassignment-realtime')
      .on('postgres_changes', channelConfig, (payload) => {
        console.log('[useOrderReassignment] Reassignment update:', payload);
        
        // Add new reassignment to history
        const newReassignment = payload.new as any;
        reassignmentHistory.value.unshift({
          id: newReassignment.id,
          order_id: newReassignment.job_id,
          order_type: newReassignment.job_type,
          old_provider_id: newReassignment.previous_provider_id,
          old_provider_name: null, // Will be populated by refresh
          new_provider_id: newReassignment.new_provider_id,
          new_provider_name: null, // Will be populated by refresh
          reassigned_by: newReassignment.reassigned_by,
          admin_name: null, // Will be populated by refresh
          reason: newReassignment.reassign_reason,
          notes: newReassignment.reassign_notes,
          created_at: newReassignment.created_at
        });
      })
      .subscribe((status) => {
        console.log('[useOrderReassignment] Reassignment subscription status:', status);
      });
  }

  /**
   * Unsubscribe from all realtime channels
   */
  function unsubscribeAll() {
    if (providersChannel) {
      supabase.removeChannel(providersChannel);
      providersChannel = null;
    }
    if (reassignmentChannel) {
      supabase.removeChannel(reassignmentChannel);
      reassignmentChannel = null;
    }
  }

  // Cleanup on unmount
  onUnmounted(() => {
    unsubscribeAll();
  });

  return {
    // State
    isLoading,
    error,
    availableProviders,
    reassignmentHistory,

    // Computed
    onlineProviders,
    offlineProviders,
    topRatedProviders,

    // Methods
    getAvailableProviders,
    reassignOrder,
    getReassignmentHistory,
    
    // Realtime methods
    subscribeToProviderUpdates,
    subscribeToReassignmentUpdates,
    unsubscribeAll,
  };
}

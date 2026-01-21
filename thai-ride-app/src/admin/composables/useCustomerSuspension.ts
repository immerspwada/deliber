import { ref } from 'vue';
import { supabase } from '@/lib/supabase';

export interface SuspensionData {
  customerId: string;
  reason: string;
}

export function useCustomerSuspension() {
  const loading = ref(false);
  const error = ref<string | null>(null);

  /**
   * Suspend a single customer
   */
  const suspendCustomer = async (customerId: string, reason: string) => {
    loading.value = true;
    error.value = null;

    try {
      const { data, error: rpcError } = await supabase.rpc('admin_suspend_customer', {
        p_customer_id: customerId,
        p_reason: reason,
      });

      if (rpcError) throw rpcError;

      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to suspend customer';
      error.value = message;
      throw new Error(message);
    } finally {
      loading.value = false;
    }
  };

  /**
   * Unsuspend a customer
   */
  const unsuspendCustomer = async (customerId: string) => {
    loading.value = true;
    error.value = null;

    try {
      const { data, error: rpcError } = await supabase.rpc('admin_unsuspend_customer', {
        p_customer_id: customerId,
      });

      if (rpcError) throw rpcError;

      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to unsuspend customer';
      error.value = message;
      throw new Error(message);
    } finally {
      loading.value = false;
    }
  };

  /**
   * Bulk suspend multiple customers
   */
  const bulkSuspendCustomers = async (customerIds: string[], reason: string) => {
    loading.value = true;
    error.value = null;

    try {
      const { data, error: rpcError } = await supabase.rpc('admin_bulk_suspend_customers', {
        p_customer_ids: customerIds,
        p_reason: reason,
      });

      if (rpcError) throw rpcError;

      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to bulk suspend customers';
      error.value = message;
      throw new Error(message);
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    error,
    suspendCustomer,
    unsuspendCustomer,
    bulkSuspendCustomers,
  };
}

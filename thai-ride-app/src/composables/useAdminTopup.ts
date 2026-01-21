import { ref, computed } from 'vue';
import { supabase } from '@/lib/supabase';
import type { TopupRequest, TopupStats, TopupStatus } from '@/types/topup';
import { useErrorHandler } from '@/composables/useErrorHandler';

export function useAdminTopup() {
  const requests = ref<TopupRequest[]>([]);
  const stats = ref<TopupStats | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const searchQuery = ref('');
  const statusFilter = ref<TopupStatus | 'all'>('all');
  
  const { handle: handleError } = useErrorHandler();

  // Filtered requests
  const filteredRequests = computed(() => {
    let filtered = requests.value;

    // Filter by status
    if (statusFilter.value !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter.value);
    }

    // Filter by search
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter(r =>
        r.tracking_id?.toLowerCase().includes(query) ||
        r.user_name?.toLowerCase().includes(query) ||
        r.user_phone?.includes(query) ||
        r.user_member_uid?.toLowerCase().includes(query)
      );
    }

    return filtered;
  });

  // Count by status
  const pendingCount = computed(() => 
    requests.value.filter(r => r.status === 'pending').length
  );

  const approvedCount = computed(() => 
    requests.value.filter(r => r.status === 'approved').length
  );

  const rejectedCount = computed(() => 
    requests.value.filter(r => r.status === 'rejected').length
  );

  // Fetch all topup requests
  async function fetchRequests(status?: TopupStatus) {
    loading.value = true;
    error.value = null;

    try {
      const { data, error: fetchError } = await supabase.rpc(
        'admin_get_topup_requests_enhanced',
        {
          p_status: status || null,
          p_limit: 100,
          p_search: null
        }
      );

      if (fetchError) throw fetchError;

      requests.value = data || [];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
      error.value = message;
      handleError(err, 'fetchRequests');
    } finally {
      loading.value = false;
    }
  }

  // Fetch statistics
  async function fetchStats(dateFrom?: Date, dateTo?: Date) {
    try {
      const { data, error: statsError } = await supabase.rpc(
        'admin_get_topup_stats',
        {
          p_date_from: dateFrom?.toISOString() || null,
          p_date_to: dateTo?.toISOString() || null
        }
      );

      if (statsError) throw statsError;

      if (data && data.length > 0) {
        stats.value = data[0];
      }
    } catch (err) {
      handleError(err, 'fetchStats');
    }
  }

  // Approve topup request
  async function approveRequest(requestId: string, adminNote?: string, adminId?: string) {
    loading.value = true;
    error.value = null;

    try {
      const { data, error: approveError } = await supabase.rpc(
        'admin_approve_topup_request',
        {
          p_request_id: requestId,
          p_admin_note: adminNote || null,
          p_admin_id: adminId || null
        }
      );

      if (approveError) throw approveError;

      const result = data?.[0];
      if (!result?.success) {
        throw new Error(result?.message || 'ไม่สามารถอนุมัติคำขอได้');
      }

      // Refresh data
      await Promise.all([fetchRequests(), fetchStats()]);

      return { success: true, message: result.message };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการอนุมัติ';
      error.value = message;
      handleError(err, 'approveRequest');
      return { success: false, message };
    } finally {
      loading.value = false;
    }
  }

  // Reject topup request
  async function rejectRequest(requestId: string, adminNote: string, adminId?: string) {
    loading.value = true;
    error.value = null;

    try {
      const { data, error: rejectError } = await supabase.rpc(
        'admin_reject_topup_request',
        {
          p_request_id: requestId,
          p_admin_note: adminNote,
          p_admin_id: adminId || null
        }
      );

      if (rejectError) throw rejectError;

      const result = data?.[0];
      if (!result?.success) {
        throw new Error(result?.message || 'ไม่สามารถปฏิเสธคำขอได้');
      }

      // Refresh data
      await Promise.all([fetchRequests(), fetchStats()]);

      return { success: true, message: result.message };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการปฏิเสธ';
      error.value = message;
      handleError(err, 'rejectRequest');
      return { success: false, message };
    } finally {
      loading.value = false;
    }
  }

  // Subscribe to realtime updates
  function subscribeToUpdates() {
    const channel = supabase
      .channel('topup_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'topup_requests'
        },
        () => {
          // Refresh data when changes occur
          fetchRequests();
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  return {
    // State
    requests,
    filteredRequests,
    stats,
    loading,
    error,
    searchQuery,
    statusFilter,
    
    // Computed
    pendingCount,
    approvedCount,
    rejectedCount,
    
    // Methods
    fetchRequests,
    fetchStats,
    approveRequest,
    rejectRequest,
    subscribeToUpdates
  };
}

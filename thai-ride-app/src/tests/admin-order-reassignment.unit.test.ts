import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useOrderReassignment } from '@/admin/composables/useOrderReassignment';
import { supabase } from '@/lib/supabase';
import { AdminErrorCode } from '@/admin/utils/errors';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

describe('useOrderReassignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAvailableProviders', () => {
    it('should fetch available providers successfully', async () => {
      const mockProviders = [
        {
          id: 'provider-1',
          full_name: 'John Doe',
          phone: '0812345678',
          vehicle_type: 'sedan',
          vehicle_plate: 'ABC-1234',
          rating: 4.5,
          total_jobs: 100,
          status: 'approved',
          is_online: true,
          current_location: { lat: 13.7563, lng: 100.5018, updated_at: '2026-01-18T10:00:00Z' },
        },
        {
          id: 'provider-2',
          full_name: 'Jane Smith',
          phone: '0823456789',
          vehicle_type: 'motorcycle',
          vehicle_plate: 'XYZ-5678',
          rating: 4.8,
          total_jobs: 150,
          status: 'approved',
          is_online: false,
          current_location: { lat: 13.7563, lng: 100.5018, updated_at: '2026-01-18T09:00:00Z' },
        },
      ];

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockProviders,
        error: null,
      } as any);

      const { getAvailableProviders, availableProviders, onlineProviders, offlineProviders } =
        useOrderReassignment();

      const result = await getAvailableProviders('ride');

      expect(supabase.rpc).toHaveBeenCalledWith('get_available_providers', {
        p_service_type: 'ride',
        p_limit: 100,
      });
      expect(result).toEqual(mockProviders);
      expect(availableProviders.value).toEqual(mockProviders);
      expect(onlineProviders.value).toHaveLength(1);
      expect(offlineProviders.value).toHaveLength(1);
    });

    it('should handle errors when fetching providers', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: 'PGRST116' },
      } as any);

      const { getAvailableProviders, error } = useOrderReassignment();

      const result = await getAvailableProviders();

      expect(result).toEqual([]);
      expect(error.value).toBeTruthy();
      expect(error.value?.code).toBe(AdminErrorCode.ADMIN_DATA_FETCH_FAILED);
      expect(error.value?.context.action).toBe('get_available_providers');
      expect(error.value?.context.timestamp).toBeGreaterThan(0);
    });

    it('should handle no available providers', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null,
      } as any);

      const { getAvailableProviders, error } = useOrderReassignment();

      const result = await getAvailableProviders('ride');

      expect(result).toEqual([]);
      expect(error.value).toBeTruthy();
      expect(error.value?.code).toBe(AdminErrorCode.NO_AVAILABLE_PROVIDERS);
      expect(error.value?.getUserMessage()).toBe('ไม่มีผู้ให้บริการที่พร้อมรับงาน');
    });
  });

  describe('reassignOrder', () => {
    it('should reassign order successfully', async () => {
      const mockResult = {
        success: true,
        order_id: 'order-123',
        order_type: 'ride',
        old_provider_id: 'provider-1',
        new_provider_id: 'provider-2',
        reassigned_by: 'admin-1',
        reassigned_at: '2026-01-18T10:00:00Z',
      };

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockResult,
        error: null,
      } as any);

      const { reassignOrder } = useOrderReassignment();

      const result = await reassignOrder(
        'order-123',
        'ride',
        'provider-2',
        'provider_unavailable',
        'Provider requested change'
      );

      expect(supabase.rpc).toHaveBeenCalledWith('reassign_order', {
        p_order_id: 'order-123',
        p_order_type: 'ride',
        p_new_provider_id: 'provider-2',
        p_reason: 'provider_unavailable',
        p_notes: 'Provider requested change',
      });
      expect(result).toEqual(mockResult);
      expect(result.success).toBe(true);
    });

    it('should handle reassignment failure', async () => {
      const mockResult = {
        success: false,
        error: 'Provider is not approved',
      };

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockResult,
        error: null,
      } as any);

      const { reassignOrder, error } = useOrderReassignment();

      const result = await reassignOrder('order-123', 'ride', 'provider-2');

      expect(result.success).toBe(false);
      expect(error.value).toBeTruthy();
      expect(error.value?.code).toBe(AdminErrorCode.ORDER_REASSIGNMENT_FAILED);
      expect(error.value?.context.orderId).toBe('order-123');
      expect(error.value?.context.providerId).toBe('provider-2');
    });

    it('should handle database errors', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'RPC function error', code: 'PGRST301' },
      } as any);

      const { reassignOrder, error } = useOrderReassignment();

      const result = await reassignOrder('order-123', 'ride', 'provider-2');

      expect(result.success).toBe(false);
      expect(error.value).toBeTruthy();
      expect(error.value?.code).toBe(AdminErrorCode.INSUFFICIENT_ADMIN_PERMISSIONS);
      expect(error.value?.getUserMessage()).toContain('สิทธิ์');
    });

    it('should validate order ID', async () => {
      const { reassignOrder, error } = useOrderReassignment();

      const result = await reassignOrder('', 'ride', 'provider-2');

      expect(result.success).toBe(false);
      expect(error.value).toBeTruthy();
      expect(error.value?.code).toBe(AdminErrorCode.INVALID_ORDER_ID);
      expect(error.value?.getUserMessage()).toBe('รหัสคำสั่งซื้อไม่ถูกต้อง');
    });

    it('should validate provider ID', async () => {
      const { reassignOrder, error } = useOrderReassignment();

      const result = await reassignOrder('order-123', 'ride', '');

      expect(result.success).toBe(false);
      expect(error.value).toBeTruthy();
      expect(error.value?.code).toBe(AdminErrorCode.INVALID_PROVIDER_ID);
      expect(error.value?.getUserMessage()).toBe('รหัสผู้ให้บริการไม่ถูกต้อง');
    });

    it('should detect provider already assigned error', async () => {
      const mockResult = {
        success: false,
        error: 'Provider already assigned to this order',
      };

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockResult,
        error: null,
      } as any);

      const { reassignOrder, error } = useOrderReassignment();

      const result = await reassignOrder('order-123', 'ride', 'provider-2');

      expect(result.success).toBe(false);
      expect(error.value).toBeTruthy();
      expect(error.value?.code).toBe(AdminErrorCode.PROVIDER_ALREADY_ASSIGNED);
      expect(error.value?.getUserMessage()).toBe('ผู้ให้บริการนี้ได้รับงานแล้ว');
    });

    it('should detect invalid order status error', async () => {
      const mockResult = {
        success: false,
        error: 'Invalid status for reassignment',
      };

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockResult,
        error: null,
      } as any);

      const { reassignOrder, error } = useOrderReassignment();

      const result = await reassignOrder('order-123', 'ride', 'provider-2');

      expect(result.success).toBe(false);
      expect(error.value).toBeTruthy();
      expect(error.value?.code).toBe(AdminErrorCode.INVALID_ORDER_STATUS);
      expect(error.value?.getUserMessage()).toBe('สถานะคำสั่งซื้อไม่ถูกต้อง');
    });
  });

  describe('getReassignmentHistory', () => {
    it('should fetch reassignment history successfully', async () => {
      const mockHistory = [
        {
          id: 'reassignment-1',
          order_id: 'order-123',
          order_type: 'ride',
          old_provider_id: 'provider-1',
          old_provider_name: 'John Doe',
          new_provider_id: 'provider-2',
          new_provider_name: 'Jane Smith',
          reassigned_by: 'admin-1',
          admin_name: 'Admin User',
          reason: 'provider_unavailable',
          notes: 'Provider requested change',
          created_at: '2026-01-18T10:00:00Z',
        },
      ];

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockHistory,
        error: null,
      } as any);

      const { getReassignmentHistory, reassignmentHistory } = useOrderReassignment();

      const result = await getReassignmentHistory('order-123');

      expect(supabase.rpc).toHaveBeenCalledWith('get_reassignment_history', {
        p_order_id: 'order-123',
        p_provider_id: null,
        p_limit: 50,
        p_offset: 0,
      });
      expect(result).toEqual(mockHistory);
      expect(reassignmentHistory.value).toEqual(mockHistory);
    });

    it('should handle errors when fetching history', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Permission denied', code: 'PGRST301' },
      } as any);

      const { getReassignmentHistory, error } = useOrderReassignment();

      const result = await getReassignmentHistory();

      expect(result).toEqual([]);
      expect(error.value).toBeTruthy();
      expect(error.value?.code).toBe(AdminErrorCode.INSUFFICIENT_ADMIN_PERMISSIONS);
      expect(error.value?.context.action).toBe('get_reassignment_history');
    });
  });

  describe('computed properties', () => {
    it('should filter online and offline providers correctly', async () => {
      const mockProviders = [
        {
          id: 'provider-1',
          full_name: 'Online Provider',
          phone: '0812345678',
          vehicle_type: 'sedan',
          vehicle_plate: 'ABC-1234',
          rating: 4.5,
          total_jobs: 100,
          status: 'approved',
          is_online: true,
          current_location: { lat: 13.7563, lng: 100.5018, updated_at: '2026-01-18T10:00:00Z' },
        },
        {
          id: 'provider-2',
          full_name: 'Offline Provider',
          phone: '0823456789',
          vehicle_type: 'motorcycle',
          vehicle_plate: 'XYZ-5678',
          rating: 4.8,
          total_jobs: 150,
          status: 'approved',
          is_online: false,
          current_location: { lat: 13.7563, lng: 100.5018, updated_at: '2026-01-18T09:00:00Z' },
        },
      ];

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockProviders,
        error: null,
      } as any);

      const { getAvailableProviders, onlineProviders, offlineProviders } = useOrderReassignment();

      await getAvailableProviders();

      expect(onlineProviders.value).toHaveLength(1);
      expect(onlineProviders.value[0].full_name).toBe('Online Provider');
      expect(offlineProviders.value).toHaveLength(1);
      expect(offlineProviders.value[0].full_name).toBe('Offline Provider');
    });

    it('should sort top rated providers correctly', async () => {
      const mockProviders = [
        {
          id: 'provider-1',
          full_name: 'Low Rated',
          phone: '0812345678',
          vehicle_type: 'sedan',
          vehicle_plate: 'ABC-1234',
          rating: 3.5,
          total_jobs: 100,
          status: 'approved',
          is_online: true,
          current_location: { lat: 13.7563, lng: 100.5018, updated_at: '2026-01-18T10:00:00Z' },
        },
        {
          id: 'provider-2',
          full_name: 'High Rated',
          phone: '0823456789',
          vehicle_type: 'motorcycle',
          vehicle_plate: 'XYZ-5678',
          rating: 4.9,
          total_jobs: 150,
          status: 'approved',
          is_online: true,
          current_location: { lat: 13.7563, lng: 100.5018, updated_at: '2026-01-18T09:00:00Z' },
        },
      ];

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockProviders,
        error: null,
      } as any);

      const { getAvailableProviders, topRatedProviders } = useOrderReassignment();

      await getAvailableProviders();

      expect(topRatedProviders.value[0].full_name).toBe('High Rated');
      expect(topRatedProviders.value[1].full_name).toBe('Low Rated');
    });
  });

  describe('retry logic', () => {
    it('should retry on network timeout errors', async () => {
      const mockProviders = [
        {
          id: 'provider-1',
          full_name: 'John Doe',
          phone: '0812345678',
          vehicle_type: 'sedan',
          vehicle_plate: 'ABC-1234',
          rating: 4.5,
          total_jobs: 100,
          status: 'approved',
          is_online: true,
          current_location: { lat: 13.7563, lng: 100.5018, updated_at: '2026-01-18T10:00:00Z' },
        },
      ];

      // First two calls fail with timeout, third succeeds
      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Connection timeout', code: 'TIMEOUT' },
        } as any)
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Connection timeout', code: 'TIMEOUT' },
        } as any)
        .mockResolvedValueOnce({
          data: mockProviders,
          error: null,
        } as any);

      const { getAvailableProviders } = useOrderReassignment();

      const result = await getAvailableProviders('ride');

      expect(supabase.rpc).toHaveBeenCalledTimes(3);
      expect(result).toEqual(mockProviders);
    });

    it('should retry on 503 server errors', async () => {
      const mockResult = {
        success: true,
        order_id: 'order-123',
        order_type: 'ride',
        new_provider_id: 'provider-2',
        reassigned_by: 'admin-1',
        reassigned_at: '2026-01-18T10:00:00Z',
      };

      // First call fails with 503, second succeeds
      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Service unavailable', code: '503' },
        } as any)
        .mockResolvedValueOnce({
          data: mockResult,
          error: null,
        } as any);

      const { reassignOrder } = useOrderReassignment();

      const result = await reassignOrder('order-123', 'ride', 'provider-2');

      expect(supabase.rpc).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });

    it('should NOT retry on validation errors (400)', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Invalid input', code: '400' },
      } as any);

      const composable = useOrderReassignment();

      await composable.getAvailableProviders('ride');

      // Should only call once (no retry)
      expect(supabase.rpc).toHaveBeenCalledTimes(1);
      expect(composable.error.value).toBeTruthy();
    });

    it('should NOT retry on authentication errors (401)', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Unauthorized', code: 'PGRST301' },
      } as any);

      const { reassignOrder, error } = useOrderReassignment();

      await reassignOrder('order-123', 'ride', 'provider-2');

      // Should only call once (no retry)
      expect(supabase.rpc).toHaveBeenCalledTimes(1);
      expect(error.value).toBeTruthy();
      expect(error.value?.code).toBe(AdminErrorCode.INSUFFICIENT_ADMIN_PERMISSIONS);
    });

    it('should NOT retry on permission errors (403)', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Permission denied', code: 'PGRST301' },
      } as any);

      const { getAvailableProviders, error } = useOrderReassignment();

      await getAvailableProviders();

      // Should only call once (no retry)
      expect(supabase.rpc).toHaveBeenCalledTimes(1);
      expect(error.value).toBeTruthy();
    });

    it('should exhaust retries after maxAttempts', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Network error', code: 'NETWORK_ERROR' },
      } as any);

      const { getAvailableProviders, error } = useOrderReassignment();

      await getAvailableProviders('ride');

      // Should call 3 times (initial + 2 retries)
      expect(supabase.rpc).toHaveBeenCalledTimes(3);
      expect(error.value).toBeTruthy();
    });

    it('should call onRetry callback with correct parameters', async () => {
      const mockProviders = [
        {
          id: 'provider-1',
          full_name: 'John Doe',
          phone: '0812345678',
          vehicle_type: 'sedan',
          vehicle_plate: 'ABC-1234',
          rating: 4.5,
          total_jobs: 100,
          status: 'approved',
          is_online: true,
          current_location: { lat: 13.7563, lng: 100.5018, updated_at: '2026-01-18T10:00:00Z' },
        },
      ];

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // First call fails, second succeeds
      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'timeout', code: 'TIMEOUT' },
        } as any)
        .mockResolvedValueOnce({
          data: mockProviders,
          error: null,
        } as any);

      const { getAvailableProviders } = useOrderReassignment();

      await getAvailableProviders('ride');

      // Verify onRetry was called
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[useOrderReassignment] Retry attempt'),
        expect.any(Object)
      );

      consoleWarnSpy.mockRestore();
    });

    it('should use exponential backoff delays', async () => {
      const mockProviders = [
        {
          id: 'provider-1',
          full_name: 'John Doe',
          phone: '0812345678',
          vehicle_type: 'sedan',
          vehicle_plate: 'ABC-1234',
          rating: 4.5,
          total_jobs: 100,
          status: 'approved',
          is_online: true,
          current_location: { lat: 13.7563, lng: 100.5018, updated_at: '2026-01-18T10:00:00Z' },
        },
      ];

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Fail twice, then succeed
      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'timeout', code: 'TIMEOUT' },
        } as any)
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'timeout', code: 'TIMEOUT' },
        } as any)
        .mockResolvedValueOnce({
          data: mockProviders,
          error: null,
        } as any);

      const { getAvailableProviders } = useOrderReassignment();

      await getAvailableProviders('ride');

      // Verify exponential backoff: 1000ms, 2000ms
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('1000ms'),
        expect.any(Object)
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('2000ms'),
        expect.any(Object)
      );

      consoleWarnSpy.mockRestore();
    });

    it('should preserve AdminError context through retries', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Network error', code: 'NETWORK_ERROR' },
      } as any);

      const { getAvailableProviders, error } = useOrderReassignment();

      await getAvailableProviders('ride');

      expect(error.value).toBeTruthy();
      expect(error.value?.context.action).toBe('get_available_providers');
      expect(error.value?.context.metadata).toEqual({ serviceType: 'ride' });
      expect(error.value?.context.timestamp).toBeGreaterThan(0);
    });
  });
});

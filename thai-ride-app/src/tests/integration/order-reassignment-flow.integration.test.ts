/**
 * Integration Test: Order Reassignment Flow
 * Task: 5.1 - Create order reassignment integration test
 * Requirements: 4.1, 4.3, 4.5, 5.1, 5.3
 * 
 * Tests complete end-to-end flows for order reassignment including:
 * - Complete flow: open modal → fetch providers → select provider → reassign → order updated → modal closes
 * - Error scenario: network failure → retry → success (verify withRetry integration)
 * - Validation scenario: invalid provider ID → error message displayed
 * - Validation scenario: empty provider ID → error message displayed
 * - Verify error messages display in Thai language
 * - Verify retry logic triggers on network errors (timeout, 503)
 * - Verify retry does NOT trigger on validation errors (400, 401, 403)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';
import OrderReassignmentModal from '@/admin/components/OrderReassignmentModal.vue';
import { useOrderReassignment } from '@/admin/composables/useOrderReassignment';
import { supabase } from '@/lib/supabase';
import { AdminErrorCode } from '@/admin/utils/errors';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

// Mock admin UI store
vi.mock('@/admin/stores/adminUI.store', () => ({
  useAdminUIStore: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

// Mock focus trap composable
vi.mock('@/composables/usePerformance', () => ({
  useFocusTrap: () => ({
    activate: vi.fn(),
    deactivate: vi.fn(),
  }),
}));

describe('Order Reassignment Flow - Integration Tests', () => {
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
      is_online: true,
      current_location: { lat: 13.7563, lng: 100.5018, updated_at: '2026-01-18T09:00:00Z' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });


  describe('Complete Flow: Success Path', () => {
    it('should complete full reassignment flow: open modal → fetch providers → select provider → reassign → modal closes', async () => {
      // Mock successful RPC calls
      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({
          data: mockProviders,
          error: null,
        } as any)
        .mockResolvedValueOnce({
          data: {
            success: true,
            order_id: 'order-123',
            order_type: 'ride',
            old_provider_id: 'provider-old',
            new_provider_id: 'provider-1',
            reassigned_by: 'admin-1',
            reassigned_at: '2026-01-18T10:00:00Z',
          },
          error: null,
        } as any);

      // Mount modal
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
          currentProviderId: 'provider-old',
          currentProviderName: 'Old Provider',
        },
      });

      // Wait for providers to load
      await flushPromises();
      await nextTick();

      // Verify providers are displayed
      expect(wrapper.text()).toContain('John Doe');
      expect(wrapper.text()).toContain('Jane Smith');

      // Select first provider
      const providerCards = wrapper.findAll('.provider-card');
      expect(providerCards.length).toBe(2);
      await providerCards[0].trigger('click');
      await nextTick();

      // Verify provider is selected
      expect(providerCards[0].classes()).toContain('selected');

      // Submit reassignment
      const submitButton = wrapper.find('.btn-primary');
      await submitButton.trigger('click');
      await flushPromises();

      // Verify RPC calls
      expect(supabase.rpc).toHaveBeenCalledTimes(2);
      expect(supabase.rpc).toHaveBeenNthCalledWith(1, 'get_available_providers', {
        p_service_type: 'ride',
        p_limit: 100,
      });
      expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'reassign_order', {
        p_order_id: 'order-123',
        p_order_type: 'ride',
        p_new_provider_id: 'provider-1',
        p_reason: null,
        p_notes: null,
      });

      // Verify success event emitted
      expect(wrapper.emitted('success')).toBeTruthy();
      expect(wrapper.emitted('close')).toBeTruthy();
    });
  });


  describe('Error Scenario: Network Failure with Retry', () => {
    it('should retry on network timeout and eventually succeed', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

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

      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      // Fast-forward through retry delays
      await flushPromises();
      await vi.advanceTimersByTimeAsync(1000); // First retry delay
      await flushPromises();
      await vi.advanceTimersByTimeAsync(2000); // Second retry delay (exponential backoff)
      await flushPromises();
      await nextTick();

      // Verify retry attempts
      expect(supabase.rpc).toHaveBeenCalledTimes(3);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Retry attempt'),
        expect.any(Object)
      );

      // Verify providers loaded after retries
      expect(wrapper.text()).toContain('John Doe');
      expect(wrapper.text()).toContain('Jane Smith');

      consoleWarnSpy.mockRestore();
    });

    it('should retry on 503 server error and eventually succeed', async () => {
      // First call fails with 503, second succeeds
      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Service unavailable', code: '503' },
        } as any)
        .mockResolvedValueOnce({
          data: mockProviders,
          error: null,
        } as any);

      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      // Fast-forward through retry delay
      await flushPromises();
      await vi.advanceTimersByTimeAsync(1000);
      await flushPromises();
      await nextTick();

      // Verify retry occurred
      expect(supabase.rpc).toHaveBeenCalledTimes(2);

      // Verify providers loaded
      expect(wrapper.text()).toContain('John Doe');
    });
  });


  describe('Validation Errors: No Retry', () => {
    it('should NOT retry on 400 validation error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Invalid input', code: '400' },
      } as any);

      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await flushPromises();
      await nextTick();

      // Should only call once (no retry)
      expect(supabase.rpc).toHaveBeenCalledTimes(1);

      // Verify error message displayed
      const errorElement = wrapper.find('[role="alert"]');
      expect(errorElement.exists()).toBe(true);
      expect(errorElement.attributes('aria-live')).toBe('assertive');
    });

    it('should NOT retry on 401 authentication error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Unauthorized', code: 'PGRST301' },
      } as any);

      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await flushPromises();
      await nextTick();

      // Should only call once (no retry)
      expect(supabase.rpc).toHaveBeenCalledTimes(1);

      // Verify error displayed
      expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    });

    it('should NOT retry on 403 permission error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Permission denied', code: 'PGRST301' },
      } as any);

      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await flushPromises();
      await nextTick();

      // Should only call once (no retry)
      expect(supabase.rpc).toHaveBeenCalledTimes(1);

      // Verify error displayed
      expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    });
  });


  describe('Validation Scenarios: Invalid Input', () => {
    it('should display error for invalid provider ID', async () => {
      // Mock successful provider fetch
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockProviders,
        error: null,
      } as any);

      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await flushPromises();
      await nextTick();

      // Use composable directly to test validation
      const { reassignOrder, error } = useOrderReassignment();
      
      // Try to reassign with empty provider ID
      const result = await reassignOrder('order-123', 'ride', '');

      // Verify validation error
      expect(result.success).toBe(false);
      expect(error.value).toBeTruthy();
      expect(error.value?.code).toBe(AdminErrorCode.INVALID_PROVIDER_ID);
      expect(error.value?.getUserMessage()).toBe('รหัสผู้ให้บริการไม่ถูกต้อง');
    });

    it('should display error for empty provider ID', async () => {
      const { reassignOrder, error } = useOrderReassignment();
      
      // Try to reassign with whitespace-only provider ID
      const result = await reassignOrder('order-123', 'ride', '   ');

      // Verify validation error
      expect(result.success).toBe(false);
      expect(error.value).toBeTruthy();
      expect(error.value?.code).toBe(AdminErrorCode.INVALID_PROVIDER_ID);
      expect(error.value?.getUserMessage()).toBe('รหัสผู้ให้บริการไม่ถูกต้อง');
    });

    it('should display error for invalid order ID', async () => {
      const { reassignOrder, error } = useOrderReassignment();
      
      // Try to reassign with empty order ID
      const result = await reassignOrder('', 'ride', 'provider-1');

      // Verify validation error
      expect(result.success).toBe(false);
      expect(error.value).toBeTruthy();
      expect(error.value?.code).toBe(AdminErrorCode.INVALID_ORDER_ID);
      expect(error.value?.getUserMessage()).toBe('รหัสคำสั่งซื้อไม่ถูกต้อง');
    });

    it('should display error for empty order ID', async () => {
      const { reassignOrder, error } = useOrderReassignment();
      
      // Try to reassign with whitespace-only order ID
      const result = await reassignOrder('   ', 'ride', 'provider-1');

      // Verify validation error
      expect(result.success).toBe(false);
      expect(error.value).toBeTruthy();
      expect(error.value?.code).toBe(AdminErrorCode.INVALID_ORDER_ID);
      expect(error.value?.getUserMessage()).toBe('รหัสคำสั่งซื้อไม่ถูกต้อง');
    });
  });


  describe('Thai Error Messages', () => {
    it('should display Thai error message for ORDER_REASSIGNMENT_FAILED', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: {
          success: false,
          error: 'Reassignment failed',
        },
        error: null,
      } as any);

      const { reassignOrder, error } = useOrderReassignment();
      
      await reassignOrder('order-123', 'ride', 'provider-1');

      expect(error.value).toBeTruthy();
      expect(error.value?.code).toBe(AdminErrorCode.ORDER_REASSIGNMENT_FAILED);
      expect(error.value?.getUserMessage()).toBe('ไม่สามารถมอบหมายงานใหม่ได้');
    });

    it('should display Thai error message for NO_AVAILABLE_PROVIDERS', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: [],
        error: null,
      } as any);

      const { getAvailableProviders, error } = useOrderReassignment();
      
      await getAvailableProviders('ride');

      expect(error.value).toBeTruthy();
      expect(error.value?.code).toBe(AdminErrorCode.NO_AVAILABLE_PROVIDERS);
      expect(error.value?.getUserMessage()).toBe('ไม่มีผู้ให้บริการที่พร้อมรับงาน');
    });

    it('should display Thai error message for PROVIDER_ALREADY_ASSIGNED', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: {
          success: false,
          error: 'Provider already assigned to this order',
        },
        error: null,
      } as any);

      const { reassignOrder, error } = useOrderReassignment();
      
      await reassignOrder('order-123', 'ride', 'provider-1');

      expect(error.value).toBeTruthy();
      expect(error.value?.code).toBe(AdminErrorCode.PROVIDER_ALREADY_ASSIGNED);
      expect(error.value?.getUserMessage()).toBe('ผู้ให้บริการนี้ได้รับงานแล้ว');
    });

    it('should display Thai error message for INVALID_ORDER_STATUS', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: {
          success: false,
          error: 'Invalid status for reassignment',
        },
        error: null,
      } as any);

      const { reassignOrder, error } = useOrderReassignment();
      
      await reassignOrder('order-123', 'ride', 'provider-1');

      expect(error.value).toBeTruthy();
      expect(error.value?.code).toBe(AdminErrorCode.INVALID_ORDER_STATUS);
      expect(error.value?.getUserMessage()).toBe('สถานะคำสั่งซื้อไม่ถูกต้อง');
    });

    it('should display Thai error message for NETWORK_TIMEOUT', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Connection timeout', code: 'TIMEOUT' },
      } as any);

      const composable = useOrderReassignment();
      
      const promise = composable.getAvailableProviders('ride');

      // Fast-forward through all retry delays
      await flushPromises();
      await vi.advanceTimersByTimeAsync(1000);
      await flushPromises();
      await vi.advanceTimersByTimeAsync(2000);
      await flushPromises();

      await promise;

      expect(composable.error.value).toBeTruthy();
      // After retries exhaust, should show network unavailable or timeout
      expect(composable.error.value?.getUserMessage()).toContain('เชื่อมต่อ');
    }, 10000); // Increase timeout for this test

    it('should display Thai error message for INSUFFICIENT_ADMIN_PERMISSIONS', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: 'Permission denied', code: 'PGRST301' },
      } as any);

      const { reassignOrder, error } = useOrderReassignment();
      
      await reassignOrder('order-123', 'ride', 'provider-1');

      expect(error.value).toBeTruthy();
      expect(error.value?.code).toBe(AdminErrorCode.INSUFFICIENT_ADMIN_PERMISSIONS);
      expect(error.value?.getUserMessage()).toBe('คุณไม่มีสิทธิ์ดำเนินการนี้');
    });
  });


  describe('Retry Logic Verification', () => {
    it('should use exponential backoff for retries (1s, 2s, 4s)', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Fail 3 times to test all retry delays
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
          data: null,
          error: { message: 'timeout', code: 'TIMEOUT' },
        } as any);

      const { getAvailableProviders } = useOrderReassignment();
      
      const promise = getAvailableProviders('ride');

      // Fast-forward through retry delays
      await flushPromises();
      await vi.advanceTimersByTimeAsync(1000); // First retry: 1s
      await flushPromises();
      await vi.advanceTimersByTimeAsync(2000); // Second retry: 2s
      await flushPromises();
      await vi.advanceTimersByTimeAsync(4000); // Would be third retry: 4s (but exhausted)
      await flushPromises();

      await promise;

      // Verify exponential backoff delays
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

    it('should exhaust retries after maxAttempts (3)', async () => {
      // All calls fail
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Network error', code: 'NETWORK_ERROR' },
      } as any);

      const { getAvailableProviders } = useOrderReassignment();
      
      const promise = getAvailableProviders('ride');

      // Fast-forward through all retry delays
      await flushPromises();
      await vi.advanceTimersByTimeAsync(1000);
      await flushPromises();
      await vi.advanceTimersByTimeAsync(2000);
      await flushPromises();

      await promise;

      // Should call 3 times total (initial + 2 retries)
      expect(supabase.rpc).toHaveBeenCalledTimes(3);
    });

    it('should stop retrying after first success', async () => {
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
      
      const promise = getAvailableProviders('ride');

      // Fast-forward through first retry delay
      await flushPromises();
      await vi.advanceTimersByTimeAsync(1000);
      await flushPromises();

      await promise;

      // Should only call twice (initial + 1 retry)
      expect(supabase.rpc).toHaveBeenCalledTimes(2);
    });
  });


  describe('Modal Integration with Composable', () => {
    it('should display loading state while fetching providers', async () => {
      // Delay the response
      vi.mocked(supabase.rpc).mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              data: mockProviders,
              error: null,
            } as any);
          }, 100);
        })
      );

      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      // Verify loading state
      expect(wrapper.find('.loading-state').exists()).toBe(true);
      expect(wrapper.text()).toContain('กำลังโหลดรายชื่อไรเดอร์');

      // Wait for response
      await vi.advanceTimersByTimeAsync(100);
      await flushPromises();
      await nextTick();

      // Verify loading state removed
      expect(wrapper.find('.loading-state').exists()).toBe(false);
      expect(wrapper.text()).toContain('John Doe');
    });

    it('should display error state with retry button', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: 'PGRST116' },
      } as any);

      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await flushPromises();
      await nextTick();

      // Verify error state
      const errorElement = wrapper.find('.error-state');
      expect(errorElement.exists()).toBe(true);
      expect(errorElement.attributes('role')).toBe('alert');
      expect(errorElement.attributes('aria-live')).toBe('assertive');

      // Verify retry button exists
      const retryButton = errorElement.find('button');
      expect(retryButton.exists()).toBe(true);
      expect(retryButton.text()).toContain('ลองใหม่');
    });

    it('should display empty state when no providers available', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null,
      } as any);

      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await flushPromises();
      await nextTick();

      // Verify empty state (error state because NO_AVAILABLE_PROVIDERS is an error)
      expect(wrapper.find('.error-state').exists()).toBe(true);
    });

    it('should filter out current provider from list', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockProviders,
        error: null,
      } as any);

      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
          currentProviderId: 'provider-1',
          currentProviderName: 'John Doe',
        },
      });

      await flushPromises();
      await nextTick();

      // Verify current provider info displayed
      expect(wrapper.find('.current-provider-info').exists()).toBe(true);
      expect(wrapper.text()).toContain('John Doe');

      // Verify only one provider card (provider-2)
      const providerCards = wrapper.findAll('.provider-card');
      expect(providerCards.length).toBe(1);
      expect(providerCards[0].text()).toContain('Jane Smith');
      expect(providerCards[0].text()).not.toContain('John Doe');
    });
  });


  describe('Error Context and Metadata', () => {
    it('should include orderId and providerId in error context', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: {
          success: false,
          error: 'Reassignment failed',
        },
        error: null,
      } as any);

      const { reassignOrder, error } = useOrderReassignment();
      
      await reassignOrder('order-123', 'ride', 'provider-1', 'test_reason', 'test notes');

      expect(error.value).toBeTruthy();
      expect(error.value?.context.orderId).toBe('order-123');
      expect(error.value?.context.providerId).toBe('provider-1');
      expect(error.value?.context.action).toBe('reassign_order');
      expect(error.value?.context.timestamp).toBeGreaterThan(0);
      expect(error.value?.context.metadata).toEqual({
        orderType: 'ride',
        reason: 'test_reason',
        notes: 'test notes',
        businessError: 'Reassignment failed',
        errorDetail: undefined,
      });
    });

    it('should include serviceType in error context for getAvailableProviders', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: 'PGRST116' },
      } as any);

      const { getAvailableProviders, error } = useOrderReassignment();
      
      await getAvailableProviders('delivery');

      expect(error.value).toBeTruthy();
      expect(error.value?.context.action).toBe('get_available_providers');
      expect(error.value?.context.metadata).toEqual({ serviceType: 'delivery' });
      expect(error.value?.context.timestamp).toBeGreaterThan(0);
    });

    it('should preserve error context through retry attempts', async () => {
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
          data: {
            success: true,
            order_id: 'order-123',
            new_provider_id: 'provider-1',
          },
          error: null,
        } as any);

      const { reassignOrder } = useOrderReassignment();
      
      const promise = reassignOrder('order-123', 'ride', 'provider-1');

      // Fast-forward through retries
      await flushPromises();
      await vi.advanceTimersByTimeAsync(1000);
      await flushPromises();
      await vi.advanceTimersByTimeAsync(2000);
      await flushPromises();

      const result = await promise;

      // Verify success after retries
      expect(result.success).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledTimes(3);
    });
  });

  describe('Complete Flow with Reason and Notes', () => {
    it('should include reason and notes in reassignment request', async () => {
      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({
          data: mockProviders,
          error: null,
        } as any)
        .mockResolvedValueOnce({
          data: {
            success: true,
            order_id: 'order-123',
            order_type: 'ride',
            new_provider_id: 'provider-1',
            reassigned_by: 'admin-1',
            reassigned_at: '2026-01-18T10:00:00Z',
          },
          error: null,
        } as any);

      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await flushPromises();
      await nextTick();

      // Select provider
      await wrapper.findAll('.provider-card')[0].trigger('click');
      await nextTick();

      // Fill in reason
      const reasonSelect = wrapper.find('#reason');
      await reasonSelect.setValue('provider_unavailable');

      // Fill in notes
      const notesTextarea = wrapper.find('#notes');
      await notesTextarea.setValue('Provider requested change due to personal reasons');

      // Submit
      await wrapper.find('.btn-primary').trigger('click');
      await flushPromises();

      // Verify RPC call includes reason and notes
      expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'reassign_order', {
        p_order_id: 'order-123',
        p_order_type: 'ride',
        p_new_provider_id: 'provider-1',
        p_reason: 'provider_unavailable',
        p_notes: 'Provider requested change due to personal reasons',
      });
    });
  });
});

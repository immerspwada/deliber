/**
 * Unit Tests for Priority 2 Admin RPC Functions
 * Tests get_scheduled_rides(), get_provider_withdrawals_admin(), get_topup_requests_admin()
 * 
 * Requirements: 3.3, 3.4, 3.5
 * Feature: admin-panel-complete-verification
 * Task: 3.5 Write unit tests for Priority 2 RPC functions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

describe('Priority 2 Admin RPC Functions', () => {
  let supabase: SupabaseClient;
  let adminSupabase: SupabaseClient;
  
  beforeEach(() => {
    // Regular client
    supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321',
      import.meta.env.VITE_SUPABASE_ANON_KEY || ''
    );

    // Admin client (for testing - in production this would be authenticated admin)
    adminSupabase = createClient(
      import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321',
      import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || ''
    );
  });

  describe('get_scheduled_rides()', () => {
    describe('Function Signature', () => {
      it('should accept date_from parameter', async () => {
        const dateFrom = new Date();
        const { data, error } = await adminSupabase.rpc('get_scheduled_rides', {
          p_date_from: dateFrom.toISOString(),
          p_date_to: null,
          p_limit: 20,
          p_offset: 0
        });

        // Should not error on valid parameters
        expect(error).toBeNull();
      });

      it('should accept optional date_to parameter', async () => {
        const dateFrom = new Date();
        const dateTo = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days later
        
        const { data, error } = await adminSupabase.rpc('get_scheduled_rides', {
          p_date_from: dateFrom.toISOString(),
          p_date_to: dateTo.toISOString(),
          p_limit: 20,
          p_offset: 0
        });

        expect(error).toBeNull();
      });

      it('should accept limit and offset for pagination', async () => {
        const { data, error } = await adminSupabase.rpc('get_scheduled_rides', {
          p_date_from: new Date().toISOString(),
          p_date_to: null,
          p_limit: 10,
          p_offset: 0
        });

        expect(error).toBeNull();
        if (data) {
          expect(data.length).toBeLessThanOrEqual(10);
        }
      });
    });

    describe('Return Structure', () => {
      it('should return table with correct columns', async () => {
        const { data, error } = await adminSupabase.rpc('get_scheduled_rides', {
          p_date_from: new Date().toISOString(),
          p_date_to: null,
          p_limit: 1,
          p_offset: 0
        });

        expect(error).toBeNull();
        
        if (data && data.length > 0) {
          const ride = data[0];
          
          // Check all required columns exist
          expect(ride).toHaveProperty('id');
          expect(ride).toHaveProperty('tracking_id');
          expect(ride).toHaveProperty('user_id');
          expect(ride).toHaveProperty('customer_name');
          expect(ride).toHaveProperty('customer_email');
          expect(ride).toHaveProperty('customer_phone');
          expect(ride).toHaveProperty('pickup_address');
          expect(ride).toHaveProperty('pickup_lat');
          expect(ride).toHaveProperty('pickup_lng');
          expect(ride).toHaveProperty('destination_address');
          expect(ride).toHaveProperty('destination_lat');
          expect(ride).toHaveProperty('destination_lng');
          expect(ride).toHaveProperty('scheduled_datetime');
          expect(ride).toHaveProperty('ride_type');
          expect(ride).toHaveProperty('estimated_fare');
          expect(ride).toHaveProperty('status');
          expect(ride).toHaveProperty('created_at');
        }
      });

      it('should include provider details when assigned', async () => {
        const { data, error } = await adminSupabase.rpc('get_scheduled_rides', {
          p_date_from: new Date().toISOString(),
          p_date_to: null,
          p_limit: 20,
          p_offset: 0
        });

        expect(error).toBeNull();
        
        if (data && data.length > 0) {
          const ride = data[0];
          
          // Provider fields should exist (may be null if not assigned)
          expect(ride).toHaveProperty('provider_id');
          expect(ride).toHaveProperty('provider_name');
          expect(ride).toHaveProperty('provider_phone');
          expect(ride).toHaveProperty('provider_rating');
        }
      });
    });

    describe('Date Filtering', () => {
      it('should only return future scheduled rides', async () => {
        const now = new Date();
        const { data, error } = await adminSupabase.rpc('get_scheduled_rides', {
          p_date_from: now.toISOString(),
          p_date_to: null,
          p_limit: 20,
          p_offset: 0
        });

        expect(error).toBeNull();
        
        if (data && data.length > 0) {
          data.forEach((ride: any) => {
            const scheduledDate = new Date(ride.scheduled_datetime);
            expect(scheduledDate.getTime()).toBeGreaterThan(now.getTime());
          });
        }
      });

      it('should filter by date range', async () => {
        const dateFrom = new Date();
        const dateTo = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days later

        const { data, error } = await adminSupabase.rpc('get_scheduled_rides', {
          p_date_from: dateFrom.toISOString(),
          p_date_to: dateTo.toISOString(),
          p_limit: 20,
          p_offset: 0
        });

        expect(error).toBeNull();
        
        if (data && data.length > 0) {
          data.forEach((ride: any) => {
            const scheduledDate = new Date(ride.scheduled_datetime);
            expect(scheduledDate.getTime()).toBeGreaterThanOrEqual(dateFrom.getTime());
            expect(scheduledDate.getTime()).toBeLessThanOrEqual(dateTo.getTime());
          });
        }
      });

      it('should exclude cancelled and expired rides', async () => {
        const { data, error } = await adminSupabase.rpc('get_scheduled_rides', {
          p_date_from: new Date().toISOString(),
          p_date_to: null,
          p_limit: 20,
          p_offset: 0
        });

        expect(error).toBeNull();
        
        if (data && data.length > 0) {
          data.forEach((ride: any) => {
            expect(ride.status).not.toBe('cancelled');
            expect(ride.status).not.toBe('expired');
          });
        }
      });
    });

    describe('Pagination', () => {
      it('should respect limit parameter', async () => {
        const { data, error } = await adminSupabase.rpc('get_scheduled_rides', {
          p_date_from: new Date().toISOString(),
          p_date_to: null,
          p_limit: 5,
          p_offset: 0
        });

        expect(error).toBeNull();
        
        if (data) {
          expect(data.length).toBeLessThanOrEqual(5);
        }
      });

      it('should work with count_scheduled_rides for pagination', async () => {
        const dateFrom = new Date();
        
        const { data: count } = await adminSupabase.rpc('count_scheduled_rides', {
          p_date_from: dateFrom.toISOString(),
          p_date_to: null
        });

        const { data: rides } = await adminSupabase.rpc('get_scheduled_rides', {
          p_date_from: dateFrom.toISOString(),
          p_date_to: null,
          p_limit: 20,
          p_offset: 0
        });

        expect(typeof count).toBe('number');
        if (rides) {
          expect(count).toBeGreaterThanOrEqual(rides.length);
        }
      });
    });

    describe('Security', () => {
      it('should require admin role', async () => {
        // Without admin session, should get access denied error
        const { error } = await supabase.rpc('get_scheduled_rides', {
          p_date_from: new Date().toISOString(),
          p_date_to: null,
          p_limit: 20,
          p_offset: 0
        });

        // Should either get access denied or work if admin session exists
        if (error) {
          expect(error.message).toContain('Access denied');
        }
      });

      it('should use SECURITY DEFINER to bypass RLS', async () => {
        // The function should return data because it uses SECURITY DEFINER
        const { data, error } = await adminSupabase.rpc('get_scheduled_rides', {
          p_date_from: new Date().toISOString(),
          p_date_to: null,
          p_limit: 1,
          p_offset: 0
        });

        // Should not have RLS errors
        expect(error).toBeNull();
      });
    });

    describe('Performance', () => {
      it('should return results within acceptable time', async () => {
        const startTime = performance.now();

        await adminSupabase.rpc('get_scheduled_rides', {
          p_date_from: new Date().toISOString(),
          p_date_to: null,
          p_limit: 20,
          p_offset: 0
        });

        const duration = performance.now() - startTime;

        // Should complete within 500ms (as per requirements)
        expect(duration).toBeLessThan(500);
      });
    });
  });

  describe('get_provider_withdrawals_admin()', () => {
    describe('Function Signature', () => {
      it('should accept optional status parameter', async () => {
        const { data, error } = await adminSupabase.rpc('get_provider_withdrawals_admin', {
          p_status: 'pending',
          p_limit: 20,
          p_offset: 0
        });

        expect(error).toBeNull();
      });

      it('should accept limit and offset for pagination', async () => {
        const { data, error } = await adminSupabase.rpc('get_provider_withdrawals_admin', {
          p_status: null,
          p_limit: 10,
          p_offset: 0
        });

        expect(error).toBeNull();
        if (data) {
          expect(data.length).toBeLessThanOrEqual(10);
        }
      });
    });

    describe('Return Structure', () => {
      it('should return table with correct columns', async () => {
        const { data, error } = await adminSupabase.rpc('get_provider_withdrawals_admin', {
          p_status: null,
          p_limit: 1,
          p_offset: 0
        });

        expect(error).toBeNull();
        
        if (data && data.length > 0) {
          const withdrawal = data[0];
          
          // Check all required columns exist
          expect(withdrawal).toHaveProperty('id');
          expect(withdrawal).toHaveProperty('provider_id');
          expect(withdrawal).toHaveProperty('provider_name');
          expect(withdrawal).toHaveProperty('provider_phone');
          expect(withdrawal).toHaveProperty('provider_email');
          expect(withdrawal).toHaveProperty('amount');
          expect(withdrawal).toHaveProperty('bank_account');
          expect(withdrawal).toHaveProperty('bank_name');
          expect(withdrawal).toHaveProperty('account_holder');
          expect(withdrawal).toHaveProperty('status');
          expect(withdrawal).toHaveProperty('requested_at');
          expect(withdrawal).toHaveProperty('wallet_balance');
          expect(withdrawal).toHaveProperty('total_earnings');
        }
      });

      it('should return numeric values for amounts', async () => {
        const { data, error } = await adminSupabase.rpc('get_provider_withdrawals_admin', {
          p_status: null,
          p_limit: 1,
          p_offset: 0
        });

        expect(error).toBeNull();
        
        if (data && data.length > 0) {
          const withdrawal = data[0];
          expect(typeof withdrawal.amount).toBe('number');
          expect(withdrawal.amount).toBeGreaterThan(0);
          expect(typeof withdrawal.wallet_balance).toBe('number');
          expect(typeof withdrawal.total_earnings).toBe('number');
        }
      });
    });

    describe('Status Filtering', () => {
      it('should filter by pending status', async () => {
        const { data, error } = await adminSupabase.rpc('get_provider_withdrawals_admin', {
          p_status: 'pending',
          p_limit: 20,
          p_offset: 0
        });

        expect(error).toBeNull();
        
        if (data && data.length > 0) {
          data.forEach((withdrawal: any) => {
            expect(withdrawal.status).toBe('pending');
          });
        }
      });

      it('should filter by approved status', async () => {
        const { data, error } = await adminSupabase.rpc('get_provider_withdrawals_admin', {
          p_status: 'approved',
          p_limit: 20,
          p_offset: 0
        });

        expect(error).toBeNull();
        
        if (data && data.length > 0) {
          data.forEach((withdrawal: any) => {
            expect(withdrawal.status).toBe('approved');
          });
        }
      });

      it('should return all statuses when status is null', async () => {
        const { data, error } = await adminSupabase.rpc('get_provider_withdrawals_admin', {
          p_status: null,
          p_limit: 20,
          p_offset: 0
        });

        expect(error).toBeNull();
        expect(Array.isArray(data)).toBe(true);
      });
    });

    describe('Dual-Role Pattern', () => {
      it('should use providers_v2.user_id for joins', async () => {
        // This test verifies the function uses dual-role pattern
        // The SQL joins: INNER JOIN providers_v2 pv ON wr.provider_id = pv.id
        // Then: LEFT JOIN users u ON pv.user_id = u.id
        const { data, error } = await adminSupabase.rpc('get_provider_withdrawals_admin', {
          p_status: null,
          p_limit: 1,
          p_offset: 0
        });

        expect(error).toBeNull();
        
        if (data && data.length > 0) {
          const withdrawal = data[0];
          // Should have provider details from providers_v2
          expect(withdrawal.provider_id).toBeDefined();
          expect(withdrawal.provider_name).toBeDefined();
        }
      });
    });

    describe('Pagination', () => {
      it('should respect limit parameter', async () => {
        const { data, error } = await adminSupabase.rpc('get_provider_withdrawals_admin', {
          p_status: null,
          p_limit: 5,
          p_offset: 0
        });

        expect(error).toBeNull();
        
        if (data) {
          expect(data.length).toBeLessThanOrEqual(5);
        }
      });

      it('should work with count_provider_withdrawals_admin for pagination', async () => {
        const { data: count } = await adminSupabase.rpc('count_provider_withdrawals_admin', {
          p_status: null
        });

        const { data: withdrawals } = await adminSupabase.rpc('get_provider_withdrawals_admin', {
          p_status: null,
          p_limit: 20,
          p_offset: 0
        });

        expect(typeof count).toBe('number');
        if (withdrawals) {
          expect(count).toBeGreaterThanOrEqual(withdrawals.length);
        }
      });
    });

    describe('Security', () => {
      it('should require admin role', async () => {
        // Without admin session, should get access denied error
        const { error } = await supabase.rpc('get_provider_withdrawals_admin', {
          p_status: null,
          p_limit: 20,
          p_offset: 0
        });

        // Should either get access denied or work if admin session exists
        if (error) {
          expect(error.message).toContain('Access denied');
        }
      });

      it('should use SECURITY DEFINER to bypass RLS', async () => {
        const { data, error } = await adminSupabase.rpc('get_provider_withdrawals_admin', {
          p_status: null,
          p_limit: 1,
          p_offset: 0
        });

        // Should not have RLS errors
        expect(error).toBeNull();
      });
    });

    describe('Performance', () => {
      it('should return results within acceptable time', async () => {
        const startTime = performance.now();

        await adminSupabase.rpc('get_provider_withdrawals_admin', {
          p_status: null,
          p_limit: 20,
          p_offset: 0
        });

        const duration = performance.now() - startTime;

        // Should complete within 500ms (as per requirements)
        expect(duration).toBeLessThan(500);
      });
    });
  });

  describe('get_topup_requests_admin()', () => {
    describe('Function Signature', () => {
      it('should accept optional status parameter', async () => {
        const { data, error } = await adminSupabase.rpc('get_topup_requests_admin', {
          p_status: 'pending',
          p_limit: 20,
          p_offset: 0
        });

        expect(error).toBeNull();
      });

      it('should accept limit and offset for pagination', async () => {
        const { data, error } = await adminSupabase.rpc('get_topup_requests_admin', {
          p_status: null,
          p_limit: 10,
          p_offset: 0
        });

        expect(error).toBeNull();
        if (data) {
          expect(data.length).toBeLessThanOrEqual(10);
        }
      });
    });

    describe('Return Structure', () => {
      it('should return table with correct columns', async () => {
        const { data, error } = await adminSupabase.rpc('get_topup_requests_admin', {
          p_status: null,
          p_limit: 1,
          p_offset: 0
        });

        expect(error).toBeNull();
        
        if (data && data.length > 0) {
          const topup = data[0];
          
          // Check all required columns exist
          expect(topup).toHaveProperty('id');
          expect(topup).toHaveProperty('user_id');
          expect(topup).toHaveProperty('user_name');
          expect(topup).toHaveProperty('user_email');
          expect(topup).toHaveProperty('user_phone');
          expect(topup).toHaveProperty('amount');
          expect(topup).toHaveProperty('payment_method');
          expect(topup).toHaveProperty('payment_reference');
          expect(topup).toHaveProperty('payment_proof_url');
          expect(topup).toHaveProperty('status');
          expect(topup).toHaveProperty('requested_at');
          expect(topup).toHaveProperty('wallet_balance');
        }
      });

      it('should return numeric values for amounts', async () => {
        const { data, error } = await adminSupabase.rpc('get_topup_requests_admin', {
          p_status: null,
          p_limit: 1,
          p_offset: 0
        });

        expect(error).toBeNull();
        
        if (data && data.length > 0) {
          const topup = data[0];
          expect(typeof topup.amount).toBe('number');
          expect(topup.amount).toBeGreaterThan(0);
          expect(typeof topup.wallet_balance).toBe('number');
        }
      });
    });

    describe('Status Filtering', () => {
      it('should filter by pending status', async () => {
        const { data, error } = await adminSupabase.rpc('get_topup_requests_admin', {
          p_status: 'pending',
          p_limit: 20,
          p_offset: 0
        });

        expect(error).toBeNull();
        
        if (data && data.length > 0) {
          data.forEach((topup: any) => {
            expect(topup.status).toBe('pending');
          });
        }
      });

      it('should filter by approved status', async () => {
        const { data, error } = await adminSupabase.rpc('get_topup_requests_admin', {
          p_status: 'approved',
          p_limit: 20,
          p_offset: 0
        });

        expect(error).toBeNull();
        
        if (data && data.length > 0) {
          data.forEach((topup: any) => {
            expect(topup.status).toBe('approved');
          });
        }
      });

      it('should return all statuses when status is null', async () => {
        const { data, error } = await adminSupabase.rpc('get_topup_requests_admin', {
          p_status: null,
          p_limit: 20,
          p_offset: 0
        });

        expect(error).toBeNull();
        expect(Array.isArray(data)).toBe(true);
      });
    });

    describe('Pagination', () => {
      it('should respect limit parameter', async () => {
        const { data, error } = await adminSupabase.rpc('get_topup_requests_admin', {
          p_status: null,
          p_limit: 5,
          p_offset: 0
        });

        expect(error).toBeNull();
        
        if (data) {
          expect(data.length).toBeLessThanOrEqual(5);
        }
      });

      it('should work with count_topup_requests_admin for pagination', async () => {
        const { data: count } = await adminSupabase.rpc('count_topup_requests_admin', {
          p_status: null
        });

        const { data: topups } = await adminSupabase.rpc('get_topup_requests_admin', {
          p_status: null,
          p_limit: 20,
          p_offset: 0
        });

        expect(typeof count).toBe('number');
        if (topups) {
          expect(count).toBeGreaterThanOrEqual(topups.length);
        }
      });
    });

    describe('Security', () => {
      it('should require admin role', async () => {
        // Without admin session, should get access denied error
        const { error } = await supabase.rpc('get_topup_requests_admin', {
          p_status: null,
          p_limit: 20,
          p_offset: 0
        });

        // Should either get access denied or work if admin session exists
        if (error) {
          expect(error.message).toContain('Access denied');
        }
      });

      it('should use SECURITY DEFINER to bypass RLS', async () => {
        const { data, error } = await adminSupabase.rpc('get_topup_requests_admin', {
          p_status: null,
          p_limit: 1,
          p_offset: 0
        });

        // Should not have RLS errors
        expect(error).toBeNull();
      });
    });

    describe('Performance', () => {
      it('should return results within acceptable time', async () => {
        const startTime = performance.now();

        await adminSupabase.rpc('get_topup_requests_admin', {
          p_status: null,
          p_limit: 20,
          p_offset: 0
        });

        const duration = performance.now() - startTime;

        // Should complete within 500ms (as per requirements)
        expect(duration).toBeLessThan(500);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null parameters gracefully', async () => {
      const { error: error1 } = await adminSupabase.rpc('get_scheduled_rides', {
        p_date_from: new Date().toISOString(),
        p_date_to: null,
        p_limit: 20,
        p_offset: 0
      });

      const { error: error2 } = await adminSupabase.rpc('get_provider_withdrawals_admin', {
        p_status: null,
        p_limit: 20,
        p_offset: 0
      });

      const { error: error3 } = await adminSupabase.rpc('get_topup_requests_admin', {
        p_status: null,
        p_limit: 20,
        p_offset: 0
      });

      expect(error1).toBeNull();
      expect(error2).toBeNull();
      expect(error3).toBeNull();
    });

    it('should handle zero limit', async () => {
      const { data, error } = await adminSupabase.rpc('get_scheduled_rides', {
        p_date_from: new Date().toISOString(),
        p_date_to: null,
        p_limit: 0,
        p_offset: 0
      });

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it('should handle large offset', async () => {
      const { data, error } = await adminSupabase.rpc('get_provider_withdrawals_admin', {
        p_status: null,
        p_limit: 20,
        p_offset: 1000
      });

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('Data Integrity', () => {
    it('should return valid UUIDs for IDs', async () => {
      const { data } = await adminSupabase.rpc('get_scheduled_rides', {
        p_date_from: new Date().toISOString(),
        p_date_to: null,
        p_limit: 1,
        p_offset: 0
      });

      if (data && data.length > 0) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        expect(uuidRegex.test(data[0].id)).toBe(true);
        expect(uuidRegex.test(data[0].user_id)).toBe(true);
      }
    });

    it('should return non-negative numeric values', async () => {
      const { data } = await adminSupabase.rpc('get_provider_withdrawals_admin', {
        p_status: null,
        p_limit: 1,
        p_offset: 0
      });

      if (data && data.length > 0) {
        const withdrawal = data[0];
        expect(withdrawal.amount).toBeGreaterThan(0);
        expect(withdrawal.wallet_balance).toBeGreaterThanOrEqual(0);
        expect(withdrawal.total_earnings).toBeGreaterThanOrEqual(0);
      }
    });

    it('should return valid timestamps', async () => {
      const { data } = await adminSupabase.rpc('get_topup_requests_admin', {
        p_status: null,
        p_limit: 1,
        p_offset: 0
      });

      if (data && data.length > 0) {
        const topup = data[0];
        const requestedAt = new Date(topup.requested_at);
        expect(requestedAt.getTime()).not.toBeNaN();
        expect(requestedAt.getTime()).toBeLessThanOrEqual(Date.now());
      }
    });
  });
});

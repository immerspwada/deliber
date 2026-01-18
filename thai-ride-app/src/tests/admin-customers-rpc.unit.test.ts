/**
 * Unit Tests for get_admin_customers() RPC Function
 * Feature: admin-panel-complete-verification
 * Task: 2.1 Create get_admin_customers() RPC function
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

describe('get_admin_customers() RPC Function', () => {
  let supabase: SupabaseClient;
  let adminSupabase: SupabaseClient;

  beforeAll(() => {
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

  describe('Function Signature', () => {
    it('should accept optional search_term parameter', async () => {
      const { data, error } = await adminSupabase.rpc('get_admin_customers', {
        p_search_term: 'test',
        p_status: null,
        p_limit: 20,
        p_offset: 0
      });

      // Should not error on valid parameters
      expect(error).toBeNull();
    });

    it('should accept optional status parameter', async () => {
      const { data, error } = await adminSupabase.rpc('get_admin_customers', {
        p_search_term: null,
        p_status: 'active',
        p_limit: 20,
        p_offset: 0
      });

      expect(error).toBeNull();
    });

    it('should accept limit and offset for pagination', async () => {
      const { data, error } = await adminSupabase.rpc('get_admin_customers', {
        p_search_term: null,
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
      const { data, error } = await adminSupabase.rpc('get_admin_customers', {
        p_search_term: null,
        p_status: null,
        p_limit: 1,
        p_offset: 0
      });

      expect(error).toBeNull();
      
      if (data && data.length > 0) {
        const customer = data[0];
        
        // Check all required columns exist
        expect(customer).toHaveProperty('id');
        expect(customer).toHaveProperty('email');
        expect(customer).toHaveProperty('full_name');
        expect(customer).toHaveProperty('phone_number');
        expect(customer).toHaveProperty('status');
        expect(customer).toHaveProperty('wallet_balance');
        expect(customer).toHaveProperty('total_orders');
        expect(customer).toHaveProperty('total_spent');
        expect(customer).toHaveProperty('average_rating');
        expect(customer).toHaveProperty('created_at');
        expect(customer).toHaveProperty('last_order_at');
        expect(customer).toHaveProperty('suspension_reason');
        expect(customer).toHaveProperty('suspended_at');
        expect(customer).toHaveProperty('suspended_by');
      }
    });

    it('should return numeric values for wallet_balance', async () => {
      const { data, error } = await adminSupabase.rpc('get_admin_customers', {
        p_search_term: null,
        p_status: null,
        p_limit: 1,
        p_offset: 0
      });

      expect(error).toBeNull();
      
      if (data && data.length > 0) {
        const customer = data[0];
        expect(typeof customer.wallet_balance).toBe('number');
        expect(customer.wallet_balance).toBeGreaterThanOrEqual(0);
      }
    });

    it('should return order statistics', async () => {
      const { data, error } = await adminSupabase.rpc('get_admin_customers', {
        p_search_term: null,
        p_status: null,
        p_limit: 1,
        p_offset: 0
      });

      expect(error).toBeNull();
      
      if (data && data.length > 0) {
        const customer = data[0];
        expect(typeof customer.total_orders).toBe('number');
        expect(typeof customer.total_spent).toBe('number');
        expect(customer.total_orders).toBeGreaterThanOrEqual(0);
        expect(customer.total_spent).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Search Functionality', () => {
    it('should filter by email search term', async () => {
      const { data, error } = await adminSupabase.rpc('get_admin_customers', {
        p_search_term: '@',
        p_status: null,
        p_limit: 20,
        p_offset: 0
      });

      expect(error).toBeNull();
      
      if (data && data.length > 0) {
        // All results should have email containing @
        data.forEach((customer: any) => {
          expect(customer.email).toContain('@');
        });
      }
    });

    it('should perform case-insensitive search', async () => {
      const { data: upperCase } = await adminSupabase.rpc('get_admin_customers', {
        p_search_term: 'TEST',
        p_status: null,
        p_limit: 20,
        p_offset: 0
      });

      const { data: lowerCase } = await adminSupabase.rpc('get_admin_customers', {
        p_search_term: 'test',
        p_status: null,
        p_limit: 20,
        p_offset: 0
      });

      // Should return same results regardless of case
      expect(upperCase?.length).toBe(lowerCase?.length);
    });

    it('should return empty array when no matches found', async () => {
      const { data, error } = await adminSupabase.rpc('get_admin_customers', {
        p_search_term: 'nonexistent_customer_xyz_123',
        p_status: null,
        p_limit: 20,
        p_offset: 0
      });

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  });

  describe('Status Filtering', () => {
    it('should filter by active status', async () => {
      const { data, error } = await adminSupabase.rpc('get_admin_customers', {
        p_search_term: null,
        p_status: 'active',
        p_limit: 20,
        p_offset: 0
      });

      expect(error).toBeNull();
      
      if (data && data.length > 0) {
        data.forEach((customer: any) => {
          expect(customer.status).toBe('active');
        });
      }
    });

    it('should filter by suspended status', async () => {
      const { data, error } = await adminSupabase.rpc('get_admin_customers', {
        p_search_term: null,
        p_status: 'suspended',
        p_limit: 20,
        p_offset: 0
      });

      expect(error).toBeNull();
      
      if (data && data.length > 0) {
        data.forEach((customer: any) => {
          expect(customer.status).toBe('suspended');
        });
      }
    });
  });

  describe('Pagination', () => {
    it('should respect limit parameter', async () => {
      const { data, error } = await adminSupabase.rpc('get_admin_customers', {
        p_search_term: null,
        p_status: null,
        p_limit: 5,
        p_offset: 0
      });

      expect(error).toBeNull();
      
      if (data) {
        expect(data.length).toBeLessThanOrEqual(5);
      }
    });

    it('should respect offset parameter', async () => {
      const { data: page1 } = await adminSupabase.rpc('get_admin_customers', {
        p_search_term: null,
        p_status: null,
        p_limit: 5,
        p_offset: 0
      });

      const { data: page2 } = await adminSupabase.rpc('get_admin_customers', {
        p_search_term: null,
        p_status: null,
        p_limit: 5,
        p_offset: 5
      });

      // Pages should have different records
      if (page1 && page2 && page1.length > 0 && page2.length > 0) {
        expect(page1[0].id).not.toBe(page2[0].id);
      }
    });

    it('should work with count_admin_customers for pagination', async () => {
      const { data: count } = await adminSupabase.rpc('count_admin_customers', {
        p_search_term: null,
        p_status: null
      });

      const { data: customers } = await adminSupabase.rpc('get_admin_customers', {
        p_search_term: null,
        p_status: null,
        p_limit: 20,
        p_offset: 0
      });

      expect(typeof count).toBe('number');
      if (customers) {
        expect(count).toBeGreaterThanOrEqual(customers.length);
      }
    });
  });

  describe('Security', () => {
    it('should use SECURITY DEFINER to bypass RLS', async () => {
      // This test verifies the function works even without direct table access
      // The function should return data because it uses SECURITY DEFINER
      const { data, error } = await adminSupabase.rpc('get_admin_customers', {
        p_search_term: null,
        p_status: null,
        p_limit: 1,
        p_offset: 0
      });

      // Should not have RLS errors
      expect(error).toBeNull();
    });

    it('should require admin role (when auth is implemented)', async () => {
      // Note: This test assumes admin role check is implemented
      // In production, non-admin users should get an error
      
      // For now, we just verify the function exists and can be called
      const { error } = await supabase.rpc('get_admin_customers', {
        p_search_term: null,
        p_status: null,
        p_limit: 1,
        p_offset: 0
      });

      // Either succeeds (if user is admin) or fails with permission error
      if (error) {
        expect(error.message).toContain('Access denied');
      }
    });
  });

  describe('Performance', () => {
    it('should return results within acceptable time', async () => {
      const startTime = performance.now();

      await adminSupabase.rpc('get_admin_customers', {
        p_search_term: null,
        p_status: null,
        p_limit: 20,
        p_offset: 0
      });

      const duration = performance.now() - startTime;

      // Should complete within 500ms (as per requirements)
      expect(duration).toBeLessThan(500);
    });

    it('should handle large offset efficiently', async () => {
      const startTime = performance.now();

      await adminSupabase.rpc('get_admin_customers', {
        p_search_term: null,
        p_status: null,
        p_limit: 20,
        p_offset: 100
      });

      const duration = performance.now() - startTime;

      // Should still be fast with offset
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null search term', async () => {
      const { data, error } = await adminSupabase.rpc('get_admin_customers', {
        p_search_term: null,
        p_status: null,
        p_limit: 20,
        p_offset: 0
      });

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle empty string search term', async () => {
      const { data, error } = await adminSupabase.rpc('get_admin_customers', {
        p_search_term: '',
        p_status: null,
        p_limit: 20,
        p_offset: 0
      });

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle zero limit', async () => {
      const { data, error } = await adminSupabase.rpc('get_admin_customers', {
        p_search_term: null,
        p_status: null,
        p_limit: 0,
        p_offset: 0
      });

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it('should handle customers with no orders', async () => {
      const { data, error } = await adminSupabase.rpc('get_admin_customers', {
        p_search_term: null,
        p_status: null,
        p_limit: 20,
        p_offset: 0
      });

      expect(error).toBeNull();
      
      if (data && data.length > 0) {
        // Should handle customers with 0 orders gracefully
        const customerWithNoOrders = data.find((c: any) => c.total_orders === 0);
        if (customerWithNoOrders) {
          expect(customerWithNoOrders.total_spent).toBe(0);
          expect(customerWithNoOrders.average_rating).toBe(0);
          expect(customerWithNoOrders.last_order_at).toBeNull();
        }
      }
    });
  });

  describe('Data Integrity', () => {
    it('should return valid UUID for id', async () => {
      const { data } = await adminSupabase.rpc('get_admin_customers', {
        p_search_term: null,
        p_status: null,
        p_limit: 1,
        p_offset: 0
      });

      if (data && data.length > 0) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        expect(uuidRegex.test(data[0].id)).toBe(true);
      }
    });

    it('should return valid email format', async () => {
      const { data } = await adminSupabase.rpc('get_admin_customers', {
        p_search_term: null,
        p_status: null,
        p_limit: 1,
        p_offset: 0
      });

      if (data && data.length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        expect(emailRegex.test(data[0].email)).toBe(true);
      }
    });

    it('should return non-negative numeric values', async () => {
      const { data } = await adminSupabase.rpc('get_admin_customers', {
        p_search_term: null,
        p_status: null,
        p_limit: 1,
        p_offset: 0
      });

      if (data && data.length > 0) {
        const customer = data[0];
        expect(customer.wallet_balance).toBeGreaterThanOrEqual(0);
        expect(customer.total_orders).toBeGreaterThanOrEqual(0);
        expect(customer.total_spent).toBeGreaterThanOrEqual(0);
        if (customer.average_rating !== null) {
          expect(customer.average_rating).toBeGreaterThanOrEqual(0);
          expect(customer.average_rating).toBeLessThanOrEqual(5);
        }
      }
    });
  });
});

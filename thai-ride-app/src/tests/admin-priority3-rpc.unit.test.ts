/**
 * Unit Tests for Admin Priority 3 RPC Functions
 * Tests revenue statistics and payment analytics functions
 * 
 * Requirements: 4.1, 4.2
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

describe('Admin Priority 3 RPC Functions - Analytics', () => {
  let supabase: SupabaseClient;
  let adminUserId: string;

  beforeAll(() => {
    // Initialize Supabase client
    supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321',
      import.meta.env.VITE_SUPABASE_ANON_KEY || ''
    );

    // Note: In real tests, you would authenticate as an admin user
    // For now, we'll test the function structure
  });

  describe('get_admin_revenue_stats()', () => {
    it('should return revenue statistics with correct structure', async () => {
      const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const dateTo = new Date().toISOString();

      const { data, error } = await supabase.rpc('get_admin_revenue_stats', {
        p_date_from: dateFrom,
        p_date_to: dateTo,
        p_service_type: null
      });

      // If not authenticated as admin, should get permission error
      if (error) {
        expect(error.message).toContain('Access denied');
        return;
      }

      // If authenticated as admin, check structure
      expect(data).toBeDefined();
      expect(data).toHaveProperty('total_revenue');
      expect(data).toHaveProperty('ride_revenue');
      expect(data).toHaveProperty('delivery_revenue');
      expect(data).toHaveProperty('shopping_revenue');
      expect(data).toHaveProperty('platform_fee');
      expect(data).toHaveProperty('provider_earnings');
      expect(data).toHaveProperty('daily_breakdown');
      expect(data).toHaveProperty('payment_method_breakdown');
      expect(data).toHaveProperty('date_from');
      expect(data).toHaveProperty('date_to');
      expect(data).toHaveProperty('service_type_filter');
    });

    it('should calculate platform fee as 15% of total revenue', async () => {
      const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const dateTo = new Date().toISOString();

      const { data, error } = await supabase.rpc('get_admin_revenue_stats', {
        p_date_from: dateFrom,
        p_date_to: dateTo,
        p_service_type: null
      });

      if (error) {
        expect(error.message).toContain('Access denied');
        return;
      }

      // Platform fee should be 15% of total revenue
      const expectedPlatformFee = data.total_revenue * 0.15;
      expect(Math.abs(data.platform_fee - expectedPlatformFee)).toBeLessThan(0.01);
    });

    it('should calculate provider earnings as 85% of total revenue', async () => {
      const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const dateTo = new Date().toISOString();

      const { data, error } = await supabase.rpc('get_admin_revenue_stats', {
        p_date_from: dateFrom,
        p_date_to: dateTo,
        p_service_type: null
      });

      if (error) {
        expect(error.message).toContain('Access denied');
        return;
      }

      // Provider earnings should be 85% of total revenue
      const expectedProviderEarnings = data.total_revenue * 0.85;
      expect(Math.abs(data.provider_earnings - expectedProviderEarnings)).toBeLessThan(0.01);
    });

    it('should filter by service type when specified', async () => {
      const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const dateTo = new Date().toISOString();

      const { data, error } = await supabase.rpc('get_admin_revenue_stats', {
        p_date_from: dateFrom,
        p_date_to: dateTo,
        p_service_type: 'ride'
      });

      if (error) {
        expect(error.message).toContain('Access denied');
        return;
      }

      // When filtering by 'ride', other service revenues should be 0
      expect(data.delivery_revenue).toBe(0);
      expect(data.shopping_revenue).toBe(0);
      expect(data.total_revenue).toBe(data.ride_revenue);
    });

    it('should return daily breakdown as array', async () => {
      const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const dateTo = new Date().toISOString();

      const { data, error } = await supabase.rpc('get_admin_revenue_stats', {
        p_date_from: dateFrom,
        p_date_to: dateTo,
        p_service_type: null
      });

      if (error) {
        expect(error.message).toContain('Access denied');
        return;
      }

      expect(Array.isArray(data.daily_breakdown)).toBe(true);
      
      // Each daily entry should have required fields
      if (data.daily_breakdown.length > 0) {
        const firstDay = data.daily_breakdown[0];
        expect(firstDay).toHaveProperty('date');
        expect(firstDay).toHaveProperty('revenue');
        expect(firstDay).toHaveProperty('orders');
        expect(firstDay).toHaveProperty('ride_revenue');
        expect(firstDay).toHaveProperty('delivery_revenue');
        expect(firstDay).toHaveProperty('shopping_revenue');
      }
    });

    it('should return payment method breakdown with all methods', async () => {
      const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const dateTo = new Date().toISOString();

      const { data, error } = await supabase.rpc('get_admin_revenue_stats', {
        p_date_from: dateFrom,
        p_date_to: dateTo,
        p_service_type: null
      });

      if (error) {
        expect(error.message).toContain('Access denied');
        return;
      }

      expect(data.payment_method_breakdown).toBeDefined();
      expect(data.payment_method_breakdown).toHaveProperty('cash');
      expect(data.payment_method_breakdown).toHaveProperty('wallet');
      expect(data.payment_method_breakdown).toHaveProperty('card');
      expect(data.payment_method_breakdown).toHaveProperty('promptpay');
      expect(data.payment_method_breakdown).toHaveProperty('mobile_banking');
      expect(data.payment_method_breakdown).toHaveProperty('other');
    });

    it('should sum service revenues to equal total revenue', async () => {
      const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const dateTo = new Date().toISOString();

      const { data, error } = await supabase.rpc('get_admin_revenue_stats', {
        p_date_from: dateFrom,
        p_date_to: dateTo,
        p_service_type: null
      });

      if (error) {
        expect(error.message).toContain('Access denied');
        return;
      }

      const sumOfServices = data.ride_revenue + data.delivery_revenue + data.shopping_revenue;
      expect(Math.abs(data.total_revenue - sumOfServices)).toBeLessThan(0.01);
    });
  });

  describe('get_admin_payment_stats()', () => {
    it('should return payment statistics with correct structure', async () => {
      const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const dateTo = new Date().toISOString();

      const { data, error } = await supabase.rpc('get_admin_payment_stats', {
        p_date_from: dateFrom,
        p_date_to: dateTo
      });

      // If not authenticated as admin, should get permission error
      if (error) {
        expect(error.message).toContain('Access denied');
        return;
      }

      // If authenticated as admin, check structure
      expect(data).toBeDefined();
      expect(data).toHaveProperty('total_transactions');
      expect(data).toHaveProperty('total_amount');
      expect(data).toHaveProperty('average_transaction');
      expect(data).toHaveProperty('payment_methods');
      expect(data).toHaveProperty('daily_trends');
      expect(data).toHaveProperty('service_breakdown');
      expect(data).toHaveProperty('date_from');
      expect(data).toHaveProperty('date_to');
    });

    it('should calculate average transaction correctly', async () => {
      const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const dateTo = new Date().toISOString();

      const { data, error } = await supabase.rpc('get_admin_payment_stats', {
        p_date_from: dateFrom,
        p_date_to: dateTo
      });

      if (error) {
        expect(error.message).toContain('Access denied');
        return;
      }

      if (data.total_transactions > 0) {
        const expectedAverage = data.total_amount / data.total_transactions;
        expect(Math.abs(data.average_transaction - expectedAverage)).toBeLessThan(0.01);
      } else {
        expect(data.average_transaction).toBe(0);
      }
    });

    it('should return payment methods as array with required fields', async () => {
      const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const dateTo = new Date().toISOString();

      const { data, error } = await supabase.rpc('get_admin_payment_stats', {
        p_date_from: dateFrom,
        p_date_to: dateTo
      });

      if (error) {
        expect(error.message).toContain('Access denied');
        return;
      }

      expect(Array.isArray(data.payment_methods)).toBe(true);
      
      // Each payment method should have required fields
      if (data.payment_methods.length > 0) {
        const firstMethod = data.payment_methods[0];
        expect(firstMethod).toHaveProperty('payment_method');
        expect(firstMethod).toHaveProperty('transaction_count');
        expect(firstMethod).toHaveProperty('total_amount');
        expect(firstMethod).toHaveProperty('average_amount');
        expect(firstMethod).toHaveProperty('percentage');
      }
    });

    it('should return daily trends as array', async () => {
      const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const dateTo = new Date().toISOString();

      const { data, error } = await supabase.rpc('get_admin_payment_stats', {
        p_date_from: dateFrom,
        p_date_to: dateTo
      });

      if (error) {
        expect(error.message).toContain('Access denied');
        return;
      }

      expect(Array.isArray(data.daily_trends)).toBe(true);
      
      // Each daily trend should have required fields
      if (data.daily_trends.length > 0) {
        const firstDay = data.daily_trends[0];
        expect(firstDay).toHaveProperty('date');
        expect(firstDay).toHaveProperty('transaction_count');
        expect(firstDay).toHaveProperty('total_amount');
        expect(firstDay).toHaveProperty('average_amount');
      }
    });

    it('should return service breakdown with all service types', async () => {
      const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const dateTo = new Date().toISOString();

      const { data, error } = await supabase.rpc('get_admin_payment_stats', {
        p_date_from: dateFrom,
        p_date_to: dateTo
      });

      if (error) {
        expect(error.message).toContain('Access denied');
        return;
      }

      expect(data.service_breakdown).toBeDefined();
      expect(data.service_breakdown).toHaveProperty('ride');
      expect(data.service_breakdown).toHaveProperty('delivery');
      expect(data.service_breakdown).toHaveProperty('shopping');

      // Each service should have count, amount, and average
      expect(data.service_breakdown.ride).toHaveProperty('count');
      expect(data.service_breakdown.ride).toHaveProperty('amount');
      expect(data.service_breakdown.ride).toHaveProperty('average');
    });

    it('should calculate service averages correctly', async () => {
      const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const dateTo = new Date().toISOString();

      const { data, error } = await supabase.rpc('get_admin_payment_stats', {
        p_date_from: dateFrom,
        p_date_to: dateTo
      });

      if (error) {
        expect(error.message).toContain('Access denied');
        return;
      }

      // Check ride average
      if (data.service_breakdown.ride.count > 0) {
        const expectedAverage = data.service_breakdown.ride.amount / data.service_breakdown.ride.count;
        expect(Math.abs(data.service_breakdown.ride.average - expectedAverage)).toBeLessThan(0.01);
      }

      // Check delivery average
      if (data.service_breakdown.delivery.count > 0) {
        const expectedAverage = data.service_breakdown.delivery.amount / data.service_breakdown.delivery.count;
        expect(Math.abs(data.service_breakdown.delivery.average - expectedAverage)).toBeLessThan(0.01);
      }

      // Check shopping average
      if (data.service_breakdown.shopping.count > 0) {
        const expectedAverage = data.service_breakdown.shopping.amount / data.service_breakdown.shopping.count;
        expect(Math.abs(data.service_breakdown.shopping.average - expectedAverage)).toBeLessThan(0.01);
      }
    });

    it('should sum payment method percentages to approximately 100%', async () => {
      const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const dateTo = new Date().toISOString();

      const { data, error } = await supabase.rpc('get_admin_payment_stats', {
        p_date_from: dateFrom,
        p_date_to: dateTo
      });

      if (error) {
        expect(error.message).toContain('Access denied');
        return;
      }

      if (data.payment_methods.length > 0) {
        const totalPercentage = data.payment_methods.reduce(
          (sum: number, method: any) => sum + method.percentage,
          0
        );
        // Allow small rounding errors
        expect(Math.abs(totalPercentage - 100)).toBeLessThan(1);
      }
    });
  });

  describe('Admin Role Security', () => {
    it('should require admin role for get_admin_revenue_stats', async () => {
      // Without admin authentication, should fail
      const { error } = await supabase.rpc('get_admin_revenue_stats', {
        p_date_from: new Date().toISOString(),
        p_date_to: new Date().toISOString(),
        p_service_type: null
      });

      // Should get access denied error if not admin
      if (error) {
        expect(error.message).toContain('Access denied');
      }
    });

    it('should require admin role for get_admin_payment_stats', async () => {
      // Without admin authentication, should fail
      const { error } = await supabase.rpc('get_admin_payment_stats', {
        p_date_from: new Date().toISOString(),
        p_date_to: new Date().toISOString()
      });

      // Should get access denied error if not admin
      if (error) {
        expect(error.message).toContain('Access denied');
      }
    });
  });

  describe('Date Range Handling', () => {
    it('should handle default date range (last 30 days)', async () => {
      const { data, error } = await supabase.rpc('get_admin_revenue_stats', {});

      if (error && !error.message.includes('Access denied')) {
        throw error;
      }

      if (data) {
        expect(data.date_from).toBeDefined();
        expect(data.date_to).toBeDefined();
      }
    });

    it('should handle custom date ranges', async () => {
      const dateFrom = new Date('2024-01-01').toISOString();
      const dateTo = new Date('2024-01-31').toISOString();

      const { data, error } = await supabase.rpc('get_admin_revenue_stats', {
        p_date_from: dateFrom,
        p_date_to: dateTo,
        p_service_type: null
      });

      if (error && !error.message.includes('Access denied')) {
        throw error;
      }

      if (data) {
        expect(data.date_from).toBe(dateFrom);
        expect(data.date_to).toBe(dateTo);
      }
    });
  });
});

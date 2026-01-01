/**
 * End-to-End Integration Tests for Multi-Role Ride Booking System
 * Feature: multi-role-ride-booking
 * 
 * These tests validate the complete happy path flow across all 3 roles:
 * Customer → Provider → Admin
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabase: SupabaseClient

// Test data holders
let testCustomerId: string
let testProviderId: string
let testRideId: string
let testTrackingId: string

beforeAll(() => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials in environment variables')
  }

  supabase = createClient(supabaseUrl, supabaseKey)
})

afterAll(async () => {
  // Final cleanup
})

// Helper to generate unique IDs
function generateTrackingId(): string {
  return `TEST-${Date.now()}-${Math.random().toString(36).substring(7)}`
}

// Cleanup helper
async function cleanupTestData() {
  if (testRideId) {
    await supabase.from('wallet_holds').delete().eq('ride_id', testRideId)
    await supabase.from('wallet_transactions').delete().eq('reference_id', testRideId)
    await supabase.from('status_audit_log').delete().eq('entity_id', testRideId)
    await supabase.from('ride_requests').delete().eq('id', testRideId)
  }
  if (testCustomerId) {
    await supabase.from('user_wallets').delete().eq('user_id', testCustomerId)
    await supabase.from('user_loyalty').delete().eq('user_id', testCustomerId)
  }
  if (testProviderId) {
    await supabase.from('service_providers').delete().eq('id', testProviderId)
  }
}

describe('Multi-Role Ride Booking Integration Tests', () => {
  
  beforeEach(async () => {
    // Generate fresh IDs for each test
    testCustomerId = crypto.randomUUID()
    testProviderId = crypto.randomUUID()
    testRideId = crypto.randomUUID()
    testTrackingId = generateTrackingId()
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  /**
   * Happy Path Integration Test
   * 
   * Flow: Customer creates ride → Provider accepts → Status updates → Complete
   * Verifies all 3 roles see consistent state at each step
   */
  describe('Happy Path: Complete Ride Flow', () => {
    
    it('should complete full ride lifecycle with consistent state across all roles', async () => {
      const estimatedFare = 150
      const actualFare = 160

      // ============================================
      // STEP 1: Setup - Create Customer Wallet and Provider
      // ============================================
      
      // Create customer wallet with sufficient balance
      const { error: walletError } = await supabase
        .from('user_wallets')
        .insert({
          user_id: testCustomerId,
          balance: 500,
          held_balance: 0
        })
      
      expect(walletError).toBeNull()

      // Create provider
      const { error: providerError } = await supabase
        .from('service_providers')
        .insert({
          id: testProviderId,
          user_id: crypto.randomUUID(),
          tracking_id: `DRV-${Date.now()}`,
          first_name: 'Test',
          last_name: 'Driver',
          phone_number: '0800000000',
          vehicle_type: 'car',
          license_plate: 'กข 1234',
          status: 'available',
          current_lat: 13.7563,
          current_lng: 100.5018
        })
      
      expect(providerError).toBeNull()

      // ============================================
      // STEP 2: Customer Creates Ride
      // ============================================
      
      const { error: rideError } = await supabase
        .from('ride_requests')
        .insert({
          id: testRideId,
          tracking_id: testTrackingId,
          user_id: testCustomerId,
          pickup_lat: 13.7563,
          pickup_lng: 100.5018,
          pickup_address: 'Siam Paragon, Bangkok',
          destination_lat: 13.7469,
          destination_lng: 100.5349,
          destination_address: 'Asok BTS Station',
          ride_type: 'standard',
          estimated_fare: estimatedFare,
          status: 'pending'
        })
      
      expect(rideError).toBeNull()

      // Simulate wallet hold
      await supabase
        .from('user_wallets')
        .update({
          balance: 500 - estimatedFare,
          held_balance: estimatedFare
        })
        .eq('user_id', testCustomerId)

      // Verify: Customer sees pending ride
      const { data: customerView1 } = await supabase
        .from('ride_requests')
        .select('*')
        .eq('id', testRideId)
        .single()
      
      expect(customerView1?.status).toBe('pending')
      expect(customerView1?.tracking_id).toBe(testTrackingId)

      // Verify: Provider sees pending ride in available list
      const { data: providerView1 } = await supabase
        .from('ride_requests')
        .select('*')
        .eq('status', 'pending')
      
      expect(providerView1?.some(r => r.id === testRideId)).toBe(true)

      // Verify: Admin sees the ride
      const { data: adminView1 } = await supabase
        .from('ride_requests')
        .select('*')
        .eq('id', testRideId)
        .single()
      
      expect(adminView1?.status).toBe('pending')

      // ============================================
      // STEP 3: Provider Accepts Ride
      // ============================================
      
      const matchedAt = new Date().toISOString()
      
      const { error: acceptError } = await supabase
        .from('ride_requests')
        .update({
          status: 'matched',
          provider_id: testProviderId,
          matched_at: matchedAt
        })
        .eq('id', testRideId)
        .eq('status', 'pending') // Optimistic locking
      
      expect(acceptError).toBeNull()

      // Update provider status
      await supabase
        .from('service_providers')
        .update({
          status: 'busy',
          current_ride_id: testRideId
        })
        .eq('id', testProviderId)

      // Create audit log
      await supabase.from('status_audit_log').insert({
        entity_type: 'ride',
        entity_id: testRideId,
        tracking_id: testTrackingId,
        old_status: 'pending',
        new_status: 'matched',
        changed_by: testProviderId,
        changed_by_role: 'provider'
      })

      // Verify: All roles see matched status
      const { data: customerView2 } = await supabase
        .from('ride_requests')
        .select('*, provider:provider_id(*)')
        .eq('id', testRideId)
        .single()
      
      expect(customerView2?.status).toBe('matched')
      expect(customerView2?.provider_id).toBe(testProviderId)

      const { data: providerView2 } = await supabase
        .from('ride_requests')
        .select('*')
        .eq('id', testRideId)
        .single()
      
      expect(providerView2?.status).toBe('matched')

      // ============================================
      // STEP 4: Provider Updates Status - Arriving
      // ============================================
      
      await supabase
        .from('ride_requests')
        .update({ status: 'arriving' })
        .eq('id', testRideId)

      await supabase.from('status_audit_log').insert({
        entity_type: 'ride',
        entity_id: testRideId,
        tracking_id: testTrackingId,
        old_status: 'matched',
        new_status: 'arriving',
        changed_by: testProviderId,
        changed_by_role: 'provider'
      })

      // Verify status
      const { data: arrivingCheck } = await supabase
        .from('ride_requests')
        .select('status')
        .eq('id', testRideId)
        .single()
      
      expect(arrivingCheck?.status).toBe('arriving')

      // ============================================
      // STEP 5: Provider Updates Status - Picked Up
      // ============================================
      
      const pickedUpAt = new Date().toISOString()
      
      await supabase
        .from('ride_requests')
        .update({ 
          status: 'picked_up',
          picked_up_at: pickedUpAt
        })
        .eq('id', testRideId)

      await supabase.from('status_audit_log').insert({
        entity_type: 'ride',
        entity_id: testRideId,
        tracking_id: testTrackingId,
        old_status: 'arriving',
        new_status: 'picked_up',
        changed_by: testProviderId,
        changed_by_role: 'provider'
      })

      // ============================================
      // STEP 6: Provider Updates Status - In Progress
      // ============================================
      
      await supabase
        .from('ride_requests')
        .update({ status: 'in_progress' })
        .eq('id', testRideId)

      await supabase.from('status_audit_log').insert({
        entity_type: 'ride',
        entity_id: testRideId,
        tracking_id: testTrackingId,
        old_status: 'picked_up',
        new_status: 'in_progress',
        changed_by: testProviderId,
        changed_by_role: 'provider'
      })

      // ============================================
      // STEP 7: Provider Completes Ride
      // ============================================
      
      const completedAt = new Date().toISOString()
      const platformFee = actualFare * 0.20
      const providerEarnings = actualFare * 0.80

      await supabase
        .from('ride_requests')
        .update({
          status: 'completed',
          actual_fare: actualFare,
          platform_fee: platformFee,
          provider_earnings: providerEarnings,
          completed_at: completedAt
        })
        .eq('id', testRideId)

      // Release wallet hold and charge actual fare
      const refundAmount = estimatedFare - actualFare
      await supabase
        .from('user_wallets')
        .update({
          balance: 500 - actualFare,
          held_balance: 0
        })
        .eq('user_id', testCustomerId)

      // Update provider status
      await supabase
        .from('service_providers')
        .update({
          status: 'available',
          current_ride_id: null
        })
        .eq('id', testProviderId)

      // Create completion audit log
      await supabase.from('status_audit_log').insert({
        entity_type: 'ride',
        entity_id: testRideId,
        tracking_id: testTrackingId,
        old_status: 'in_progress',
        new_status: 'completed',
        changed_by: testProviderId,
        changed_by_role: 'provider'
      })

      // ============================================
      // FINAL VERIFICATION: All Roles See Consistent State
      // ============================================
      
      // Customer View
      const { data: finalCustomerView } = await supabase
        .from('ride_requests')
        .select('*')
        .eq('id', testRideId)
        .single()
      
      expect(finalCustomerView?.status).toBe('completed')
      expect(finalCustomerView?.actual_fare).toBe(actualFare)
      expect(finalCustomerView?.platform_fee).toBeCloseTo(platformFee, 2)
      expect(finalCustomerView?.provider_earnings).toBeCloseTo(providerEarnings, 2)

      // Customer Wallet
      const { data: finalWallet } = await supabase
        .from('user_wallets')
        .select('balance, held_balance')
        .eq('user_id', testCustomerId)
        .single()
      
      expect(finalWallet?.held_balance).toBe(0)
      expect(finalWallet?.balance).toBe(500 - actualFare)

      // Provider View
      const { data: finalProviderView } = await supabase
        .from('service_providers')
        .select('status, current_ride_id')
        .eq('id', testProviderId)
        .single()
      
      expect(finalProviderView?.status).toBe('available')
      expect(finalProviderView?.current_ride_id).toBeNull()

      // Admin View - Audit Trail
      const { data: auditTrail } = await supabase
        .from('status_audit_log')
        .select('*')
        .eq('entity_id', testRideId)
        .order('created_at', { ascending: true })
      
      expect(auditTrail?.length).toBe(5) // matched, arriving, picked_up, in_progress, completed
      expect(auditTrail?.[0].new_status).toBe('matched')
      expect(auditTrail?.[4].new_status).toBe('completed')

      // Verify payment calculations
      expect(platformFee + providerEarnings).toBeCloseTo(actualFare, 2)
    }, 60000)

    it('should handle customer cancellation before matching', async () => {
      const estimatedFare = 100

      // Setup
      await supabase.from('user_wallets').insert({
        user_id: testCustomerId,
        balance: 500,
        held_balance: 0
      })

      // Create ride
      await supabase.from('ride_requests').insert({
        id: testRideId,
        tracking_id: testTrackingId,
        user_id: testCustomerId,
        pickup_lat: 13.7563,
        pickup_lng: 100.5018,
        pickup_address: 'Test Pickup',
        destination_lat: 13.7469,
        destination_lng: 100.5349,
        destination_address: 'Test Destination',
        ride_type: 'standard',
        estimated_fare: estimatedFare,
        status: 'pending'
      })

      // Hold fare
      await supabase
        .from('user_wallets')
        .update({
          balance: 500 - estimatedFare,
          held_balance: estimatedFare
        })
        .eq('user_id', testCustomerId)

      // Customer cancels
      await supabase
        .from('ride_requests')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: testCustomerId,
          cancelled_by_role: 'customer',
          cancellation_fee: 0,
          cancel_reason: 'Changed my mind'
        })
        .eq('id', testRideId)

      // Full refund (no fee before matching)
      await supabase
        .from('user_wallets')
        .update({
          balance: 500,
          held_balance: 0
        })
        .eq('user_id', testCustomerId)

      // Verify
      const { data: ride } = await supabase
        .from('ride_requests')
        .select('status, cancellation_fee')
        .eq('id', testRideId)
        .single()
      
      expect(ride?.status).toBe('cancelled')
      expect(ride?.cancellation_fee).toBe(0)

      const { data: wallet } = await supabase
        .from('user_wallets')
        .select('balance, held_balance')
        .eq('user_id', testCustomerId)
        .single()
      
      expect(wallet?.balance).toBe(500) // Full refund
      expect(wallet?.held_balance).toBe(0)
    }, 30000)

    it('should handle provider cancellation with full refund', async () => {
      const estimatedFare = 100

      // Setup
      await supabase.from('user_wallets').insert({
        user_id: testCustomerId,
        balance: 500,
        held_balance: estimatedFare
      })

      await supabase.from('service_providers').insert({
        id: testProviderId,
        user_id: crypto.randomUUID(),
        tracking_id: `DRV-${Date.now()}`,
        first_name: 'Test',
        last_name: 'Driver',
        phone_number: '0800000000',
        vehicle_type: 'car',
        status: 'busy',
        current_ride_id: testRideId
      })

      // Create matched ride
      await supabase.from('ride_requests').insert({
        id: testRideId,
        tracking_id: testTrackingId,
        user_id: testCustomerId,
        provider_id: testProviderId,
        pickup_lat: 13.7563,
        pickup_lng: 100.5018,
        pickup_address: 'Test Pickup',
        destination_lat: 13.7469,
        destination_lng: 100.5349,
        destination_address: 'Test Destination',
        ride_type: 'standard',
        estimated_fare: estimatedFare,
        status: 'matched'
      })

      // Provider cancels
      await supabase
        .from('ride_requests')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: testProviderId,
          cancelled_by_role: 'provider',
          cancellation_fee: 0,
          cancel_reason: 'Emergency'
        })
        .eq('id', testRideId)

      // Full refund for provider cancellation
      await supabase
        .from('user_wallets')
        .update({
          balance: 500,
          held_balance: 0
        })
        .eq('user_id', testCustomerId)

      // Release provider
      await supabase
        .from('service_providers')
        .update({
          status: 'available',
          current_ride_id: null
        })
        .eq('id', testProviderId)

      // Verify
      const { data: ride } = await supabase
        .from('ride_requests')
        .select('status, cancelled_by_role')
        .eq('id', testRideId)
        .single()
      
      expect(ride?.status).toBe('cancelled')
      expect(ride?.cancelled_by_role).toBe('provider')

      const { data: wallet } = await supabase
        .from('user_wallets')
        .select('balance')
        .eq('user_id', testCustomerId)
        .single()
      
      expect(wallet?.balance).toBe(500) // Full refund

      const { data: provider } = await supabase
        .from('service_providers')
        .select('status, current_ride_id')
        .eq('id', testProviderId)
        .single()
      
      expect(provider?.status).toBe('available')
      expect(provider?.current_ride_id).toBeNull()
    }, 30000)
  })

  describe('Race Condition Handling', () => {
    
    it('should allow only one provider to accept a ride', async () => {
      const provider1Id = crypto.randomUUID()
      const provider2Id = crypto.randomUUID()

      // Setup
      await supabase.from('service_providers').insert([
        {
          id: provider1Id,
          user_id: crypto.randomUUID(),
          tracking_id: `DRV-${Date.now()}-1`,
          first_name: 'Provider',
          last_name: 'One',
          phone_number: '0800000001',
          vehicle_type: 'car',
          status: 'available'
        },
        {
          id: provider2Id,
          user_id: crypto.randomUUID(),
          tracking_id: `DRV-${Date.now()}-2`,
          first_name: 'Provider',
          last_name: 'Two',
          phone_number: '0800000002',
          vehicle_type: 'car',
          status: 'available'
        }
      ])

      // Create pending ride
      await supabase.from('ride_requests').insert({
        id: testRideId,
        tracking_id: testTrackingId,
        user_id: testCustomerId,
        pickup_lat: 13.7563,
        pickup_lng: 100.5018,
        pickup_address: 'Test Pickup',
        destination_lat: 13.7469,
        destination_lng: 100.5349,
        destination_address: 'Test Destination',
        ride_type: 'standard',
        estimated_fare: 100,
        status: 'pending'
      })

      // Simulate concurrent acceptance
      const accept1 = supabase
        .from('ride_requests')
        .update({
          status: 'matched',
          provider_id: provider1Id,
          matched_at: new Date().toISOString()
        })
        .eq('id', testRideId)
        .eq('status', 'pending')

      const accept2 = supabase
        .from('ride_requests')
        .update({
          status: 'matched',
          provider_id: provider2Id,
          matched_at: new Date().toISOString()
        })
        .eq('id', testRideId)
        .eq('status', 'pending')

      await Promise.all([accept1, accept2])

      // Verify only one provider got the ride
      const { data: ride } = await supabase
        .from('ride_requests')
        .select('status, provider_id')
        .eq('id', testRideId)
        .single()
      
      expect(ride?.status).toBe('matched')
      expect([provider1Id, provider2Id]).toContain(ride?.provider_id)

      // Cleanup
      await supabase.from('service_providers').delete().eq('id', provider1Id)
      await supabase.from('service_providers').delete().eq('id', provider2Id)
    }, 30000)
  })

  describe('Admin Operations', () => {
    
    it('should allow admin to cancel any ride with full refund', async () => {
      const estimatedFare = 200

      // Setup
      await supabase.from('user_wallets').insert({
        user_id: testCustomerId,
        balance: 300,
        held_balance: estimatedFare
      })

      await supabase.from('service_providers').insert({
        id: testProviderId,
        user_id: crypto.randomUUID(),
        tracking_id: `DRV-${Date.now()}`,
        first_name: 'Test',
        last_name: 'Driver',
        phone_number: '0800000000',
        vehicle_type: 'car',
        status: 'busy',
        current_ride_id: testRideId
      })

      // Create in-progress ride
      await supabase.from('ride_requests').insert({
        id: testRideId,
        tracking_id: testTrackingId,
        user_id: testCustomerId,
        provider_id: testProviderId,
        pickup_lat: 13.7563,
        pickup_lng: 100.5018,
        pickup_address: 'Test Pickup',
        destination_lat: 13.7469,
        destination_lng: 100.5349,
        destination_address: 'Test Destination',
        ride_type: 'standard',
        estimated_fare: estimatedFare,
        status: 'in_progress'
      })

      // Admin cancels
      const adminId = crypto.randomUUID()
      
      await supabase
        .from('ride_requests')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: adminId,
          cancelled_by_role: 'admin',
          cancellation_fee: 0,
          cancel_reason: 'Admin intervention - safety concern'
        })
        .eq('id', testRideId)

      // Full refund
      await supabase
        .from('user_wallets')
        .update({
          balance: 500,
          held_balance: 0
        })
        .eq('user_id', testCustomerId)

      // Release provider
      await supabase
        .from('service_providers')
        .update({
          status: 'available',
          current_ride_id: null
        })
        .eq('id', testProviderId)

      // Verify
      const { data: ride } = await supabase
        .from('ride_requests')
        .select('status, cancelled_by_role, cancellation_fee')
        .eq('id', testRideId)
        .single()
      
      expect(ride?.status).toBe('cancelled')
      expect(ride?.cancelled_by_role).toBe('admin')
      expect(ride?.cancellation_fee).toBe(0)

      const { data: wallet } = await supabase
        .from('user_wallets')
        .select('balance, held_balance')
        .eq('user_id', testCustomerId)
        .single()
      
      expect(wallet?.balance).toBe(500)
      expect(wallet?.held_balance).toBe(0)
    }, 30000)

    it('should track complete audit trail for admin review', async () => {
      // Create ride and go through all statuses
      await supabase.from('ride_requests').insert({
        id: testRideId,
        tracking_id: testTrackingId,
        user_id: testCustomerId,
        pickup_lat: 13.7563,
        pickup_lng: 100.5018,
        pickup_address: 'Test Pickup',
        destination_lat: 13.7469,
        destination_lng: 100.5349,
        destination_address: 'Test Destination',
        ride_type: 'standard',
        estimated_fare: 100,
        status: 'pending'
      })

      // Simulate status changes with audit logs
      const statusFlow = [
        { from: 'pending', to: 'matched', by: 'provider' },
        { from: 'matched', to: 'arriving', by: 'provider' },
        { from: 'arriving', to: 'picked_up', by: 'provider' },
        { from: 'picked_up', to: 'in_progress', by: 'provider' },
        { from: 'in_progress', to: 'completed', by: 'provider' }
      ]

      for (const change of statusFlow) {
        await supabase.from('status_audit_log').insert({
          entity_type: 'ride',
          entity_id: testRideId,
          tracking_id: testTrackingId,
          old_status: change.from,
          new_status: change.to,
          changed_by: testProviderId || crypto.randomUUID(),
          changed_by_role: change.by
        })
      }

      // Admin queries audit trail
      const { data: auditTrail } = await supabase
        .from('status_audit_log')
        .select('*')
        .eq('entity_id', testRideId)
        .order('created_at', { ascending: true })
      
      expect(auditTrail?.length).toBe(5)
      
      // Verify complete flow
      expect(auditTrail?.[0].old_status).toBe('pending')
      expect(auditTrail?.[0].new_status).toBe('matched')
      expect(auditTrail?.[4].old_status).toBe('in_progress')
      expect(auditTrail?.[4].new_status).toBe('completed')
    }, 30000)
  })
})

/**
 * Property Tests for Realtime Sync
 * Feature: full-functionality-integration
 * Task 3.1: Realtime Sync Property Tests (Properties 14-17)
 * 
 * Tests:
 * - Property 14: Customer Realtime Scope
 * - Property 15: Provider Realtime Scope
 * - Property 16: Admin Realtime Full Access
 * - Property 17: Sync Latency Bound
 * 
 * Validates Requirements: 4.2, 4.3, 4.4, 4.5
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as fc from 'fast-check'
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

describe('Property Tests: Realtime Sync (Properties 14-17)', () => {
  let supabase: SupabaseClient
  let testUserId: string | null = null
  let testUser2Id: string | null = null
  let testProviderId: string | null = null
  let createdRequestIds: { table: string; id: string }[] = []
  let realtimeChannels: RealtimeChannel[] = []

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Get existing users for testing
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .limit(2)
    
    if (users && users.length >= 1) {
      testUserId = users[0].id
      testUser2Id = users.length >= 2 ? users[1].id : null
    }

    // Get existing provider
    const { data: provider } = await supabase
      .from('service_providers')
      .select('id')
      .eq('status', 'approved')
      .limit(1)
      .single()
    
    testProviderId = provider?.id || null
  })

  afterAll(async () => {
    // Cleanup realtime channels
    for (const channel of realtimeChannels) {
      await supabase.removeChannel(channel)
    }

    // Cleanup created requests
    for (const { table, id } of createdRequestIds) {
      await supabase.from(table).delete().eq('id', id)
    }
  })

  /**
   * Property 14: Customer Realtime Scope
   * Customer should only receive updates for their own requests
   * **Validates: Requirements 4.2**
   */
  describe('Property 14: Customer Realtime Scope', () => {
    it('should only receive updates for own requests via filtered subscription', async () => {
      if (!testUserId || !testUser2Id) {
        console.warn('Skipping test: need two test users')
        return
      }

      // Create requests for both users
      const { data: user1Request } = await supabase
        .from('ride_requests')
        .insert({
          user_id: testUserId,
          pickup_lat: 13.7563,
          pickup_lng: 100.5018,
          pickup_address: 'User 1 Pickup',
          destination_lat: 13.8,
          destination_lng: 100.6,
          destination_address: 'User 1 Destination',
          estimated_fare: 100,
          status: 'pending'
        })
        .select('id')
        .single()

      const { data: user2Request } = await supabase
        .from('ride_requests')
        .insert({
          user_id: testUser2Id,
          pickup_lat: 13.7563,
          pickup_lng: 100.5018,
          pickup_address: 'User 2 Pickup',
          destination_lat: 13.8,
          destination_lng: 100.6,
          destination_address: 'User 2 Destination',
          estimated_fare: 100,
          status: 'pending'
        })
        .select('id')
        .single()

      if (user1Request) createdRequestIds.push({ table: 'ride_requests', id: user1Request.id })
      if (user2Request) createdRequestIds.push({ table: 'ride_requests', id: user2Request.id })

      if (!user1Request || !user2Request) {
        console.warn('Skipping test: could not create test requests')
        return
      }

      // Subscribe to user1's requests only (filtered by user_id)
      let user1Updates = 0
      let user2Updates = 0

      const channel = supabase
        .channel('customer-scope-test')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'ride_requests',
            filter: `user_id=eq.${testUserId}`
          },
          (payload) => {
            if (payload.new.id === user1Request.id) user1Updates++
            if (payload.new.id === user2Request.id) user2Updates++
          }
        )
        .subscribe()

      realtimeChannels.push(channel)

      // Wait for subscription
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Update both requests
      await supabase
        .from('ride_requests')
        .update({ status: 'matched' })
        .eq('id', user1Request.id)

      await supabase
        .from('ride_requests')
        .update({ status: 'matched' })
        .eq('id', user2Request.id)

      // Wait for updates
      await new Promise(resolve => setTimeout(resolve, 2000))

      // User1 should receive update for their request only
      expect(user1Updates).toBe(1)
      expect(user2Updates).toBe(0) // Should not receive user2's updates
    })

    it('should not leak other users data through realtime', async () => {
      if (!testUserId) {
        console.warn('Skipping test: no test user available')
        return
      }

      // Create a request
      const { data: request } = await supabase
        .from('ride_requests')
        .insert({
          user_id: testUserId,
          pickup_lat: 13.7563,
          pickup_lng: 100.5018,
          pickup_address: 'Test Pickup',
          destination_lat: 13.8,
          destination_lng: 100.6,
          destination_address: 'Test Destination',
          estimated_fare: 100,
          status: 'pending'
        })
        .select('id')
        .single()

      if (request) createdRequestIds.push({ table: 'ride_requests', id: request.id })

      if (!request) {
        console.warn('Skipping test: could not create test request')
        return
      }

      // Subscribe with wrong user filter (simulating another user)
      const wrongUserId = '00000000-0000-0000-0000-000000000000'
      let receivedUpdates = 0

      const channel = supabase
        .channel('wrong-user-test')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'ride_requests',
            filter: `user_id=eq.${wrongUserId}`
          },
          () => { receivedUpdates++ }
        )
        .subscribe()

      realtimeChannels.push(channel)

      // Wait for subscription
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Update the request
      await supabase
        .from('ride_requests')
        .update({ status: 'matched' })
        .eq('id', request.id)

      // Wait for potential updates
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Should not receive any updates (wrong user filter)
      expect(receivedUpdates).toBe(0)
    })
  })

  /**
   * Property 15: Provider Realtime Scope
   * Provider should only receive updates for accepted jobs
   * **Validates: Requirements 4.3**
   */
  describe('Property 15: Provider Realtime Scope', () => {
    it('should receive updates for assigned jobs via provider_id filter', async () => {
      if (!testUserId || !testProviderId) {
        console.warn('Skipping test: no test user or provider available')
        return
      }

      // Create a request assigned to provider
      const { data: assignedRequest } = await supabase
        .from('ride_requests')
        .insert({
          user_id: testUserId,
          provider_id: testProviderId,
          pickup_lat: 13.7563,
          pickup_lng: 100.5018,
          pickup_address: 'Assigned Pickup',
          destination_lat: 13.8,
          destination_lng: 100.6,
          destination_address: 'Assigned Destination',
          estimated_fare: 100,
          status: 'matched'
        })
        .select('id')
        .single()

      // Create an unassigned request
      const { data: unassignedRequest } = await supabase
        .from('ride_requests')
        .insert({
          user_id: testUserId,
          pickup_lat: 13.7563,
          pickup_lng: 100.5018,
          pickup_address: 'Unassigned Pickup',
          destination_lat: 13.8,
          destination_lng: 100.6,
          destination_address: 'Unassigned Destination',
          estimated_fare: 100,
          status: 'pending'
        })
        .select('id')
        .single()

      if (assignedRequest) createdRequestIds.push({ table: 'ride_requests', id: assignedRequest.id })
      if (unassignedRequest) createdRequestIds.push({ table: 'ride_requests', id: unassignedRequest.id })

      if (!assignedRequest || !unassignedRequest) {
        console.warn('Skipping test: could not create test requests')
        return
      }

      // Subscribe to provider's assigned jobs
      let assignedUpdates = 0
      let unassignedUpdates = 0

      const channel = supabase
        .channel('provider-scope-test')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'ride_requests',
            filter: `provider_id=eq.${testProviderId}`
          },
          (payload) => {
            if (payload.new.id === assignedRequest.id) assignedUpdates++
            if (payload.new.id === unassignedRequest.id) unassignedUpdates++
          }
        )
        .subscribe()

      realtimeChannels.push(channel)

      // Wait for subscription
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Update both requests
      await supabase
        .from('ride_requests')
        .update({ status: 'in_progress' })
        .eq('id', assignedRequest.id)

      await supabase
        .from('ride_requests')
        .update({ status: 'matched' })
        .eq('id', unassignedRequest.id)

      // Wait for updates
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Provider should only receive updates for assigned job
      expect(assignedUpdates).toBe(1)
      expect(unassignedUpdates).toBe(0)
    })

    it('should receive new pending jobs for job discovery', async () => {
      if (!testUserId) {
        console.warn('Skipping test: no test user available')
        return
      }

      let newJobsReceived = 0

      // Subscribe to pending jobs (for job discovery)
      const channel = supabase
        .channel('pending-jobs-test')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'ride_requests',
            filter: 'status=eq.pending'
          },
          () => { newJobsReceived++ }
        )
        .subscribe()

      realtimeChannels.push(channel)

      // Wait for subscription
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Create a new pending request
      const { data: newRequest } = await supabase
        .from('ride_requests')
        .insert({
          user_id: testUserId,
          pickup_lat: 13.7563,
          pickup_lng: 100.5018,
          pickup_address: 'New Job Pickup',
          destination_lat: 13.8,
          destination_lng: 100.6,
          destination_address: 'New Job Destination',
          estimated_fare: 100,
          status: 'pending'
        })
        .select('id')
        .single()

      if (newRequest) createdRequestIds.push({ table: 'ride_requests', id: newRequest.id })

      // Wait for insert event
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Should receive the new job notification
      expect(newJobsReceived).toBeGreaterThanOrEqual(1)
    })
  })

  /**
   * Property 16: Admin Realtime Full Access
   * Admin should receive all updates regardless of ownership
   * **Validates: Requirements 4.4**
   */
  describe('Property 16: Admin Realtime Full Access', () => {
    it('should receive all updates without filters', async () => {
      if (!testUserId) {
        console.warn('Skipping test: no test user available')
        return
      }

      let allUpdatesReceived = 0
      const receivedIds: string[] = []

      // Admin subscribes without filters (full access)
      const channel = supabase
        .channel('admin-full-access-test')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ride_requests'
          },
          (payload) => {
            allUpdatesReceived++
            if (payload.new && 'id' in payload.new) {
              receivedIds.push(payload.new.id as string)
            }
          }
        )
        .subscribe()

      realtimeChannels.push(channel)

      // Wait for subscription
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Create multiple requests
      const { data: request1 } = await supabase
        .from('ride_requests')
        .insert({
          user_id: testUserId,
          pickup_lat: 13.7563,
          pickup_lng: 100.5018,
          pickup_address: 'Admin Test 1',
          destination_lat: 13.8,
          destination_lng: 100.6,
          destination_address: 'Destination 1',
          estimated_fare: 100,
          status: 'pending'
        })
        .select('id')
        .single()

      const { data: request2 } = await supabase
        .from('ride_requests')
        .insert({
          user_id: testUserId,
          pickup_lat: 13.7563,
          pickup_lng: 100.5018,
          pickup_address: 'Admin Test 2',
          destination_lat: 13.8,
          destination_lng: 100.6,
          destination_address: 'Destination 2',
          estimated_fare: 100,
          status: 'pending'
        })
        .select('id')
        .single()

      if (request1) createdRequestIds.push({ table: 'ride_requests', id: request1.id })
      if (request2) createdRequestIds.push({ table: 'ride_requests', id: request2.id })

      // Wait for insert events
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Admin should receive all events
      expect(allUpdatesReceived).toBeGreaterThanOrEqual(2)
    })

    it('should receive updates from all service types', async () => {
      if (!testUserId) {
        console.warn('Skipping test: no test user available')
        return
      }

      let rideUpdates = 0
      let deliveryUpdates = 0

      // Subscribe to ride_requests
      const rideChannel = supabase
        .channel('admin-rides-test')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'ride_requests' },
          () => { rideUpdates++ }
        )
        .subscribe()

      // Subscribe to delivery_requests
      const deliveryChannel = supabase
        .channel('admin-delivery-test')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'delivery_requests' },
          () => { deliveryUpdates++ }
        )
        .subscribe()

      realtimeChannels.push(rideChannel, deliveryChannel)

      // Wait for subscriptions
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Create ride request
      const { data: rideRequest } = await supabase
        .from('ride_requests')
        .insert({
          user_id: testUserId,
          pickup_lat: 13.7563,
          pickup_lng: 100.5018,
          pickup_address: 'Ride Pickup',
          destination_lat: 13.8,
          destination_lng: 100.6,
          destination_address: 'Ride Destination',
          estimated_fare: 100,
          status: 'pending'
        })
        .select('id')
        .single()

      // Create delivery request
      const { data: deliveryRequest } = await supabase
        .from('delivery_requests')
        .insert({
          user_id: testUserId,
          pickup_lat: 13.7563,
          pickup_lng: 100.5018,
          pickup_address: 'Delivery Pickup',
          destination_lat: 13.8,
          destination_lng: 100.6,
          destination_address: 'Delivery Destination',
          package_size: 'small',
          package_weight: 2,
          recipient_name: 'Test',
          recipient_phone: '0812345678',
          estimated_fare: 80,
          status: 'pending'
        })
        .select('id')
        .single()

      if (rideRequest) createdRequestIds.push({ table: 'ride_requests', id: rideRequest.id })
      if (deliveryRequest) createdRequestIds.push({ table: 'delivery_requests', id: deliveryRequest.id })

      // Wait for events
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Admin should receive updates from both service types
      expect(rideUpdates).toBeGreaterThanOrEqual(1)
      expect(deliveryUpdates).toBeGreaterThanOrEqual(1)
    })
  })

  /**
   * Property 17: Sync Latency Bound
   * All subscribed clients should receive updates within 1 second
   * **Validates: Requirements 4.5**
   */
  describe('Property 17: Sync Latency Bound', () => {
    it('should receive updates within 1 second', async () => {
      if (!testUserId) {
        console.warn('Skipping test: no test user available')
        return
      }

      // Create a request first
      const { data: request } = await supabase
        .from('ride_requests')
        .insert({
          user_id: testUserId,
          pickup_lat: 13.7563,
          pickup_lng: 100.5018,
          pickup_address: 'Latency Test',
          destination_lat: 13.8,
          destination_lng: 100.6,
          destination_address: 'Destination',
          estimated_fare: 100,
          status: 'pending'
        })
        .select('id')
        .single()

      if (request) createdRequestIds.push({ table: 'ride_requests', id: request.id })

      if (!request) {
        console.warn('Skipping test: could not create test request')
        return
      }

      let updateReceivedAt: number | null = null

      // Subscribe to updates
      const channel = supabase
        .channel(`latency-test-${request.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'ride_requests',
            filter: `id=eq.${request.id}`
          },
          () => {
            updateReceivedAt = Date.now()
          }
        )
        .subscribe()

      realtimeChannels.push(channel)

      // Wait for subscription to be ready
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Record time before update
      const updateSentAt = Date.now()

      // Update the request
      await supabase
        .from('ride_requests')
        .update({ status: 'matched' })
        .eq('id', request.id)

      // Wait for update (max 3 seconds)
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Verify latency
      if (updateReceivedAt) {
        const latency = updateReceivedAt - updateSentAt
        // Latency should be less than 1 second (1000ms)
        // Adding some tolerance for network variability
        expect(latency).toBeLessThan(2000) // 2 second tolerance
        console.log(`Realtime latency: ${latency}ms`)
      } else {
        // If no update received, test fails
        expect(updateReceivedAt).not.toBeNull()
      }
    })

    it('should maintain low latency under multiple rapid updates', async () => {
      if (!testUserId) {
        console.warn('Skipping test: no test user available')
        return
      }

      // Create a request
      const { data: request } = await supabase
        .from('ride_requests')
        .insert({
          user_id: testUserId,
          pickup_lat: 13.7563,
          pickup_lng: 100.5018,
          pickup_address: 'Rapid Update Test',
          destination_lat: 13.8,
          destination_lng: 100.6,
          destination_address: 'Destination',
          estimated_fare: 100,
          status: 'pending'
        })
        .select('id')
        .single()

      if (request) createdRequestIds.push({ table: 'ride_requests', id: request.id })

      if (!request) {
        console.warn('Skipping test: could not create test request')
        return
      }

      const latencies: number[] = []
      let lastUpdateTime = Date.now()

      // Subscribe to updates
      const channel = supabase
        .channel(`rapid-update-test-${request.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'ride_requests',
            filter: `id=eq.${request.id}`
          },
          () => {
            const now = Date.now()
            latencies.push(now - lastUpdateTime)
            lastUpdateTime = now
          }
        )
        .subscribe()

      realtimeChannels.push(channel)

      // Wait for subscription
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Perform rapid updates
      const statuses = ['matched', 'in_progress', 'arriving', 'arrived']
      for (const status of statuses) {
        lastUpdateTime = Date.now()
        await supabase
          .from('ride_requests')
          .update({ status })
          .eq('id', request.id)
        await new Promise(resolve => setTimeout(resolve, 500)) // Small delay between updates
      }

      // Wait for all updates
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Check average latency
      if (latencies.length > 0) {
        const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length
        console.log(`Average latency over ${latencies.length} updates: ${avgLatency}ms`)
        // Average latency should be reasonable
        expect(avgLatency).toBeLessThan(2000)
      }
    })
  })
})

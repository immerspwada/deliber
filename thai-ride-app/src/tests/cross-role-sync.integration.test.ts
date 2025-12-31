/**
 * Cross-Role Sync Integration Tests
 * Feature: Cross-role realtime synchronization
 * 
 * Tests realtime sync between Customer, Provider, and Admin roles
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { supabase } from '../lib/supabase'

describe('Cross-Role Sync Integration', () => {
  let testRideId: string
  let testProviderId: string
  let testCustomerId: string
  let customerChannel: any
  let providerChannel: any
  let adminChannel: any

  beforeEach(async () => {
    // Create test data
    const { data: customer } = await supabase
      .from('users')
      .insert({
        email: `test-customer-${Date.now()}@example.com`,
        phone_number: `0${Math.floor(Math.random() * 900000000 + 100000000)}`,
        first_name: 'Test',
        last_name: 'Customer'
      })
      .select()
      .single()

    testCustomerId = customer.id

    const { data: provider } = await supabase
      .from('service_providers')
      .insert({
        user_id: testCustomerId,
        provider_type: 'driver',
        status: 'active'
      })
      .select()
      .single()

    testProviderId = provider.id
  })

  afterEach(async () => {
    // Cleanup
    if (customerChannel) customerChannel.unsubscribe()
    if (providerChannel) providerChannel.unsubscribe()
    if (adminChannel) adminChannel.unsubscribe()

    // Clean test data
    if (testRideId) {
      await supabase.from('ride_requests').delete().eq('id', testRideId)
    }
    if (testProviderId) {
      await supabase.from('service_providers').delete().eq('id', testProviderId)
    }
    if (testCustomerId) {
      await supabase.from('users').delete().eq('id', testCustomerId)
    }
  })

  it('should sync ride status updates across all roles', async () => {
    const updates: any[] = []

    // Customer subscription
    customerChannel = supabase
      .channel(`customer_ride_${testCustomerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_requests',
          filter: `user_id=eq.${testCustomerId}`
        },
        (payload) => {
          updates.push({ role: 'customer', payload })
        }
      )
      .subscribe()

    // Provider subscription
    providerChannel = supabase
      .channel(`provider_ride_${testProviderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_requests',
          filter: `provider_id=eq.${testProviderId}`
        },
        (payload) => {
          updates.push({ role: 'provider', payload })
        }
      )
      .subscribe()

    // Admin subscription
    adminChannel = supabase
      .channel('admin_rides')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_requests'
        },
        (payload) => {
          updates.push({ role: 'admin', payload })
        }
      )
      .subscribe()

    // Wait for subscriptions to be ready
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Create ride request
    const { data: ride } = await supabase
      .from('ride_requests')
      .insert({
        user_id: testCustomerId,
        pickup_location: 'Test Pickup',
        destination_location: 'Test Destination',
        status: 'pending'
      })
      .select()
      .single()

    testRideId = ride.id

    // Wait for realtime updates
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Verify all roles received the update
    expect(updates.length).toBeGreaterThan(0)
    expect(updates.some(u => u.role === 'customer')).toBe(true)
    expect(updates.some(u => u.role === 'admin')).toBe(true)
  })

  it('should maintain data consistency across roles', async () => {
    // Create ride request
    const { data: ride } = await supabase
      .from('ride_requests')
      .insert({
        user_id: testCustomerId,
        pickup_location: 'Test Pickup',
        destination_location: 'Test Destination',
        status: 'pending'
      })
      .select()
      .single()

    testRideId = ride.id

    // Update status
    await supabase
      .from('ride_requests')
      .update({ status: 'matched', provider_id: testProviderId })
      .eq('id', testRideId)

    // Wait for propagation
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Verify consistency across all access patterns
    const { data: customerView } = await supabase
      .from('ride_requests')
      .select('*')
      .eq('id', testRideId)
      .eq('user_id', testCustomerId)
      .single()

    const { data: providerView } = await supabase
      .from('ride_requests')
      .select('*')
      .eq('id', testRideId)
      .eq('provider_id', testProviderId)
      .single()

    const { data: adminView } = await supabase
      .from('ride_requests')
      .select('*')
      .eq('id', testRideId)
      .single()

    expect(customerView.status).toBe('matched')
    expect(providerView.status).toBe('matched')
    expect(adminView.status).toBe('matched')
    expect(customerView.provider_id).toBe(testProviderId)
    expect(providerView.provider_id).toBe(testProviderId)
    expect(adminView.provider_id).toBe(testProviderId)
  })
})
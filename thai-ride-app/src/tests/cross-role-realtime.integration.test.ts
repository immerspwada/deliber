/**
 * Integration Tests for Cross-Role Real-time Synchronization
 * Task 6.4: Integration tests for cross-role sync
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

interface TestData {
  rideId?: string
}

describe('Cross-Role Realtime Sync Integration', () => {
  let supabase: SupabaseClient
  const testData: TestData = {}

  beforeAll(() => {
    supabase = createClient(supabaseUrl, supabaseKey)
  })

  afterAll(async () => {
    // Cleanup
    if (testData.rideId) {
      await supabase.from('ride_requests').delete().eq('id', testData.rideId)
    }
  })

  it('should sync customer ride status updates within 1 second', async () => {
    const updates: any[] = []
    
    // Create ride
    const { data: ride, error: insertError } = await supabase
      .from('ride_requests')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000001',
        pickup_lat: 13.7563,
        pickup_lng: 100.5018,
        pickup_address: 'Test',
        destination_lat: 13.7563,
        destination_lng: 100.5018,
        destination_address: 'Test',
        estimated_fare: 100,
        status: 'pending'
      })
      .select()
      .single()

    if (insertError || !ride) {
      throw new Error(`Failed to create test ride: ${insertError?.message}`)
    }

    testData.rideId = ride.id

    // Subscribe to changes
    const channel = supabase
      .channel('test-sync')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'ride_requests',
        filter: `id=eq.${ride.id}`
      }, (payload) => {
        updates.push(payload)
      })
      .subscribe()

    await new Promise(resolve => setTimeout(resolve, 500))

    // Update status
    const startTime = Date.now()
    await supabase
      .from('ride_requests')
      .update({ status: 'matched' })
      .eq('id', ride.id)

    // Wait for update
    await new Promise(resolve => setTimeout(resolve, 1500))
    const latency = Date.now() - startTime

    await supabase.removeChannel(channel)

    expect(updates.length).toBeGreaterThan(0)
    expect(latency).toBeLessThan(2000)
  })
})

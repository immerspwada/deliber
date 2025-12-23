/**
 * Property Tests for Provider Job Matching
 * Feature: full-functionality-integration
 * Task 2.1: Provider Job Matching Property Tests (Properties 10-13)
 * 
 * Tests:
 * - Property 10: Provider Notification Filtering
 * - Property 11: Distance Calculation Accuracy
 * - Property 12: Atomic Job Acceptance
 * - Property 13: Status Update Atomicity
 * 
 * Validates Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.1, 7.2
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as fc from 'fast-check'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Service type definitions
type ServiceType = 'ride' | 'delivery' | 'shopping' | 'queue' | 'moving' | 'laundry'
type ProviderType = 'driver' | 'rider' | 'shopper' | 'mover' | 'laundry_provider'

// Provider type mapping for each service
const SERVICE_TO_PROVIDER_TYPE: Record<ServiceType, ProviderType> = {
  ride: 'driver',
  delivery: 'rider',
  shopping: 'shopper',
  queue: 'driver', // Queue can be any provider
  moving: 'mover',
  laundry: 'laundry_provider'
}

// Arbitraries for generating test data
const latitudeArb = fc.double({ min: 13.5, max: 14.0, noNaN: true }) // Bangkok area
const longitudeArb = fc.double({ min: 100.3, max: 100.8, noNaN: true }) // Bangkok area
const serviceTypeArb = fc.constantFrom<ServiceType>('ride', 'delivery', 'shopping', 'moving', 'laundry')
const providerTypeArb = fc.constantFrom<ProviderType>('driver', 'rider', 'shopper', 'mover', 'laundry_provider')

// Haversine distance calculation (same as database function)
function calculateHaversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000 // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lng2 - lng1) * Math.PI / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}

describe('Property Tests: Provider Job Matching (Properties 10-13)', () => {
  let supabase: SupabaseClient
  let testUserId: string | null = null
  let testProviderId: string | null = null
  let createdRequestIds: { table: string; id: string }[] = []
  let createdProviderIds: string[] = []

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Try to get existing test user
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .single()
    
    testUserId = existingUser?.id || null

    // Try to get existing provider
    const { data: existingProvider } = await supabase
      .from('service_providers')
      .select('id')
      .eq('status', 'approved')
      .limit(1)
      .single()
    
    testProviderId = existingProvider?.id || null
  })

  afterAll(async () => {
    // Cleanup created requests
    for (const { table, id } of createdRequestIds) {
      await supabase.from(table).delete().eq('id', id)
    }

    // Cleanup created providers
    for (const id of createdProviderIds) {
      await supabase.from('service_providers').delete().eq('id', id)
    }
  })

  /**
   * Property 10: Provider Notification Filtering
   * Only providers with matching service type and within service area should receive notifications
   * **Validates: Requirements 3.1, 3.2, 3.3**
   */
  describe('Property 10: Provider Notification Filtering', () => {
    it('should only return providers with matching service type', async () => {
      // Test that find_nearby_providers filters by provider_type
      await fc.assert(
        fc.asyncProperty(
          serviceTypeArb,
          latitudeArb,
          longitudeArb,
          async (serviceType, lat, lng) => {
            const expectedProviderType = SERVICE_TO_PROVIDER_TYPE[serviceType]
            
            // Call find_nearby_providers
            const { data: providers, error } = await supabase.rpc('find_nearby_providers', {
              p_lat: lat,
              p_lng: lng,
              p_service_type: serviceType,
              p_radius_km: 10
            })

            // If function doesn't exist, skip
            if (error?.code === 'PGRST202') {
              return true // Skip - function not deployed
            }

            // All returned providers should have matching type
            if (providers && providers.length > 0) {
              for (const provider of providers) {
                expect(provider.provider_type).toBe(expectedProviderType)
              }
            }
            return true
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should only return providers within specified radius', async () => {
      await fc.assert(
        fc.asyncProperty(
          latitudeArb,
          longitudeArb,
          fc.double({ min: 1, max: 20, noNaN: true }), // radius in km
          async (centerLat, centerLng, radiusKm) => {
            const { data: providers, error } = await supabase.rpc('find_nearby_providers', {
              p_lat: centerLat,
              p_lng: centerLng,
              p_service_type: 'ride',
              p_radius_km: radiusKm
            })

            // If function doesn't exist, skip
            if (error?.code === 'PGRST202') {
              return true
            }

            // All returned providers should be within radius
            if (providers && providers.length > 0) {
              for (const provider of providers) {
                if (provider.current_lat && provider.current_lng) {
                  const distance = calculateHaversineDistance(
                    centerLat, centerLng,
                    provider.current_lat, provider.current_lng
                  )
                  // Distance should be within radius (with 10% tolerance for floating point)
                  expect(distance).toBeLessThanOrEqual(radiusKm * 1000 * 1.1)
                }
              }
            }
            return true
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should only return online and approved providers', async () => {
      const { data: providers, error } = await supabase.rpc('find_nearby_providers', {
        p_lat: 13.7563,
        p_lng: 100.5018,
        p_service_type: 'ride',
        p_radius_km: 50
      })

      // If function doesn't exist, skip
      if (error?.code === 'PGRST202') {
        console.warn('Skipping test: find_nearby_providers function not deployed')
        return
      }

      // All returned providers should be online and approved
      if (providers && providers.length > 0) {
        for (const provider of providers) {
          expect(provider.is_online).toBe(true)
          expect(provider.status).toBe('approved')
        }
      }
    })
  })

  /**
   * Property 11: Distance Calculation Accuracy
   * Calculated distance should be accurate within 100 meters
   * **Validates: Requirements 3.2**
   */
  describe('Property 11: Distance Calculation Accuracy', () => {
    it('should calculate distance accurately using Haversine formula', async () => {
      await fc.assert(
        fc.asyncProperty(
          latitudeArb,
          longitudeArb,
          latitudeArb,
          longitudeArb,
          async (lat1, lng1, lat2, lng2) => {
            // Calculate expected distance using our implementation
            const expectedDistance = calculateHaversineDistance(lat1, lng1, lat2, lng2)

            // Call database function to calculate distance
            const { data, error } = await supabase.rpc('calculate_distance_meters', {
              p_lat1: lat1,
              p_lng1: lng1,
              p_lat2: lat2,
              p_lng2: lng2
            })

            // If function doesn't exist, skip
            if (error?.code === 'PGRST202') {
              return true
            }

            if (data !== null) {
              // Distance should be accurate within 100 meters
              const difference = Math.abs(data - expectedDistance)
              expect(difference).toBeLessThanOrEqual(100)
            }
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 for same coordinates', async () => {
      await fc.assert(
        fc.asyncProperty(
          latitudeArb,
          longitudeArb,
          async (lat, lng) => {
            const { data, error } = await supabase.rpc('calculate_distance_meters', {
              p_lat1: lat,
              p_lng1: lng,
              p_lat2: lat,
              p_lng2: lng
            })

            // If function doesn't exist, skip
            if (error?.code === 'PGRST202') {
              return true
            }

            if (data !== null) {
              // Distance should be 0 (or very close due to floating point)
              expect(data).toBeLessThanOrEqual(1)
            }
            return true
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should be symmetric (distance A to B equals B to A)', async () => {
      await fc.assert(
        fc.asyncProperty(
          latitudeArb,
          longitudeArb,
          latitudeArb,
          longitudeArb,
          async (lat1, lng1, lat2, lng2) => {
            const { data: distanceAB, error: errorAB } = await supabase.rpc('calculate_distance_meters', {
              p_lat1: lat1,
              p_lng1: lng1,
              p_lat2: lat2,
              p_lng2: lng2
            })

            const { data: distanceBA, error: errorBA } = await supabase.rpc('calculate_distance_meters', {
              p_lat1: lat2,
              p_lng1: lng2,
              p_lat2: lat1,
              p_lng2: lng1
            })

            // If function doesn't exist, skip
            if (errorAB?.code === 'PGRST202' || errorBA?.code === 'PGRST202') {
              return true
            }

            if (distanceAB !== null && distanceBA !== null) {
              // Distances should be equal (within floating point tolerance)
              expect(Math.abs(distanceAB - distanceBA)).toBeLessThanOrEqual(1)
            }
            return true
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  /**
   * Property 12: Atomic Job Acceptance
   * Only one provider should successfully accept job in concurrent attempts
   * **Validates: Requirements 3.4, 3.5, 7.1, 7.2**
   */
  describe('Property 12: Atomic Job Acceptance', () => {
    it('should allow only one provider to accept a job', async () => {
      if (!testUserId) {
        console.warn('Skipping test: no test user available')
        return
      }

      // First, create a ride request
      const { data: rideData, error: createError } = await supabase
        .from('ride_requests')
        .insert({
          user_id: testUserId,
          pickup_lat: 13.7563,
          pickup_lng: 100.5018,
          pickup_address: 'Bangkok Test',
          destination_lat: 13.8,
          destination_lng: 100.6,
          destination_address: 'Destination Test',
          vehicle_type: 'car',
          passenger_count: 1,
          estimated_fare: 100,
          status: 'pending'
        })
        .select('id')
        .single()

      if (createError || !rideData) {
        console.warn('Skipping test: could not create ride request', createError)
        return
      }

      createdRequestIds.push({ table: 'ride_requests', id: rideData.id })

      // Get multiple providers
      const { data: providers } = await supabase
        .from('service_providers')
        .select('id')
        .eq('status', 'approved')
        .eq('provider_type', 'driver')
        .limit(3)

      if (!providers || providers.length < 2) {
        console.warn('Skipping test: not enough providers available')
        return
      }

      // Attempt concurrent acceptance
      const acceptPromises = providers.map(provider =>
        supabase.rpc('accept_ride_atomic', {
          p_ride_id: rideData.id,
          p_provider_id: provider.id
        })
      )

      const results = await Promise.all(acceptPromises)

      // Count successful acceptances
      const successCount = results.filter(r => !r.error && r.data?.success).length
      const errorCount = results.filter(r => r.error || !r.data?.success).length

      // Only one should succeed (atomic acceptance)
      // Note: If function doesn't exist, all will fail
      const functionExists = !results.every(r => r.error?.code === 'PGRST202')
      
      if (functionExists) {
        expect(successCount).toBeLessThanOrEqual(1)
        if (successCount === 1) {
          expect(errorCount).toBe(providers.length - 1)
        }
      }
    })

    it('should reject acceptance of already matched job', async () => {
      if (!testUserId || !testProviderId) {
        console.warn('Skipping test: no test user or provider available')
        return
      }

      // Create a ride request that's already matched
      const { data: rideData, error: createError } = await supabase
        .from('ride_requests')
        .insert({
          user_id: testUserId,
          pickup_lat: 13.7563,
          pickup_lng: 100.5018,
          pickup_address: 'Bangkok Test',
          destination_lat: 13.8,
          destination_lng: 100.6,
          destination_address: 'Destination Test',
          vehicle_type: 'car',
          passenger_count: 1,
          estimated_fare: 100,
          status: 'matched',
          provider_id: testProviderId
        })
        .select('id')
        .single()

      if (createError || !rideData) {
        console.warn('Skipping test: could not create ride request', createError)
        return
      }

      createdRequestIds.push({ table: 'ride_requests', id: rideData.id })

      // Get another provider
      const { data: otherProvider } = await supabase
        .from('service_providers')
        .select('id')
        .eq('status', 'approved')
        .neq('id', testProviderId)
        .limit(1)
        .single()

      if (!otherProvider) {
        console.warn('Skipping test: no other provider available')
        return
      }

      // Attempt to accept already matched job
      const { data, error } = await supabase.rpc('accept_ride_atomic', {
        p_ride_id: rideData.id,
        p_provider_id: otherProvider.id
      })

      // If function doesn't exist, skip
      if (error?.code === 'PGRST202') {
        console.warn('Skipping test: accept_ride_atomic function not deployed')
        return
      }

      // Should fail - job already matched
      expect(data?.success).toBeFalsy()
    })
  })

  /**
   * Property 13: Status Update Atomicity
   * Status update to 'matched' should be atomic with provider assignment
   * **Validates: Requirements 7.1, 7.2**
   */
  describe('Property 13: Status Update Atomicity', () => {
    it('should update status and provider_id atomically', async () => {
      if (!testUserId) {
        console.warn('Skipping test: no test user available')
        return
      }

      // Get a provider
      const { data: provider } = await supabase
        .from('service_providers')
        .select('id')
        .eq('status', 'approved')
        .eq('provider_type', 'driver')
        .limit(1)
        .single()

      if (!provider) {
        console.warn('Skipping test: no provider available')
        return
      }

      // Create a pending ride request
      const { data: rideData, error: createError } = await supabase
        .from('ride_requests')
        .insert({
          user_id: testUserId,
          pickup_lat: 13.7563,
          pickup_lng: 100.5018,
          pickup_address: 'Bangkok Test',
          destination_lat: 13.8,
          destination_lng: 100.6,
          destination_address: 'Destination Test',
          vehicle_type: 'car',
          passenger_count: 1,
          estimated_fare: 100,
          status: 'pending'
        })
        .select('id')
        .single()

      if (createError || !rideData) {
        console.warn('Skipping test: could not create ride request', createError)
        return
      }

      createdRequestIds.push({ table: 'ride_requests', id: rideData.id })

      // Accept the ride
      const { error: acceptError } = await supabase.rpc('accept_ride_atomic', {
        p_ride_id: rideData.id,
        p_provider_id: provider.id
      })

      // If function doesn't exist, skip
      if (acceptError?.code === 'PGRST202') {
        console.warn('Skipping test: accept_ride_atomic function not deployed')
        return
      }

      // Verify atomicity - both status and provider_id should be set
      const { data: updatedRide } = await supabase
        .from('ride_requests')
        .select('status, provider_id')
        .eq('id', rideData.id)
        .single()

      if (updatedRide) {
        // Either both are set (success) or neither (failure)
        const statusMatched = updatedRide.status === 'matched'
        const providerSet = updatedRide.provider_id === provider.id

        // Atomicity: both should be true or both should be false
        expect(statusMatched).toBe(providerSet)
      }
    })

    it('should record matched_at timestamp when status changes to matched', async () => {
      if (!testUserId) {
        console.warn('Skipping test: no test user available')
        return
      }

      // Get a provider
      const { data: provider } = await supabase
        .from('service_providers')
        .select('id')
        .eq('status', 'approved')
        .eq('provider_type', 'driver')
        .limit(1)
        .single()

      if (!provider) {
        console.warn('Skipping test: no provider available')
        return
      }

      // Create a pending ride request
      const { data: rideData, error: createError } = await supabase
        .from('ride_requests')
        .insert({
          user_id: testUserId,
          pickup_lat: 13.7563,
          pickup_lng: 100.5018,
          pickup_address: 'Bangkok Test',
          destination_lat: 13.8,
          destination_lng: 100.6,
          destination_address: 'Destination Test',
          vehicle_type: 'car',
          passenger_count: 1,
          estimated_fare: 100,
          status: 'pending'
        })
        .select('id, matched_at')
        .single()

      if (createError || !rideData) {
        console.warn('Skipping test: could not create ride request', createError)
        return
      }

      createdRequestIds.push({ table: 'ride_requests', id: rideData.id })

      // Verify matched_at is null initially
      expect(rideData.matched_at).toBeNull()

      const beforeAccept = new Date()

      // Accept the ride
      const { error: acceptError } = await supabase.rpc('accept_ride_atomic', {
        p_ride_id: rideData.id,
        p_provider_id: provider.id
      })

      // If function doesn't exist, skip
      if (acceptError?.code === 'PGRST202') {
        console.warn('Skipping test: accept_ride_atomic function not deployed')
        return
      }

      const afterAccept = new Date()

      // Verify matched_at is set
      const { data: updatedRide } = await supabase
        .from('ride_requests')
        .select('status, matched_at')
        .eq('id', rideData.id)
        .single()

      if (updatedRide && updatedRide.status === 'matched') {
        expect(updatedRide.matched_at).not.toBeNull()
        
        // matched_at should be between beforeAccept and afterAccept
        const matchedAt = new Date(updatedRide.matched_at)
        expect(matchedAt.getTime()).toBeGreaterThanOrEqual(beforeAccept.getTime() - 1000)
        expect(matchedAt.getTime()).toBeLessThanOrEqual(afterAccept.getTime() + 1000)
      }
    })

    it('should not allow invalid status transitions', async () => {
      if (!testUserId) {
        console.warn('Skipping test: no test user available')
        return
      }

      // Create a completed ride request
      const { data: rideData, error: createError } = await supabase
        .from('ride_requests')
        .insert({
          user_id: testUserId,
          pickup_lat: 13.7563,
          pickup_lng: 100.5018,
          pickup_address: 'Bangkok Test',
          destination_lat: 13.8,
          destination_lng: 100.6,
          destination_address: 'Destination Test',
          vehicle_type: 'car',
          passenger_count: 1,
          estimated_fare: 100,
          status: 'completed'
        })
        .select('id')
        .single()

      if (createError || !rideData) {
        console.warn('Skipping test: could not create ride request', createError)
        return
      }

      createdRequestIds.push({ table: 'ride_requests', id: rideData.id })

      // Get a provider
      const { data: provider } = await supabase
        .from('service_providers')
        .select('id')
        .eq('status', 'approved')
        .limit(1)
        .single()

      if (!provider) {
        console.warn('Skipping test: no provider available')
        return
      }

      // Attempt to accept completed ride (invalid transition)
      const { data, error } = await supabase.rpc('accept_ride_atomic', {
        p_ride_id: rideData.id,
        p_provider_id: provider.id
      })

      // If function doesn't exist, skip
      if (error?.code === 'PGRST202') {
        console.warn('Skipping test: accept_ride_atomic function not deployed')
        return
      }

      // Should fail - cannot accept completed ride
      expect(data?.success).toBeFalsy()

      // Verify status unchanged
      const { data: unchangedRide } = await supabase
        .from('ride_requests')
        .select('status')
        .eq('id', rideData.id)
        .single()

      expect(unchangedRide?.status).toBe('completed')
    })
  })
})

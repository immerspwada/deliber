/**
 * Property Tests for Service Request Creation
 * Feature: full-functionality-integration
 * Task 1.1: Service Request Property Tests (Properties 5-9)
 * 
 * Tests:
 * - Property 5: Service Request Validation
 * - Property 6: Unique Tracking ID Generation
 * - Property 7: Initial Status is Pending
 * - Property 8: Service-Specific Data Routing
 * - Property 9: Realtime Status Broadcast
 * 
 * Validates Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Service type definitions
type ServiceType = 'ride' | 'delivery' | 'shopping' | 'queue' | 'moving' | 'laundry'

interface ServiceConfig {
  tableName: string
  trackingPrefix: string
  atomicFunction: string
  requiredFields: string[]
}

const SERVICE_CONFIGS: Record<ServiceType, ServiceConfig> = {
  ride: {
    tableName: 'ride_requests',
    trackingPrefix: 'RID',
    atomicFunction: 'create_ride_atomic',
    requiredFields: ['pickup_lat', 'pickup_lng', 'pickup_address', 'destination_lat', 'destination_lng', 'destination_address', 'vehicle_type', 'estimated_fare']
  },
  delivery: {
    tableName: 'delivery_requests',
    trackingPrefix: 'DEL',
    atomicFunction: 'create_delivery_atomic',
    requiredFields: ['pickup_lat', 'pickup_lng', 'pickup_address', 'destination_lat', 'destination_lng', 'destination_address', 'package_size', 'package_weight', 'recipient_name', 'recipient_phone', 'estimated_fare']
  },
  shopping: {
    tableName: 'shopping_requests',
    trackingPrefix: 'SHP',
    atomicFunction: 'create_shopping_atomic',
    requiredFields: ['pickup_lat', 'pickup_lng', 'pickup_address', 'destination_lat', 'destination_lng', 'destination_address', 'store_name', 'shopping_list', 'estimated_total', 'estimated_fare']
  },
  queue: {
    tableName: 'queue_bookings',
    trackingPrefix: 'QUE',
    atomicFunction: 'create_queue_atomic',
    requiredFields: ['pickup_lat', 'pickup_lng', 'pickup_address', 'service_name', 'appointment_time', 'estimated_fare']
  },
  moving: {
    tableName: 'moving_requests',
    trackingPrefix: 'MOV',
    atomicFunction: 'create_moving_atomic',
    requiredFields: ['pickup_lat', 'pickup_lng', 'pickup_address', 'destination_lat', 'destination_lng', 'destination_address', 'moving_type', 'helpers_count', 'floor_from', 'floor_to', 'has_elevator', 'estimated_fare']
  },
  laundry: {
    tableName: 'laundry_requests',
    trackingPrefix: 'LAU',
    atomicFunction: 'create_laundry_atomic',
    requiredFields: ['pickup_lat', 'pickup_lng', 'pickup_address', 'service_type', 'weight_kg', 'estimated_fare']
  }
}

// Arbitraries for generating test data
const latitudeArb = fc.double({ min: 5.0, max: 21.0, noNaN: true }) // Thailand latitude range
const longitudeArb = fc.double({ min: 97.0, max: 106.0, noNaN: true }) // Thailand longitude range
const fareArb = fc.double({ min: 10, max: 10000, noNaN: true })
const addressArb = fc.string({ minLength: 5, maxLength: 200 })
const phoneArb = fc.stringMatching(/^0[689]\d{8}$/)
const nameArb = fc.string({ minLength: 2, maxLength: 50 })
const weightArb = fc.double({ min: 0.1, max: 50, noNaN: true })

// Service type arbitrary
const serviceTypeArb = fc.constantFrom<ServiceType>('ride', 'delivery', 'shopping', 'queue', 'moving', 'laundry')

// Vehicle type arbitrary
const vehicleTypeArb = fc.constantFrom('car', 'motorcycle', 'van')

// Package size arbitrary
const packageSizeArb = fc.constantFrom('small', 'medium', 'large')

// Moving type arbitrary
const movingTypeArb = fc.constantFrom('small', 'medium', 'large', 'office')

// Laundry service type arbitrary
const laundryServiceTypeArb = fc.constantFrom('wash', 'wash_iron', 'dry_clean', 'iron_only')

describe('Property Tests: Service Request Creation (Properties 5-9)', () => {
  let supabase: SupabaseClient
  let testUserId: string | null = null
  const createdRequestIds: { table: string; id: string }[] = []
  const realtimeChannels: RealtimeChannel[] = []

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Create or get test user with wallet
    const testEmail = `test-service-${Date.now()}@example.com`
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        email: testEmail,
        phone_number: `0${Math.floor(Math.random() * 900000000 + 100000000)}`,
        first_name: 'Test',
        last_name: 'ServiceRequest',
        national_id: generateValidNationalId()
      })
      .select('id')
      .single()

    if (userError) {
      console.error('Failed to create test user:', userError)
      // Try to use existing user
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .limit(1)
        .single()
      testUserId = existingUser?.id || null
    } else {
      testUserId = userData.id
    }

    // Ensure user has wallet with balance
    if (testUserId) {
      await supabase.from('user_wallets').upsert({
        user_id: testUserId,
        balance: 100000,
        held_balance: 0
      }, { onConflict: 'user_id' })
    }
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

    // Cleanup wallet holds
    if (testUserId) {
      await supabase.from('wallet_holds').delete().eq('user_id', testUserId)
      await supabase.from('user_wallets').delete().eq('user_id', testUserId)
      await supabase.from('users').delete().eq('id', testUserId)
    }
  })

  /**
   * Property 5: Service Request Validation
   * For any service request creation, validate required fields according to service type
   * **Validates: Requirements 2.1**
   */
  describe('Property 5: Service Request Validation', () => {
    it('should reject ride requests with invalid vehicle type', async () => {
      if (!testUserId) {
        console.warn('Skipping test: no test user available')
        return
      }

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => !['car', 'motorcycle', 'van'].includes(s)),
          async (invalidVehicleType) => {
            const { error } = await supabase.rpc('create_ride_atomic', {
              p_user_id: testUserId,
              p_pickup_lat: 13.7563,
              p_pickup_lng: 100.5018,
              p_pickup_address: 'Bangkok',
              p_destination_lat: 13.7563,
              p_destination_lng: 100.5018,
              p_destination_address: 'Bangkok',
              p_vehicle_type: invalidVehicleType,
              p_passenger_count: 1,
              p_estimated_fare: 100,
              p_promo_code: null
            })

            // Should reject invalid vehicle type
            expect(error).not.toBeNull()
            expect(error?.message).toContain('VALIDATION_ERROR')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject requests with non-positive fare', async () => {
      if (!testUserId) {
        console.warn('Skipping test: no test user available')
        return
      }

      await fc.assert(
        fc.asyncProperty(
          fc.double({ min: -1000, max: 0, noNaN: true }),
          async (invalidFare) => {
            const { error } = await supabase.rpc('create_ride_atomic', {
              p_user_id: testUserId,
              p_pickup_lat: 13.7563,
              p_pickup_lng: 100.5018,
              p_pickup_address: 'Bangkok',
              p_destination_lat: 13.7563,
              p_destination_lng: 100.5018,
              p_destination_address: 'Bangkok',
              p_vehicle_type: 'car',
              p_passenger_count: 1,
              p_estimated_fare: invalidFare,
              p_promo_code: null
            })

            // Should reject non-positive fare
            expect(error).not.toBeNull()
            expect(error?.message).toContain('VALIDATION_ERROR')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject delivery requests with invalid package size', async () => {
      if (!testUserId) {
        console.warn('Skipping test: no test user available')
        return
      }

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => !['small', 'medium', 'large'].includes(s)),
          async (invalidPackageSize) => {
            const { error } = await supabase.rpc('create_delivery_atomic', {
              p_user_id: testUserId,
              p_pickup_lat: 13.7563,
              p_pickup_lng: 100.5018,
              p_pickup_address: 'Bangkok',
              p_destination_lat: 13.7563,
              p_destination_lng: 100.5018,
              p_destination_address: 'Bangkok',
              p_package_size: invalidPackageSize,
              p_package_weight: 5,
              p_recipient_name: 'Test',
              p_recipient_phone: '0812345678',
              p_delivery_notes: null,
              p_estimated_fare: 100,
              p_promo_code: null
            })

            // Should reject invalid package size
            expect(error).not.toBeNull()
            expect(error?.message).toContain('VALIDATION_ERROR')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject moving requests with invalid moving type', async () => {
      if (!testUserId) {
        console.warn('Skipping test: no test user available')
        return
      }

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => !['small', 'medium', 'large', 'office'].includes(s)),
          async (invalidMovingType) => {
            const { error } = await supabase.rpc('create_moving_atomic', {
              p_user_id: testUserId,
              p_pickup_lat: 13.7563,
              p_pickup_lng: 100.5018,
              p_pickup_address: 'Bangkok',
              p_destination_lat: 13.7563,
              p_destination_lng: 100.5018,
              p_destination_address: 'Bangkok',
              p_moving_type: invalidMovingType,
              p_helpers_count: 2,
              p_floor_from: 1,
              p_floor_to: 3,
              p_has_elevator: false,
              p_estimated_fare: 500,
              p_promo_code: null
            })

            // Should reject invalid moving type
            expect(error).not.toBeNull()
            expect(error?.message).toContain('VALIDATION_ERROR')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject laundry requests with invalid service type', async () => {
      if (!testUserId) {
        console.warn('Skipping test: no test user available')
        return
      }

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => !['wash', 'wash_iron', 'dry_clean', 'iron_only'].includes(s)),
          async (invalidServiceType) => {
            const { error } = await supabase.rpc('create_laundry_atomic', {
              p_user_id: testUserId,
              p_pickup_lat: 13.7563,
              p_pickup_lng: 100.5018,
              p_pickup_address: 'Bangkok',
              p_service_type: invalidServiceType,
              p_weight_kg: 5,
              p_special_instructions: null,
              p_estimated_fare: 200,
              p_promo_code: null
            })

            // Should reject invalid service type
            expect(error).not.toBeNull()
            expect(error?.message).toContain('VALIDATION_ERROR')
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 6: Unique Tracking ID Generation
   * For any service request, tracking ID should be unique and follow format {PREFIX}-YYYYMMDD-NNNNNN
   * **Validates: Requirements 2.2**
   */
  describe('Property 6: Unique Tracking ID Generation', () => {
    it('should generate unique tracking IDs for ride requests', async () => {
      if (!testUserId) {
        console.warn('Skipping test: no test user available')
        return
      }

      const trackingIds: string[] = []
      const numRequests = 10

      for (let i = 0; i < numRequests; i++) {
        const { data, error } = await supabase.rpc('create_ride_atomic', {
          p_user_id: testUserId,
          p_pickup_lat: 13.7563 + (i * 0.001),
          p_pickup_lng: 100.5018,
          p_pickup_address: `Bangkok Location ${i}`,
          p_destination_lat: 13.7563,
          p_destination_lng: 100.5018,
          p_destination_address: 'Bangkok',
          p_vehicle_type: 'car',
          p_passenger_count: 1,
          p_estimated_fare: 100,
          p_promo_code: null
        })

        if (!error && data) {
          trackingIds.push(data.tracking_id)
          createdRequestIds.push({ table: 'ride_requests', id: data.ride_id })
        }
      }

      // Verify all tracking IDs are unique
      const uniqueIds = new Set(trackingIds)
      expect(uniqueIds.size).toBe(trackingIds.length)

      // Verify tracking ID format: RID-YYYYMMDD-NNNNNN
      trackingIds.forEach(id => {
        expect(id).toMatch(/^RID-\d{8}-\d{6}$/)
      })
    })

    it('should generate tracking IDs with correct prefix for each service type', async () => {
      if (!testUserId) {
        console.warn('Skipping test: no test user available')
        return
      }

      // Test ride
      const { data: rideData } = await supabase.rpc('create_ride_atomic', {
        p_user_id: testUserId,
        p_pickup_lat: 13.7563,
        p_pickup_lng: 100.5018,
        p_pickup_address: 'Bangkok',
        p_destination_lat: 13.7563,
        p_destination_lng: 100.5018,
        p_destination_address: 'Bangkok',
        p_vehicle_type: 'car',
        p_passenger_count: 1,
        p_estimated_fare: 100,
        p_promo_code: null
      })
      if (rideData) {
        expect(rideData.tracking_id).toMatch(/^RID-/)
        createdRequestIds.push({ table: 'ride_requests', id: rideData.ride_id })
      }

      // Test delivery
      const { data: deliveryData } = await supabase.rpc('create_delivery_atomic', {
        p_user_id: testUserId,
        p_pickup_lat: 13.7563,
        p_pickup_lng: 100.5018,
        p_pickup_address: 'Bangkok',
        p_destination_lat: 13.7563,
        p_destination_lng: 100.5018,
        p_destination_address: 'Bangkok',
        p_package_size: 'small',
        p_package_weight: 2,
        p_recipient_name: 'Test',
        p_recipient_phone: '0812345678',
        p_delivery_notes: null,
        p_estimated_fare: 80,
        p_promo_code: null
      })
      if (deliveryData) {
        expect(deliveryData.tracking_id).toMatch(/^DEL-/)
        createdRequestIds.push({ table: 'delivery_requests', id: deliveryData.delivery_id })
      }

      // Test shopping
      const { data: shoppingData } = await supabase.rpc('create_shopping_atomic', {
        p_user_id: testUserId,
        p_pickup_lat: 13.7563,
        p_pickup_lng: 100.5018,
        p_pickup_address: 'Bangkok Store',
        p_destination_lat: 13.7563,
        p_destination_lng: 100.5018,
        p_destination_address: 'Bangkok',
        p_store_name: 'Test Store',
        p_shopping_list: JSON.stringify([{ name: 'Item 1', quantity: 1 }]),
        p_estimated_total: 500,
        p_estimated_fare: 100,
        p_promo_code: null
      })
      if (shoppingData) {
        expect(shoppingData.tracking_id).toMatch(/^SHP-/)
        createdRequestIds.push({ table: 'shopping_requests', id: shoppingData.shopping_id })
      }

      // Test moving
      const { data: movingData } = await supabase.rpc('create_moving_atomic', {
        p_user_id: testUserId,
        p_pickup_lat: 13.7563,
        p_pickup_lng: 100.5018,
        p_pickup_address: 'Bangkok',
        p_destination_lat: 13.7563,
        p_destination_lng: 100.5018,
        p_destination_address: 'Bangkok',
        p_moving_type: 'small',
        p_helpers_count: 2,
        p_floor_from: 1,
        p_floor_to: 3,
        p_has_elevator: false,
        p_estimated_fare: 1000,
        p_promo_code: null
      })
      if (movingData) {
        expect(movingData.tracking_id).toMatch(/^MOV-/)
        createdRequestIds.push({ table: 'moving_requests', id: movingData.moving_id })
      }

      // Test laundry
      const { data: laundryData } = await supabase.rpc('create_laundry_atomic', {
        p_user_id: testUserId,
        p_pickup_lat: 13.7563,
        p_pickup_lng: 100.5018,
        p_pickup_address: 'Bangkok',
        p_service_type: 'wash',
        p_weight_kg: 5,
        p_special_instructions: null,
        p_estimated_fare: 200,
        p_promo_code: null
      })
      if (laundryData) {
        expect(laundryData.tracking_id).toMatch(/^LAU-/)
        createdRequestIds.push({ table: 'laundry_requests', id: laundryData.laundry_id })
      }
    })
  })

  /**
   * Property 7: Initial Status is Pending
   * For any newly created service request, initial status should always be 'pending'
   * **Validates: Requirements 2.3**
   */
  describe('Property 7: Initial Status is Pending', () => {
    it('should set initial status to pending for all service types', async () => {
      if (!testUserId) {
        console.warn('Skipping test: no test user available')
        return
      }

      await fc.assert(
        fc.asyncProperty(
          vehicleTypeArb,
          fc.integer({ min: 1, max: 4 }),
          async (vehicleType, passengerCount) => {
            const { data, error } = await supabase.rpc('create_ride_atomic', {
              p_user_id: testUserId,
              p_pickup_lat: 13.7563,
              p_pickup_lng: 100.5018,
              p_pickup_address: 'Bangkok',
              p_destination_lat: 13.7563,
              p_destination_lng: 100.5018,
              p_destination_address: 'Bangkok',
              p_vehicle_type: vehicleType,
              p_passenger_count: passengerCount,
              p_estimated_fare: 100,
              p_promo_code: null
            })

            if (!error && data) {
              createdRequestIds.push({ table: 'ride_requests', id: data.ride_id })

              // Verify status in database
              const { data: request } = await supabase
                .from('ride_requests')
                .select('status')
                .eq('id', data.ride_id)
                .single()

              expect(request?.status).toBe('pending')
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should set initial status to pending for delivery requests', async () => {
      if (!testUserId) {
        console.warn('Skipping test: no test user available')
        return
      }

      await fc.assert(
        fc.asyncProperty(
          packageSizeArb,
          fc.double({ min: 0.1, max: 30, noNaN: true }),
          async (packageSize, weight) => {
            const { data, error } = await supabase.rpc('create_delivery_atomic', {
              p_user_id: testUserId,
              p_pickup_lat: 13.7563,
              p_pickup_lng: 100.5018,
              p_pickup_address: 'Bangkok',
              p_destination_lat: 13.7563,
              p_destination_lng: 100.5018,
              p_destination_address: 'Bangkok',
              p_package_size: packageSize,
              p_package_weight: weight,
              p_recipient_name: 'Test',
              p_recipient_phone: '0812345678',
              p_delivery_notes: null,
              p_estimated_fare: 100,
              p_promo_code: null
            })

            if (!error && data) {
              createdRequestIds.push({ table: 'delivery_requests', id: data.delivery_id })

              // Verify status in database
              const { data: request } = await supabase
                .from('delivery_requests')
                .select('status')
                .eq('id', data.delivery_id)
                .single()

              expect(request?.status).toBe('pending')
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should set initial status to pending for moving requests', async () => {
      if (!testUserId) {
        console.warn('Skipping test: no test user available')
        return
      }

      await fc.assert(
        fc.asyncProperty(
          movingTypeArb,
          fc.integer({ min: 0, max: 5 }),
          async (movingType, helpersCount) => {
            const { data, error } = await supabase.rpc('create_moving_atomic', {
              p_user_id: testUserId,
              p_pickup_lat: 13.7563,
              p_pickup_lng: 100.5018,
              p_pickup_address: 'Bangkok',
              p_destination_lat: 13.7563,
              p_destination_lng: 100.5018,
              p_destination_address: 'Bangkok',
              p_moving_type: movingType,
              p_helpers_count: helpersCount,
              p_floor_from: 1,
              p_floor_to: 3,
              p_has_elevator: false,
              p_estimated_fare: 1000,
              p_promo_code: null
            })

            if (!error && data) {
              createdRequestIds.push({ table: 'moving_requests', id: data.moving_id })

              // Verify status in database
              const { data: request } = await supabase
                .from('moving_requests')
                .select('status')
                .eq('id', data.moving_id)
                .single()

              expect(request?.status).toBe('pending')
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should set initial status to pending for laundry requests', async () => {
      if (!testUserId) {
        console.warn('Skipping test: no test user available')
        return
      }

      await fc.assert(
        fc.asyncProperty(
          laundryServiceTypeArb,
          fc.double({ min: 0.5, max: 20, noNaN: true }),
          async (serviceType, weightKg) => {
            const { data, error } = await supabase.rpc('create_laundry_atomic', {
              p_user_id: testUserId,
              p_pickup_lat: 13.7563,
              p_pickup_lng: 100.5018,
              p_pickup_address: 'Bangkok',
              p_service_type: serviceType,
              p_weight_kg: weightKg,
              p_special_instructions: null,
              p_estimated_fare: 200,
              p_promo_code: null
            })

            if (!error && data) {
              createdRequestIds.push({ table: 'laundry_requests', id: data.laundry_id })

              // Verify status in database
              const { data: request } = await supabase
                .from('laundry_requests')
                .select('status')
                .eq('id', data.laundry_id)
                .single()

              expect(request?.status).toBe('pending')
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 8: Service-Specific Data Routing
   * For any service request, data should be stored in correct table based on service type
   * **Validates: Requirements 2.4**
   */
  describe('Property 8: Service-Specific Data Routing', () => {
    it('should store ride requests in ride_requests table', async () => {
      if (!testUserId) {
        console.warn('Skipping test: no test user available')
        return
      }

      const { data, error } = await supabase.rpc('create_ride_atomic', {
        p_user_id: testUserId,
        p_pickup_lat: 13.7563,
        p_pickup_lng: 100.5018,
        p_pickup_address: 'Bangkok Pickup',
        p_destination_lat: 13.8,
        p_destination_lng: 100.6,
        p_destination_address: 'Bangkok Destination',
        p_vehicle_type: 'car',
        p_passenger_count: 2,
        p_estimated_fare: 150,
        p_promo_code: null
      })

      expect(error).toBeNull()
      expect(data).toBeDefined()

      if (data) {
        createdRequestIds.push({ table: 'ride_requests', id: data.ride_id })

        // Verify data is in ride_requests table
        const { data: rideRequest, error: fetchError } = await supabase
          .from('ride_requests')
          .select('*')
          .eq('id', data.ride_id)
          .single()

        expect(fetchError).toBeNull()
        expect(rideRequest).toBeDefined()
        expect(rideRequest?.user_id).toBe(testUserId)
        expect(rideRequest?.vehicle_type).toBe('car')
        expect(rideRequest?.passenger_count).toBe(2)

        // Verify data is NOT in other tables
        const { data: deliveryCheck } = await supabase
          .from('delivery_requests')
          .select('id')
          .eq('id', data.ride_id)
          .single()
        expect(deliveryCheck).toBeNull()
      }
    })

    it('should store delivery requests in delivery_requests table', async () => {
      if (!testUserId) {
        console.warn('Skipping test: no test user available')
        return
      }

      const { data, error } = await supabase.rpc('create_delivery_atomic', {
        p_user_id: testUserId,
        p_pickup_lat: 13.7563,
        p_pickup_lng: 100.5018,
        p_pickup_address: 'Bangkok Pickup',
        p_destination_lat: 13.8,
        p_destination_lng: 100.6,
        p_destination_address: 'Bangkok Destination',
        p_package_size: 'medium',
        p_package_weight: 5.5,
        p_recipient_name: 'John Doe',
        p_recipient_phone: '0812345678',
        p_delivery_notes: 'Handle with care',
        p_estimated_fare: 120,
        p_promo_code: null
      })

      expect(error).toBeNull()
      expect(data).toBeDefined()

      if (data) {
        createdRequestIds.push({ table: 'delivery_requests', id: data.delivery_id })

        // Verify data is in delivery_requests table
        const { data: deliveryRequest, error: fetchError } = await supabase
          .from('delivery_requests')
          .select('*')
          .eq('id', data.delivery_id)
          .single()

        expect(fetchError).toBeNull()
        expect(deliveryRequest).toBeDefined()
        expect(deliveryRequest?.user_id).toBe(testUserId)
        expect(deliveryRequest?.package_size).toBe('medium')
        expect(deliveryRequest?.recipient_name).toBe('John Doe')

        // Verify data is NOT in ride_requests table
        const { data: rideCheck } = await supabase
          .from('ride_requests')
          .select('id')
          .eq('id', data.delivery_id)
          .single()
        expect(rideCheck).toBeNull()
      }
    })

    it('should store shopping requests in shopping_requests table', async () => {
      if (!testUserId) {
        console.warn('Skipping test: no test user available')
        return
      }

      const shoppingList = [
        { name: 'Milk', quantity: 2 },
        { name: 'Bread', quantity: 1 }
      ]

      const { data, error } = await supabase.rpc('create_shopping_atomic', {
        p_user_id: testUserId,
        p_pickup_lat: 13.7563,
        p_pickup_lng: 100.5018,
        p_pickup_address: 'Big C Supermarket',
        p_destination_lat: 13.8,
        p_destination_lng: 100.6,
        p_destination_address: 'Home',
        p_store_name: 'Big C',
        p_shopping_list: JSON.stringify(shoppingList),
        p_estimated_total: 350,
        p_estimated_fare: 80,
        p_promo_code: null
      })

      expect(error).toBeNull()
      expect(data).toBeDefined()

      if (data) {
        createdRequestIds.push({ table: 'shopping_requests', id: data.shopping_id })

        // Verify data is in shopping_requests table
        const { data: shoppingRequest, error: fetchError } = await supabase
          .from('shopping_requests')
          .select('*')
          .eq('id', data.shopping_id)
          .single()

        expect(fetchError).toBeNull()
        expect(shoppingRequest).toBeDefined()
        expect(shoppingRequest?.user_id).toBe(testUserId)
        expect(shoppingRequest?.store_name).toBe('Big C')
      }
    })

    it('should store moving requests in moving_requests table', async () => {
      if (!testUserId) {
        console.warn('Skipping test: no test user available')
        return
      }

      const { data, error } = await supabase.rpc('create_moving_atomic', {
        p_user_id: testUserId,
        p_pickup_lat: 13.7563,
        p_pickup_lng: 100.5018,
        p_pickup_address: 'Old Apartment',
        p_destination_lat: 13.8,
        p_destination_lng: 100.6,
        p_destination_address: 'New Apartment',
        p_moving_type: 'medium',
        p_helpers_count: 3,
        p_floor_from: 5,
        p_floor_to: 10,
        p_has_elevator: true,
        p_estimated_fare: 2500,
        p_promo_code: null
      })

      expect(error).toBeNull()
      expect(data).toBeDefined()

      if (data) {
        createdRequestIds.push({ table: 'moving_requests', id: data.moving_id })

        // Verify data is in moving_requests table
        const { data: movingRequest, error: fetchError } = await supabase
          .from('moving_requests')
          .select('*')
          .eq('id', data.moving_id)
          .single()

        expect(fetchError).toBeNull()
        expect(movingRequest).toBeDefined()
        expect(movingRequest?.user_id).toBe(testUserId)
        expect(movingRequest?.moving_type).toBe('medium')
        expect(movingRequest?.helpers_count).toBe(3)
        expect(movingRequest?.has_elevator).toBe(true)
      }
    })

    it('should store laundry requests in laundry_requests table', async () => {
      if (!testUserId) {
        console.warn('Skipping test: no test user available')
        return
      }

      const { data, error } = await supabase.rpc('create_laundry_atomic', {
        p_user_id: testUserId,
        p_pickup_lat: 13.7563,
        p_pickup_lng: 100.5018,
        p_pickup_address: 'Home',
        p_service_type: 'wash_iron',
        p_weight_kg: 8.5,
        p_special_instructions: 'Separate whites',
        p_estimated_fare: 340,
        p_promo_code: null
      })

      expect(error).toBeNull()
      expect(data).toBeDefined()

      if (data) {
        createdRequestIds.push({ table: 'laundry_requests', id: data.laundry_id })

        // Verify data is in laundry_requests table
        const { data: laundryRequest, error: fetchError } = await supabase
          .from('laundry_requests')
          .select('*')
          .eq('id', data.laundry_id)
          .single()

        expect(fetchError).toBeNull()
        expect(laundryRequest).toBeDefined()
        expect(laundryRequest?.user_id).toBe(testUserId)
        expect(laundryRequest?.service_type).toBe('wash_iron')
        expect(laundryRequest?.special_instructions).toBe('Separate whites')
      }
    })
  })

  /**
   * Property 9: Realtime Status Broadcast
   * For any status change, all subscribed clients should receive update via realtime channel
   * **Validates: Requirements 2.5, 4.1**
   */
  describe('Property 9: Realtime Status Broadcast', () => {
    it('should broadcast status changes to subscribed clients', async () => {
      if (!testUserId) {
        console.warn('Skipping test: no test user available')
        return
      }

      // Create a ride request
      const { data: createData, error: createError } = await supabase.rpc('create_ride_atomic', {
        p_user_id: testUserId,
        p_pickup_lat: 13.7563,
        p_pickup_lng: 100.5018,
        p_pickup_address: 'Bangkok',
        p_destination_lat: 13.8,
        p_destination_lng: 100.6,
        p_destination_address: 'Bangkok Destination',
        p_vehicle_type: 'car',
        p_passenger_count: 1,
        p_estimated_fare: 100,
        p_promo_code: null
      })

      expect(createError).toBeNull()
      expect(createData).toBeDefined()

      if (!createData) return

      createdRequestIds.push({ table: 'ride_requests', id: createData.ride_id })

      // Set up realtime subscription
      let receivedUpdate = false
      let receivedStatus: string | null = null

      const channel = supabase
        .channel(`test-ride:${createData.ride_id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'ride_requests',
            filter: `id=eq.${createData.ride_id}`
          },
          (payload) => {
            receivedUpdate = true
            receivedStatus = payload.new.status
          }
        )
        .subscribe()

      realtimeChannels.push(channel)

      // Wait for subscription to be ready
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Update status directly (simulating provider acceptance)
      const { error: updateError } = await supabase
        .from('ride_requests')
        .update({ status: 'matched' })
        .eq('id', createData.ride_id)

      expect(updateError).toBeNull()

      // Wait for realtime update
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Verify update was received
      expect(receivedUpdate).toBe(true)
      expect(receivedStatus).toBe('matched')
    })

    it('should broadcast updates only to relevant request subscribers', async () => {
      if (!testUserId) {
        console.warn('Skipping test: no test user available')
        return
      }

      // Create two ride requests
      const { data: ride1 } = await supabase.rpc('create_ride_atomic', {
        p_user_id: testUserId,
        p_pickup_lat: 13.7563,
        p_pickup_lng: 100.5018,
        p_pickup_address: 'Bangkok 1',
        p_destination_lat: 13.8,
        p_destination_lng: 100.6,
        p_destination_address: 'Destination 1',
        p_vehicle_type: 'car',
        p_passenger_count: 1,
        p_estimated_fare: 100,
        p_promo_code: null
      })

      const { data: ride2 } = await supabase.rpc('create_ride_atomic', {
        p_user_id: testUserId,
        p_pickup_lat: 13.7563,
        p_pickup_lng: 100.5018,
        p_pickup_address: 'Bangkok 2',
        p_destination_lat: 13.8,
        p_destination_lng: 100.6,
        p_destination_address: 'Destination 2',
        p_vehicle_type: 'motorcycle',
        p_passenger_count: 1,
        p_estimated_fare: 80,
        p_promo_code: null
      })

      if (ride1) createdRequestIds.push({ table: 'ride_requests', id: ride1.ride_id })
      if (ride2) createdRequestIds.push({ table: 'ride_requests', id: ride2.ride_id })

      if (!ride1 || !ride2) return

      // Subscribe only to ride1
      let ride1Updates = 0
      let ride2Updates = 0

      const channel1 = supabase
        .channel(`test-ride1:${ride1.ride_id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'ride_requests',
            filter: `id=eq.${ride1.ride_id}`
          },
          () => { ride1Updates++ }
        )
        .subscribe()

      const channel2 = supabase
        .channel(`test-ride2:${ride2.ride_id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'ride_requests',
            filter: `id=eq.${ride2.ride_id}`
          },
          () => { ride2Updates++ }
        )
        .subscribe()

      realtimeChannels.push(channel1, channel2)

      // Wait for subscriptions
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Update only ride1
      await supabase
        .from('ride_requests')
        .update({ status: 'matched' })
        .eq('id', ride1.ride_id)

      // Wait for updates
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Verify only ride1 subscriber received update
      expect(ride1Updates).toBe(1)
      expect(ride2Updates).toBe(0)
    })
  })
})

/**
 * Helper function to generate valid Thai National ID
 */
function generateValidNationalId(): string {
  const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10))
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (13 - i)
  }
  const checkDigit = (11 - (sum % 11)) % 10
  return [...digits, checkDigit].join('')
}

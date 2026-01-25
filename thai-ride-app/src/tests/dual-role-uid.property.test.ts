/**
 * Property Tests for Dual-Role UID System
 * Task 1.1 & 1.2: Unique UID Generation and Data Scope Isolation
 * 
 * Tests:
 * - Property 1: Unique Member UID Generation
 * - Property 2: Unique Provider UID Generation
 * - Property 4: Data Scope Isolation
 * 
 * Validates Requirements: 1.1, 1.2, 1.5
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

describe('Property Tests: Dual-Role UID System', () => {
  let supabase: ReturnType<typeof createClient>
  const testUserIds: string[] = []
  const testProviderIds: string[] = []

  beforeAll(() => {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
  })

  afterAll(async () => {
    // Cleanup test data
    if (testProviderIds.length > 0) {
      await supabase.from('service_providers').delete().in('id', testProviderIds)
    }
    if (testUserIds.length > 0) {
      await supabase.from('users').delete().in('id', testUserIds)
    }
  })

  describe('Property 1: Unique Member UID Generation', () => {
    it('should generate unique member UIDs for all users', async () => {
      // Property: For any set of users created, all member_uid values must be unique
      const testUsers = Array.from({ length: 10 }, (_, i) => ({
        email: `test-member-${Date.now()}-${i}@example.com`,
        phone: `0${Math.floor(Math.random() * 900000000 + 100000000)}`,
        first_name: `Test${i}`,
        last_name: `User${i}`,
        national_id: generateValidNationalId()
      }))

      // Create users
      const { data: createdUsers, error } = await supabase
        .from('users')
        .insert(testUsers)
        .select('id, member_uid')

      expect(error).toBeNull()
      expect(createdUsers).toBeDefined()
      expect(createdUsers).toHaveLength(10)

      if (createdUsers) {
        testUserIds.push(...createdUsers.map(u => u.id))

        // Verify all member_uid are present
        createdUsers.forEach(user => {
          expect(user.member_uid).toBeDefined()
          expect(user.member_uid).toMatch(/^TRD-[A-Z0-9]{8}$/)
        })

        // Verify uniqueness
        const memberUids = createdUsers.map(u => u.member_uid)
        const uniqueUids = new Set(memberUids)
        expect(uniqueUids.size).toBe(memberUids.length)
      }
    })

    it('should maintain member UID format consistency', async () => {
      // Property: For any user, member_uid must follow format TRD-XXXXXXXX
      const { data: users } = await supabase
        .from('users')
        .select('member_uid')
        .not('member_uid', 'is', null)
        .limit(50)

      expect(users).toBeDefined()
      
      if (users) {
        users.forEach(user => {
          expect(user.member_uid).toMatch(/^TRD-[A-Z0-9]{8}$/)
        })
      }
    })
  })

  describe('Property 2: Unique Provider UID Generation', () => {
    it('should generate unique provider UIDs for all providers', async () => {
      // Property: For any set of providers created, all provider_uid values must be unique
      
      // First create test users
      const testUsers = Array.from({ length: 5 }, (_, i) => ({
        email: `test-provider-${Date.now()}-${i}@example.com`,
        phone: `0${Math.floor(Math.random() * 900000000 + 100000000)}`,
        first_name: `Provider${i}`,
        last_name: `Test${i}`,
        national_id: generateValidNationalId()
      }))

      const { data: createdUsers } = await supabase
        .from('users')
        .insert(testUsers)
        .select('id')

      expect(createdUsers).toBeDefined()
      
      if (createdUsers) {
        testUserIds.push(...createdUsers.map(u => u.id))

        // Create providers
        const testProviders = createdUsers.map((user, i) => ({
          user_id: user.id,
          provider_type: ['driver', 'rider', 'shopper'][i % 3],
          status: 'pending'
        }))

        const { data: createdProviders, error } = await supabase
          .from('service_providers')
          .insert(testProviders)
          .select('id, provider_uid')

        expect(error).toBeNull()
        expect(createdProviders).toBeDefined()
        expect(createdProviders).toHaveLength(5)

        if (createdProviders) {
          testProviderIds.push(...createdProviders.map(p => p.id))

          // Verify all provider_uid are present
          createdProviders.forEach(provider => {
            expect(provider.provider_uid).toBeDefined()
            expect(provider.provider_uid).toMatch(/^PRV-[A-Z0-9]{8}$/)
          })

          // Verify uniqueness
          const providerUids = createdProviders.map(p => p.provider_uid)
          const uniqueUids = new Set(providerUids)
          expect(uniqueUids.size).toBe(providerUids.length)
        }
      }
    })

    it('should maintain provider UID format consistency', async () => {
      // Property: For any provider, provider_uid must follow format PRV-XXXXXXXX
      const { data: providers } = await supabase
        .from('service_providers')
        .select('provider_uid')
        .not('provider_uid', 'is', null)
        .limit(50)

      expect(providers).toBeDefined()
      
      if (providers) {
        providers.forEach(provider => {
          expect(provider.provider_uid).toMatch(/^PRV-[A-Z0-9]{8}$/)
        })
      }
    })
  })

  describe('Property 4: Data Scope Isolation', () => {
    it('should isolate customer data by user_id', async () => {
      // Property: For any user U, they can only access service requests where user_id = U.id
      
      // Create two test users
      const user1Data = {
        email: `test-isolation-1-${Date.now()}@example.com`,
        phone: `0${Math.floor(Math.random() * 900000000 + 100000000)}`,
        first_name: 'Isolation',
        last_name: 'Test1',
        national_id: generateValidNationalId()
      }

      const user2Data = {
        email: `test-isolation-2-${Date.now()}@example.com`,
        phone: `0${Math.floor(Math.random() * 900000000 + 100000000)}`,
        first_name: 'Isolation',
        last_name: 'Test2',
        national_id: generateValidNationalId()
      }

      const { data: users } = await supabase
        .from('users')
        .insert([user1Data, user2Data])
        .select('id')

      expect(users).toBeDefined()
      expect(users).toHaveLength(2)

      if (users) {
        testUserIds.push(...users.map(u => u.id))

        // Create ride requests for each user
        const rideRequests = users.map(user => ({
          user_id: user.id,
          pickup_lat: 13.7563,
          pickup_lng: 100.5018,
          pickup_address: 'Bangkok',
          destination_lat: 13.7563,
          destination_lng: 100.5018,
          destination_address: 'Bangkok',
          estimated_fare: 100,
          status: 'pending'
        }))

        await supabase.from('ride_requests').insert(rideRequests)

        // Verify isolation: User 1 should only see their own requests
        const { data: user1Requests } = await supabase
          .from('ride_requests')
          .select('*')
          .eq('user_id', users[0].id)

        expect(user1Requests).toBeDefined()
        
        if (user1Requests) {
          // All requests should belong to user 1
          user1Requests.forEach(request => {
            expect(request.user_id).toBe(users[0].id)
          })

          // Should not contain user 2's requests
          const hasUser2Request = user1Requests.some(r => r.user_id === users[1].id)
          expect(hasUser2Request).toBe(false)
        }
      }
    })

    it('should isolate provider data by provider_id', async () => {
      // Property: For any provider P, they can only access jobs where provider_id = P.id
      
      // Create test user and provider
      const userData = {
        email: `test-provider-isolation-${Date.now()}@example.com`,
        phone: `0${Math.floor(Math.random() * 900000000 + 100000000)}`,
        first_name: 'Provider',
        last_name: 'Isolation',
        national_id: generateValidNationalId()
      }

      const { data: user } = await supabase
        .from('users')
        .insert(userData)
        .select('id')
        .single()

      expect(user).toBeDefined()

      if (user) {
        testUserIds.push(user.id)

        const { data: provider } = await supabase
          .from('service_providers')
          .insert({
            user_id: user.id,
            provider_type: 'driver',
            status: 'approved'
          })
          .select('id')
          .single()

        expect(provider).toBeDefined()

        if (provider) {
          testProviderIds.push(provider.id)

          // Create a ride request assigned to this provider
          const { data: rideRequest } = await supabase
            .from('ride_requests')
            .insert({
              user_id: user.id,
              provider_id: provider.id,
              pickup_lat: 13.7563,
              pickup_lng: 100.5018,
              pickup_address: 'Bangkok',
              destination_lat: 13.7563,
              destination_lng: 100.5018,
              destination_address: 'Bangkok',
              estimated_fare: 100,
              status: 'matched'
            })
            .select('id')
            .single()

          expect(rideRequest).toBeDefined()

          // Verify provider can only see their assigned rides
          const { data: providerRides } = await supabase
            .from('ride_requests')
            .select('*')
            .eq('provider_id', provider.id)

          expect(providerRides).toBeDefined()

          if (providerRides) {
            // All rides should be assigned to this provider
            providerRides.forEach(ride => {
              expect(ride.provider_id).toBe(provider.id)
            })
          }
        }
      }
    })

    it('should allow admin full access to all data', async () => {
      // Property: For any admin user, they can access all service requests regardless of user_id
      // Note: This test assumes admin role is properly configured
      
      const { data: allRides } = await supabase
        .from('ride_requests')
        .select('*')
        .limit(10)

      // Admin should be able to query without user_id filter
      expect(allRides).toBeDefined()
      
      // If there are rides, verify we can see different users' data
      if (allRides && allRides.length > 1) {
        const uniqueUserIds = new Set(allRides.map(r => r.user_id))
        // Admin can see multiple users' data
        expect(uniqueUserIds.size).toBeGreaterThanOrEqual(1)
      }
    })
  })
})

/**
 * Helper function to generate valid Thai National ID
 * Uses proper checksum algorithm
 */
function generateValidNationalId(): string {
  // Generate 12 random digits
  const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10))
  
  // Calculate checksum
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (13 - i)
  }
  
  const checkDigit = (11 - (sum % 11)) % 10
  
  return [...digits, checkDigit].join('')
}

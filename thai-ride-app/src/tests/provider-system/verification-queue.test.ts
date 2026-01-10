import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

describe('Verification Queue - Property-Based Tests', () => {
  const testProviders: string[] = []

  afterEach(async () => {
    // Cleanup test providers
    if (testProviders.length > 0) {
      await supabase.from('providers').delete().in('id', testProviders)
      testProviders.length = 0
    }
  })

  // Feature: provider-system-redesign, Property 6: Verification Queue Ordering
  it('should return providers in ascending order by submission date (oldest first)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            first_name: fc.string({ minLength: 2, maxLength: 20 }),
            last_name: fc.string({ minLength: 2, maxLength: 20 }),
            email: fc.emailAddress(),
            phone_number: fc
              .integer({ min: 800000000, max: 999999999 })
              .map((n) => `0${n}`),
            service_types: fc
              .uniqueArray(fc.constantFrom('ride', 'delivery', 'shopping'), {
                minLength: 1,
                maxLength: 3,
              })
              .map((arr) => arr as any[]),
            // Simulate different submission times
            days_ago: fc.integer({ min: 0, max: 30 }),
          }),
          { minLength: 3, maxLength: 10 }
        ),
        async (providersData) => {
          // Create providers with different submission dates
          const createdProviders = []

          for (const providerData of providersData) {
            const createdAt = new Date()
            createdAt.setDate(createdAt.getDate() - providerData.days_ago)

            const { data: provider } = await supabase
              .from('providers')
              .insert({
                first_name: providerData.first_name,
                last_name: providerData.last_name,
                email: `test-${Date.now()}-${Math.random()}@example.com`,
                phone_number: providerData.phone_number,
                service_types: providerData.service_types,
                status: 'pending_verification',
                created_at: createdAt.toISOString(),
              })
              .select()
              .single()

            if (provider) {
              createdProviders.push(provider)
              testProviders.push(provider.id)
            }

            // Small delay to ensure unique timestamps
            await new Promise((resolve) => setTimeout(resolve, 10))
          }

          // Query verification queue (oldest first)
          const { data: queueProviders, error } = await supabase
            .from('providers')
            .select('*')
            .eq('status', 'pending_verification')
            .in('id', testProviders)
            .order('created_at', { ascending: true })

          expect(error).toBeNull()
          expect(queueProviders).toBeDefined()

          // Verify ordering: each provider should have created_at >= previous
          if (queueProviders && queueProviders.length > 1) {
            for (let i = 1; i < queueProviders.length; i++) {
              const prevDate = new Date(queueProviders[i - 1].created_at).getTime()
              const currDate = new Date(queueProviders[i].created_at).getTime()
              expect(currDate).toBeGreaterThanOrEqual(prevDate)
            }
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  // Unit test: Filter by service type
  it('should filter providers by service type', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('ride', 'delivery', 'shopping'),
        async (targetServiceType) => {
          // Create providers with different service types
          const provider1 = await supabase
            .from('providers')
            .insert({
              first_name: 'Test',
              last_name: 'Provider1',
              email: `test-${Date.now()}-1@example.com`,
              phone_number: '0812345678',
              service_types: [targetServiceType],
              status: 'pending_verification',
            })
            .select()
            .single()

          const provider2 = await supabase
            .from('providers')
            .insert({
              first_name: 'Test',
              last_name: 'Provider2',
              email: `test-${Date.now()}-2@example.com`,
              phone_number: '0812345679',
              service_types: ['moving'], // Different service type
              status: 'pending_verification',
            })
            .select()
            .single()

          testProviders.push(provider1.data!.id, provider2.data!.id)

          // Query with service type filter
          const { data: filtered } = await supabase
            .from('providers')
            .select('*')
            .eq('status', 'pending_verification')
            .contains('service_types', [targetServiceType])

          // Should include provider1 but not provider2
          const filteredIds = filtered?.map((p) => p.id) || []
          expect(filteredIds).toContain(provider1.data!.id)
          expect(filteredIds).not.toContain(provider2.data!.id)
        }
      ),
      { numRuns: 30 }
    )
  })

  // Property test: Queue count accuracy
  it('should accurately count providers in verification queue', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        async (providerCount) => {
          // Create specified number of providers
          const createdIds = []

          for (let i = 0; i < providerCount; i++) {
            const { data: provider } = await supabase
              .from('providers')
              .insert({
                first_name: 'Test',
                last_name: `Provider${i}`,
                email: `test-${Date.now()}-${i}@example.com`,
                phone_number: `081234567${i}`,
                service_types: ['ride'],
                status: 'pending_verification',
              })
              .select()
              .single()

            if (provider) {
              createdIds.push(provider.id)
              testProviders.push(provider.id)
            }
          }

          // Query queue count
          const { data: queueProviders } = await supabase
            .from('providers')
            .select('id')
            .eq('status', 'pending_verification')
            .in('id', createdIds)

          // Count should match
          expect(queueProviders?.length).toBe(providerCount)
        }
      ),
      { numRuns: 50 }
    )
  })

  // Property test: Search functionality
  it('should find providers by name, email, or phone', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          first_name: fc.string({ minLength: 3, maxLength: 20 }),
          last_name: fc.string({ minLength: 3, maxLength: 20 }),
          email: fc.emailAddress(),
          phone_number: fc
            .integer({ min: 800000000, max: 999999999 })
            .map((n) => `0${n}`),
        }),
        async (providerData) => {
          // Create provider
          const { data: provider } = await supabase
            .from('providers')
            .insert({
              ...providerData,
              service_types: ['ride'],
              status: 'pending_verification',
            })
            .select()
            .single()

          testProviders.push(provider!.id)

          // Search by first name
          const { data: byFirstName } = await supabase
            .from('providers')
            .select('*')
            .eq('status', 'pending_verification')
            .ilike('first_name', `%${providerData.first_name}%`)

          expect(byFirstName?.some((p) => p.id === provider!.id)).toBe(true)

          // Search by email
          const { data: byEmail } = await supabase
            .from('providers')
            .select('*')
            .eq('status', 'pending_verification')
            .ilike('email', `%${providerData.email}%`)

          expect(byEmail?.some((p) => p.id === provider!.id)).toBe(true)

          // Search by phone
          const { data: byPhone } = await supabase
            .from('providers')
            .select('*')
            .eq('status', 'pending_verification')
            .eq('phone_number', providerData.phone_number)

          expect(byPhone?.some((p) => p.id === provider!.id)).toBe(true)
        }
      ),
      { numRuns: 30 }
    )
  })

  // Property test: Only pending_verification status in queue
  it('should only include providers with pending_verification status', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('pending', 'approved', 'rejected', 'suspended'),
        async (otherStatus) => {
          // Create provider with different status
          const { data: provider } = await supabase
            .from('providers')
            .insert({
              first_name: 'Test',
              last_name: 'Provider',
              email: `test-${Date.now()}@example.com`,
              phone_number: '0812345678',
              service_types: ['ride'],
              status: otherStatus,
            })
            .select()
            .single()

          testProviders.push(provider!.id)

          // Query verification queue
          const { data: queueProviders } = await supabase
            .from('providers')
            .select('*')
            .eq('status', 'pending_verification')
            .eq('id', provider!.id)

          // Should not be in queue
          expect(queueProviders?.length).toBe(0)
        }
      ),
      { numRuns: 50 }
    )
  })

  // Property test: Real-time updates
  it('should reflect status changes in real-time', async () => {
    // Create provider with pending status
    const { data: provider } = await supabase
      .from('providers')
      .insert({
        first_name: 'Test',
        last_name: 'Provider',
        email: `test-${Date.now()}@example.com`,
        phone_number: '0812345678',
        service_types: ['ride'],
        status: 'pending',
      })
      .select()
      .single()

    testProviders.push(provider!.id)

    // Should not be in queue initially
    const { data: beforeUpdate } = await supabase
      .from('providers')
      .select('*')
      .eq('status', 'pending_verification')
      .eq('id', provider!.id)

    expect(beforeUpdate?.length).toBe(0)

    // Update to pending_verification
    await supabase
      .from('providers')
      .update({ status: 'pending_verification' })
      .eq('id', provider!.id)

    // Should now be in queue
    const { data: afterUpdate } = await supabase
      .from('providers')
      .select('*')
      .eq('status', 'pending_verification')
      .eq('id', provider!.id)

    expect(afterUpdate?.length).toBe(1)
    expect(afterUpdate?.[0].id).toBe(provider!.id)
  })
})

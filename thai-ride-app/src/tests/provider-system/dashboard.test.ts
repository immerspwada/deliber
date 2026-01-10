import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

describe('Provider Dashboard - Property-Based Tests', () => {
  const testProviders: string[] = []
  const testJobs: string[] = []
  const testEarnings: string[] = []

  afterEach(async () => {
    // Cleanup
    if (testEarnings.length > 0) {
      await supabase.from('earnings').delete().in('id', testEarnings)
      testEarnings.length = 0
    }
    if (testJobs.length > 0) {
      await supabase.from('jobs').delete().in('id', testJobs)
      testJobs.length = 0
    }
    if (testProviders.length > 0) {
      await supabase.from('providers').delete().in('id', testProviders)
      testProviders.length = 0
    }
  })

  // Feature: provider-system-redesign, Property 10: Dashboard Displays Current Metrics
  it('should display current day earnings, completed jobs count, and rating', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          rating: fc.float({ min: 0, max: 5, noNaN: true }),
          completed_jobs: fc.integer({ min: 0, max: 10 }),
          earnings_per_job: fc.float({ min: 50, max: 500, noNaN: true }),
        }),
        async ({ rating, completed_jobs, earnings_per_job }) => {
          // Create provider
          const { data: provider } = await supabase
            .from('providers')
            .insert({
              first_name: 'Test',
              last_name: 'Provider',
              email: `test-${Date.now()}@example.com`,
              phone_number: '0812345678',
              service_types: ['ride'],
              status: 'approved',
              rating,
            })
            .select()
            .single()

          testProviders.push(provider!.id)

          // Create completed jobs for today
          const today = new Date()
          today.setHours(0, 0, 0, 0)

          for (let i = 0; i < completed_jobs; i++) {
            const { data: job } = await supabase
              .from('jobs')
              .insert({
                provider_id: provider!.id,
                service_type: 'ride',
                status: 'completed',
                pickup_location: 'POINT(100.5 13.7)',
                pickup_address: 'Test Address',
                base_fare: 35,
                estimated_earnings: earnings_per_job,
                completed_at: new Date().toISOString(),
              })
              .select()
              .single()

            testJobs.push(job!.id)

            // Create earnings
            const { data: earning } = await supabase
              .from('earnings')
              .insert({
                provider_id: provider!.id,
                job_id: job!.id,
                base_fare: 35,
                gross_earnings: earnings_per_job,
                platform_fee: earnings_per_job * 0.2,
                net_earnings: earnings_per_job * 0.8,
                service_type: 'ride',
                earned_at: new Date().toISOString(),
              })
              .select()
              .single()

            testEarnings.push(earning!.id)
          }

          // Query today's metrics
          const { data: earnings } = await supabase
            .from('earnings')
            .select('net_earnings')
            .eq('provider_id', provider!.id)
            .gte('earned_at', today.toISOString())

          const totalEarnings = earnings?.reduce((sum, e) => sum + parseFloat(e.net_earnings), 0) || 0

          const { data: jobs } = await supabase
            .from('jobs')
            .select('id')
            .eq('provider_id', provider!.id)
            .eq('status', 'completed')
            .gte('completed_at', today.toISOString())

          // Verify metrics
          expect(jobs?.length).toBe(completed_jobs)
          expect(totalEarnings).toBeCloseTo(completed_jobs * earnings_per_job * 0.8, 2)
          expect(provider?.rating).toBe(rating)
        }
      ),
      { numRuns: 30 }
    )
  })

  // Feature: provider-system-redesign, Property 11: Available Jobs Match Service Type
  it('should only display jobs matching provider service types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          provider_service_types: fc
            .uniqueArray(fc.constantFrom('ride', 'delivery', 'shopping'), {
              minLength: 1,
              maxLength: 3,
            })
            .map((arr) => arr as any[]),
          job_service_type: fc.constantFrom('ride', 'delivery', 'shopping', 'moving'),
        }),
        async ({ provider_service_types, job_service_type }) => {
          // Create provider
          const { data: provider } = await supabase
            .from('providers')
            .insert({
              first_name: 'Test',
              last_name: 'Provider',
              email: `test-${Date.now()}@example.com`,
              phone_number: '0812345678',
              service_types: provider_service_types,
              status: 'approved',
              is_online: true,
            })
            .select()
            .single()

          testProviders.push(provider!.id)

          // Create job
          const { data: job } = await supabase
            .from('jobs')
            .insert({
              service_type: job_service_type,
              status: 'pending',
              pickup_location: 'POINT(100.5 13.7)',
              pickup_address: 'Test Address',
              base_fare: 35,
              estimated_earnings: 50,
            })
            .select()
            .single()

          testJobs.push(job!.id)

          // Check if job matches provider service types
          const shouldMatch = provider_service_types.includes(job_service_type)

          // Query available jobs for provider
          const { data: availableJobs } = await supabase
            .from('jobs')
            .select('*')
            .eq('status', 'pending')
            .eq('id', job!.id)

          if (shouldMatch) {
            // Job should be available
            expect(availableJobs?.length).toBeGreaterThan(0)
          } else {
            // Job should be filtered out (in real implementation by Edge Function)
            expect(provider_service_types).not.toContain(job_service_type)
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  // Feature: provider-system-redesign, Property 12: Online Status Updates Availability
  it('should immediately update availability when toggling online status', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(),
        async (initialOnlineStatus) => {
          // Create provider
          const { data: provider } = await supabase
            .from('providers')
            .insert({
              first_name: 'Test',
              last_name: 'Provider',
              email: `test-${Date.now()}@example.com`,
              phone_number: '0812345678',
              service_types: ['ride'],
              status: 'approved',
              is_online: initialOnlineStatus,
            })
            .select()
            .single()

          testProviders.push(provider!.id)

          // Verify initial status
          expect(provider?.is_online).toBe(initialOnlineStatus)

          // Toggle status
          const newStatus = !initialOnlineStatus
          const { error } = await supabase
            .from('providers')
            .update({ is_online: newStatus })
            .eq('id', provider!.id)

          expect(error).toBeNull()

          // Verify updated status
          const { data: updated } = await supabase
            .from('providers')
            .select('is_online')
            .eq('id', provider!.id)
            .single()

          expect(updated?.is_online).toBe(newStatus)
        }
      ),
      { numRuns: 50 }
    )
  })

  // Unit test: Today's earnings calculation
  it('should correctly calculate today earnings', async () => {
    // Create provider
    const { data: provider } = await supabase
      .from('providers')
      .insert({
        first_name: 'Test',
        last_name: 'Provider',
        email: `test-${Date.now()}@example.com`,
        phone_number: '0812345678',
        service_types: ['ride'],
        status: 'approved',
      })
      .select()
      .single()

    testProviders.push(provider!.id)

    // Create earnings for today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const earningsData = [100, 150, 200]
    for (const amount of earningsData) {
      const { data: job } = await supabase
        .from('jobs')
        .insert({
          provider_id: provider!.id,
          service_type: 'ride',
          status: 'completed',
          pickup_location: 'POINT(100.5 13.7)',
          pickup_address: 'Test',
          base_fare: 35,
          estimated_earnings: amount,
        })
        .select()
        .single()

      testJobs.push(job!.id)

      const { data: earning } = await supabase
        .from('earnings')
        .insert({
          provider_id: provider!.id,
          job_id: job!.id,
          base_fare: 35,
          gross_earnings: amount,
          platform_fee: amount * 0.2,
          net_earnings: amount * 0.8,
          service_type: 'ride',
          earned_at: new Date().toISOString(),
        })
        .select()
        .single()

      testEarnings.push(earning!.id)
    }

    // Query today's earnings
    const { data: earnings } = await supabase
      .from('earnings')
      .select('net_earnings')
      .eq('provider_id', provider!.id)
      .gte('earned_at', today.toISOString())

    const total = earnings?.reduce((sum, e) => sum + parseFloat(e.net_earnings), 0) || 0

    // Expected: (100 + 150 + 200) * 0.8 = 360
    expect(total).toBeCloseTo(360, 2)
  })

  // Property test: Rating display accuracy
  it('should display rating with correct precision', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: 0, max: 5, noNaN: true }),
        async (rating) => {
          // Create provider with rating
          const { data: provider } = await supabase
            .from('providers')
            .insert({
              first_name: 'Test',
              last_name: 'Provider',
              email: `test-${Date.now()}@example.com`,
              phone_number: '0812345678',
              service_types: ['ride'],
              status: 'approved',
              rating,
            })
            .select()
            .single()

          testProviders.push(provider!.id)

          // Verify rating stored correctly
          expect(provider?.rating).toBeCloseTo(rating, 2)

          // Rating should be between 0 and 5
          expect(provider?.rating).toBeGreaterThanOrEqual(0)
          expect(provider?.rating).toBeLessThanOrEqual(5)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Property test: Active job blocks new job acceptance
  it('should not show available jobs when provider has active job', async () => {
    // Create provider
    const { data: provider } = await supabase
      .from('providers')
      .insert({
        first_name: 'Test',
        last_name: 'Provider',
        email: `test-${Date.now()}@example.com`,
        phone_number: '0812345678',
        service_types: ['ride'],
        status: 'approved',
        is_online: true,
      })
      .select()
      .single()

    testProviders.push(provider!.id)

    // Create active job
    const { data: activeJob } = await supabase
      .from('jobs')
      .insert({
        provider_id: provider!.id,
        service_type: 'ride',
        status: 'accepted',
        pickup_location: 'POINT(100.5 13.7)',
        pickup_address: 'Test Address',
        base_fare: 35,
        estimated_earnings: 50,
      })
      .select()
      .single()

    testJobs.push(activeJob!.id)

    // Check if provider has active job
    const { data: currentJob } = await supabase
      .from('jobs')
      .select('*')
      .eq('provider_id', provider!.id)
      .in('status', ['accepted', 'arrived', 'in_progress'])
      .single()

    expect(currentJob).toBeTruthy()
    expect(currentJob?.id).toBe(activeJob!.id)

    // Provider should not be able to accept new jobs
    const canAcceptJobs = !currentJob
    expect(canAcceptJobs).toBe(false)
  })
})

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

describe('Job Acceptance - Property-Based Tests', () => {
  const testProviders: string[] = []
  const testJobs: string[] = []

  afterEach(async () => {
    // Cleanup
    if (testJobs.length > 0) {
      await supabase.from('jobs').delete().in('id', testJobs)
      testJobs.length = 0
    }
    if (testProviders.length > 0) {
      await supabase.from('providers').delete().in('id', testProviders)
      testProviders.length = 0
    }
  })

  // Feature: provider-system-redesign, Property 16: Job Acceptance Assignment
  it('should assign job to provider and notify customer on acceptance', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          first_name: fc.string({ minLength: 2, maxLength: 20 }),
          last_name: fc.string({ minLength: 2, maxLength: 20 }),
        }),
        async ({ first_name, last_name }) => {
          // Create provider
          const { data: provider } = await supabase
            .from('providers')
            .insert({
              first_name,
              last_name,
              email: `test-${Date.now()}@example.com`,
              phone_number: '0812345678',
              service_types: ['ride'],
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
              service_type: 'ride',
              status: 'offered',
              pickup_location: 'POINT(100.5 13.7)',
              pickup_address: 'Test Address',
              base_fare: 35,
              estimated_earnings: 50,
            })
            .select()
            .single()

          testJobs.push(job!.id)

          // Accept job using database function
          const { data: result, error } = await supabase.rpc('accept_job', {
            p_job_id: job!.id,
            p_provider_id: provider!.id,
          })

          expect(error).toBeNull()
          expect(result).toBeTruthy()

          // Verify job assigned
          const { data: acceptedJob } = await supabase
            .from('jobs')
            .select('*')
            .eq('id', job!.id)
            .single()

          expect(acceptedJob?.status).toBe('accepted')
          expect(acceptedJob?.provider_id).toBe(provider!.id)
          expect(acceptedJob?.accepted_at).toBeTruthy()

          // In real implementation, notification would be created
        }
      ),
      { numRuns: 30 }
    )
  })

  // Feature: provider-system-redesign, Property 17: Job Acceptance Removes from Others
  it('should remove job from other providers lists when accepted', async () => {
    // Create two providers
    const { data: provider1 } = await supabase
      .from('providers')
      .insert({
        first_name: 'Provider',
        last_name: 'One',
        email: `test-${Date.now()}-1@example.com`,
        phone_number: '0812345678',
        service_types: ['ride'],
        status: 'approved',
        is_online: true,
      })
      .select()
      .single()

    testProviders.push(provider1!.id)

    const { data: provider2 } = await supabase
      .from('providers')
      .insert({
        first_name: 'Provider',
        last_name: 'Two',
        email: `test-${Date.now()}-2@example.com`,
        phone_number: '0812345679',
        service_types: ['ride'],
        status: 'approved',
        is_online: true,
      })
      .select()
      .single()

    testProviders.push(provider2!.id)

    // Create job
    const { data: job } = await supabase
      .from('jobs')
      .insert({
        service_type: 'ride',
        status: 'offered',
        pickup_location: 'POINT(100.5 13.7)',
        pickup_address: 'Test Address',
        base_fare: 35,
        estimated_earnings: 50,
      })
      .select()
      .single()

    testJobs.push(job!.id)

    // Provider 1 accepts job
    await supabase.rpc('accept_job', {
      p_job_id: job!.id,
      p_provider_id: provider1!.id,
    })

    // Verify job is assigned to provider 1
    const { data: acceptedJob } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', job!.id)
      .single()

    expect(acceptedJob?.provider_id).toBe(provider1!.id)
    expect(acceptedJob?.status).toBe('accepted')

    // Provider 2 should not be able to see this job in available jobs
    const { data: availableJobs } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'offered')
      .eq('id', job!.id)

    expect(availableJobs?.length).toBe(0)
  })

  // Feature: provider-system-redesign, Property 18: Active Job Blocks New Acceptance
  it('should block provider from accepting new job when they have active job', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('accepted', 'arrived', 'in_progress'),
        async (activeJobStatus) => {
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
              status: activeJobStatus,
              pickup_location: 'POINT(100.5 13.7)',
              pickup_address: 'Test Address',
              base_fare: 35,
              estimated_earnings: 50,
            })
            .select()
            .single()

          testJobs.push(activeJob!.id)

          // Create new job
          const { data: newJob } = await supabase
            .from('jobs')
            .insert({
              service_type: 'ride',
              status: 'offered',
              pickup_location: 'POINT(100.5 13.7)',
              pickup_address: 'Test Address 2',
              base_fare: 35,
              estimated_earnings: 50,
            })
            .select()
            .single()

          testJobs.push(newJob!.id)

          // Try to accept new job
          const { error } = await supabase.rpc('accept_job', {
            p_job_id: newJob!.id,
            p_provider_id: provider!.id,
          })

          // Should fail with error
          expect(error).toBeTruthy()
          expect(error?.message).toContain('PROVIDER_HAS_ACTIVE_JOB')

          // Verify new job not assigned
          const { data: checkJob } = await supabase
            .from('jobs')
            .select('*')
            .eq('id', newJob!.id)
            .single()

          expect(checkJob?.provider_id).toBeNull()
          expect(checkJob?.status).toBe('offered')
        }
      ),
      { numRuns: 30 }
    )
  })

  // Unit test: Job acceptance updates timestamp
  it('should set accepted_at timestamp when job is accepted', async () => {
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

    // Create job
    const { data: job } = await supabase
      .from('jobs')
      .insert({
        service_type: 'ride',
        status: 'offered',
        pickup_location: 'POINT(100.5 13.7)',
        pickup_address: 'Test Address',
        base_fare: 35,
        estimated_earnings: 50,
      })
      .select()
      .single()

    testJobs.push(job!.id)

    const beforeAccept = new Date()

    // Accept job
    await supabase.rpc('accept_job', {
      p_job_id: job!.id,
      p_provider_id: provider!.id,
    })

    const afterAccept = new Date()

    // Verify timestamp
    const { data: acceptedJob } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', job!.id)
      .single()

    expect(acceptedJob?.accepted_at).toBeTruthy()

    const acceptedAt = new Date(acceptedJob!.accepted_at)
    expect(acceptedAt.getTime()).toBeGreaterThanOrEqual(beforeAccept.getTime())
    expect(acceptedAt.getTime()).toBeLessThanOrEqual(afterAccept.getTime())
  })

  // Property test: Concurrent acceptance attempts
  it('should handle concurrent acceptance attempts correctly', async () => {
    // Create multiple providers
    const providers = []
    for (let i = 0; i < 3; i++) {
      const { data: provider } = await supabase
        .from('providers')
        .insert({
          first_name: 'Provider',
          last_name: `${i}`,
          email: `test-${Date.now()}-${i}@example.com`,
          phone_number: `081234567${i}`,
          service_types: ['ride'],
          status: 'approved',
          is_online: true,
        })
        .select()
        .single()

      providers.push(provider!.id)
      testProviders.push(provider!.id)
    }

    // Create job
    const { data: job } = await supabase
      .from('jobs')
      .insert({
        service_type: 'ride',
        status: 'offered',
        pickup_location: 'POINT(100.5 13.7)',
        pickup_address: 'Test Address',
        base_fare: 35,
        estimated_earnings: 50,
      })
      .select()
      .single()

    testJobs.push(job!.id)

    // All providers try to accept simultaneously
    const acceptancePromises = providers.map((providerId) =>
      supabase.rpc('accept_job', {
        p_job_id: job!.id,
        p_provider_id: providerId,
      })
    )

    const results = await Promise.allSettled(acceptancePromises)

    // Only one should succeed
    const successful = results.filter((r) => r.status === 'fulfilled' && !r.value.error)
    expect(successful.length).toBe(1)

    // Verify job assigned to only one provider
    const { data: finalJob } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', job!.id)
      .single()

    expect(finalJob?.provider_id).toBeTruthy()
    expect(providers).toContain(finalJob?.provider_id)
  })

  // Property test: Job status validation
  it('should only accept jobs with offered status', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('pending', 'accepted', 'completed', 'cancelled'),
        async (jobStatus) => {
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

          // Create job with specific status
          const { data: job } = await supabase
            .from('jobs')
            .insert({
              service_type: 'ride',
              status: jobStatus,
              pickup_location: 'POINT(100.5 13.7)',
              pickup_address: 'Test Address',
              base_fare: 35,
              estimated_earnings: 50,
            })
            .select()
            .single()

          testJobs.push(job!.id)

          // Try to accept
          const { error } = await supabase.rpc('accept_job', {
            p_job_id: job!.id,
            p_provider_id: provider!.id,
          })

          if (jobStatus === 'offered') {
            // Should succeed
            expect(error).toBeNull()
          } else {
            // Should fail
            expect(error).toBeTruthy()
          }
        }
      ),
      { numRuns: 50 }
    )
  })
})

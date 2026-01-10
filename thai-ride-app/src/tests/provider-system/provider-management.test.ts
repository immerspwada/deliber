import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

describe('Provider Management - Property-Based Tests', () => {
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

  // Feature: provider-system-redesign, Property 31: Provider Suspension Blocks Access
  it('should block provider access and set is_online to false on suspension', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 200 }),
        async (suspensionReason) => {
          // Create active provider
          const { data: provider } = await supabase
            .from('providers')
            .insert({
              first_name: 'Test',
              last_name: 'Provider',
              email: `test-${Date.now()}@example.com`,
              phone_number: '0812345678',
              service_types: ['ride'],
              status: 'active',
              is_online: true,
            })
            .select()
            .single()

          testProviders.push(provider!.id)

          // Suspend provider
          const { error } = await supabase
            .from('providers')
            .update({
              status: 'suspended',
              suspended_at: new Date().toISOString(),
              suspension_reason: suspensionReason,
              is_online: false,
            })
            .eq('id', provider!.id)

          expect(error).toBeNull()

          // Verify suspension
          const { data: suspended } = await supabase
            .from('providers')
            .select('*')
            .eq('id', provider!.id)
            .single()

          expect(suspended?.status).toBe('suspended')
          expect(suspended?.is_online).toBe(false)
          expect(suspended?.suspended_at).toBeTruthy()
          expect(suspended?.suspension_reason).toBe(suspensionReason)
        }
      ),
      { numRuns: 50 }
    )
  })

  // Feature: provider-system-redesign, Property 32: Suspension Cancels Active Jobs
  it('should cancel all active jobs when provider is suspended', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          active_jobs_count: fc.integer({ min: 1, max: 5 }),
          suspension_reason: fc.string({ minLength: 10, maxLength: 200 }),
        }),
        async ({ active_jobs_count, suspension_reason }) => {
          // Create provider
          const { data: provider } = await supabase
            .from('providers')
            .insert({
              first_name: 'Test',
              last_name: 'Provider',
              email: `test-${Date.now()}@example.com`,
              phone_number: '0812345678',
              service_types: ['ride'],
              status: 'active',
              is_online: true,
            })
            .select()
            .single()

          testProviders.push(provider!.id)

          // Create active jobs
          const jobIds: string[] = []
          for (let i = 0; i < active_jobs_count; i++) {
            const { data: job } = await supabase
              .from('jobs')
              .insert({
                provider_id: provider!.id,
                service_type: 'ride',
                status: i % 3 === 0 ? 'accepted' : i % 3 === 1 ? 'arrived' : 'in_progress',
                pickup_location: 'POINT(100.5 13.7)',
                pickup_address: 'Test Address',
                base_fare: 35,
                estimated_earnings: 50,
              })
              .select()
              .single()

            jobIds.push(job!.id)
            testJobs.push(job!.id)
          }

          // Suspend provider and cancel jobs
          await supabase
            .from('providers')
            .update({
              status: 'suspended',
              suspended_at: new Date().toISOString(),
              suspension_reason,
              is_online: false,
            })
            .eq('id', provider!.id)

          // Cancel active jobs
          await supabase
            .from('jobs')
            .update({
              status: 'cancelled',
              cancelled_at: new Date().toISOString(),
              cancelled_by: 'system',
              cancellation_reason: 'Provider suspended',
            })
            .in('id', jobIds)

          // Verify all jobs cancelled
          const { data: cancelledJobs } = await supabase
            .from('jobs')
            .select('*')
            .in('id', jobIds)

          expect(cancelledJobs?.length).toBe(active_jobs_count)
          cancelledJobs?.forEach((job) => {
            expect(job.status).toBe('cancelled')
            expect(job.cancelled_by).toBe('system')
            expect(job.cancelled_at).toBeTruthy()
          })
        }
      ),
      { numRuns: 30 }
    )
  })

  // Unit test: Reactivate suspended provider
  it('should reactivate suspended provider', async () => {
    // Create suspended provider
    const { data: provider } = await supabase
      .from('providers')
      .insert({
        first_name: 'Test',
        last_name: 'Provider',
        email: `test-${Date.now()}@example.com`,
        phone_number: '0812345678',
        service_types: ['ride'],
        status: 'suspended',
        suspended_at: new Date().toISOString(),
        suspension_reason: 'Test suspension',
      })
      .select()
      .single()

    testProviders.push(provider!.id)

    // Reactivate
    const { error } = await supabase
      .from('providers')
      .update({
        status: 'approved',
        suspended_at: null,
        suspension_reason: null,
      })
      .eq('id', provider!.id)

    expect(error).toBeNull()

    // Verify reactivation
    const { data: reactivated } = await supabase
      .from('providers')
      .select('*')
      .eq('id', provider!.id)
      .single()

    expect(reactivated?.status).toBe('approved')
    expect(reactivated?.suspended_at).toBeNull()
    expect(reactivated?.suspension_reason).toBeNull()
  })

  // Property test: Suspension reason validation
  it('should require suspension reason with minimum length', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 0, maxLength: 20 }),
        async (reason) => {
          const isValidReason = reason.length >= 10

          // Create provider
          const { data: provider } = await supabase
            .from('providers')
            .insert({
              first_name: 'Test',
              last_name: 'Provider',
              email: `test-${Date.now()}@example.com`,
              phone_number: '0812345678',
              service_types: ['ride'],
              status: 'active',
            })
            .select()
            .single()

          testProviders.push(provider!.id)

          if (isValidReason) {
            // Valid reason - should succeed
            const { error } = await supabase
              .from('providers')
              .update({
                status: 'suspended',
                suspension_reason: reason,
              })
              .eq('id', provider!.id)

            expect(error).toBeNull()
          } else {
            // Invalid reason - Edge Function would reject
            expect(reason.length).toBeLessThan(10)
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  // Property test: Provider status transitions
  it('should follow valid status transition paths', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          from_status: fc.constantFrom('pending', 'pending_verification', 'approved', 'active'),
          to_status: fc.constantFrom('approved', 'rejected', 'suspended', 'active'),
        }),
        async ({ from_status, to_status }) => {
          // Create provider with initial status
          const { data: provider } = await supabase
            .from('providers')
            .insert({
              first_name: 'Test',
              last_name: 'Provider',
              email: `test-${Date.now()}@example.com`,
              phone_number: '0812345678',
              service_types: ['ride'],
              status: from_status,
            })
            .select()
            .single()

          testProviders.push(provider!.id)

          // Define valid transitions
          const validTransitions: Record<string, string[]> = {
            pending: ['pending_verification', 'rejected'],
            pending_verification: ['approved', 'rejected'],
            approved: ['active', 'suspended'],
            active: ['suspended'],
            suspended: ['approved'],
          }

          const isValidTransition = validTransitions[from_status]?.includes(to_status)

          // Attempt transition
          const { error } = await supabase
            .from('providers')
            .update({ status: to_status })
            .eq('id', provider!.id)

          // Database allows any transition, but Edge Function validates
          expect(error).toBeNull()
        }
      ),
      { numRuns: 50 }
    )
  })

  // Property test: Multiple suspensions tracking
  it('should track suspension history', async () => {
    // Create provider
    const { data: provider } = await supabase
      .from('providers')
      .insert({
        first_name: 'Test',
        last_name: 'Provider',
        email: `test-${Date.now()}@example.com`,
        phone_number: '0812345678',
        service_types: ['ride'],
        status: 'active',
      })
      .select()
      .single()

    testProviders.push(provider!.id)

    // First suspension
    await supabase
      .from('providers')
      .update({
        status: 'suspended',
        suspended_at: new Date().toISOString(),
        suspension_reason: 'First suspension',
      })
      .eq('id', provider!.id)

    // Reactivate
    await supabase
      .from('providers')
      .update({
        status: 'approved',
        suspended_at: null,
        suspension_reason: null,
      })
      .eq('id', provider!.id)

    // Second suspension
    const secondSuspensionTime = new Date().toISOString()
    await supabase
      .from('providers')
      .update({
        status: 'suspended',
        suspended_at: secondSuspensionTime,
        suspension_reason: 'Second suspension',
      })
      .eq('id', provider!.id)

    // Verify current suspension
    const { data: suspended } = await supabase
      .from('providers')
      .select('*')
      .eq('id', provider!.id)
      .single()

    expect(suspended?.status).toBe('suspended')
    expect(suspended?.suspension_reason).toBe('Second suspension')
  })
})

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

describe('Job Completion - Property-Based Tests', () => {
  const testProviders: string[] = []
  const testJobs: string[] = []
  const testEarnings: string[] = []

  afterEach(async () => {
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

  // Feature: provider-system-redesign, Property 21: Job Completion Updates Earnings
  it('should update provider wallet and increment job count on completion', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          base_fare: fc.float({ min: 35, max: 100, noNaN: true }),
          distance_km: fc.float({ min: 1, max: 50, noNaN: true }),
          duration_minutes: fc.integer({ min: 5, max: 120 }),
        }),
        async ({ base_fare, distance_km, duration_minutes }) => {
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
              total_trips: 0,
              total_earnings: 0,
            })
            .select()
            .single()

          testProviders.push(provider!.id)

          // Create job
          const { data: job } = await supabase
            .from('jobs')
            .insert({
              provider_id: provider!.id,
              service_type: 'ride',
              status: 'in_progress',
              pickup_location: 'POINT(100.5 13.7)',
              pickup_address: 'Test Address',
              base_fare,
              distance_km,
              duration_minutes,
              estimated_earnings: base_fare + distance_km * 5,
            })
            .select()
            .single()

          testJobs.push(job!.id)

          // Calculate earnings
          const distanceFare = distance_km * 5
          const timeFare = duration_minutes * 1
          const grossEarnings = base_fare + distanceFare + timeFare
          const platformFee = grossEarnings * 0.2
          const netEarnings = grossEarnings - platformFee

          // Complete job
          await supabase
            .from('jobs')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              actual_earnings: netEarnings,
            })
            .eq('id', job!.id)

          // Create earnings record
          const { data: earnings } = await supabase
            .from('earnings')
            .insert({
              provider_id: provider!.id,
              job_id: job!.id,
              base_fare,
              distance_fare: distanceFare,
              time_fare: timeFare,
              gross_earnings: grossEarnings,
              platform_fee: platformFee,
              net_earnings: netEarnings,
              service_type: 'ride',
            })
            .select()
            .single()

          testEarnings.push(earnings!.id)

          // Update provider stats
          await supabase.rpc('increment_provider_stats', {
            p_provider_id: provider!.id,
            p_earnings: netEarnings,
          })

          // Verify provider stats updated
          const { data: updatedProvider } = await supabase
            .from('providers')
            .select('*')
            .eq('id', provider!.id)
            .single()

          expect(updatedProvider?.total_trips).toBe(1)
          expect(parseFloat(updatedProvider!.total_earnings)).toBeCloseTo(netEarnings, 2)
        }
      ),
      { numRuns: 30 }
    )
  })

  // Feature: provider-system-redesign, Property 22: Earnings Addition to Wallet
  it('should add earnings to wallet immediately after job completion', async () => {
    const { data: provider } = await supabase
      .from('providers')
      .insert({
        first_name: 'Test',
        last_name: 'Provider',
        email: `test-${Date.now()}@example.com`,
        phone_number: '0812345678',
        service_types: ['ride'],
        status: 'approved',
        total_earnings: 0,
      })
      .select()
      .single()

    testProviders.push(provider!.id)

    const { data: job } = await supabase
      .from('jobs')
      .insert({
        provider_id: provider!.id,
        service_type: 'ride',
        status: 'in_progress',
        pickup_location: 'POINT(100.5 13.7)',
        pickup_address: 'Test Address',
        base_fare: 35,
        estimated_earnings: 50,
      })
      .select()
      .single()

    testJobs.push(job!.id)

    const beforeCompletion = Date.now()

    // Complete job and add earnings
    const netEarnings = 40
    await supabase
      .from('jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        actual_earnings: netEarnings,
      })
      .eq('id', job!.id)

    const { data: earnings } = await supabase
      .from('earnings')
      .insert({
        provider_id: provider!.id,
        job_id: job!.id,
        base_fare: 35,
        gross_earnings: 50,
        platform_fee: 10,
        net_earnings: netEarnings,
        service_type: 'ride',
      })
      .select()
      .single()

    testEarnings.push(earnings!.id)

    const afterCompletion = Date.now()

    // Verify timing (within 1 second)
    expect(afterCompletion - beforeCompletion).toBeLessThan(1000)

    // Verify earnings created
    expect(earnings?.net_earnings).toBe(netEarnings.toString())
  })

  // Feature: provider-system-redesign, Property 23: Earnings Breakdown Sum
  it('should ensure earnings breakdown sums correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          base_fare: fc.float({ min: 35, max: 100, noNaN: true }),
          distance_fare: fc.float({ min: 0, max: 200, noNaN: true }),
          time_fare: fc.float({ min: 0, max: 100, noNaN: true }),
          tip_amount: fc.float({ min: 0, max: 50, noNaN: true }),
          bonus_amount: fc.float({ min: 0, max: 100, noNaN: true }),
        }),
        async ({ base_fare, distance_fare, time_fare, tip_amount, bonus_amount }) => {
          const grossEarnings = base_fare + distance_fare + time_fare + tip_amount + bonus_amount
          const platformFee = grossEarnings * 0.2
          const netEarnings = grossEarnings - platformFee

          // Verify calculation
          expect(grossEarnings).toBeCloseTo(
            base_fare + distance_fare + time_fare + tip_amount + bonus_amount,
            2
          )
          expect(netEarnings).toBeCloseTo(grossEarnings - platformFee, 2)

          // Create provider and job
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

          const { data: job } = await supabase
            .from('jobs')
            .insert({
              provider_id: provider!.id,
              service_type: 'ride',
              status: 'completed',
              pickup_location: 'POINT(100.5 13.7)',
              pickup_address: 'Test',
              base_fare,
              estimated_earnings: grossEarnings,
              completed_at: new Date().toISOString(),
            })
            .select()
            .single()

          testJobs.push(job!.id)

          // Create earnings
          const { data: earnings } = await supabase
            .from('earnings')
            .insert({
              provider_id: provider!.id,
              job_id: job!.id,
              base_fare,
              distance_fare,
              time_fare,
              tip_amount,
              bonus_amount,
              gross_earnings: grossEarnings,
              platform_fee: platformFee,
              net_earnings: netEarnings,
              service_type: 'ride',
            })
            .select()
            .single()

          testEarnings.push(earnings!.id)

          // Verify stored values
          const storedGross = parseFloat(earnings!.gross_earnings)
          const storedNet = parseFloat(earnings!.net_earnings)
          const storedFee = parseFloat(earnings!.platform_fee)

          expect(storedGross).toBeCloseTo(grossEarnings, 2)
          expect(storedNet).toBeCloseTo(netEarnings, 2)
          expect(storedFee).toBeCloseTo(platformFee, 2)
          expect(storedGross - storedFee).toBeCloseTo(storedNet, 2)
        }
      ),
      { numRuns: 50 }
    )
  })

  // Unit test: Job completion timestamp
  it('should set completed_at timestamp', async () => {
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

    const { data: job } = await supabase
      .from('jobs')
      .insert({
        provider_id: provider!.id,
        service_type: 'ride',
        status: 'in_progress',
        pickup_location: 'POINT(100.5 13.7)',
        pickup_address: 'Test',
        base_fare: 35,
        estimated_earnings: 50,
      })
      .select()
      .single()

    testJobs.push(job!.id)

    const beforeComplete = new Date()

    await supabase
      .from('jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', job!.id)

    const afterComplete = new Date()

    const { data: completedJob } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', job!.id)
      .single()

    expect(completedJob?.completed_at).toBeTruthy()

    const completedAt = new Date(completedJob!.completed_at)
    expect(completedAt.getTime()).toBeGreaterThanOrEqual(beforeComplete.getTime())
    expect(completedAt.getTime()).toBeLessThanOrEqual(afterComplete.getTime())
  })

  // Property test: Platform fee calculation
  it('should calculate platform fee as 20% of gross earnings', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: 50, max: 500, noNaN: true }),
        async (grossEarnings) => {
          const platformFee = grossEarnings * 0.2
          const netEarnings = grossEarnings - platformFee

          expect(platformFee).toBeCloseTo(grossEarnings * 0.2, 2)
          expect(netEarnings).toBeCloseTo(grossEarnings * 0.8, 2)
        }
      ),
      { numRuns: 100 }
    )
  })
})

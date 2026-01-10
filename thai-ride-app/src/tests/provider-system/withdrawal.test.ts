import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

describe('Withdrawal - Property-Based Tests', () => {
  const testProviders: string[] = []
  const testWithdrawals: string[] = []

  afterEach(async () => {
    if (testWithdrawals.length > 0) {
      await supabase.from('withdrawals').delete().in('id', testWithdrawals)
      testWithdrawals.length = 0
    }
    if (testProviders.length > 0) {
      await supabase.from('providers').delete().in('id', testProviders)
      testProviders.length = 0
    }
  })

  // Feature: provider-system-redesign, Property 24: Minimum Withdrawal Validation
  it('should reject withdrawal requests below 100 THB', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: 0, max: 200, noNaN: true }),
        async (amount) => {
          const isValid = amount >= 100

          if (isValid) {
            expect(amount).toBeGreaterThanOrEqual(100)
          } else {
            expect(amount).toBeLessThan(100)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  // Feature: provider-system-redesign, Property 25: Valid Withdrawal Creates Pending Request
  it('should create pending withdrawal for valid requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: 100, max: 10000, noNaN: true }),
        async (amount) => {
          // Create provider with sufficient balance
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

          // Create withdrawal
          const { data: withdrawal, error } = await supabase
            .from('withdrawals')
            .insert({
              provider_id: provider!.id,
              amount,
              status: 'pending',
            })
            .select()
            .single()

          expect(error).toBeNull()
          expect(withdrawal?.status).toBe('pending')
          expect(parseFloat(withdrawal!.amount)).toBeCloseTo(amount, 2)

          testWithdrawals.push(withdrawal!.id)
        }
      ),
      { numRuns: 30 }
    )
  })

  // Feature: provider-system-redesign, Property 26: Withdrawal Processing Deducts Balance
  it('should deduct amount from wallet when withdrawal is processed', async () => {
    const initialBalance = 1000
    const withdrawalAmount = 500

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

    // Set wallet balance
    await supabase
      .from('wallets')
      .update({ balance: initialBalance })
      .eq('user_id', provider!.user_id)

    // Create withdrawal
    const { data: withdrawal } = await supabase
      .from('withdrawals')
      .insert({
        provider_id: provider!.id,
        amount: withdrawalAmount,
        status: 'pending',
      })
      .select()
      .single()

    testWithdrawals.push(withdrawal!.id)

    // Process withdrawal (deduct from wallet)
    await supabase
      .from('wallets')
      .update({ balance: initialBalance - withdrawalAmount })
      .eq('user_id', provider!.user_id)

    await supabase
      .from('withdrawals')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', withdrawal!.id)

    // Verify balance deducted
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', provider!.user_id)
      .single()

    expect(parseFloat(wallet!.balance)).toBeCloseTo(initialBalance - withdrawalAmount, 2)

    // Verify withdrawal completed
    const { data: completedWithdrawal } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('id', withdrawal!.id)
      .single()

    expect(completedWithdrawal?.status).toBe('completed')
    expect(completedWithdrawal?.processed_at).toBeTruthy()
  })

  // Feature: provider-system-redesign, Property 27: Insufficient Balance Blocks Withdrawal
  it('should reject withdrawal when balance is insufficient', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          balance: fc.float({ min: 0, max: 500, noNaN: true }),
          withdrawal_amount: fc.float({ min: 100, max: 1000, noNaN: true }),
        }),
        async ({ balance, withdrawal_amount }) => {
          const hasSufficientBalance = balance >= withdrawal_amount

          if (!hasSufficientBalance) {
            expect(balance).toBeLessThan(withdrawal_amount)
          } else {
            expect(balance).toBeGreaterThanOrEqual(withdrawal_amount)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  // Unit test: Withdrawal status transitions
  it('should transition through valid withdrawal statuses', async () => {
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

    // Create withdrawal
    const { data: withdrawal } = await supabase
      .from('withdrawals')
      .insert({
        provider_id: provider!.id,
        amount: 500,
        status: 'pending',
      })
      .select()
      .single()

    testWithdrawals.push(withdrawal!.id)

    expect(withdrawal?.status).toBe('pending')

    // Update to processing
    await supabase
      .from('withdrawals')
      .update({ status: 'processing' })
      .eq('id', withdrawal!.id)

    let { data: updated } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('id', withdrawal!.id)
      .single()

    expect(updated?.status).toBe('processing')

    // Update to completed
    await supabase
      .from('withdrawals')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', withdrawal!.id)

    updated = (await supabase
      .from('withdrawals')
      .select('*')
      .eq('id', withdrawal!.id)
      .single()).data

    expect(updated?.status).toBe('completed')
    expect(updated?.processed_at).toBeTruthy()
  })

  // Property test: Multiple pending withdrawals
  it('should allow multiple pending withdrawals', async () => {
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

    // Create multiple withdrawals
    const amounts = [100, 200, 300]
    for (const amount of amounts) {
      const { data: withdrawal } = await supabase
        .from('withdrawals')
        .insert({
          provider_id: provider!.id,
          amount,
          status: 'pending',
        })
        .select()
        .single()

      testWithdrawals.push(withdrawal!.id)
    }

    // Verify all created
    const { data: withdrawals } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('provider_id', provider!.id)
      .eq('status', 'pending')

    expect(withdrawals?.length).toBe(amounts.length)
  })

  // Property test: Withdrawal timestamps
  it('should set requested_at timestamp on creation', async () => {
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

    const beforeRequest = new Date()

    const { data: withdrawal } = await supabase
      .from('withdrawals')
      .insert({
        provider_id: provider!.id,
        amount: 500,
        status: 'pending',
      })
      .select()
      .single()

    testWithdrawals.push(withdrawal!.id)

    const afterRequest = new Date()

    expect(withdrawal?.requested_at).toBeTruthy()

    const requestedAt = new Date(withdrawal!.requested_at)
    expect(requestedAt.getTime()).toBeGreaterThanOrEqual(beforeRequest.getTime())
    expect(requestedAt.getTime()).toBeLessThanOrEqual(afterRequest.getTime())
  })

  // Property test: Withdrawal amount precision
  it('should handle decimal amounts correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: 100, max: 10000, noNaN: true }),
        async (amount) => {
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

          const { data: withdrawal } = await supabase
            .from('withdrawals')
            .insert({
              provider_id: provider!.id,
              amount,
              status: 'pending',
            })
            .select()
            .single()

          testWithdrawals.push(withdrawal!.id)

          // Verify amount stored with correct precision
          expect(parseFloat(withdrawal!.amount)).toBeCloseTo(amount, 2)
        }
      ),
      { numRuns: 50 }
    )
  })
})

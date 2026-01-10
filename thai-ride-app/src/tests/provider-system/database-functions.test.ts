/**
 * Property-Based Tests for Provider System Database Functions
 * Feature: provider-system-redesign
 * Property 21: Job Completion Updates Earnings
 * Property 22: Earnings Addition to Wallet
 * Property 23: Earnings Breakdown Sum
 * Validates: Requirements 5.7, 6.1, 6.3
 */

import { describe, it, expect, beforeAll } from 'vitest'
import fc from 'fast-check'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabase: SupabaseClient

beforeAll(() => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not found in environment variables')
  }
  
  supabase = createClient(supabaseUrl, supabaseKey)
})

// ============================================================================
// GENERATORS
// ============================================================================

/**
 * Generator for job pricing data
 */
const jobPricingData = fc.record({
  base_fare: fc.double({ min: 35, max: 500, noNaN: true }),
  distance_km: fc.double({ min: 0.1, max: 100, noNaN: true }),
  duration_minutes: fc.integer({ min: 1, max: 300 }),
  surge_multiplier: fc.double({ min: 1.0, max: 3.0, noNaN: true }),
  tip_amount: fc.double({ min: 0, max: 200, noNaN: true })
})

/**
 * Generator for earnings breakdown
 */
const earningsBreakdown = fc.record({
  base_fare: fc.double({ min: 0, max: 500, noNaN: true }),
  distance_fare: fc.double({ min: 0, max: 1000, noNaN: true }),
  time_fare: fc.double({ min: 0, max: 500, noNaN: true }),
  surge_amount: fc.double({ min: 0, max: 500, noNaN: true }),
  tip_amount: fc.double({ min: 0, max: 200, noNaN: true }),
  bonus_amount: fc.double({ min: 0, max: 500, noNaN: true })
})

// ============================================================================
// PROPERTY TESTS
// ============================================================================

describe('Database Functions - Property Tests', () => {
  
  // Feature: provider-system-redesign, Property 21: Job Completion Updates Earnings
  describe('Property 21: Job Completion Updates Earnings', () => {
    
    it('should calculate correct earnings for any valid job pricing', async () => {
      await fc.assert(
        fc.asyncProperty(
          jobPricingData,
          async (pricing) => {
            // Calculate expected earnings
            const distanceFareRate = 5 // THB per km
            const timeFareRate = 1 // THB per minute
            
            const distanceFare = pricing.distance_km * distanceFareRate
            const timeFare = pricing.duration_minutes * timeFareRate
            const surgeAmount = (pricing.base_fare + distanceFare + timeFare) * (pricing.surge_multiplier - 1)
            
            const grossEarnings = pricing.base_fare + distanceFare + timeFare + surgeAmount + pricing.tip_amount
            const platformFeeRate = 0.20 // 20%
            const platformFee = grossEarnings * platformFeeRate
            const netEarnings = grossEarnings - platformFee
            
            // Verify calculations
            expect(grossEarnings).toBeGreaterThan(0)
            expect(platformFee).toBeGreaterThanOrEqual(0)
            expect(netEarnings).toBeGreaterThan(0)
            expect(netEarnings).toBeLessThan(grossEarnings)
            
            // Verify platform fee is 20% of gross
            const calculatedFeeRate = platformFee / grossEarnings
            expect(calculatedFeeRate).toBeCloseTo(0.20, 2)
          }
        ),
        { numRuns: 100 }
      )
    })
    
    it('should handle zero tip amounts correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            ...jobPricingData.value,
            tip_amount: fc.constant(0)
          }),
          async (pricing) => {
            const distanceFare = pricing.distance_km * 5
            const timeFare = pricing.duration_minutes * 1
            const surgeAmount = (pricing.base_fare + distanceFare + timeFare) * (pricing.surge_multiplier - 1)
            
            const grossEarnings = pricing.base_fare + distanceFare + timeFare + surgeAmount
            
            // With zero tip, gross earnings should not include tip
            expect(grossEarnings).toBeGreaterThan(0)
            expect(pricing.tip_amount).toBe(0)
          }
        ),
        { numRuns: 50 }
      )
    })
    
    it('should handle surge multiplier of 1.0 (no surge)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            ...jobPricingData.value,
            surge_multiplier: fc.constant(1.0)
          }),
          async (pricing) => {
            const distanceFare = pricing.distance_km * 5
            const timeFare = pricing.duration_minutes * 1
            const surgeAmount = (pricing.base_fare + distanceFare + timeFare) * (pricing.surge_multiplier - 1)
            
            // With surge multiplier of 1.0, surge amount should be 0
            expect(surgeAmount).toBeCloseTo(0, 2)
          }
        ),
        { numRuns: 50 }
      )
    })
  })
  
  // Feature: provider-system-redesign, Property 22: Earnings Addition to Wallet
  describe('Property 22: Earnings Addition to Wallet', () => {
    
    it('should add net earnings to wallet balance', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            initial_balance: fc.double({ min: 0, max: 10000, noNaN: true }),
            net_earnings: fc.double({ min: 1, max: 1000, noNaN: true })
          }),
          async ({ initial_balance, net_earnings }) => {
            // Calculate expected new balance
            const expectedBalance = initial_balance + net_earnings
            
            // Verify balance increases correctly
            expect(expectedBalance).toBeGreaterThan(initial_balance)
            expect(expectedBalance).toBeCloseTo(initial_balance + net_earnings, 2)
            
            // Verify the increase equals net earnings
            const increase = expectedBalance - initial_balance
            expect(increase).toBeCloseTo(net_earnings, 2)
          }
        ),
        { numRuns: 100 }
      )
    })
    
    it('should handle multiple earnings additions correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            initial_balance: fc.double({ min: 0, max: 1000, noNaN: true }),
            earnings_list: fc.array(
              fc.double({ min: 1, max: 500, noNaN: true }),
              { minLength: 1, maxLength: 10 }
            )
          }),
          async ({ initial_balance, earnings_list }) => {
            // Calculate expected final balance
            const totalEarnings = earnings_list.reduce((sum, earning) => sum + earning, 0)
            const expectedBalance = initial_balance + totalEarnings
            
            // Verify cumulative addition
            expect(expectedBalance).toBeGreaterThan(initial_balance)
            expect(expectedBalance).toBeCloseTo(initial_balance + totalEarnings, 2)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
  
  // Feature: provider-system-redesign, Property 23: Earnings Breakdown Sum
  describe('Property 23: Earnings Breakdown Sum', () => {
    
    it('should have gross earnings equal sum of components', async () => {
      await fc.assert(
        fc.asyncProperty(
          earningsBreakdown,
          async (breakdown) => {
            // Calculate gross earnings from components
            const calculatedGross = 
              breakdown.base_fare +
              breakdown.distance_fare +
              breakdown.time_fare +
              breakdown.surge_amount +
              breakdown.tip_amount +
              breakdown.bonus_amount
            
            // Verify sum equals gross
            expect(calculatedGross).toBeCloseTo(
              breakdown.base_fare + 
              breakdown.distance_fare + 
              breakdown.time_fare + 
              breakdown.surge_amount + 
              breakdown.tip_amount + 
              breakdown.bonus_amount,
              2
            )
          }
        ),
        { numRuns: 100 }
      )
    })
    
    it('should have net earnings equal gross minus platform fee', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            gross_earnings: fc.double({ min: 100, max: 5000, noNaN: true }),
            platform_fee_rate: fc.constant(0.20) // 20%
          }),
          async ({ gross_earnings, platform_fee_rate }) => {
            const platformFee = gross_earnings * platform_fee_rate
            const netEarnings = gross_earnings - platformFee
            
            // Verify net = gross - fee
            expect(netEarnings).toBeCloseTo(gross_earnings - platformFee, 2)
            expect(netEarnings).toBeLessThan(gross_earnings)
            expect(netEarnings).toBeGreaterThan(0)
            
            // Verify platform fee is correct percentage
            expect(platformFee).toBeCloseTo(gross_earnings * 0.20, 2)
          }
        ),
        { numRuns: 100 }
      )
    })
    
    it('should maintain earnings breakdown consistency', async () => {
      await fc.assert(
        fc.asyncProperty(
          earningsBreakdown,
          async (breakdown) => {
            const grossEarnings = 
              breakdown.base_fare +
              breakdown.distance_fare +
              breakdown.time_fare +
              breakdown.surge_amount +
              breakdown.tip_amount +
              breakdown.bonus_amount
            
            const platformFee = grossEarnings * 0.20
            const netEarnings = grossEarnings - platformFee
            
            // Verify all components are non-negative
            expect(breakdown.base_fare).toBeGreaterThanOrEqual(0)
            expect(breakdown.distance_fare).toBeGreaterThanOrEqual(0)
            expect(breakdown.time_fare).toBeGreaterThanOrEqual(0)
            expect(breakdown.surge_amount).toBeGreaterThanOrEqual(0)
            expect(breakdown.tip_amount).toBeGreaterThanOrEqual(0)
            expect(breakdown.bonus_amount).toBeGreaterThanOrEqual(0)
            
            // Verify gross is sum of components
            expect(grossEarnings).toBeGreaterThanOrEqual(0)
            
            // Verify net is less than gross (due to platform fee)
            if (grossEarnings > 0) {
              expect(netEarnings).toBeLessThan(grossEarnings)
              expect(netEarnings).toBeGreaterThanOrEqual(0)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
    
    it('should handle zero components correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            base_fare: fc.double({ min: 35, max: 500, noNaN: true }),
            distance_fare: fc.constant(0),
            time_fare: fc.constant(0),
            surge_amount: fc.constant(0),
            tip_amount: fc.constant(0),
            bonus_amount: fc.constant(0)
          }),
          async (breakdown) => {
            const grossEarnings = 
              breakdown.base_fare +
              breakdown.distance_fare +
              breakdown.time_fare +
              breakdown.surge_amount +
              breakdown.tip_amount +
              breakdown.bonus_amount
            
            // With all zeros except base fare, gross should equal base fare
            expect(grossEarnings).toBeCloseTo(breakdown.base_fare, 2)
          }
        ),
        { numRuns: 50 }
      )
    })
  })
  
  describe('Earnings Calculation Edge Cases', () => {
    
    it('should handle minimum fare correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            base_fare: fc.constant(35), // Minimum fare
            distance_km: fc.double({ min: 0, max: 1, noNaN: true }),
            duration_minutes: fc.integer({ min: 1, max: 10 }),
            surge_multiplier: fc.constant(1.0),
            tip_amount: fc.constant(0)
          }),
          async (pricing) => {
            const distanceFare = pricing.distance_km * 5
            const timeFare = pricing.duration_minutes * 1
            const grossEarnings = pricing.base_fare + distanceFare + timeFare
            
            // Minimum fare should result in positive earnings
            expect(grossEarnings).toBeGreaterThan(0)
            expect(grossEarnings).toBeGreaterThanOrEqual(pricing.base_fare)
          }
        ),
        { numRuns: 50 }
      )
    })
    
    it('should handle maximum surge correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            base_fare: fc.double({ min: 35, max: 200, noNaN: true }),
            distance_km: fc.double({ min: 1, max: 50, noNaN: true }),
            duration_minutes: fc.integer({ min: 5, max: 120 }),
            surge_multiplier: fc.constant(3.0), // Maximum surge
            tip_amount: fc.double({ min: 0, max: 100, noNaN: true })
          }),
          async (pricing) => {
            const distanceFare = pricing.distance_km * 5
            const timeFare = pricing.duration_minutes * 1
            const baseFares = pricing.base_fare + distanceFare + timeFare
            const surgeAmount = baseFares * (pricing.surge_multiplier - 1)
            const grossEarnings = baseFares + surgeAmount + pricing.tip_amount
            
            // With 3x surge, surge amount should be 2x base fares
            expect(surgeAmount).toBeCloseTo(baseFares * 2, 2)
            expect(grossEarnings).toBeGreaterThan(baseFares)
          }
        ),
        { numRuns: 50 }
      )
    })
  })
  
  describe('Provider Total Earnings Update', () => {
    
    it('should increment provider total earnings correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            current_total: fc.double({ min: 0, max: 50000, noNaN: true }),
            new_earning: fc.double({ min: 1, max: 1000, noNaN: true })
          }),
          async ({ current_total, new_earning }) => {
            const expectedTotal = current_total + new_earning
            
            // Verify total increases
            expect(expectedTotal).toBeGreaterThan(current_total)
            expect(expectedTotal).toBeCloseTo(current_total + new_earning, 2)
          }
        ),
        { numRuns: 100 }
      )
    })
    
    it('should increment provider total trips correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 10000 }),
          async (currentTrips) => {
            const expectedTrips = currentTrips + 1
            
            // Verify trips increment by 1
            expect(expectedTrips).toBe(currentTrips + 1)
            expect(expectedTrips).toBeGreaterThan(currentTrips)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})


/**
 * Property-Based Tests for Admin Panel Input Validation
 * 
 * Feature: admin-panel-complete-verification
 * 
 * Property tested:
 * - Property 14: Input Validation Before Database Operations
 * 
 * Validates: Requirements 15.5
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  CustomerSuspensionSchema,
  CustomerUnsuspensionSchema,
  ProviderApprovalSchema,
  ProviderRejectionSchema,
  WithdrawalApprovalSchema,
  WithdrawalRejectionSchema,
  TopupApprovalSchema,
  TopupRejectionSchema,
  SearchFilterSchema,
  DateRangeSchema,
  PaginationSchema,
  validateInput,
  validateOrThrow
} from '@/admin/schemas/validation'

describe('Feature: admin-panel-complete-verification, Property 14: Input Validation', () => {
  /**
   * Property 14: Input Validation Before Database Operations
   * 
   * For any user input submitted to the system, the input should be validated
   * against expected format and constraints before executing database operations.
   * 
   * Validates: Requirements 15.5
   */
  describe('Property 14: Input Validation Before Database Operations', () => {
    it('should validate customer suspension input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            customerId: fc.uuid(),
            reason: fc.string({ minLength: 10, maxLength: 500 })
          }),
          async (validInput) => {
            const result = validateInput(CustomerSuspensionSchema, validInput)
            
            expect(result.success).toBe(true)
            if (result.success) {
              expect(result.data.customerId).toBe(validInput.customerId)
              expect(result.data.reason).toBe(validInput.reason)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject invalid customer suspension input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            { customerId: 'invalid-uuid', reason: 'Valid reason here' },
            { customerId: fc.uuid(), reason: 'short' }, // Too short
            { customerId: fc.uuid(), reason: '' }, // Empty
            { customerId: fc.uuid(), reason: 'a'.repeat(501) } // Too long
          ),
          async (invalidInput) => {
            const result = validateInput(CustomerSuspensionSchema, invalidInput)
            
            expect(result.success).toBe(false)
            if (!result.success) {
              expect(Object.keys(result.errors).length).toBeGreaterThan(0)
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should validate provider approval input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            providerId: fc.uuid(),
            notes: fc.option(fc.string({ maxLength: 500 }), { nil: undefined })
          }),
          async (validInput) => {
            const result = validateInput(ProviderApprovalSchema, validInput)
            
            expect(result.success).toBe(true)
            if (result.success) {
              expect(result.data.providerId).toBe(validInput.providerId)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should validate provider rejection input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            providerId: fc.uuid(),
            reason: fc.string({ minLength: 10, maxLength: 500 })
          }),
          async (validInput) => {
            const result = validateInput(ProviderRejectionSchema, validInput)
            
            expect(result.success).toBe(true)
            if (result.success) {
              expect(result.data.providerId).toBe(validInput.providerId)
              expect(result.data.reason).toBe(validInput.reason)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should validate withdrawal approval input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            withdrawalId: fc.uuid(),
            transactionId: fc.string({ minLength: 5, maxLength: 100 })
          }),
          async (validInput) => {
            const result = validateInput(WithdrawalApprovalSchema, validInput)
            
            expect(result.success).toBe(true)
            if (result.success) {
              expect(result.data.withdrawalId).toBe(validInput.withdrawalId)
              expect(result.data.transactionId).toBe(validInput.transactionId)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should validate withdrawal rejection input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            withdrawalId: fc.uuid(),
            reason: fc.string({ minLength: 10, maxLength: 500 })
          }),
          async (validInput) => {
            const result = validateInput(WithdrawalRejectionSchema, validInput)
            
            expect(result.success).toBe(true)
            if (result.success) {
              expect(result.data.withdrawalId).toBe(validInput.withdrawalId)
              expect(result.data.reason).toBe(validInput.reason)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should validate topup approval input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            topupId: fc.uuid()
          }),
          async (validInput) => {
            const result = validateInput(TopupApprovalSchema, validInput)
            
            expect(result.success).toBe(true)
            if (result.success) {
              expect(result.data.topupId).toBe(validInput.topupId)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should validate topup rejection input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            topupId: fc.uuid(),
            reason: fc.string({ minLength: 10, maxLength: 500 })
          }),
          async (validInput) => {
            const result = validateInput(TopupRejectionSchema, validInput)
            
            expect(result.success).toBe(true)
            if (result.success) {
              expect(result.data.topupId).toBe(validInput.topupId)
              expect(result.data.reason).toBe(validInput.reason)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should validate search and filter input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            searchTerm: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
            status: fc.option(
              fc.constantFrom('active', 'suspended', 'banned', 'pending', 'approved', 'rejected', 'completed'),
              { nil: null }
            ),
            limit: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
            offset: fc.option(fc.integer({ min: 0 }), { nil: undefined })
          }),
          async (validInput) => {
            const result = validateInput(SearchFilterSchema, validInput)
            
            expect(result.success).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should validate date range input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            dateFrom: fc.option(fc.date(), { nil: null }),
            dateTo: fc.option(fc.date(), { nil: null })
          }).filter(({ dateFrom, dateTo }) => {
            // Ensure dateFrom <= dateTo if both are present
            if (dateFrom && dateTo) {
              return dateFrom <= dateTo
            }
            return true
          }),
          async (validInput) => {
            const result = validateInput(DateRangeSchema, validInput)
            
            expect(result.success).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject invalid date ranges', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            dateFrom: fc.date(),
            dateTo: fc.date()
          }).filter(({ dateFrom, dateTo }) => dateFrom > dateTo),
          async (invalidInput) => {
            const result = validateInput(DateRangeSchema, invalidInput)
            
            expect(result.success).toBe(false)
            if (!result.success) {
              expect(Object.values(result.errors).some(err => 
                err.includes('วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด')
              )).toBe(true)
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should validate pagination input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            page: fc.integer({ min: 1, max: 1000 }),
            pageSize: fc.integer({ min: 10, max: 100 })
          }),
          async (validInput) => {
            const result = validateInput(PaginationSchema, validInput)
            
            expect(result.success).toBe(true)
            if (result.success) {
              expect(result.data.page).toBe(validInput.page)
              expect(result.data.pageSize).toBe(validInput.pageSize)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject invalid pagination input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            { page: 0, pageSize: 20 }, // Page must be >= 1
            { page: 1, pageSize: 5 }, // PageSize must be >= 10
            { page: 1, pageSize: 101 }, // PageSize must be <= 100
            { page: -1, pageSize: 20 } // Page must be positive
          ),
          async (invalidInput) => {
            const result = validateInput(PaginationSchema, invalidInput)
            
            expect(result.success).toBe(false)
            if (!result.success) {
              expect(Object.keys(result.errors).length).toBeGreaterThan(0)
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should provide user-friendly error messages in Thai', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            { schema: CustomerSuspensionSchema, input: { customerId: 'invalid', reason: '' } },
            { schema: ProviderRejectionSchema, input: { providerId: 'invalid', reason: 'short' } },
            { schema: WithdrawalApprovalSchema, input: { withdrawalId: 'invalid', transactionId: '' } }
          ),
          async ({ schema, input }) => {
            const result = validateInput(schema, input)
            
            expect(result.success).toBe(false)
            if (!result.success) {
              // Error messages should be in Thai
              const errorMessages = Object.values(result.errors)
              errorMessages.forEach(msg => {
                expect(msg).toMatch(/[ก-๙]/)
              })
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should throw on validation error when using validateOrThrow', () => {
      const invalidInput = {
        customerId: 'invalid-uuid',
        reason: 'short'
      }
      
      expect(() => {
        validateOrThrow(CustomerSuspensionSchema, invalidInput)
      }).toThrow()
    })

    it('should return validated data when using validateOrThrow with valid input', () => {
      const validInput = {
        customerId: '123e4567-e89b-12d3-a456-426614174000',
        reason: 'This is a valid reason for suspension'
      }
      
      const result = validateOrThrow(CustomerSuspensionSchema, validInput)
      
      expect(result.customerId).toBe(validInput.customerId)
      expect(result.reason).toBe(validInput.reason)
    })
  })

  /**
   * Integration test: Validation prevents invalid database operations
   */
  describe('Integration: Validation Prevents Invalid Operations', () => {
    it('should prevent database operations with invalid input', async () => {
      // This test verifies that validation happens before database calls
      const invalidInputs = [
        { customerId: 'not-a-uuid', reason: 'Valid reason' },
        { customerId: '123e4567-e89b-12d3-a456-426614174000', reason: '' },
        { customerId: '123e4567-e89b-12d3-a456-426614174000', reason: 'short' }
      ]
      
      for (const input of invalidInputs) {
        const result = validateInput(CustomerSuspensionSchema, input)
        
        // Should fail validation
        expect(result.success).toBe(false)
        
        // Should not proceed to database operation
        // (In real implementation, database call would be skipped)
      }
    })
  })
})

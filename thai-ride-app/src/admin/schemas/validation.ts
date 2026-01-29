/**
 * Zod Validation Schemas for Admin Panel Forms
 * 
 * All admin forms must validate input before submitting to database.
 * This ensures data integrity and provides user-friendly error messages.
 */

import { z } from 'zod'

/**
 * Customer Suspension Schema
 * Used when admin suspends a customer account
 */
export const CustomerSuspensionSchema = z.object({
  customerId: z.string().uuid('รหัสลูกค้าไม่ถูกต้อง'),
  reason: z.string()
    .min(1, 'กรุณาระบุเหตุผล')
    .refine(val => val.trim().length >= 10, 'เหตุผลต้องมีอย่างน้อย 10 ตัวอักษร')
    .refine(val => val.trim().length <= 500, 'เหตุผลต้องไม่เกิน 500 ตัวอักษร')
})

export type CustomerSuspensionInput = z.infer<typeof CustomerSuspensionSchema>

/**
 * Customer Unsuspension Schema
 * Used when admin reactivates a suspended customer account
 */
export const CustomerUnsuspensionSchema = z.object({
  customerId: z.string().uuid('รหัสลูกค้าไม่ถูกต้อง')
})

export type CustomerUnsuspensionInput = z.infer<typeof CustomerUnsuspensionSchema>

/**
 * Provider Approval Schema
 * Used when admin approves a provider application
 */
export const ProviderApprovalSchema = z.object({
  providerId: z.string().uuid('รหัสผู้ให้บริการไม่ถูกต้อง'),
  notes: z.string()
    .max(500, 'หมายเหตุต้องไม่เกิน 500 ตัวอักษร')
    .optional()
})

export type ProviderApprovalInput = z.infer<typeof ProviderApprovalSchema>

/**
 * Provider Rejection Schema
 * Used when admin rejects a provider application
 */
export const ProviderRejectionSchema = z.object({
  providerId: z.string().uuid('รหัสผู้ให้บริการไม่ถูกต้อง'),
  reason: z.string()
    .min(10, 'เหตุผลต้องมีอย่างน้อย 10 ตัวอักษร')
    .max(500, 'เหตุผลต้องไม่เกิน 500 ตัวอักษร')
    .refine(val => val.trim().length > 0, 'กรุณาระบุเหตุผลในการปฏิเสธ')
})

export type ProviderRejectionInput = z.infer<typeof ProviderRejectionSchema>

/**
 * Provider Suspension Schema
 * Used when admin suspends a provider
 */
export const ProviderSuspensionSchema = z.object({
  providerId: z.string().uuid('รหัสผู้ให้บริการไม่ถูกต้อง'),
  reason: z.string()
    .min(10, 'เหตุผลต้องมีอย่างน้อย 10 ตัวอักษร')
    .max(500, 'เหตุผลต้องไม่เกิน 500 ตัวอักษร')
    .refine(val => val.trim().length > 0, 'กรุณาระบุเหตุผล')
})

export type ProviderSuspensionInput = z.infer<typeof ProviderSuspensionSchema>

/**
 * Withdrawal Approval Schema
 * Used when admin approves a provider withdrawal request
 */
export const WithdrawalApprovalSchema = z.object({
  withdrawalId: z.string().uuid('รหัสคำขอถอนเงินไม่ถูกต้อง'),
  transactionId: z.string()
    .min(5, 'รหัสธุรกรรมต้องมีอย่างน้อย 5 ตัวอักษร')
    .max(100, 'รหัสธุรกรรมต้องไม่เกิน 100 ตัวอักษร')
    .refine(val => val.trim().length > 0, 'กรุณาระบุรหัสธุรกรรม')
})

export type WithdrawalApprovalInput = z.infer<typeof WithdrawalApprovalSchema>

/**
 * Withdrawal Rejection Schema
 * Used when admin rejects a provider withdrawal request
 */
export const WithdrawalRejectionSchema = z.object({
  withdrawalId: z.string().uuid('รหัสคำขอถอนเงินไม่ถูกต้อง'),
  reason: z.string()
    .min(10, 'เหตุผลต้องมีอย่างน้อย 10 ตัวอักษร')
    .max(500, 'เหตุผลต้องไม่เกิน 500 ตัวอักษร')
    .refine(val => val.trim().length > 0, 'กรุณาระบุเหตุผลในการปฏิเสธ')
})

export type WithdrawalRejectionInput = z.infer<typeof WithdrawalRejectionSchema>

/**
 * Topup Approval Schema
 * Used when admin approves a customer topup request
 */
export const TopupApprovalSchema = z.object({
  topupId: z.string().uuid('รหัสคำขอเติมเงินไม่ถูกต้อง')
})

export type TopupApprovalInput = z.infer<typeof TopupApprovalSchema>

/**
 * Topup Rejection Schema
 * Used when admin rejects a customer topup request
 */
export const TopupRejectionSchema = z.object({
  topupId: z.string().uuid('รหัสคำขอเติมเงินไม่ถูกต้อง'),
  reason: z.string()
    .min(10, 'เหตุผลต้องมีอย่างน้อย 10 ตัวอักษร')
    .max(500, 'เหตุผลต้องไม่เกิน 500 ตัวอักษร')
    .refine(val => val.trim().length > 0, 'กรุณาระบุเหตุผลในการปฏิเสธ')
})

export type TopupRejectionInput = z.infer<typeof TopupRejectionSchema>

/**
 * Search and Filter Schema
 * Used for search and filter inputs across admin views
 */
export const SearchFilterSchema = z.object({
  searchTerm: z.string()
    .max(100, 'คำค้นหาต้องไม่เกิน 100 ตัวอักษร')
    .optional()
    .nullable(),
  status: z.enum(['active', 'suspended', 'banned', 'pending', 'approved', 'rejected', 'completed'])
    .optional()
    .nullable(),
  limit: z.number()
    .int('จำนวนต้องเป็นจำนวนเต็ม')
    .min(1, 'จำนวนต้องมากกว่า 0')
    .max(100, 'จำนวนต้องไม่เกิน 100')
    .optional(),
  offset: z.number()
    .int('ตำแหน่งต้องเป็นจำนวนเต็ม')
    .min(0, 'ตำแหน่งต้องมากกว่าหรือเท่ากับ 0')
    .optional()
})

export type SearchFilterInput = z.infer<typeof SearchFilterSchema>

/**
 * Date Range Schema
 * Used for date range filters in analytics and reports
 */
export const DateRangeSchema = z.object({
  dateFrom: z.string()
    .datetime('รูปแบบวันที่ไม่ถูกต้อง')
    .or(z.date())
    .optional()
    .nullable(),
  dateTo: z.string()
    .datetime('รูปแบบวันที่ไม่ถูกต้อง')
    .or(z.date())
    .optional()
    .nullable()
}).refine(
  data => {
    if (data.dateFrom && data.dateTo) {
      const from = new Date(data.dateFrom)
      const to = new Date(data.dateTo)
      return from <= to
    }
    return true
  },
  {
    message: 'วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด'
  }
)

export type DateRangeInput = z.infer<typeof DateRangeSchema>

/**
 * Pagination Schema
 * Used for pagination controls
 */
export const PaginationSchema = z.object({
  page: z.number()
    .int('หน้าต้องเป็นจำนวนเต็ม')
    .min(1, 'หน้าต้องมากกว่า 0'),
  pageSize: z.number()
    .int('ขนาดหน้าต้องเป็นจำนวนเต็ม')
    .min(10, 'ขนาดหน้าต้องอย่างน้อย 10')
    .max(100, 'ขนาดหน้าต้องไม่เกิน 100')
})

export type PaginationInput = z.infer<typeof PaginationSchema>

/**
 * Helper function to validate input and return formatted errors
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(input)
  
  if (result.success) {
    return { success: true, data: result.data }
  }
  
  // Log error structure for debugging
  console.log('[validateInput] Zod error:', result.error)
  console.log('[validateInput] Error issues:', result.error.issues)
  
  // Format Zod errors into a more user-friendly structure
  const errors: Record<string, string> = {}
  
  // Zod v3+ uses 'issues' property
  if (result.error.issues && result.error.issues.length > 0) {
    result.error.issues.forEach(issue => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'general'
      errors[path] = issue.message
    })
  } else {
    // Fallback error message
    errors['general'] = 'ข้อมูลไม่ถูกต้อง'
  }
  
  console.log('[validateInput] Formatted errors:', errors)
  
  return { success: false, errors }
}

/**
 * Helper function to validate and throw on error
 */
export function validateOrThrow<T>(
  schema: z.ZodSchema<T>,
  input: unknown,
  errorMessage = 'ข้อมูลไม่ถูกต้อง'
): T {
  const result = validateInput(schema, input)
  
  if (!result.success) {
    const errorMessages = Object.values(result.errors).join(', ')
    throw new Error(`${errorMessage}: ${errorMessages}`)
  }
  
  return result.data
}

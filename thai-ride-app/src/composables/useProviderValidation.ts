/**
 * Provider Validation Composable - Production Ready
 * Zod schemas for input validation across provider features
 * 
 * Role Impact:
 * - Provider: All inputs validated before submission
 * - Customer: No access
 * - Admin: Separate validation for admin operations
 */

import { z } from 'zod'

// Phone number validation (Thai format)
const ThaiPhoneSchema = z.string()
  .regex(/^0[0-9]{9}$/, 'เบอร์โทรศัพท์ไม่ถูกต้อง (ต้องขึ้นต้นด้วย 0 และมี 10 หลัก)')

// National ID validation (Thai format)
const ThaiNationalIdSchema = z.string()
  .regex(/^[0-9]{13}$/, 'เลขบัตรประชาชนไม่ถูกต้อง (ต้องเป็นตัวเลข 13 หลัก)')

// License plate validation (Thai format)
const ThaiLicensePlateSchema = z.string()
  .regex(/^[ก-ฮ]{1,2}\s?[0-9]{1,4}$/, 'ทะเบียนรถไม่ถูกต้อง')

// Service types
export const ServiceTypeSchema = z.enum([
  'ride',
  'delivery',
  'shopping',
  'moving',
  'laundry'
])

// Provider registration schema
export const ProviderRegistrationSchema = z.object({
  firstName: z.string()
    .min(2, 'ชื่อต้องมีอย่างน้อย 2 ตัวอักษร')
    .max(50, 'ชื่อยาวเกินไป'),
  
  lastName: z.string()
    .min(2, 'นามสกุลต้องมีอย่างน้อย 2 ตัวอักษร')
    .max(50, 'นามสกุลยาวเกินไป'),
  
  email: z.string()
    .email('อีเมลไม่ถูกต้อง')
    .toLowerCase(),
  
  phoneNumber: ThaiPhoneSchema,
  
  nationalId: ThaiNationalIdSchema,
  
  serviceTypes: z.array(ServiceTypeSchema)
    .min(1, 'กรุณาเลือกประเภทบริการอย่างน้อย 1 ประเภท')
    .max(3, 'เลือกได้สูงสุด 3 ประเภท'),
  
  primaryService: ServiceTypeSchema,
  
  vehicleType: z.string()
    .min(2, 'กรุณาระบุประเภทยานพาหนะ')
    .max(50),
  
  vehiclePlate: ThaiLicensePlateSchema.optional(),
  
  vehicleColor: z.string()
    .min(2, 'กรุณาระบุสีรถ')
    .max(30)
    .optional(),
  
  licenseNumber: z.string()
    .min(5, 'เลขใบขับขี่ไม่ถูกต้อง')
    .max(20)
    .optional(),
  
  licenseExpiry: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'วันหมดอายุไม่ถูกต้อง (YYYY-MM-DD)')
    .refine(
      (date) => new Date(date) > new Date(),
      'ใบขับขี่หมดอายุแล้ว'
    )
    .optional()
})

export type ProviderRegistrationInput = z.infer<typeof ProviderRegistrationSchema>

// Profile update schema (partial)
export const ProviderProfileUpdateSchema = ProviderRegistrationSchema.partial()

// Vehicle info schema
export const VehicleInfoSchema = z.object({
  type: z.string().min(2).max(50),
  plate: ThaiLicensePlateSchema.optional(),
  color: z.string().min(2).max(30).optional(),
  brand: z.string().max(50).optional(),
  model: z.string().max(50).optional(),
  year: z.number()
    .int()
    .min(1990, 'ปีรถต้องไม่ต่ำกว่า 1990')
    .max(new Date().getFullYear() + 1, 'ปีรถไม่ถูกต้อง')
    .optional(),
  seats: z.number()
    .int()
    .min(1)
    .max(50)
    .optional()
})

export type VehicleInfo = z.infer<typeof VehicleInfoSchema>

// Document upload schema
export const DocumentUploadSchema = z.object({
  type: z.enum([
    'national_id',
    'license',
    'vehicle_registration',
    'insurance',
    'profile_photo',
    'vehicle_photo'
  ]),
  
  file: z.instanceof(File)
    .refine(
      (file) => file.size <= 5 * 1024 * 1024,
      'ไฟล์ต้องมีขนาดไม่เกิน 5MB'
    )
    .refine(
      (file) => ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type),
      'ไฟล์ต้องเป็น JPG, PNG, WebP หรือ PDF'
    ),
  
  notes: z.string().max(200).optional()
})

export type DocumentUpload = z.infer<typeof DocumentUploadSchema>

// Job acceptance schema
export const JobAcceptanceSchema = z.object({
  jobId: z.string().uuid('Job ID ไม่ถูกต้อง'),
  estimatedArrival: z.number()
    .int()
    .min(1, 'เวลาถึงต้องมากกว่า 0 นาที')
    .max(60, 'เวลาถึงต้องไม่เกิน 60 นาที')
    .optional()
})

// Job completion schema
export const JobCompletionSchema = z.object({
  jobId: z.string().uuid('Job ID ไม่ถูกต้อง'),
  
  actualFare: z.number()
    .positive('ค่าบริการต้องมากกว่า 0')
    .max(10000, 'ค่าบริการสูงเกินไป'),
  
  notes: z.string()
    .max(500, 'หมายเหตุยาวเกินไป')
    .optional(),
  
  photoUrls: z.array(z.string().url())
    .max(5, 'อัพโหลดรูปได้สูงสุด 5 รูป')
    .optional()
})

export type JobCompletion = z.infer<typeof JobCompletionSchema>

// Earnings withdrawal schema
export const WithdrawalRequestSchema = z.object({
  amount: z.number()
    .positive('จำนวนเงินต้องมากกว่า 0')
    .max(50000, 'ถอนได้สูงสุด 50,000 บาทต่อครั้ง')
    .multipleOf(0.01, 'จำนวนเงินไม่ถูกต้อง'),
  
  bankAccount: z.object({
    bankCode: z.string()
      .length(3, 'รหัสธนาคารไม่ถูกต้อง'),
    
    accountNumber: z.string()
      .regex(/^[0-9]{10,12}$/, 'เลขบัญชีไม่ถูกต้อง'),
    
    accountName: z.string()
      .min(2, 'ชื่อบัญชีต้องมีอย่างน้อย 2 ตัวอักษร')
      .max(100, 'ชื่อบัญชียาวเกินไป')
  }),
  
  notes: z.string()
    .max(200, 'หมายเหตุยาวเกินไป')
    .optional()
})

export type WithdrawalRequest = z.infer<typeof WithdrawalRequestSchema>

// Location update schema
export const LocationUpdateSchema = z.object({
  latitude: z.number()
    .min(-90, 'Latitude ไม่ถูกต้อง')
    .max(90, 'Latitude ไม่ถูกต้อง'),
  
  longitude: z.number()
    .min(-180, 'Longitude ไม่ถูกต้อง')
    .max(180, 'Longitude ไม่ถูกต้อง'),
  
  accuracy: z.number()
    .positive()
    .optional(),
  
  speed: z.number()
    .nonnegative()
    .optional(),
  
  heading: z.number()
    .min(0)
    .max(360)
    .optional()
})

export type LocationUpdate = z.infer<typeof LocationUpdateSchema>

// Rating submission schema
export const RatingSubmissionSchema = z.object({
  rideId: z.string().uuid('Ride ID ไม่ถูกต้อง'),
  
  rating: z.number()
    .int()
    .min(1, 'คะแนนต้องอยู่ระหว่าง 1-5')
    .max(5, 'คะแนนต้องอยู่ระหว่าง 1-5'),
  
  comment: z.string()
    .max(500, 'ความคิดเห็นยาวเกินไป')
    .optional(),
  
  tags: z.array(z.string())
    .max(5, 'เลือกแท็กได้สูงสุด 5 แท็ก')
    .optional()
})

export type RatingSubmission = z.infer<typeof RatingSubmissionSchema>

/**
 * Validation helper function
 * Returns { success: true, data } or { success: false, error }
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data)
  
  if (result.success) {
    return { success: true, data: result.data }
  }
  
  // Get first error message
  const firstError = result.error.errors[0]
  const errorMessage = firstError?.message || 'ข้อมูลไม่ถูกต้อง'
  
  return { success: false, error: errorMessage }
}

/**
 * Get all validation errors
 */
export function validateWithErrors<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data)
  
  if (result.success) {
    return { success: true, data: result.data }
  }
  
  // Map errors to field names
  const errors: Record<string, string> = {}
  result.error.errors.forEach(err => {
    const field = err.path.join('.')
    errors[field] = err.message
  })
  
  return { success: false, errors }
}

/**
 * Validation Library - Production-ready input validation
 * Task: Production Readiness
 * 
 * Provides comprehensive validation for all user inputs
 */

// =====================================================
// Types
// =====================================================

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export interface ValidationRule {
  validate: (value: any) => boolean
  message: string
}

// =====================================================
// Basic Validators
// =====================================================

export const validators = {
  /**
   * Check if value is required (not empty)
   */
  required: (value: any): boolean => {
    if (value === null || value === undefined) return false
    if (typeof value === 'string') return value.trim().length > 0
    if (Array.isArray(value)) return value.length > 0
    return true
  },

  /**
   * Check email format
   */
  email: (value: string): boolean => {
    if (!value) return true // Optional field
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
  },

  /**
   * Check Thai phone number format
   */
  thaiPhone: (value: string): boolean => {
    if (!value) return true
    const cleaned = value.replace(/[\s-]/g, '')
    // Thai phone: 0XXXXXXXXX or +66XXXXXXXXX
    return /^(0[689]\d{8}|\+66[689]\d{8})$/.test(cleaned)
  },

  /**
   * Check Thai national ID format
   */
  thaiNationalId: (value: string): boolean => {
    if (!value) return true
    const cleaned = value.replace(/[\s-]/g, '')
    if (!/^\d{13}$/.test(cleaned)) return false
    
    // Checksum validation
    let sum = 0
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cleaned[i]) * (13 - i)
    }
    const checkDigit = (11 - (sum % 11)) % 10
    return checkDigit === parseInt(cleaned[12])
  },

  /**
   * Check minimum length
   */
  minLength: (min: number) => (value: string): boolean => {
    if (!value) return true
    return value.length >= min
  },

  /**
   * Check maximum length
   */
  maxLength: (max: number) => (value: string): boolean => {
    if (!value) return true
    return value.length <= max
  },

  /**
   * Check numeric value
   */
  numeric: (value: any): boolean => {
    if (value === null || value === undefined || value === '') return true
    return !isNaN(Number(value))
  },

  /**
   * Check positive number
   */
  positive: (value: number): boolean => {
    if (value === null || value === undefined) return true
    return Number(value) > 0
  },

  /**
   * Check minimum value
   */
  min: (minVal: number) => (value: number): boolean => {
    if (value === null || value === undefined) return true
    return Number(value) >= minVal
  },

  /**
   * Check maximum value
   */
  max: (maxVal: number) => (value: number): boolean => {
    if (value === null || value === undefined) return true
    return Number(value) <= maxVal
  },

  /**
   * Check if value is in allowed list
   */
  oneOf: <T>(allowed: T[]) => (value: T): boolean => {
    if (value === null || value === undefined) return true
    return allowed.includes(value)
  },

  /**
   * Check URL format
   */
  url: (value: string): boolean => {
    if (!value) return true
    try {
      new URL(value)
      return true
    } catch {
      return false
    }
  },

  /**
   * Check date format (ISO)
   */
  date: (value: string): boolean => {
    if (!value) return true
    const date = new Date(value)
    return !isNaN(date.getTime())
  },

  /**
   * Check future date
   */
  futureDate: (value: string): boolean => {
    if (!value) return true
    const date = new Date(value)
    return date > new Date()
  },

  /**
   * Check past date
   */
  pastDate: (value: string): boolean => {
    if (!value) return true
    const date = new Date(value)
    return date < new Date()
  },

  /**
   * Check latitude
   */
  latitude: (value: number): boolean => {
    if (value === null || value === undefined) return true
    return value >= -90 && value <= 90
  },

  /**
   * Check longitude
   */
  longitude: (value: number): boolean => {
    if (value === null || value === undefined) return true
    return value >= -180 && value <= 180
  },

  /**
   * Check Thai bank account number
   */
  thaiBankAccount: (value: string): boolean => {
    if (!value) return true
    const cleaned = value.replace(/[\s-]/g, '')
    return /^\d{10,12}$/.test(cleaned)
  },

  /**
   * Check password strength
   */
  strongPassword: (value: string): boolean => {
    if (!value) return true
    // At least 8 chars, 1 uppercase, 1 lowercase, 1 number
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value)
  },

  /**
   * Check Member UID format
   */
  memberUid: (value: string): boolean => {
    if (!value) return true
    return /^TRD-[A-Z0-9]{8}$/.test(value)
  },

  /**
   * Check tracking ID format
   */
  trackingId: (value: string): boolean => {
    if (!value) return true
    return /^[A-Z]{3}-\d{8}-\d{6}$/.test(value)
  }
}

// =====================================================
// Validation Schema
// =====================================================

type ValidatorFn = (value: any) => boolean

interface SchemaField {
  rules: Array<{ validator: ValidatorFn; message: string }>
}

export class ValidationSchema {
  private fields: Map<string, SchemaField> = new Map()

  field(name: string): FieldBuilder {
    return new FieldBuilder(this, name)
  }

  addField(name: string, field: SchemaField): void {
    this.fields.set(name, field)
  }

  validate(data: Record<string, any>): ValidationResult {
    const errors: string[] = []

    for (const [fieldName, field] of this.fields.entries()) {
      const value = data[fieldName]
      
      for (const rule of field.rules) {
        if (!rule.validator(value)) {
          errors.push(rule.message.replace('{field}', fieldName))
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

class FieldBuilder {
  private schema: ValidationSchema
  private fieldName: string
  private rules: Array<{ validator: ValidatorFn; message: string }> = []

  constructor(schema: ValidationSchema, fieldName: string) {
    this.schema = schema
    this.fieldName = fieldName
  }

  required(message = '{field} is required'): this {
    this.rules.push({ validator: validators.required, message })
    return this
  }

  email(message = '{field} must be a valid email'): this {
    this.rules.push({ validator: validators.email, message })
    return this
  }

  thaiPhone(message = '{field} must be a valid Thai phone number'): this {
    this.rules.push({ validator: validators.thaiPhone, message })
    return this
  }

  thaiNationalId(message = '{field} must be a valid Thai national ID'): this {
    this.rules.push({ validator: validators.thaiNationalId, message })
    return this
  }

  minLength(min: number, message = `{field} must be at least ${min} characters`): this {
    this.rules.push({ validator: validators.minLength(min), message })
    return this
  }

  maxLength(max: number, message = `{field} must be at most ${max} characters`): this {
    this.rules.push({ validator: validators.maxLength(max), message })
    return this
  }

  numeric(message = '{field} must be a number'): this {
    this.rules.push({ validator: validators.numeric, message })
    return this
  }

  positive(message = '{field} must be positive'): this {
    this.rules.push({ validator: validators.positive, message })
    return this
  }

  min(minVal: number, message = `{field} must be at least ${minVal}`): this {
    this.rules.push({ validator: validators.min(minVal), message })
    return this
  }

  max(maxVal: number, message = `{field} must be at most ${maxVal}`): this {
    this.rules.push({ validator: validators.max(maxVal), message })
    return this
  }

  custom(validator: ValidatorFn, message: string): this {
    this.rules.push({ validator, message })
    return this
  }

  build(): ValidationSchema {
    this.schema.addField(this.fieldName, { rules: this.rules })
    return this.schema
  }
}

// =====================================================
// Pre-built Schemas
// =====================================================

export const schemas = {
  /**
   * User registration schema
   */
  userRegistration: () => {
    const schema = new ValidationSchema()
    schema.field('first_name').required('กรุณากรอกชื่อ').minLength(2).build()
    schema.field('last_name').required('กรุณากรอกนามสกุล').minLength(2).build()
    schema.field('phone_number').required('กรุณากรอกเบอร์โทร').thaiPhone('เบอร์โทรไม่ถูกต้อง').build()
    schema.field('email').email('อีเมลไม่ถูกต้อง').build()
    return schema
  },

  /**
   * Provider registration schema
   */
  providerRegistration: () => {
    const schema = new ValidationSchema()
    schema.field('first_name').required('กรุณากรอกชื่อ').build()
    schema.field('last_name').required('กรุณากรอกนามสกุล').build()
    schema.field('phone_number').required('กรุณากรอกเบอร์โทร').thaiPhone().build()
    schema.field('national_id').required('กรุณากรอกเลขบัตรประชาชน').thaiNationalId('เลขบัตรประชาชนไม่ถูกต้อง').build()
    schema.field('provider_type').required('กรุณาเลือกประเภทบริการ').build()
    return schema
  },

  /**
   * Ride booking schema
   */
  rideBooking: () => {
    const schema = new ValidationSchema()
    schema.field('pickup_lat').required('กรุณาเลือกจุดรับ').custom(validators.latitude, 'พิกัดไม่ถูกต้อง').build()
    schema.field('pickup_lng').required('กรุณาเลือกจุดรับ').custom(validators.longitude, 'พิกัดไม่ถูกต้อง').build()
    schema.field('dropoff_lat').required('กรุณาเลือกจุดส่ง').custom(validators.latitude, 'พิกัดไม่ถูกต้อง').build()
    schema.field('dropoff_lng').required('กรุณาเลือกจุดส่ง').custom(validators.longitude, 'พิกัดไม่ถูกต้อง').build()
    return schema
  },

  /**
   * Delivery booking schema
   */
  deliveryBooking: () => {
    const schema = new ValidationSchema()
    schema.field('pickup_lat').required().custom(validators.latitude, 'พิกัดไม่ถูกต้อง').build()
    schema.field('pickup_lng').required().custom(validators.longitude, 'พิกัดไม่ถูกต้อง').build()
    schema.field('dropoff_lat').required().custom(validators.latitude, 'พิกัดไม่ถูกต้อง').build()
    schema.field('dropoff_lng').required().custom(validators.longitude, 'พิกัดไม่ถูกต้อง').build()
    schema.field('package_description').required('กรุณาระบุรายละเอียดพัสดุ').maxLength(500).build()
    return schema
  },

  /**
   * Bank account schema
   */
  bankAccount: () => {
    const schema = new ValidationSchema()
    schema.field('bank_name').required('กรุณาเลือกธนาคาร').build()
    schema.field('account_number').required('กรุณากรอกเลขบัญชี').custom(validators.thaiBankAccount, 'เลขบัญชีไม่ถูกต้อง').build()
    schema.field('account_name').required('กรุณากรอกชื่อบัญชี').build()
    return schema
  },

  /**
   * Topup request schema
   */
  topupRequest: () => {
    const schema = new ValidationSchema()
    schema.field('amount').required('กรุณาระบุจำนวนเงิน').positive('จำนวนเงินต้องมากกว่า 0').min(20, 'ขั้นต่ำ 20 บาท').max(50000, 'สูงสุด 50,000 บาท').build()
    return schema
  },

  /**
   * Withdrawal request schema
   */
  withdrawalRequest: () => {
    const schema = new ValidationSchema()
    schema.field('amount').required('กรุณาระบุจำนวนเงิน').positive().min(100, 'ขั้นต่ำ 100 บาท').build()
    schema.field('bank_account_id').required('กรุณาเลือกบัญชีธนาคาร').build()
    return schema
  }
}

// =====================================================
// Sanitization Functions
// =====================================================

export const sanitize = {
  /**
   * Trim and normalize whitespace
   */
  string: (value: string): string => {
    if (!value) return ''
    return value.trim().replace(/\s+/g, ' ')
  },

  /**
   * Sanitize phone number
   */
  phone: (value: string): string => {
    if (!value) return ''
    return value.replace(/[\s-()]/g, '')
  },

  /**
   * Sanitize national ID
   */
  nationalId: (value: string): string => {
    if (!value) return ''
    return value.replace(/[\s-]/g, '')
  },

  /**
   * Sanitize email
   */
  email: (value: string): string => {
    if (!value) return ''
    return value.trim().toLowerCase()
  },

  /**
   * Sanitize number
   */
  number: (value: any): number | null => {
    if (value === null || value === undefined || value === '') return null
    const num = Number(value)
    return isNaN(num) ? null : num
  },

  /**
   * Sanitize HTML (basic XSS prevention)
   */
  html: (value: string): string => {
    if (!value) return ''
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  },

  /**
   * Sanitize object (apply sanitizers to all string fields)
   */
  object: <T extends Record<string, any>>(obj: T): T => {
    const result = { ...obj }
    for (const key in result) {
      if (typeof result[key] === 'string') {
        result[key] = sanitize.string(result[key]) as any
      }
    }
    return result
  }
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Generate Member UID
 */
export function generateMemberUid(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let uid = 'TRD-'
  for (let i = 0; i < 8; i++) {
    uid += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return uid
}

/**
 * Format phone number for display
 */
export function formatPhone(phone: string): string {
  const cleaned = sanitize.phone(phone)
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

/**
 * Format national ID for display
 */
export function formatNationalId(id: string): string {
  const cleaned = sanitize.nationalId(id)
  if (cleaned.length === 13) {
    return `${cleaned[0]}-${cleaned.slice(1, 5)}-${cleaned.slice(5, 10)}-${cleaned.slice(10, 12)}-${cleaned[12]}`
  }
  return id
}

/**
 * Mask sensitive data
 */
export function maskSensitive(value: string, visibleChars = 4): string {
  if (!value || value.length <= visibleChars) return value
  const visible = value.slice(-visibleChars)
  const masked = '*'.repeat(value.length - visibleChars)
  return masked + visible
}

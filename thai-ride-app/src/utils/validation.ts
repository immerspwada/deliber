/**
 * Input Validation Utilities
 * Comprehensive validation for all user inputs
 */

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export interface ValidationRule<T = any> {
  validate: (value: T) => boolean
  message: string
}

/**
 * Common validation rules
 */
export const ValidationRules = {
  // Required field
  required: <T>(message = 'This field is required'): ValidationRule<T> => ({
    validate: (value: T) => {
      if (value === null || value === undefined) return false
      if (typeof value === 'string') return value.trim().length > 0
      if (Array.isArray(value)) return value.length > 0
      return true
    },
    message
  }),

  // Email validation
  email: (message = 'Please enter a valid email address'): ValidationRule<string> => ({
    validate: (value: string) => {
      if (!value) return true // Allow empty if not required
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(value)
    },
    message
  }),

  // Phone number validation (Thai format)
  phone: (message = 'Please enter a valid phone number'): ValidationRule<string> => ({
    validate: (value: string) => {
      if (!value) return true // Allow empty if not required
      const phoneRegex = /^(\+66|0)[0-9]{8,9}$/
      return phoneRegex.test(value.replace(/[-\s]/g, ''))
    },
    message
  }),

  // Minimum length
  minLength: (min: number, message?: string): ValidationRule<string> => ({
    validate: (value: string) => {
      if (!value) return true // Allow empty if not required
      return value.length >= min
    },
    message: message || `Must be at least ${min} characters`
  }),

  // Maximum length
  maxLength: (max: number, message?: string): ValidationRule<string> => ({
    validate: (value: string) => {
      if (!value) return true // Allow empty if not required
      return value.length <= max
    },
    message: message || `Must be no more than ${max} characters`
  }),

  // Numeric validation
  numeric: (message = 'Must be a valid number'): ValidationRule<string | number> => ({
    validate: (value: string | number) => {
      if (!value && value !== 0) return true // Allow empty if not required
      return !isNaN(Number(value))
    },
    message
  }),

  // Minimum value
  min: (min: number, message?: string): ValidationRule<number> => ({
    validate: (value: number) => {
      if (value === null || value === undefined) return true
      return value >= min
    },
    message: message || `Must be at least ${min}`
  }),

  // Maximum value
  max: (max: number, message?: string): ValidationRule<number> => ({
    validate: (value: number) => {
      if (value === null || value === undefined) return true
      return value <= max
    },
    message: message || `Must be no more than ${max}`
  }),

  // UUID validation
  uuid: (message = 'Must be a valid UUID'): ValidationRule<string> => ({
    validate: (value: string) => {
      if (!value) return true // Allow empty if not required
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      return uuidRegex.test(value)
    },
    message
  }),

  // OTP validation (6 digits)
  otp: (message = 'Must be a 6-digit code'): ValidationRule<string> => ({
    validate: (value: string) => {
      if (!value) return true // Allow empty if not required
      return /^\d{6}$/.test(value)
    },
    message
  }),

  // Amount validation (positive number with max 2 decimal places)
  amount: (message = 'Must be a valid amount'): ValidationRule<number | string> => ({
    validate: (value: number | string) => {
      if (!value && value !== 0) return true // Allow empty if not required
      const num = Number(value)
      if (isNaN(num) || num < 0) return false
      // Check decimal places
      const str = num.toString()
      const decimalIndex = str.indexOf('.')
      if (decimalIndex !== -1 && str.length - decimalIndex - 1 > 2) return false
      return true
    },
    message
  }),

  // Bank account number validation
  bankAccount: (message = 'Must be a valid bank account number'): ValidationRule<string> => ({
    validate: (value: string) => {
      if (!value) return true // Allow empty if not required
      // Thai bank account numbers are typically 10-12 digits
      return /^\d{10,12}$/.test(value.replace(/[-\s]/g, ''))
    },
    message
  }),

  // Custom validation
  custom: <T>(validator: (value: T) => boolean, message: string): ValidationRule<T> => ({
    validate: validator,
    message
  })
}

/**
 * Validate a single field
 */
export function validateField<T>(value: T, rules: ValidationRule<T>[]): ValidationResult {
  const errors: string[] = []

  for (const rule of rules) {
    if (!rule.validate(value)) {
      errors.push(rule.message)
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate multiple fields
 */
export function validateForm<T extends Record<string, any>>(
  data: T,
  rules: Partial<Record<keyof T, ValidationRule<any>[]>>
): Record<keyof T, ValidationResult> & { isValid: boolean } {
  const results = {} as Record<keyof T, ValidationResult>
  let isValid = true

  for (const [field, fieldRules] of Object.entries(rules) as [keyof T, ValidationRule<any>[]][]) {
    if (fieldRules) {
      const result = validateField(data[field], fieldRules)
      results[field] = result
      if (!result.isValid) {
        isValid = false
      }
    }
  }

  return { ...results, isValid }
}

/**
 * Sanitize input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  if (!input) return ''
  
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
}

/**
 * Validate Thai phone number
 */
export function validateThaiPhoneNumber(phone: string): boolean {
  if (!phone) return false
  const phoneRegex = /^(\+66|0)[0-9]{8,9}$/
  return phoneRegex.test(phone.replace(/[-\s]/g, ''))
}

/**
 * Validate email address
 */
export function validateEmail(email: string): boolean {
  if (!email) return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): boolean {
  if (!password) return false
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/
  return passwordRegex.test(password)
}

/**
 * Format Thai phone number for display
 * Converts 0812345678 to 081-234-5678
 */
export function formatThaiPhoneNumber(phone: string): string {
  if (!phone) return ''
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '')
  
  // Handle +66 prefix
  let normalized = digits
  if (digits.startsWith('66')) {
    normalized = '0' + digits.slice(2)
  }
  
  // Format as XXX-XXX-XXXX
  if (normalized.length === 10) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3, 6)}-${normalized.slice(6)}`
  }
  
  // Format as XX-XXX-XXXX for 9-digit numbers
  if (normalized.length === 9) {
    return `${normalized.slice(0, 2)}-${normalized.slice(2, 5)}-${normalized.slice(5)}`
  }
  
  return phone
}

/**
 * Validate and sanitize ride request data
 */
export function validateRideRequest(data: unknown): {
  isValid: boolean
  errors: string[]
  data?: { pickup: string; dropoff: string; serviceType?: string }
} {
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Invalid request data'] }
  }

  const { pickup, dropoff, serviceType } = data as Record<string, unknown>

  const errors: string[] = []

  // Validate pickup
  if (typeof pickup !== 'string' || pickup.length < 3) {
    errors.push('Pickup location must be at least 3 characters')
  }

  // Validate dropoff
  if (typeof dropoff !== 'string' || dropoff.length < 3) {
    errors.push('Dropoff location must be at least 3 characters')
  }

  // Validate service type if provided
  if (serviceType && !['ride', 'delivery', 'shopping'].includes(serviceType as string)) {
    errors.push('Invalid service type')
  }

  if (errors.length > 0) {
    return { isValid: false, errors }
  }

  return {
    isValid: true,
    errors: [],
    data: {
      pickup: sanitizeInput(pickup as string),
      dropoff: sanitizeInput(dropoff as string),
      serviceType: serviceType as string | undefined
    }
  }
}

/**
 * Validate withdrawal request
 */
export function validateWithdrawalRequest(data: unknown): {
  isValid: boolean
  errors: string[]
  data?: { amount: number; bankAccountId: string }
} {
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Invalid request data'] }
  }

  const { amount, bankAccountId } = data as Record<string, unknown>

  const errors: string[] = []

  // Validate amount
  if (typeof amount !== 'number' || amount <= 0) {
    errors.push('Amount must be a positive number')
  } else if (amount < 100) {
    errors.push('Minimum withdrawal amount is 100 THB')
  } else if (amount > 50000) {
    errors.push('Maximum withdrawal amount is 50,000 THB')
  }

  // Validate bank account ID
  if (typeof bankAccountId !== 'string' || !ValidationRules.uuid().validate(bankAccountId)) {
    errors.push('Invalid bank account ID')
  }

  if (errors.length > 0) {
    return { isValid: false, errors }
  }

  return {
    isValid: true,
    errors: [],
    data: {
      amount: amount as number,
      bankAccountId: bankAccountId as string
    }
  }
}

/**
 * Validate topup request
 */
export function validateTopupRequest(data: unknown): {
  isValid: boolean
  errors: string[]
  data?: { amount: number; paymentMethod: string }
} {
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Invalid request data'] }
  }

  const { amount, paymentMethod } = data as Record<string, unknown>

  const errors: string[] = []

  // Validate amount
  if (typeof amount !== 'number' || amount <= 0) {
    errors.push('Amount must be a positive number')
  } else if (amount < 50) {
    errors.push('Minimum topup amount is 50 THB')
  } else if (amount > 100000) {
    errors.push('Maximum topup amount is 100,000 THB')
  }

  // Validate payment method
  if (!['promptpay', 'bank_transfer', 'credit_card'].includes(paymentMethod as string)) {
    errors.push('Invalid payment method')
  }

  if (errors.length > 0) {
    return { isValid: false, errors }
  }

  return {
    isValid: true,
    errors: [],
    data: {
      amount: amount as number,
      paymentMethod: paymentMethod as string
    }
  }
}
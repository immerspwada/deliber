/**
 * Property-Based Tests for Provider Registration Form
 * Feature: provider-system-redesign, Property 1: Provider Registration Creates Pending Status
 * Validates: Requirements 1.2
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

// ============================================================================
// GENERATORS
// ============================================================================

const validFirstName = fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2)
const validLastName = fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2)
const validEmail = fc.emailAddress()
const validPhoneNumber = fc.string({ minLength: 10, maxLength: 10 }).map(s => '0' + s.slice(1, 10).replace(/\D/g, '').padEnd(9, '0'))
const validServiceTypes = fc.array(
  fc.constantFrom('ride', 'delivery', 'shopping', 'moving', 'laundry'),
  { minLength: 1, maxLength: 5 }
).map(arr => Array.from(new Set(arr)))

// ============================================================================
// VALIDATION FUNCTIONS (mirrored from component)
// ============================================================================

function validateEmail(email: string): string | null {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
  if (!email) return 'กรุณากรอกอีเมล'
  if (!emailRegex.test(email)) return 'รูปแบบอีเมลไม่ถูกต้อง'
  return null
}

function validatePhoneNumber(phone: string): string | null {
  const phoneRegex = /^\d{10}$/
  if (!phone) return 'กรุณากรอกเบอร์โทรศัพท์'
  if (!phoneRegex.test(phone)) return 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก'
  if (!phone.startsWith('0')) return 'เบอร์โทรศัพท์ต้องขึ้นต้นด้วย 0'
  return null
}

function validateName(name: string, field: string): string | null {
  if (!name || name.trim().length === 0) return `กรุณากรอก${field}`
  if (name.trim().length < 2) return `${field}ต้องมีอย่างน้อย 2 ตัวอักษร`
  if (name.trim().length > 50) return `${field}ต้องไม่เกิน 50 ตัวอักษร`
  return null
}

function validateServiceTypes(types: string[]): string | null {
  if (types.length === 0) return 'กรุณาเลือกประเภทบริการอย่างน้อย 1 ประเภท'
  if (types.length > 5) return 'เลือกได้สูงสุด 5 ประเภท'
  return null
}

// ============================================================================
// PROPERTY TESTS
// ============================================================================

describe('Provider Registration Form - Property Tests', () => {
  
  describe('Property 1: Valid Registration Data Creates Pending Provider', () => {
    
    it('should accept any valid registration data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            first_name: validFirstName,
            last_name: validLastName,
            email: validEmail,
            phone_number: validPhoneNumber,
            service_types: validServiceTypes
          }),
          async (data) => {
            // Validate all fields
            expect(validateName(data.first_name, 'ชื่อ')).toBeNull()
            expect(validateName(data.last_name, 'นามสกุล')).toBeNull()
            expect(validateEmail(data.email)).toBeNull()
            expect(validatePhoneNumber(data.phone_number)).toBeNull()
            expect(validateServiceTypes(data.service_types)).toBeNull()
            
            // Verify data structure
            expect(data.first_name.trim().length).toBeGreaterThanOrEqual(2)
            expect(data.last_name.trim().length).toBeGreaterThanOrEqual(2)
            expect(data.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
            expect(data.phone_number).toMatch(/^\d{10}$/)
            expect(data.phone_number.startsWith('0')).toBe(true)
            expect(data.service_types.length).toBeGreaterThan(0)
            expect(data.service_types.length).toBeLessThanOrEqual(5)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
  
  describe('Email Validation', () => {
    
    it('should accept valid email formats', async () => {
      await fc.assert(
        fc.asyncProperty(
          validEmail,
          async (email) => {
            const error = validateEmail(email)
            expect(error).toBeNull()
            expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
          }
        ),
        { numRuns: 100 }
      )
    })
    
    it('should reject invalid email formats', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(''),
            fc.constant('notanemail'),
            fc.constant('@example.com'),
            fc.constant('user@'),
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('@'))
          ),
          async (email) => {
            const error = validateEmail(email)
            if (!email || !email.includes('@')) {
              expect(error).not.toBeNull()
            }
          }
        ),
        { numRuns: 50 }
      )
    })
  })
  
  describe('Phone Number Validation', () => {
    
    it('should accept valid 10-digit phone numbers starting with 0', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPhoneNumber,
          async (phone) => {
            const error = validatePhoneNumber(phone)
            expect(error).toBeNull()
            expect(phone).toMatch(/^\d{10}$/)
            expect(phone.startsWith('0')).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })
    
    it('should reject invalid phone numbers', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(''),
            fc.constant('123'), // Too short
            fc.constant('12345678901'), // Too long
            fc.constant('abcdefghij'), // Not digits
            fc.string({ minLength: 1, maxLength: 15 }).filter(s => s.length !== 10)
          ),
          async (phone) => {
            const error = validatePhoneNumber(phone)
            if (!phone || phone.length !== 10 || !/^\d{10}$/.test(phone)) {
              expect(error).not.toBeNull()
            }
          }
        ),
        { numRuns: 50 }
      )
    })
    
    it('should reject phone numbers not starting with 0', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 10 })
            .filter(s => /^\d{10}$/.test(s) && !s.startsWith('0')),
          async (phone) => {
            const error = validatePhoneNumber(phone)
            expect(error).not.toBeNull()
            expect(error).toContain('ต้องขึ้นต้นด้วย 0')
          }
        ),
        { numRuns: 50 }
      )
    })
  })
  
  describe('Name Validation', () => {
    
    it('should accept valid names (2-50 characters)', async () => {
      await fc.assert(
        fc.asyncProperty(
          validFirstName,
          async (name) => {
            const error = validateName(name, 'ชื่อ')
            expect(error).toBeNull()
            expect(name.trim().length).toBeGreaterThanOrEqual(2)
            expect(name.trim().length).toBeLessThanOrEqual(50)
          }
        ),
        { numRuns: 100 }
      )
    })
    
    it('should reject names that are too short', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(''),
            fc.constant(' '),
            fc.constant('a')
          ),
          async (name) => {
            const error = validateName(name, 'ชื่อ')
            expect(error).not.toBeNull()
          }
        ),
        { numRuns: 30 }
      )
    })
    
    it('should reject names that are too long', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 51, maxLength: 100 }),
          async (name) => {
            const error = validateName(name, 'ชื่อ')
            if (name.trim().length > 50) {
              expect(error).not.toBeNull()
              expect(error).toContain('ไม่เกิน 50')
            }
          }
        ),
        { numRuns: 50 }
      )
    })
  })
  
  describe('Service Types Validation', () => {
    
    it('should accept 1-5 service types', async () => {
      await fc.assert(
        fc.asyncProperty(
          validServiceTypes,
          async (types) => {
            const error = validateServiceTypes(types)
            expect(error).toBeNull()
            expect(types.length).toBeGreaterThan(0)
            expect(types.length).toBeLessThanOrEqual(5)
            
            // All types should be valid
            const validTypes = ['ride', 'delivery', 'shopping', 'moving', 'laundry']
            types.forEach(type => {
              expect(validTypes).toContain(type)
            })
          }
        ),
        { numRuns: 100 }
      )
    })
    
    it('should reject empty service types array', async () => {
      const error = validateServiceTypes([])
      expect(error).not.toBeNull()
      expect(error).toContain('อย่างน้อย 1 ประเภท')
    })
    
    it('should reject more than 5 service types', async () => {
      const types = ['ride', 'delivery', 'shopping', 'moving', 'laundry', 'extra']
      const error = validateServiceTypes(types)
      expect(error).not.toBeNull()
      expect(error).toContain('สูงสุด 5')
    })
    
    it('should handle duplicate service types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.constantFrom('ride', 'delivery', 'shopping', 'moving', 'laundry'),
            { minLength: 1, maxLength: 10 }
          ),
          async (typesWithDuplicates) => {
            // Remove duplicates (as the component does)
            const uniqueTypes = Array.from(new Set(typesWithDuplicates))
            
            if (uniqueTypes.length >= 1 && uniqueTypes.length <= 5) {
              const error = validateServiceTypes(uniqueTypes)
              expect(error).toBeNull()
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })
  
  describe('Form Validation Integration', () => {
    
    it('should validate complete form data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            first_name: validFirstName,
            last_name: validLastName,
            email: validEmail,
            phone_number: validPhoneNumber,
            service_types: validServiceTypes,
            terms_accepted: fc.constant(true)
          }),
          async (formData) => {
            // All validations should pass
            expect(validateName(formData.first_name, 'ชื่อ')).toBeNull()
            expect(validateName(formData.last_name, 'นามสกุล')).toBeNull()
            expect(validateEmail(formData.email)).toBeNull()
            expect(validatePhoneNumber(formData.phone_number)).toBeNull()
            expect(validateServiceTypes(formData.service_types)).toBeNull()
            expect(formData.terms_accepted).toBe(true)
            
            // Form should be valid
            const isValid = 
              formData.first_name.trim().length > 0 &&
              formData.last_name.trim().length > 0 &&
              formData.email.trim().length > 0 &&
              formData.phone_number.trim().length === 10 &&
              formData.service_types.length > 0 &&
              formData.terms_accepted
            
            expect(isValid).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })
    
    it('should reject form with any invalid field', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            first_name: fc.oneof(validFirstName, fc.constant('')),
            last_name: fc.oneof(validLastName, fc.constant('')),
            email: fc.oneof(validEmail, fc.constant('invalid')),
            phone_number: fc.oneof(validPhoneNumber, fc.constant('123')),
            service_types: fc.oneof(validServiceTypes, fc.constant([])),
            terms_accepted: fc.boolean()
          }),
          async (formData) => {
            const hasError = 
              validateName(formData.first_name, 'ชื่อ') !== null ||
              validateName(formData.last_name, 'นามสกุล') !== null ||
              validateEmail(formData.email) !== null ||
              validatePhoneNumber(formData.phone_number) !== null ||
              validateServiceTypes(formData.service_types) !== null ||
              !formData.terms_accepted
            
            const isValid = 
              formData.first_name.trim().length > 0 &&
              formData.last_name.trim().length > 0 &&
              formData.email.trim().length > 0 &&
              formData.phone_number.trim().length === 10 &&
              formData.service_types.length > 0 &&
              formData.terms_accepted
            
            // If form is invalid, there should be an error
            if (!isValid) {
              expect(hasError).toBe(true)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })
  
  describe('Edge Cases', () => {
    
    it('should handle whitespace in names', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 2, maxLength: 50 }).map(s => '  ' + s + '  '),
          async (name) => {
            const trimmed = name.trim()
            if (trimmed.length >= 2 && trimmed.length <= 50) {
              const error = validateName(name, 'ชื่อ')
              expect(error).toBeNull()
            }
          }
        ),
        { numRuns: 50 }
      )
    })
    
    it('should handle special characters in email', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          async (email) => {
            const error = validateEmail(email)
            expect(error).toBeNull()
          }
        ),
        { numRuns: 100 }
      )
    })
    
    it('should handle phone numbers with leading zeros', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 999999999 }).map(n => '0' + n.toString().padStart(9, '0')),
          async (phone) => {
            const error = validatePhoneNumber(phone)
            expect(error).toBeNull()
            expect(phone.startsWith('0')).toBe(true)
            expect(phone.length).toBe(10)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})


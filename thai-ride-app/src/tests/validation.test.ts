import { describe, it, expect } from 'vitest'
import {
  validateThaiNationalId,
  formatThaiNationalId,
  validateThaiPhoneNumber,
  formatThaiPhoneNumber,
  validateEmail,
  validateThaiName,
  validatePassword,
  formatThaiBaht
} from '../utils/validation'

describe('Thai National ID Validation', () => {
  it('should validate correct Thai National ID', () => {
    // Valid Thai ID (example with correct check digit)
    // 1100700000001: sum = 1*13 + 1*12 + 0*11 + 0*10 + 7*9 + 0*8 + 0*7 + 0*6 + 0*5 + 0*4 + 0*3 + 0*2 = 88
    // check = (11 - 88%11) % 10 = (11 - 0) % 10 = 1 - correct!
    expect(validateThaiNationalId('1100700000001')).toBe(true)
  })

  it('should reject invalid check digit', () => {
    expect(validateThaiNationalId('1234567890123')).toBe(false) // Invalid check digit
    expect(validateThaiNationalId('1100700000002')).toBe(false) // Invalid check digit
  })

  it('should reject invalid length', () => {
    expect(validateThaiNationalId('123456789012')).toBe(false) // 12 digits
    expect(validateThaiNationalId('12345678901234')).toBe(false) // 14 digits
  })

  it('should reject non-numeric characters', () => {
    expect(validateThaiNationalId('123456789012a')).toBe(false)
    expect(validateThaiNationalId('1-2345-67890-12-3')).toBe(false) // With dashes (handled separately)
  })

  it('should format Thai National ID correctly', () => {
    expect(formatThaiNationalId('1234567890123')).toBe('1-2345-67890-12-3')
  })
})

describe('Thai Phone Number Validation', () => {
  it('should validate correct mobile numbers', () => {
    expect(validateThaiPhoneNumber('0812345678')).toBe(true)
    expect(validateThaiPhoneNumber('0912345678')).toBe(true)
    expect(validateThaiPhoneNumber('0612345678')).toBe(true)
  })

  it('should validate numbers with dashes', () => {
    expect(validateThaiPhoneNumber('081-234-5678')).toBe(true)
  })

  it('should validate numbers with +66 prefix', () => {
    expect(validateThaiPhoneNumber('+66812345678')).toBe(true)
  })

  it('should reject invalid phone numbers', () => {
    expect(validateThaiPhoneNumber('0112345678')).toBe(false) // Invalid prefix
    expect(validateThaiPhoneNumber('08123456789')).toBe(false) // Too long
    expect(validateThaiPhoneNumber('081234567')).toBe(false) // Too short
  })

  it('should format phone numbers correctly', () => {
    expect(formatThaiPhoneNumber('0812345678')).toBe('081-234-5678')
    expect(formatThaiPhoneNumber('+66812345678')).toBe('081-234-5678')
  })
})

describe('Email Validation', () => {
  it('should validate correct emails', () => {
    expect(validateEmail('test@example.com')).toBe(true)
    expect(validateEmail('user.name@domain.co.th')).toBe(true)
  })

  it('should reject invalid emails', () => {
    expect(validateEmail('invalid')).toBe(false)
    expect(validateEmail('invalid@')).toBe(false)
    expect(validateEmail('@domain.com')).toBe(false)
  })
})

describe('Thai Name Validation', () => {
  it('should validate Thai names', () => {
    expect(validateThaiName('สมชาย')).toBe(true)
    expect(validateThaiName('John')).toBe(true)
    expect(validateThaiName('สมชาย Smith')).toBe(true)
  })

  it('should reject invalid names', () => {
    expect(validateThaiName('a')).toBe(false) // Too short
    expect(validateThaiName('123')).toBe(false) // Numbers only
  })
})

describe('Password Validation', () => {
  it('should validate strong passwords', () => {
    const result = validatePassword('Password123')
    expect(result.valid).toBe(true)
  })

  it('should reject short passwords', () => {
    const result = validatePassword('Pass1')
    expect(result.valid).toBe(false)
    expect(result.message).toContain('8')
  })

  it('should reject passwords without letters', () => {
    const result = validatePassword('12345678')
    expect(result.valid).toBe(false)
  })

  it('should reject passwords without numbers', () => {
    const result = validatePassword('Password')
    expect(result.valid).toBe(false)
  })
})

describe('Thai Baht Formatting', () => {
  it('should format currency correctly', () => {
    const formatted = formatThaiBaht(1000)
    expect(formatted).toContain('1,000')
  })
})
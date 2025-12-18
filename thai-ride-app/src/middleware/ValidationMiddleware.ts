/**
 * Validation Middleware
 * 
 * Handles input validation and data sanitization
 */

import { logger } from '../utils/logger'
import type { Result } from '../utils/result'

export interface ValidationRule {
  field: string
  type: 'string' | 'number' | 'boolean' | 'email' | 'phone' | 'url' | 'date' | 'array' | 'object'
  required?: boolean
  min?: number
  max?: number
  pattern?: RegExp
  custom?: (value: any) => boolean | string
  sanitize?: boolean
}

export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string[]>
  sanitizedData?: Record<string, any>
}

export class ValidationMiddleware {
  /**
   * Validate data against rules
   */
  static validate(data: Record<string, any>, rules: ValidationRule[]): ValidationResult {
    const errors: Record<string, string[]> = {}
    const sanitizedData: Record<string, any> = { ...data }
    
    for (const rule of rules) {
      const fieldErrors: string[] = []
      const value = data[rule.field]
      
      // Check required fields
      if (rule.required && (value === undefined || value === null || value === '')) {
        fieldErrors.push(`${rule.field} is required`)
        continue
      }
      
      // Skip validation if field is not required and empty
      if (!rule.required && (value === undefined || value === null || value === '')) {
        continue
      }
      
      // Type validation
      const typeError = this.validateType(value, rule.type, rule.field)
      if (typeError) {
        fieldErrors.push(typeError)
        continue
      }
      
      // Length/size validation
      if (rule.min !== undefined || rule.max !== undefined) {
        const lengthError = this.validateLength(value, rule.min, rule.max, rule.field, rule.type)
        if (lengthError) {
          fieldErrors.push(lengthError)
        }
      }
      
      // Pattern validation
      if (rule.pattern && typeof value === 'string') {
        if (!rule.pattern.test(value)) {
          fieldErrors.push(`${rule.field} format is invalid`)
        }
      }
      
      // Custom validation
      if (rule.custom) {
        const customResult = rule.custom(value)
        if (typeof customResult === 'string') {
          fieldErrors.push(customResult)
        } else if (!customResult) {
          fieldErrors.push(`${rule.field} is invalid`)
        }
      }
      
      // Sanitization
      if (rule.sanitize && typeof value === 'string') {
        sanitizedData[rule.field] = this.sanitizeString(value)
      }
      
      if (fieldErrors.length > 0) {
        errors[rule.field] = fieldErrors
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      sanitizedData
    }
  }
  
  /**
   * Validate type
   */
  private static validateType(value: any, type: string, field: string): string | null {
    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          return `${field} must be a string`
        }
        break
      
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return `${field} must be a valid number`
        }
        break
      
      case 'boolean':
        if (typeof value !== 'boolean') {
          return `${field} must be a boolean`
        }
        break
      
      case 'email':
        if (typeof value !== 'string' || !this.isValidEmail(value)) {
          return `${field} must be a valid email address`
        }
        break
      
      case 'phone':
        if (typeof value !== 'string' || !this.isValidPhone(value)) {
          return `${field} must be a valid phone number`
        }
        break
      
      case 'url':
        if (typeof value !== 'string' || !this.isValidUrl(value)) {
          return `${field} must be a valid URL`
        }
        break
      
      case 'date':
        if (!(value instanceof Date) && !this.isValidDateString(value)) {
          return `${field} must be a valid date`
        }
        break
      
      case 'array':
        if (!Array.isArray(value)) {
          return `${field} must be an array`
        }
        break
      
      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          return `${field} must be an object`
        }
        break
    }
    
    return null
  }
  
  /**
   * Validate length/size
   */
  private static validateLength(
    value: any,
    min?: number,
    max?: number,
    field?: string,
    type?: string
  ): string | null {
    let length: number
    
    if (typeof value === 'string' || Array.isArray(value)) {
      length = value.length
    } else if (typeof value === 'number') {
      length = value
    } else {
      return null
    }
    
    if (min !== undefined && length < min) {
      if (type === 'string') {
        return `${field} must be at least ${min} characters long`
      } else if (type === 'array') {
        return `${field} must have at least ${min} items`
      } else if (type === 'number') {
        return `${field} must be at least ${min}`
      }
      return `${field} is too short`
    }
    
    if (max !== undefined && length > max) {
      if (type === 'string') {
        return `${field} must be no more than ${max} characters long`
      } else if (type === 'array') {
        return `${field} must have no more than ${max} items`
      } else if (type === 'number') {
        return `${field} must be no more than ${max}`
      }
      return `${field} is too long`
    }
    
    return null
  }
  
  /**
   * Validate email format
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
  
  /**
   * Validate Thai phone number
   */
  private static isValidPhone(phone: string): boolean {
    // Thai phone number patterns
    const phoneRegex = /^(\+66|66|0)[0-9]{8,9}$/
    return phoneRegex.test(phone.replace(/[-\s]/g, ''))
  }
  
  /**
   * Validate URL format
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }
  
  /**
   * Validate date string
   */
  private static isValidDateString(dateString: any): boolean {
    if (typeof dateString !== 'string') return false
    const date = new Date(dateString)
    return !isNaN(date.getTime())
  }
  
  /**
   * Sanitize string input
   */
  private static sanitizeString(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/['"]/g, '') // Remove quotes
      .substring(0, 1000) // Limit length
  }
  
  /**
   * Validate ride request data
   */
  static validateRideRequest(data: any): ValidationResult {
    const rules: ValidationRule[] = [
      { field: 'userId', type: 'string', required: true },
      { field: 'pickup', type: 'object', required: true },
      { field: 'destination', type: 'object', required: true },
      { field: 'rideType', type: 'string', required: false, custom: (value) => 
        !value || ['standard', 'premium', 'shared'].includes(value) },
      { field: 'passengerCount', type: 'number', required: false, min: 1, max: 8 },
      { field: 'specialRequests', type: 'string', required: false, max: 500, sanitize: true }
    ]
    
    const result = this.validate(data, rules)
    
    // Validate pickup location
    if (data.pickup) {
      const pickupResult = this.validateLocation(data.pickup, 'pickup')
      if (!pickupResult.isValid) {
        Object.assign(result.errors, pickupResult.errors)
        result.isValid = false
      }
    }
    
    // Validate destination location
    if (data.destination) {
      const destinationResult = this.validateLocation(data.destination, 'destination')
      if (!destinationResult.isValid) {
        Object.assign(result.errors, destinationResult.errors)
        result.isValid = false
      }
    }
    
    return result
  }
  
  /**
   * Validate delivery request data
   */
  static validateDeliveryRequest(data: any): ValidationResult {
    const rules: ValidationRule[] = [
      { field: 'userId', type: 'string', required: true },
      { field: 'senderName', type: 'string', required: true, min: 2, max: 100, sanitize: true },
      { field: 'senderPhone', type: 'phone', required: true },
      { field: 'senderAddress', type: 'string', required: true, min: 10, max: 200, sanitize: true },
      { field: 'recipientName', type: 'string', required: true, min: 2, max: 100, sanitize: true },
      { field: 'recipientPhone', type: 'phone', required: true },
      { field: 'recipientAddress', type: 'string', required: true, min: 10, max: 200, sanitize: true },
      { field: 'packageType', type: 'string', required: true },
      { field: 'packageDescription', type: 'string', required: false, max: 300, sanitize: true },
      { field: 'packageWeight', type: 'number', required: false, min: 0.1, max: 50 },
      { field: 'specialInstructions', type: 'string', required: false, max: 500, sanitize: true }
    ]
    
    return this.validate(data, rules)
  }
  
  /**
   * Validate location data
   */
  static validateLocation(location: any, fieldName: string = 'location'): ValidationResult {
    const rules: ValidationRule[] = [
      { field: 'lat', type: 'number', required: true, min: -90, max: 90 },
      { field: 'lng', type: 'number', required: true, min: -180, max: 180 },
      { field: 'address', type: 'string', required: true, min: 5, max: 200, sanitize: true }
    ]
    
    const result = this.validate(location, rules)
    
    // Prefix field names with location type
    const prefixedErrors: Record<string, string[]> = {}
    for (const [field, errors] of Object.entries(result.errors)) {
      prefixedErrors[`${fieldName}.${field}`] = errors
    }
    
    return {
      ...result,
      errors: prefixedErrors
    }
  }
  
  /**
   * Validate user registration data
   */
  static validateUserRegistration(data: any): ValidationResult {
    const rules: ValidationRule[] = [
      { field: 'firstName', type: 'string', required: true, min: 2, max: 50, sanitize: true },
      { field: 'lastName', type: 'string', required: true, min: 2, max: 50, sanitize: true },
      { field: 'email', type: 'email', required: false },
      { field: 'phoneNumber', type: 'phone', required: true },
      { field: 'nationalId', type: 'string', required: true, pattern: /^\d{13}$/ },
      { field: 'password', type: 'string', required: true, min: 8, max: 128 },
      { field: 'acceptTerms', type: 'boolean', required: true, custom: (value) => value === true }
    ]
    
    return this.validate(data, rules)
  }
  
  /**
   * Validate payment data
   */
  static validatePayment(data: any): ValidationResult {
    const rules: ValidationRule[] = [
      { field: 'amount', type: 'number', required: true, min: 1, max: 100000 },
      { field: 'paymentMethod', type: 'string', required: true },
      { field: 'requestId', type: 'string', required: true },
      { field: 'requestType', type: 'string', required: true, 
        custom: (value) => ['ride', 'delivery', 'shopping'].includes(value) }
    ]
    
    return this.validate(data, rules)
  }
  
  /**
   * Log validation errors
   */
  static logValidationErrors(errors: Record<string, string[]>, context?: string): void {
    const errorCount = Object.keys(errors).length
    if (errorCount > 0) {
      logger.warn(`[ValidationMiddleware] Validation failed${context ? ` for ${context}` : ''}:`, {
        errorCount,
        errors
      })
    }
  }
}
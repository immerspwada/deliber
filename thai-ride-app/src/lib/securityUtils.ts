/**
 * Security Utilities for Production
 * XSS prevention, CSRF protection, input sanitization
 */

// ========================================
// XSS Prevention
// ========================================

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(str: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  }
  return str.replace(/[&<>"'`=/]/g, char => htmlEntities[char])
}

/**
 * Sanitize user input - remove dangerous characters
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:/gi, '')
    .trim()
}

/**
 * Sanitize URL to prevent javascript: and data: protocols
 */
export function sanitizeUrl(url: string): string {
  const sanitized = url.trim().toLowerCase()
  if (
    sanitized.startsWith('javascript:') ||
    sanitized.startsWith('data:') ||
    sanitized.startsWith('vbscript:')
  ) {
    return ''
  }
  return url
}

// ========================================
// CSRF Protection
// ========================================

/**
 * Generate CSRF token
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Store CSRF token in session storage
 */
export function storeCsrfToken(token: string): void {
  sessionStorage.setItem('csrf_token', token)
}

/**
 * Get stored CSRF token
 */
export function getCsrfToken(): string | null {
  return sessionStorage.getItem('csrf_token')
}

/**
 * Validate CSRF token
 */
export function validateCsrfToken(token: string): boolean {
  const storedToken = getCsrfToken()
  return storedToken !== null && storedToken === token
}

// ========================================
// Content Security Policy Helpers
// ========================================

/**
 * Generate nonce for inline scripts
 */
export function generateNonce(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
}

// ========================================
// Password Security
// ========================================

/**
 * Check password strength
 */
export interface PasswordStrength {
  score: number // 0-4
  level: 'weak' | 'fair' | 'good' | 'strong' | 'very_strong'
  feedback: string[]
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = []
  let score = 0

  if (password.length >= 8) score++
  else feedback.push('รหัสผ่านควรมีอย่างน้อย 8 ตัวอักษร')

  if (password.length >= 12) score++

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  else feedback.push('ควรมีตัวพิมพ์เล็กและตัวพิมพ์ใหญ่')

  if (/\d/.test(password)) score++
  else feedback.push('ควรมีตัวเลข')

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++
  else feedback.push('ควรมีอักขระพิเศษ')

  // Check for common patterns
  const commonPatterns = ['123456', 'password', 'qwerty', 'abc123']
  if (commonPatterns.some(p => password.toLowerCase().includes(p))) {
    score = Math.max(0, score - 2)
    feedback.push('หลีกเลี่ยงรูปแบบที่คาดเดาง่าย')
  }

  const levels: PasswordStrength['level'][] = ['weak', 'fair', 'good', 'strong', 'very_strong']
  
  return {
    score: Math.min(4, score),
    level: levels[Math.min(4, score)],
    feedback
  }
}

// ========================================
// Sensitive Data Masking
// ========================================

/**
 * Mask phone number (show last 4 digits)
 */
export function maskPhone(phone: string): string {
  if (phone.length < 4) return '****'
  return '*'.repeat(phone.length - 4) + phone.slice(-4)
}

/**
 * Mask email address
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return '***@***'
  
  const maskedLocal = local.length > 2 
    ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
    : '*'.repeat(local.length)
  
  return `${maskedLocal}@${domain}`
}

/**
 * Mask national ID
 */
export function maskNationalId(id: string): string {
  if (id.length < 4) return '****'
  return '*'.repeat(id.length - 4) + id.slice(-4)
}

/**
 * Mask credit card number
 */
export function maskCreditCard(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\D/g, '')
  if (cleaned.length < 4) return '****'
  return '**** **** **** ' + cleaned.slice(-4)
}

// ========================================
// Rate Limiting Helpers
// ========================================

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Check if action is rate limited
 */
export function isRateLimited(
  key: string,
  maxAttempts: number,
  windowMs: number
): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return false
  }

  if (entry.count >= maxAttempts) {
    return true
  }

  entry.count++
  return false
}

/**
 * Reset rate limit for key
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key)
}

// ========================================
// Session Security
// ========================================

/**
 * Generate secure session ID
 */
export function generateSessionId(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Check if session is expired
 */
export function isSessionExpired(loginTime: number, maxAgeMs: number): boolean {
  return Date.now() - loginTime > maxAgeMs
}

// ========================================
// Input Validation
// ========================================

/**
 * Validate Thai phone number
 */
export function isValidThaiPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '')
  return /^0[689]\d{8}$/.test(cleaned)
}

/**
 * Validate Thai national ID
 */
export function isValidThaiNationalId(id: string): boolean {
  const cleaned = id.replace(/\D/g, '')
  if (cleaned.length !== 13) return false

  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned[i]) * (13 - i)
  }
  const checkDigit = (11 - (sum % 11)) % 10
  return checkDigit === parseInt(cleaned[12])
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// ========================================
// Secure Storage
// ========================================

/**
 * Securely store sensitive data (with expiry)
 */
export function secureStore(key: string, value: string, expiryMs: number): void {
  const data = {
    value,
    expiry: Date.now() + expiryMs
  }
  sessionStorage.setItem(key, JSON.stringify(data))
}

/**
 * Retrieve securely stored data
 */
export function secureRetrieve(key: string): string | null {
  const item = sessionStorage.getItem(key)
  if (!item) return null

  try {
    const data = JSON.parse(item)
    if (Date.now() > data.expiry) {
      sessionStorage.removeItem(key)
      return null
    }
    return data.value
  } catch {
    return null
  }
}

/**
 * Clear all secure storage
 */
export function clearSecureStorage(): void {
  sessionStorage.clear()
}

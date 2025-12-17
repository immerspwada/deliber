/**
 * Thai National ID Validation
 * Validates Thai 13-digit national ID number using check digit algorithm
 */
export const validateThaiNationalId = (nationalId: string): boolean => {
  // Remove any dashes or spaces
  const cleanId = nationalId.replace(/[-\s]/g, '')
  
  // Check length
  if (cleanId.length !== 13) {
    return false
  }
  
  // Check if all characters are digits
  if (!/^\d+$/.test(cleanId)) {
    return false
  }
  
  // Calculate checksum using Thai ID algorithm
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanId.charAt(i)) * (13 - i)
  }
  
  const checkDigit = (11 - (sum % 11)) % 10
  
  return checkDigit === parseInt(cleanId.charAt(12))
}

/**
 * Format Thai National ID with dashes
 * Input: 1234567890123
 * Output: 1-2345-67890-12-3
 */
export const formatThaiNationalId = (nationalId: string): string => {
  const cleanId = nationalId.replace(/[-\s]/g, '')
  
  if (cleanId.length !== 13) {
    return nationalId
  }
  
  return `${cleanId[0]}-${cleanId.slice(1, 5)}-${cleanId.slice(5, 10)}-${cleanId.slice(10, 12)}-${cleanId[12]}`
}

/**
 * Thai Phone Number Validation
 * Validates Thai phone numbers (mobile and landline)
 */
export const validateThaiPhoneNumber = (phone: string): boolean => {
  // Remove any dashes, spaces, or country code
  let cleanPhone = phone.replace(/[-\s]/g, '')
  
  // Remove +66 or 66 prefix
  if (cleanPhone.startsWith('+66')) {
    cleanPhone = '0' + cleanPhone.slice(3)
  } else if (cleanPhone.startsWith('66')) {
    cleanPhone = '0' + cleanPhone.slice(2)
  }
  
  // Thai mobile numbers: 08x, 09x (10 digits)
  // Thai landline: 02x, 03x, 04x, 05x, 07x (9 digits)
  const mobilePattern = /^0[689]\d{8}$/
  const landlinePattern = /^0[2-57]\d{7}$/
  
  return mobilePattern.test(cleanPhone) || landlinePattern.test(cleanPhone)
}

/**
 * Format Thai Phone Number
 * Input: 0812345678
 * Output: 081-234-5678
 */
export const formatThaiPhoneNumber = (phone: string): string => {
  let cleanPhone = phone.replace(/[-\s]/g, '')
  
  // Remove +66 or 66 prefix
  if (cleanPhone.startsWith('+66')) {
    cleanPhone = '0' + cleanPhone.slice(3)
  } else if (cleanPhone.startsWith('66')) {
    cleanPhone = '0' + cleanPhone.slice(2)
  }
  
  if (cleanPhone.length === 10) {
    // Mobile format: 081-234-5678
    return `${cleanPhone.slice(0, 3)}-${cleanPhone.slice(3, 6)}-${cleanPhone.slice(6)}`
  } else if (cleanPhone.length === 9) {
    // Landline format: 02-123-4567
    return `${cleanPhone.slice(0, 2)}-${cleanPhone.slice(2, 5)}-${cleanPhone.slice(5)}`
  }
  
  return phone
}

/**
 * Email Validation
 */
export const validateEmail = (email: string): boolean => {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailPattern.test(email)
}

/**
 * Thai Name Validation
 * Allows Thai and English characters
 */
export const validateThaiName = (name: string): boolean => {
  // Allow Thai characters, English characters, spaces, and common name characters
  const namePattern = /^[\u0E00-\u0E7Fa-zA-Z\s\-'.]+$/
  return namePattern.test(name) && name.trim().length >= 2
}

/**
 * Password Validation
 * Minimum 8 characters, at least one letter and one number
 */
export const validatePassword = (password: string): { valid: boolean; message: string } => {
  if (password.length < 8) {
    return { valid: false, message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' }
  }
  
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, message: 'รหัสผ่านต้องมีตัวอักษรอย่างน้อย 1 ตัว' }
  }
  
  if (!/\d/.test(password)) {
    return { valid: false, message: 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว' }
  }
  
  return { valid: true, message: '' }
}

/**
 * Thai Currency Formatting
 * Formats number to Thai Baht currency string
 */
export const formatThaiBaht = (amount: number): string => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Thai Date Formatting
 * Formats date to Thai locale string
 */
export const formatThaiDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Thai Time Formatting
 * Formats time to Thai locale string
 */
export const formatThaiTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Thai DateTime Formatting
 * Formats datetime to Thai locale string
 */
export const formatThaiDateTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Generate Member UID
 * Format: TRD-XXXXXXXX (8 random alphanumeric characters)
 * Used for tracking user activities across the system
 */
export const generateMemberUid = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let uid = 'TRD-'
  
  for (let i = 0; i < 8; i++) {
    uid += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return uid
}

/**
 * Validate Member UID format
 * Format: TRD-XXXXXXXX
 */
export const validateMemberUid = (uid: string): boolean => {
  const pattern = /^TRD-[A-Z0-9]{8}$/
  return pattern.test(uid)
}

/**
 * Format Member UID for display
 * Input: TRD-ABCD1234
 * Output: TRD-ABCD-1234
 */
export const formatMemberUid = (uid: string): string => {
  if (!validateMemberUid(uid)) return uid
  
  const code = uid.slice(4) // Remove 'TRD-'
  return `TRD-${code.slice(0, 4)}-${code.slice(4)}`
}
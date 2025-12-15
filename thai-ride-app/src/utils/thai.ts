// Thai Localization Utilities

// Format Thai Baht currency
export const formatThaiCurrency = (amount: number): string => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount)
}

// Format Thai Baht without symbol
export const formatThaiNumber = (amount: number): string => {
  return new Intl.NumberFormat('th-TH').format(amount)
}

// Format Thai date
export const formatThaiDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Format Thai date short
export const formatThaiDateShort = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('th-TH', {
    year: '2-digit',
    month: 'short',
    day: 'numeric'
  })
}

// Format Thai time
export const formatThaiTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Format Thai datetime
export const formatThaiDateTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  return `${formatThaiDate(d)} ${formatThaiTime(d)}`
}

// Format relative time in Thai
export const formatRelativeTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'เมื่อสักครู่'
  if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`
  if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`
  if (diffDays < 7) return `${diffDays} วันที่แล้ว`
  return formatThaiDateShort(d)
}

// Format distance in Thai
export const formatDistance = (km: number): string => {
  if (km < 1) {
    return `${Math.round(km * 1000)} ม.`
  }
  return `${km.toFixed(1)} กม.`
}

// Format duration in Thai
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} นาที`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) {
    return `${hours} ชั่วโมง`
  }
  return `${hours} ชม. ${mins} นาที`
}

// Thai phone number formatting
export const formatThaiPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

// Status translations
export const STATUS_TRANSLATIONS: Record<string, string> = {
  // Ride statuses
  pending: 'รอดำเนินการ',
  matched: 'จับคู่แล้ว',
  pickup: 'กำลังไปรับ',
  in_progress: 'กำลังเดินทาง',
  completed: 'เสร็จสิ้น',
  cancelled: 'ยกเลิก',
  
  // Delivery statuses
  in_transit: 'กำลังจัดส่ง',
  delivered: 'ส่งแล้ว',
  failed: 'ส่งไม่สำเร็จ',
  
  // Shopping statuses
  shopping: 'กำลังซื้อของ',
  delivering: 'กำลังจัดส่ง',
  
  // Payment statuses
  processing: 'กำลังดำเนินการ',
  refunded: 'คืนเงินแล้ว',
  
  // Verification statuses
  verified: 'ยืนยันแล้ว',
  rejected: 'ถูกปฏิเสธ',
  approved: 'อนุมัติแล้ว'
}

export const translateStatus = (status: string): string => {
  return STATUS_TRANSLATIONS[status] || status
}

// Service type translations
export const SERVICE_TRANSLATIONS: Record<string, string> = {
  ride: 'เรียกรถ',
  delivery: 'ส่งของ',
  shopping: 'ซื้อของ',
  driver: 'คนขับ',
  shopper: 'นักช้อป'
}

export const translateService = (service: string): string => {
  return SERVICE_TRANSLATIONS[service] || service
}

// Package type translations
export const PACKAGE_TRANSLATIONS: Record<string, string> = {
  document: 'เอกสาร',
  small: 'ขนาดเล็ก',
  medium: 'ขนาดกลาง',
  large: 'ขนาดใหญ่'
}

export const translatePackageType = (type: string): string => {
  return PACKAGE_TRANSLATIONS[type] || type
}

// Ride type translations
export const RIDE_TYPE_TRANSLATIONS: Record<string, string> = {
  standard: 'มาตรฐาน',
  premium: 'พรีเมียม',
  shared: 'ร่วมเดินทาง'
}

export const translateRideType = (type: string): string => {
  return RIDE_TYPE_TRANSLATIONS[type] || type
}

// Payment method translations
export const PAYMENT_METHOD_TRANSLATIONS: Record<string, string> = {
  promptpay: 'พร้อมเพย์',
  credit_card: 'บัตรเครดิต',
  cash: 'เงินสด',
  mobile_banking: 'Mobile Banking'
}

export const translatePaymentMethod = (method: string): string => {
  return PAYMENT_METHOD_TRANSLATIONS[method] || method
}

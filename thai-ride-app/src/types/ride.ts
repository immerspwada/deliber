/**
 * Ride Types with Zod Validation
 * Production-ready type definitions for ride booking system
 */
import { z } from 'zod'

// =====================================================
// ZOD SCHEMAS (Input Validation)
// =====================================================

export const LocationSchema = z.object({
  lat: z.number().min(-90).max(90, 'Invalid latitude'),
  lng: z.number().min(-180).max(180, 'Invalid longitude'),
  address: z.string().min(3, 'Address too short').max(500, 'Address too long')
})

export const VehicleTypeSchema = z.enum(['bike', 'car', 'premium', 'shared'], {
  errorMap: () => ({ message: 'Invalid vehicle type' })
})

export const PaymentMethodSchema = z.enum(['wallet', 'cash', 'card'], {
  errorMap: () => ({ message: 'Invalid payment method' })
})

export const RideTypeSchema = z.enum(['standard', 'premium', 'shared'], {
  errorMap: () => ({ message: 'Invalid ride type' })
})

export const CreateRideRequestSchema = z.object({
  pickup: LocationSchema,
  destination: LocationSchema,
  vehicleType: VehicleTypeSchema,
  paymentMethod: PaymentMethodSchema,
  notes: z.string().max(500, 'Notes too long').optional(),
  scheduledTime: z.string().datetime().optional(),
  promoCode: z.string().max(50).optional(),
  passengerCount: z.number().int().min(1).max(8).default(1)
})

export const UpdateRideStatusSchema = z.object({
  rideId: z.string().uuid('Invalid ride ID'),
  status: z.enum([
    'pending',
    'matched',
    'arriving',
    'picked_up',
    'in_progress',
    'completed',
    'cancelled'
  ]),
  providerId: z.string().uuid().optional()
})

export const SubmitRatingSchema = z.object({
  rideId: z.string().uuid('Invalid ride ID'),
  rating: z.number().int().min(1).max(5, 'Rating must be 1-5'),
  tipAmount: z.number().min(0).default(0),
  comment: z.string().max(500).optional()
})

// =====================================================
// TYPESCRIPT TYPES (Inferred from Zod)
// =====================================================

export type Location = z.infer<typeof LocationSchema>
export type VehicleType = z.infer<typeof VehicleTypeSchema>
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>
export type RideType = z.infer<typeof RideTypeSchema>
export type CreateRideRequest = z.infer<typeof CreateRideRequestSchema>
export type UpdateRideStatus = z.infer<typeof UpdateRideStatusSchema>
export type SubmitRating = z.infer<typeof SubmitRatingSchema>

// =====================================================
// DATABASE TYPES
// =====================================================

export type RideStatus =
  | 'pending'
  | 'matched'
  | 'arriving'
  | 'picked_up'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export interface RideRequest {
  id: string
  tracking_id: string
  user_id: string
  provider_id: string | null
  status: RideStatus
  pickup_lat: number
  pickup_lng: number
  pickup_address: string
  destination_lat: number
  destination_lng: number
  destination_address: string
  ride_type: RideType
  passenger_count: number
  estimated_fare: number
  final_fare: number | null
  payment_method: PaymentMethod | null
  promo_code: string | null
  promo_discount: number | null
  notes: string | null
  scheduled_time: string | null
  special_requests: string | null
  created_at: string
  accepted_at: string | null
  arrived_at: string | null
  started_at: string | null
  completed_at: string | null
  cancelled_at: string | null
}

export interface VehicleOption {
  id: string
  name: string
  multiplier: number
  eta: string
  icon: string
}

export interface MatchedDriver {
  id: string
  name: string
  phone?: string
  rating?: number
  total_trips?: number
  vehicle_type?: string
  vehicle_color?: string
  vehicle_plate?: string
  avatar_url?: string
  current_lat?: number
  current_lng?: number
  eta?: number
}

export interface NearbyPlace {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  type: string
  icon: string
  distance?: number
}

// =====================================================
// BOOKING OPTIONS
// =====================================================

export interface BookingOptions {
  paymentMethod: PaymentMethod
  scheduledTime: string | null
  promoCode: string | null
  promoDiscount: number
  finalAmount: number
  notes?: string
}

// =====================================================
// VALIDATION HELPERS
// =====================================================

export function validateCreateRide(data: unknown): {
  success: boolean
  data?: CreateRideRequest
  error?: string
} {
  const result = CreateRideRequestSchema.safeParse(data)
  
  if (result.success) {
    return { success: true, data: result.data }
  }
  
  const firstError = result.error.errors[0]
  return {
    success: false,
    error: firstError?.message || 'Invalid ride data'
  }
}

export function validateLocation(data: unknown): {
  success: boolean
  data?: Location
  error?: string
} {
  const result = LocationSchema.safeParse(data)
  
  if (result.success) {
    return { success: true, data: result.data }
  }
  
  const firstError = result.error.errors[0]
  return {
    success: false,
    error: firstError?.message || 'Invalid location'
  }
}

export function validateRating(data: unknown): {
  success: boolean
  data?: SubmitRating
  error?: string
} {
  const result = SubmitRatingSchema.safeParse(data)
  
  if (result.success) {
    return { success: true, data: result.data }
  }
  
  const firstError = result.error.errors[0]
  return {
    success: false,
    error: firstError?.message || 'Invalid rating'
  }
}

// =====================================================
// ERROR MESSAGES (Thai)
// =====================================================

export const RIDE_ERROR_MESSAGES = {
  INVALID_PICKUP: 'ตำแหน่งรับไม่ถูกต้อง',
  INVALID_DESTINATION: 'ตำแหน่งส่งไม่ถูกต้อง',
  INVALID_VEHICLE: 'ประเภทรถไม่ถูกต้อง',
  INVALID_PAYMENT: 'วิธีชำระเงินไม่ถูกต้อง',
  INSUFFICIENT_BALANCE: 'ยอดเงินไม่เพียงพอ',
  BOOKING_FAILED: 'ไม่สามารถจองได้ กรุณาลองใหม่',
  NO_DRIVER_FOUND: 'ไม่พบคนขับในบริเวณใกล้เคียง',
  UNAUTHORIZED: 'คุณไม่มีสิทธิ์ใช้งานฟีเจอร์นี้',
  NETWORK_ERROR: 'ไม่สามารถเชื่อมต่อได้ กรุณาตรวจสอบอินเทอร์เน็ต'
} as const

// =====================================================
// CONSTANTS
// =====================================================

export const DEFAULT_VEHICLES: VehicleOption[] = [
  { id: 'bike', name: 'มอเตอร์ไซค์', multiplier: 0.7, eta: '3 นาที', icon: 'bike' },
  { id: 'car', name: 'รถยนต์', multiplier: 1.0, eta: '5 นาที', icon: 'car' },
  { id: 'premium', name: 'พรีเมียม', multiplier: 1.5, eta: '7 นาที', icon: 'premium' }
]

export const FARE_CONFIG = {
  baseFare: 35, // THB
  perKm: 12, // THB/km
  perMinute: 2, // THB/min
  minimumFare: 45, // THB
  maxDistance: 100, // km
  maxFare: 5000 // THB
} as const

export const BOOKING_LIMITS = {
  maxNotesLength: 500,
  maxPassengers: 8,
  minScheduleHours: 1,
  maxScheduleDays: 7
} as const

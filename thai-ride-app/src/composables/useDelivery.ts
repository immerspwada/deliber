/**
 * useDelivery - Customer Delivery Composable
 * 
 * Feature: F03 - Delivery Service
 * Tables: delivery_requests, service_providers
 * 
 * @syncs-with
 * - Admin: useAdmin.ts (ดู/จัดการออเดอร์, refund)
 * - Provider: useProvider.ts (รับงาน/อัพเดทสถานะ)
 * - Database: Realtime subscription on delivery_requests
 * - Notifications: Push notification เมื่อสถานะเปลี่ยน
 * 
 * @status-flow
 * Customer: createDelivery → [pending]
 * Provider: accept → [accepted] → [picking_up] → [picked_up] → [delivering] → [delivered]
 * Customer: trackDelivery, rateDelivery
 */

import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import type { GeoLocation } from './useLocation'

export interface DeliveryRequest {
  id: string
  tracking_id: string
  user_id: string
  provider_id: string | null
  sender_name: string
  sender_phone: string
  sender_address: string
  sender_lat: number
  sender_lng: number
  recipient_name: string
  recipient_phone: string
  recipient_address: string
  recipient_lat: number
  recipient_lng: number
  package_type: 'document' | 'small' | 'medium' | 'large' | 'fragile'
  package_size: string | null
  package_weight: number | null
  package_description: string | null
  package_photo: string | null
  special_instructions: string | null
  estimated_fee: number
  final_fee: number | null
  distance_km: number
  status: 'pending' | 'matched' | 'pickup' | 'in_transit' | 'delivered' | 'failed' | 'cancelled'
  scheduled_pickup: string | null
  picked_up_at: string | null
  delivered_at: string | null
  created_at: string
  provider?: {
    id: string
    vehicle_type: string
    vehicle_plate: string
    rating: number
    user: {
      name: string
      phone: string
    }
  }
}

export interface TimeRange {
  min: number
  max: number
}

// Image quality presets for compression
export type ImageQuality = 'low' | 'medium' | 'high'

export interface QualityPreset {
  maxWidth: number
  quality: number
  label: string
  description: string
  estimatedSize: string
}

export const QUALITY_PRESETS: Record<ImageQuality, QualityPreset> = {
  low: {
    maxWidth: 640,
    quality: 0.5,
    label: 'ต่ำ',
    description: 'ประหยัด data',
    estimatedSize: '~50KB'
  },
  medium: {
    maxWidth: 1024,
    quality: 0.7,
    label: 'กลาง',
    description: 'สมดุล',
    estimatedSize: '~150KB'
  },
  high: {
    maxWidth: 1920,
    quality: 0.85,
    label: 'สูง',
    description: 'คมชัด',
    estimatedSize: '~300KB'
  }
}

export function useDelivery() {
  const authStore = useAuthStore()
  const currentDelivery = ref<DeliveryRequest | null>(null)
  const deliveryHistory = ref<DeliveryRequest[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Calculate delivery fee
  const calculateFee = (distanceKm: number, packageType: string): number => {
    const baseFee = 35
    const perKm = 8
    const multipliers: Record<string, number> = {
      document: 0.8,
      small: 1.0,
      medium: 1.3,
      large: 1.6,
      fragile: 1.5
    }
    const multiplier = multipliers[packageType] || 1.0
    return Math.ceil((baseFee + (distanceKm * perKm)) * multiplier)
  }

  // Calculate estimated time range (more realistic than single value)
  const calculateTimeRange = (distanceKm: number): TimeRange => {
    // Base time calculation: average speed 25 km/h in city
    const baseTime = Math.ceil((distanceKm / 25) * 60)
    
    // Add buffer for traffic, pickup time, etc.
    const pickupBuffer = 5 // minutes for pickup
    const trafficBuffer = Math.ceil(baseTime * 0.3) // 30% buffer for traffic
    
    const minTime = baseTime + pickupBuffer
    const maxTime = baseTime + pickupBuffer + trafficBuffer + 10 // extra 10 min buffer
    
    return {
      min: Math.max(15, minTime), // minimum 15 minutes
      max: Math.max(25, maxTime)
    }
  }

  // Upload package photo to Supabase Storage
  const uploadPackagePhoto = async (file: File): Promise<string | null> => {
    if (!authStore.user?.id) return null
    
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${authStore.user.id}/${Date.now()}.${fileExt}`
      
      const { data, error: uploadError } = await supabase.storage
        .from('package-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (uploadError) {
        console.error('Upload error:', uploadError)
        return null
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('package-photos')
        .getPublicUrl(data.path)
      
      return urlData.publicUrl
    } catch (err) {
      console.error('Error uploading photo:', err)
      return null
    }
  }

  // Compress image before upload with quality preset support
  const compressImage = async (
    file: File, 
    maxWidthOrPreset: number | ImageQuality = 1024, 
    quality = 0.8
  ): Promise<File> => {
    // Handle quality preset
    let finalMaxWidth = typeof maxWidthOrPreset === 'number' ? maxWidthOrPreset : QUALITY_PRESETS[maxWidthOrPreset].maxWidth
    let finalQuality = typeof maxWidthOrPreset === 'number' ? quality : QUALITY_PRESETS[maxWidthOrPreset].quality
    
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          
          if (width > finalMaxWidth) {
            height = (height * finalMaxWidth) / width
            width = finalMaxWidth
          }
          
          canvas.width = width
          canvas.height = height
          
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(new File([blob], file.name, { type: 'image/jpeg' }))
              } else {
                resolve(file)
              }
            },
            'image/jpeg',
            finalQuality
          )
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    })
  }

  // Clear error
  const clearError = () => {
    error.value = null
  }

  // Create delivery request
  const createDeliveryRequest = async (data: {
    senderName: string
    senderPhone: string
    senderAddress: string
    senderLocation: GeoLocation
    recipientName: string
    recipientPhone: string
    recipientAddress: string
    recipientLocation: GeoLocation
    packageType: string
    packageWeight: number
    packageDescription?: string
    packagePhoto?: string
    specialInstructions?: string
    distanceKm: number
  }) => {
    error.value = null
    
    if (!authStore.user?.id) {
      error.value = 'กรุณาเข้าสู่ระบบก่อนใช้งาน'
      return null
    }

    // Validate required fields
    if (!data.senderLocation || !data.recipientLocation) {
      error.value = 'กรุณาเลือกจุดรับและจุดส่งพัสดุ'
      return null
    }

    if (!data.recipientPhone) {
      error.value = 'กรุณากรอกเบอร์โทรผู้รับ'
      return null
    }

    loading.value = true
    try {
      const estimatedFee = calculateFee(data.distanceKm, data.packageType)

      const { data: delivery, error: dbError } = await (supabase
        .from('delivery_requests') as any)
        .insert({
          user_id: authStore.user.id,
          sender_name: data.senderName,
          sender_phone: data.senderPhone,
          sender_address: data.senderAddress,
          sender_lat: data.senderLocation.lat,
          sender_lng: data.senderLocation.lng,
          recipient_name: data.recipientName,
          recipient_phone: data.recipientPhone,
          recipient_address: data.recipientAddress,
          recipient_lat: data.recipientLocation.lat,
          recipient_lng: data.recipientLocation.lng,
          package_type: data.packageType,
          package_weight: data.packageWeight,
          package_description: data.packageDescription || null,
          package_photo: data.packagePhoto || null,
          special_instructions: data.specialInstructions || null,
          estimated_fee: estimatedFee,
          distance_km: data.distanceKm,
          status: 'pending'
        })
        .select()
        .single()

      if (dbError) {
        console.error('Database error:', dbError)
        // Handle specific error codes
        if (dbError.code === '42501') {
          error.value = 'ไม่มีสิทธิ์ในการสร้างคำขอ กรุณาเข้าสู่ระบบใหม่'
        } else if (dbError.code === '23503') {
          error.value = 'ข้อมูลผู้ใช้ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่'
        } else if (dbError.message?.includes('network') || dbError.message?.includes('fetch')) {
          error.value = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ต'
        } else {
          error.value = dbError.message || 'เกิดข้อผิดพลาดในการสร้างคำขอ กรุณาลองใหม่'
        }
        return null
      }

      if (delivery) {
        currentDelivery.value = delivery as DeliveryRequest
        return delivery
      }
      
      error.value = 'ไม่สามารถสร้างคำขอได้ กรุณาลองใหม่'
      return null
    } catch (err: any) {
      console.error('Error creating delivery request:', err)
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        error.value = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ต'
      } else {
        error.value = err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่'
      }
      return null
    } finally {
      loading.value = false
    }
  }

  // Fetch current active delivery
  const fetchActiveDelivery = async () => {
    if (!authStore.user?.id) return null

    try {
      const { data, error } = await (supabase
        .from('delivery_requests') as any)
        .select(`
          *,
          provider:provider_id (
            id,
            vehicle_type,
            vehicle_plate,
            rating,
            user:user_id (name, phone)
          )
        `)
        .eq('user_id', authStore.user.id)
        .in('status', ['pending', 'matched', 'pickup', 'in_transit'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!error && data) {
        currentDelivery.value = data as DeliveryRequest
      }
      return currentDelivery.value
    } catch {
      return null
    }
  }

  // Fetch delivery history
  const fetchDeliveryHistory = async (limit = 20) => {
    if (!authStore.user?.id) {
      deliveryHistory.value = []
      return []
    }

    loading.value = true
    try {
      const { data, error } = await (supabase
        .from('delivery_requests') as any)
        .select(`
          *,
          provider:provider_id (
            id,
            vehicle_type,
            vehicle_plate,
            rating,
            user:user_id (name, phone)
          )
        `)
        .eq('user_id', authStore.user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (!error && data) {
        deliveryHistory.value = data as DeliveryRequest[]
      }
      return deliveryHistory.value
    } catch (err) {
      console.error('Error fetching delivery history:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  // Get delivery by tracking ID
  const getDeliveryByTrackingId = async (trackingId: string) => {
    try {
      const { data, error } = await (supabase
        .from('delivery_requests') as any)
        .select(`
          *,
          provider:provider_id (
            id,
            vehicle_type,
            vehicle_plate,
            rating,
            current_lat,
            current_lng,
            user:user_id (name, phone)
          ),
          user:user_id (name, phone)
        `)
        .eq('tracking_id', trackingId)
        .single()

      if (!error && data) {
        return data as DeliveryRequest
      }
      return null
    } catch {
      return null
    }
  }

  // Cancel delivery
  const cancelDelivery = async (deliveryId: string) => {
    try {
      const { error } = await (supabase
        .from('delivery_requests') as any)
        .update({ status: 'cancelled' })
        .eq('id', deliveryId)
        .eq('user_id', authStore.user?.id || '')
        .in('status', ['pending', 'matched'])

      if (!error) {
        if (currentDelivery.value?.id === deliveryId) {
          currentDelivery.value = null
        }
        return true
      }
      return false
    } catch {
      return false
    }
  }

  // Subscribe to delivery updates
  const subscribeToDelivery = (deliveryId: string, callback: (delivery: DeliveryRequest) => void) => {
    const channel = supabase
      .channel(`delivery:${deliveryId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'delivery_requests',
          filter: `id=eq.${deliveryId}`
        },
        async (payload) => {
          const updated = payload.new as DeliveryRequest
          currentDelivery.value = updated
          callback(updated)
        }
      )
      .subscribe()

    return {
      unsubscribe: () => channel.unsubscribe()
    }
  }

  // Format status
  const formatStatus = (status: string): string => {
    const statuses: Record<string, string> = {
      pending: 'รอคนขับรับงาน',
      matched: 'คนขับรับงานแล้ว',
      pickup: 'กำลังไปรับพัสดุ',
      in_transit: 'กำลังจัดส่ง',
      delivered: 'ส่งสำเร็จ',
      failed: 'ส่งไม่สำเร็จ',
      cancelled: 'ยกเลิก'
    }
    return statuses[status] || status
  }

  return {
    currentDelivery,
    deliveryHistory,
    loading,
    error,
    clearError,
    calculateFee,
    calculateTimeRange,
    uploadPackagePhoto,
    compressImage,
    createDeliveryRequest,
    fetchActiveDelivery,
    fetchDeliveryHistory,
    getDeliveryByTrackingId,
    cancelDelivery,
    subscribeToDelivery,
    formatStatus
  }
}

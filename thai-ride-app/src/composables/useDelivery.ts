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

  // Create delivery request with atomic wallet check
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

      // Use atomic function to check wallet balance and create delivery
      const { data: result, error: rpcError } = await supabase.rpc('create_delivery_atomic', {
        p_user_id: authStore.user.id,
        p_sender_name: data.senderName,
        p_sender_phone: data.senderPhone,
        p_sender_address: data.senderAddress,
        p_sender_lat: data.senderLocation.lat,
        p_sender_lng: data.senderLocation.lng,
        p_recipient_name: data.recipientName,
        p_recipient_phone: data.recipientPhone,
        p_recipient_address: data.recipientAddress,
        p_recipient_lat: data.recipientLocation.lat,
        p_recipient_lng: data.recipientLocation.lng,
        p_package_type: data.packageType,
        p_package_weight: data.packageWeight,
        p_package_description: data.packageDescription || null,
        p_package_photo: data.packagePhoto || null,
        p_special_instructions: data.specialInstructions || null,
        p_estimated_fee: estimatedFee,
        p_distance_km: data.distanceKm
      })

      if (rpcError) {
        console.error('RPC error:', rpcError)
        // Handle specific error codes
        if (rpcError.message?.includes('INSUFFICIENT_BALANCE')) {
          error.value = 'ยอดเงินในกระเป๋าไม่เพียงพอ กรุณาเติมเงินก่อนใช้บริการ'
        } else if (rpcError.message?.includes('WALLET_NOT_FOUND')) {
          error.value = 'ไม่พบกระเป๋าเงิน กรุณาติดต่อฝ่ายสนับสนุน'
        } else if (rpcError.code === '42501') {
          error.value = 'ไม่มีสิทธิ์ในการสร้างคำขอ กรุณาเข้าสู่ระบบใหม่'
        } else if (rpcError.message?.includes('network') || rpcError.message?.includes('fetch')) {
          error.value = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ต'
        } else {
          error.value = rpcError.message || 'เกิดข้อผิดพลาดในการสร้างคำขอ กรุณาลองใหม่'
        }
        return null
      }

      if (result?.delivery_id) {
        // Fetch the created delivery
        const { data: delivery } = await (supabase
          .from('delivery_requests') as any)
          .select('*')
          .eq('id', result.delivery_id)
          .single()
        
        if (delivery) {
          currentDelivery.value = delivery as DeliveryRequest
          return delivery
        }
      }
      
      error.value = 'ไม่สามารถสร้างคำขอได้ กรุณาลองใหม่'
      return null
    } catch (err: any) {
      console.error('Error creating delivery request:', err)
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        error.value = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ต'
      } else if (err.message?.includes('INSUFFICIENT_BALANCE')) {
        error.value = 'ยอดเงินในกระเป๋าไม่เพียงพอ กรุณาเติมเงินก่อนใช้บริการ'
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
            first_name,
            last_name,
            phone_number,
            rating
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
            first_name,
            last_name,
            phone_number,
            rating
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
          provider:providers_v2!delivery_requests_provider_id_fkey (
            id,
            first_name,
            last_name,
            phone_number,
            rating,
            vehicle_type,
            vehicle_plate
          )
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

  // Cancel delivery with pending refund (requires Admin approval)
  const cancelDelivery = async (deliveryId: string, reason?: string) => {
    if (!authStore.user?.id) {
      error.value = 'กรุณาเข้าสู่ระบบ'
      return null
    }

    loading.value = true
    error.value = null

    try {
      // Use atomic cancel function with pending refund
      const { data: result, error: rpcError } = await supabase.rpc('cancel_request_with_pending_refund', {
        p_request_id: deliveryId,
        p_request_type: 'delivery',
        p_cancelled_by: authStore.user.id,
        p_cancelled_by_role: 'customer',
        p_cancel_reason: reason || 'ลูกค้ายกเลิก'
      })

      if (rpcError) {
        console.error('Cancel error:', rpcError)
        if (rpcError.message?.includes('REQUEST_NOT_FOUND')) {
          error.value = 'ไม่พบคำขอนี้'
        } else if (rpcError.message?.includes('REQUEST_ALREADY_FINALIZED')) {
          error.value = 'ไม่สามารถยกเลิกได้ คำขอนี้ดำเนินการเสร็จสิ้นแล้ว'
        } else {
          error.value = rpcError.message || 'เกิดข้อผิดพลาดในการยกเลิก'
        }
        return null
      }

      if (result?.success) {
        if (currentDelivery.value?.id === deliveryId) {
          currentDelivery.value = null
        }
        return {
          success: true,
          refundAmount: result.refund_amount,
          refundStatus: result.refund_status,
          message: result.message || 'ยกเลิกสำเร็จ คำขอคืนเงินรอการอนุมัติจาก Admin'
        }
      }
      
      return null
    } catch (err: any) {
      console.error('Error cancelling delivery:', err)
      error.value = err.message || 'เกิดข้อผิดพลาดในการยกเลิก'
      return null
    } finally {
      loading.value = false
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

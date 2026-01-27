<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDelivery, type DeliveryRequest } from '../composables/useDelivery'
import { supabase } from '../lib/supabase'
import { useToast } from '../composables/useToast'

// Import tracking-specific CSS
import '../styles/tracking.css'

// SVG Icons as components
const ClockIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`
const CheckCircleIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`
const TruckIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>`
const UserIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>`
const XCircleIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`
const BanIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>`
const MapPinIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>`
const ShoppingBagIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>`
const BuildingStorefrontIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" /></svg>`
const HomeIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>`
const DocumentTextIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>`
const InboxStackIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M7.875 14.25l1.214 1.942a2.25 2.25 0 001.908 1.058h2.006c.776 0 1.497-.4 1.908-1.058l1.214-1.942M2.41 9h4.636a2.25 2.25 0 011.872 1.002l.164.246a2.25 2.25 0 001.872 1.002h2.092a2.25 2.25 0 001.872-1.002l.164-.246A2.25 2.25 0 0116.954 9h4.636M2.41 9a2.25 2.25 0 00-.16.832V12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 12V9.832c0-.287-.055-.57-.16-.832M2.41 9a2.25 2.25 0 01.382-.632l3.285-3.832a2.25 2.25 0 011.708-.786h8.43c.657 0 1.281.287 1.709.786l3.284 3.832c.163.19.291.404.382.632M4.5 20.25h15A2.25 2.25 0 0021.75 18v-2.625c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125V18a2.25 2.25 0 002.25 2.25z" /></svg>`
const LightBulbIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>`

// Provider details from database query
interface ProviderDetails {
  id: string
  first_name: string
  last_name: string
  phone_number: string
  rating: number
  vehicle_type: string
  vehicle_plate: string
}

// Flexible delivery type
type DeliveryWithProvider = Omit<DeliveryRequest, 'provider'> & {
  provider?: ProviderDetails | DeliveryRequest['provider']
}

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { getDeliveryByTrackingId, subscribeToDelivery } = useDelivery()

const trackingId = computed(() => route.params.trackingId as string)
const delivery = ref<DeliveryWithProvider | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// Display tracking ID (use tracking_id from delivery, not URL param)
const displayTrackingId = computed(() => {
  return delivery.value?.tracking_id || trackingId.value
})

let subscription: { unsubscribe: () => void } | null = null

// Status configuration
const statusConfig: Record<string, { label: string; icon: string; color: string }> = {
  pending: { label: 'รอคนขับรับงาน', icon: ClockIcon, color: 'text-amber-600' },
  matched: { label: 'คนขับรับงานแล้ว', icon: UserIcon, color: 'text-blue-600' },
  pickup: { label: 'กำลังไปรับพัสดุ', icon: TruckIcon, color: 'text-indigo-600' },
  in_transit: { label: 'กำลังจัดส่ง', icon: TruckIcon, color: 'text-purple-600' },
  delivered: { label: 'ส่งสำเร็จ', icon: CheckCircleIcon, color: 'text-green-600' },
  failed: { label: 'ส่งไม่สำเร็จ', icon: XCircleIcon, color: 'text-red-600' },
  cancelled: { label: 'ยกเลิก', icon: BanIcon, color: 'text-gray-600' }
}

const currentStatus = computed(() => {
  if (!delivery.value) return null
  return statusConfig[delivery.value.status] || statusConfig.pending
})

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatCurrency = (amount: number | null) => {
  if (!amount) return '฿0'
  return `฿${amount.toFixed(2)}`
}

// Provider access
const isProvider = ref(false)
const providerId = ref<string | null>(null)

const checkProviderAccess = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      isProvider.value = false
      return
    }

    // Check if user is a provider
    const { data: providerData } = await supabase
      .from('providers_v2')
      .select('id, status')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (providerData && (providerData.status === 'approved' || providerData.status === 'active')) {
      isProvider.value = true
      providerId.value = providerData.id
    }
  } catch (err) {
    console.error('Error checking provider access:', err)
  }
}

const goToProviderJob = () => {
  if (!delivery.value?.id) return
  
  // Navigate to provider job detail
  router.push(`/provider/job/${delivery.value.id}`)
}

const loadDelivery = async () => {
  console.log('🔍 [Tracking] Loading delivery for:', trackingId.value)
  loading.value = true
  error.value = null
  
  try {
    const identifier = trackingId.value
    let data = null
    
    // Check if UUID format
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)
    
    if (isUUID) {
      // Determine table based on UUID (try both tables)
      // Try delivery_requests first
      const { data: deliveryResult, error: deliveryError } = await supabase
        .from('delivery_requests')
        .select(`
          *,
          provider:providers_v2 (
            id,
            first_name,
            last_name,
            phone_number,
            rating,
            vehicle_type,
            vehicle_plate
          )
        `)
        .eq('id', identifier)
        .maybeSingle()
      
      if (deliveryResult) {
        data = deliveryResult
      } else {
        // Try shopping_requests
        const { data: shoppingResult, error: shoppingError } = await supabase
          .from('shopping_requests')
          .select(`
            *,
            provider:providers_v2 (
              id,
              first_name,
              last_name,
              phone_number,
              rating,
              vehicle_type,
              vehicle_plate
            )
          `)
          .eq('id', identifier)
          .maybeSingle()
        
        if (shoppingResult) {
          data = shoppingResult
        } else {
          console.error('❌ [Tracking] Not found in either table:', { deliveryError, shoppingError })
          error.value = 'ไม่พบข้อมูลการจัดส่ง'
          return
        }
      }
    } else {
      // Determine table based on tracking ID prefix
      const tableName = identifier.startsWith('SHP-') ? 'shopping_requests' : 'delivery_requests'
      console.log('🔍 [Tracking] Using table:', tableName)
      
      const { data: result, error: queryError } = await supabase
        .from(tableName)
        .select(`
          *,
          provider:providers_v2 (
            id,
            first_name,
            last_name,
            phone_number,
            rating,
            vehicle_type,
            vehicle_plate
          )
        `)
        .eq('tracking_id', identifier)
        .maybeSingle()
      
      if (queryError) {
        console.error('❌ [Tracking] Query error:', queryError)
        error.value = 'ไม่พบข้อมูลการจัดส่ง'
        return
      }
      
      data = result
    }
    
    if (!data) {
      console.log('❌ [Tracking] No data found')
      error.value = 'ไม่พบข้อมูลการจัดส่ง'
      return
    }
    
    console.log('✅ [Tracking] Data loaded:', data)
    delivery.value = data
    
    // Subscribe to updates (only for delivery_requests, not shopping_requests yet)
    if (data.id && !identifier.startsWith('SHP-')) {
      subscription = subscribeToDelivery(data.id, (updated) => {
        delivery.value = updated
      })
    }
  } catch (err) {
    console.error('💥 [Tracking] Error loading delivery:', err)
    error.value = 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
  } finally {
    console.log('🏁 [Tracking] Loading complete. State:', { loading: false, hasDelivery: !!delivery.value, error: error.value })
    loading.value = false
  }
}

const goBack = () => router.back()

const copyTrackingId = async () => {
  try {
    // Copy the human-readable tracking ID, not the UUID
    const idToCopy = delivery.value?.tracking_id || trackingId.value
    await navigator.clipboard.writeText(idToCopy)
    toast.success('คัดลอก Tracking ID แล้ว')
  } catch (err) {
    toast.error('ไม่สามารถคัดลอกได้')
  }
}

// Cancel delivery
const cancelling = ref(false)
const showCancelModal = ref(false)
const cancelReason = ref('')

// Check if user is authenticated and is the owner
const canCancel = computed(() => {
  if (!delivery.value) return false
  
  // Can only cancel if status is pending or matched
  const cancelableStatuses = ['pending', 'matched']
  if (!cancelableStatuses.includes(delivery.value.status)) return false
  
  // Must be authenticated to cancel
  // Note: This is a public page, so we need to check auth state
  return true // Will check auth when user clicks cancel button
})

const openCancelModal = async () => {
  // Check authentication first
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.user) {
    toast.error('กรุณาเข้าสู่ระบบก่อนยกเลิก')
    // Redirect to login with return URL
    const returnUrl = encodeURIComponent(window.location.pathname)
    router.push(`/login?redirect=${returnUrl}`)
    return
  }
  
  // Check if user is the owner
  if (delivery.value?.user_id !== session.user.id) {
    toast.error('คุณไม่มีสิทธิ์ยกเลิกการจัดส่งนี้')
    return
  }
  
  showCancelModal.value = true
}

const closeCancelModal = () => {
  showCancelModal.value = false
  cancelReason.value = ''
}

const confirmCancel = async () => {
  if (!delivery.value?.id) return
  
  // Double-check authentication
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.user) {
    toast.error('กรุณาเข้าสู่ระบบก่อนยกเลิก')
    closeCancelModal()
    return
  }
  
  // Verify ownership again
  if (delivery.value.user_id !== session.user.id) {
    toast.error('คุณไม่มีสิทธิ์ยกเลิกการจัดส่งนี้')
    closeCancelModal()
    return
  }
  
  cancelling.value = true
  try {
    // Determine request type based on tracking ID prefix
    const requestType = delivery.value.tracking_id?.startsWith('SHP-') ? 'shopping' : 'delivery'
    
    const { data, error: cancelError } = await supabase.rpc('cancel_request_with_pending_refund', {
      p_request_id: delivery.value.id,
      p_request_type: requestType,
      p_cancelled_by: session.user.id, // Use authenticated user ID
      p_cancelled_by_role: 'customer',
      p_cancel_reason: cancelReason.value || 'ลูกค้ายกเลิก'
    })

    if (cancelError) {
      console.error('Cancel error:', cancelError)
      
      // Handle specific error messages
      if (cancelError.message?.includes('Unauthorized') || cancelError.message?.includes('permission')) {
        toast.error('คุณไม่มีสิทธิ์ยกเลิกการจัดส่งนี้')
      } else if (cancelError.message?.includes('REQUEST_ALREADY_FINALIZED')) {
        toast.error('ไม่สามารถยกเลิกได้ การจัดส่งนี้ดำเนินการเสร็จสิ้นแล้ว')
      } else {
        toast.error('ไม่สามารถยกเลิกได้ กรุณาลองใหม่')
      }
      return
    }

    if (data?.success) {
      toast.success('ยกเลิกสำเร็จ คำขอคืนเงินรอการอนุมัติ')
      closeCancelModal()
      // Reload delivery to show updated status
      await loadDelivery()
    }
  } catch (err) {
    console.error('Cancel exception:', err)
    toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่')
  } finally {
    cancelling.value = false
  }
}

onMounted(async () => {
  await checkProviderAccess()
  await loadDelivery()
})

onUnmounted(() => {
  if (subscription) subscription.unsubscribe()
})
</script>

<template>
  <div class="tracking-page">
    <div class="tracking-container">
      <!-- Header -->
      <div class="tracking-header">
        <button class="tracking-back-btn" type="button" @click="goBack">
          ← กลับ
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="tracking-loading">
        <div class="tracking-spinner"></div>
        <p class="tracking-loading-text">กำลังโหลดข้อมูล...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="tracking-error">
        <div class="tracking-error-icon">😕</div>
        <h2 class="tracking-error-title">ไม่พบข้อมูล</h2>
        <p class="tracking-error-message">{{ error }}</p>
        <button class="tracking-retry-btn" type="button" @click="loadDelivery">
          🔄 ลองใหม่
        </button>
      </div>

      <!-- Content -->
      <div v-else-if="delivery" class="tracking-content">
        <!-- Status -->
        <div class="tracking-status">
          <div class="tracking-status-icon" :class="currentStatus?.color" v-html="currentStatus?.icon"></div>
          <h1 class="tracking-status-title">{{ currentStatus?.label }}</h1>
        </div>

        <!-- Tracking ID Card -->
        <div class="tracking-card">
          <div class="tracking-card-header">
            <h2 class="tracking-card-title">Tracking ID</h2>
            <button class="tracking-copy-btn" type="button" @click="copyTrackingId">
              📋 คัดลอก
            </button>
          </div>
          <p class="tracking-id">{{ displayTrackingId }}</p>
        </div>

        <!-- Timeline Card -->
        <div class="tracking-card">
          <h2 class="tracking-card-title">ประวัติการจัดส่ง</h2>
          <div class="tracking-timeline">
            <div v-if="delivery.created_at" class="tracking-timeline-item">
              <div class="tracking-timeline-dot"></div>
              <div class="tracking-timeline-content">
                <p class="tracking-timeline-title">สร้างคำขอ</p>
                <p class="tracking-timeline-time">{{ formatDate(delivery.created_at) }}</p>
              </div>
            </div>
            <div v-if="delivery.picked_up_at" class="tracking-timeline-item">
              <div class="tracking-timeline-dot"></div>
              <div class="tracking-timeline-content">
                <p class="tracking-timeline-title">รับพัสดุแล้ว</p>
                <p class="tracking-timeline-time">{{ formatDate(delivery.picked_up_at) }}</p>
              </div>
            </div>
            <div v-if="delivery.delivered_at" class="tracking-timeline-item">
              <div class="tracking-timeline-dot"></div>
              <div class="tracking-timeline-content">
                <p class="tracking-timeline-title">ส่งสำเร็จ</p>
                <p class="tracking-timeline-time">{{ formatDate(delivery.delivered_at) }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Location Card - Shopping Order -->
        <div v-if="delivery.tracking_id?.startsWith('SHP-')" class="tracking-card">
          <h2 class="tracking-card-title">สถานที่</h2>
          <div class="tracking-location">
            <!-- Store Location -->
            <div class="tracking-location-item">
              <div class="tracking-location-header">
                <div class="tracking-icon-badge tracking-badge-primary">
                  <div class="tracking-icon" v-html="BuildingStorefrontIcon"></div>
                </div>
                <span class="tracking-location-label">ร้านค้า / จุดซื้อของ</span>
              </div>
              <p v-if="delivery.store_name" class="tracking-location-name">{{ delivery.store_name }}</p>
              <p v-else class="tracking-location-name text-gray-500">ยังไม่ระบุชื่อร้าน</p>
              <p class="tracking-location-detail">{{ delivery.store_address || delivery.sender_address || 'ยังไม่ระบุที่อยู่' }}</p>
            </div>

            <!-- Delivery Location -->
            <div class="tracking-location-item">
              <div class="tracking-location-header">
                <div class="tracking-icon-badge tracking-badge-success">
                  <div class="tracking-icon" v-html="HomeIcon"></div>
                </div>
                <span class="tracking-location-label">จุดส่งของ</span>
              </div>
              <p class="tracking-location-name">{{ delivery.recipient_name || 'ผู้รับ' }}</p>
              <p v-if="delivery.recipient_phone" class="tracking-location-detail">{{ delivery.recipient_phone }}</p>
              <p class="tracking-location-detail">{{ delivery.delivery_address || delivery.recipient_address || 'ยังไม่ระบุที่อยู่' }}</p>
            </div>
          </div>
        </div>

        <!-- Location Card - Delivery Order -->
        <div v-else class="tracking-card">
          <h2 class="tracking-card-title">สถานที่</h2>
          <div class="tracking-location">
            <!-- Pickup Location -->
            <div class="tracking-location-item">
              <div class="tracking-location-header">
                <div class="tracking-badge tracking-badge-light">A</div>
                <span class="tracking-location-label">จุดรับพัสดุ</span>
              </div>
              <p class="tracking-location-name">{{ delivery.sender_name }}</p>
              <p class="tracking-location-detail">{{ delivery.sender_phone }}</p>
              <p class="tracking-location-detail">{{ delivery.sender_address }}</p>
            </div>

            <!-- Delivery Location -->
            <div class="tracking-location-item">
              <div class="tracking-location-header">
                <div class="tracking-badge tracking-badge-dark">B</div>
                <span class="tracking-location-label">จุดส่งพัสดุ</span>
              </div>
              <p class="tracking-location-name">{{ delivery.recipient_name }}</p>
              <p class="tracking-location-detail">{{ delivery.recipient_phone }}</p>
              <p class="tracking-location-detail">{{ delivery.recipient_address }}</p>
            </div>
          </div>
        </div>

        <!-- Details Card - Shopping Order -->
        <div v-if="delivery.tracking_id?.startsWith('SHP-')" class="tracking-card">
          <h2 class="tracking-card-title">รายละเอียดค่าบริการ</h2>
          <div class="tracking-details">
            <div class="tracking-detail-row">
              <span class="tracking-detail-label">
                <span class="tracking-detail-icon" v-html="ShoppingBagIcon"></span>
                ประเภทบริการ
              </span>
              <span class="tracking-detail-value">ซื้อของ</span>
            </div>
            <div v-if="delivery.distance_km" class="tracking-detail-row">
              <span class="tracking-detail-label">
                <span class="tracking-detail-icon" v-html="MapPinIcon"></span>
                ระยะทาง
              </span>
              <span class="tracking-detail-value">{{ delivery.distance_km }} กม.</span>
            </div>
            <div class="tracking-detail-divider"></div>
            <div class="tracking-detail-row tracking-detail-total">
              <span class="tracking-detail-label">ค่าบริการ</span>
              <span class="tracking-detail-value">{{ formatCurrency(delivery.service_fee || delivery.estimated_fee) }}</span>
            </div>
          </div>
          
          <!-- Shopping Notes -->
          <div v-if="delivery.shopping_notes || delivery.package_description" class="tracking-notes">
            <p class="tracking-notes-label">หมายเหตุ</p>
            <p class="tracking-notes-text">{{ delivery.shopping_notes || delivery.package_description }}</p>
          </div>
        </div>

        <!-- Details Card - Delivery Order -->
        <div v-else class="tracking-card">
          <h2 class="tracking-card-title">รายละเอียดพัสดุ</h2>
          <div class="tracking-details">
            <div class="tracking-detail-row">
              <span class="tracking-detail-label">
                <span class="tracking-detail-icon" v-html="InboxStackIcon"></span>
                ประเภท
              </span>
              <span class="tracking-detail-value">{{ delivery.package_type }}</span>
            </div>
            <div class="tracking-detail-row">
              <span class="tracking-detail-label">น้ำหนัก</span>
              <span class="tracking-detail-value">{{ delivery.package_weight }} กก.</span>
            </div>
            <div class="tracking-detail-row">
              <span class="tracking-detail-label">
                <span class="tracking-detail-icon" v-html="MapPinIcon"></span>
                ระยะทาง
              </span>
              <span class="tracking-detail-value">{{ delivery.distance_km }} กม.</span>
            </div>
            <div class="tracking-detail-divider"></div>
            <div class="tracking-detail-row tracking-detail-total">
              <span class="tracking-detail-label">ค่าบริการ</span>
              <span class="tracking-detail-value">{{ formatCurrency(delivery.estimated_fee) }}</span>
            </div>
          </div>
          
          <!-- Notes -->
          <div v-if="delivery.package_description" class="tracking-notes">
            <p class="tracking-notes-label">หมายเหตุ</p>
            <p class="tracking-notes-text">{{ delivery.package_description }}</p>
          </div>
        </div>

        <!-- Shopping Items Card (for shopping orders) -->
        <div v-if="delivery.tracking_id?.startsWith('SHP-')" class="tracking-card">
          <h2 class="tracking-card-title">รายการสินค้า</h2>
          
          <!-- Shopping Items List -->
          <div v-if="delivery.items && delivery.items.length > 0" class="tracking-shopping-items">
            <div 
              v-for="(item, index) in delivery.items" 
              :key="index"
              class="tracking-shopping-item"
            >
              <div class="tracking-shopping-item-number">{{ index + 1 }}</div>
              <div class="tracking-shopping-item-content">
                <p class="tracking-shopping-item-name">{{ item.name || 'ไม่ระบุชื่อสินค้า' }}</p>
                <div class="tracking-shopping-item-details">
                  <span v-if="item.quantity" class="tracking-shopping-item-quantity">
                    จำนวน: {{ item.quantity }} {{ item.unit || 'ชิ้น' }}
                  </span>
                  <span v-if="item.price" class="tracking-shopping-item-price">
                    ราคา: {{ formatCurrency(item.price) }}
                  </span>
                </div>
                <p v-if="item.notes" class="tracking-shopping-item-notes">
                  หมายเหตุ: {{ item.notes }}
                </p>
              </div>
            </div>
          </div>
          
          <!-- Empty State with Helpful Message -->
          <div v-else class="tracking-shopping-empty">
            <div class="tracking-shopping-empty-icon" v-html="DocumentTextIcon"></div>
            <p class="tracking-shopping-empty-text">ยังไม่มีรายการสินค้า</p>
            <p class="tracking-shopping-empty-subtext">
              ลูกค้ายังไม่ได้เพิ่มรายการสินค้าที่ต้องการซื้อ
            </p>
            
            <!-- Helpful Actions for Different Roles -->
            <div class="tracking-shopping-empty-actions">
              <div v-if="isProvider && delivery?.provider_id === providerId" class="tracking-shopping-empty-action">
                <div class="tracking-shopping-empty-action-icon" v-html="LightBulbIcon"></div>
                <div>
                  <p class="tracking-shopping-empty-action-title">สำหรับคนขับ:</p>
                  <p class="tracking-shopping-empty-action-text">
                    กรุณาติดต่อลูกค้าเพื่อสอบถามรายการสินค้าที่ต้องการซื้อ
                  </p>
                </div>
              </div>
              <div v-else class="tracking-shopping-empty-action">
                <div class="tracking-shopping-empty-action-icon" v-html="LightBulbIcon"></div>
                <div>
                  <p class="tracking-shopping-empty-action-title">คำแนะนำ:</p>
                  <p class="tracking-shopping-empty-action-text">
                    หากคุณเป็นลูกค้า กรุณาเพิ่มรายการสินค้าในหน้าออเดอร์
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Driver Card -->
        <div v-if="delivery.provider && 'first_name' in delivery.provider" class="tracking-card">
          <h2 class="tracking-card-title">ข้อมูลคนขับ</h2>
          <div class="tracking-driver">
            <div class="tracking-driver-avatar">
              <div class="tracking-driver-avatar-icon" v-html="UserIcon"></div>
            </div>
            <div class="tracking-driver-info">
              <p class="tracking-driver-name">
                {{ delivery.provider.first_name }} {{ delivery.provider.last_name }}
              </p>
              <p class="tracking-driver-vehicle">
                {{ delivery.provider.vehicle_type }} • {{ delivery.provider.vehicle_plate }}
              </p>
              <p class="tracking-driver-rating">
                ⭐ {{ delivery.provider.rating?.toFixed(1) || '5.0' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Provider Access Button -->
        <div v-if="isProvider && delivery?.provider_id === providerId" class="tracking-card">
          <h2 class="tracking-card-title">สำหรับคนขับ</h2>
          <button 
            class="tracking-provider-btn" 
            type="button"
            @click="goToProviderJob"
          >
            🚗 เข้าสู่หน้างาน Provider
          </button>
          <p class="tracking-provider-note">
            คุณเป็นคนขับที่รับงานนี้ คลิกเพื่อดูรายละเอียดและจัดการงาน
          </p>
        </div>

        <!-- Help Section -->
        <div class="tracking-help">
          <p class="tracking-help-title">ต้องการความช่วยเหลือ?</p>
          <p class="tracking-help-text">กรุณาติดต่อฝ่ายสนับสนุนลูกค้า</p>
        </div>

        <!-- Cancel Button (only for pending/matched status) -->
        <div v-if="canCancel" class="tracking-actions">
          <button 
            class="tracking-cancel-btn" 
            type="button" 
            :disabled="cancelling"
            @click="openCancelModal"
          >
            <svg class="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            ยกเลิกการจัดส่ง
          </button>
          <p class="tracking-actions-note">
            * ต้องเข้าสู่ระบบเพื่อยกเลิก
          </p>
        </div>
      </div>
    </div>

    <!-- Cancel Confirmation Modal -->
    <div v-if="showCancelModal" class="tracking-modal-overlay" @click="closeCancelModal">
      <div class="tracking-modal" @click.stop>
        <div class="tracking-modal-header">
          <h3 class="tracking-modal-title">ยืนยันการยกเลิก</h3>
          <button class="tracking-modal-close" type="button" @click="closeCancelModal" aria-label="ปิด">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div class="tracking-modal-body">
          <p class="tracking-modal-text">
            คุณต้องการยกเลิกการจัดส่งนี้ใช่หรือไม่?
          </p>
          <p class="tracking-modal-subtext">
            เงินจะถูกคืนหลังจากได้รับการอนุมัติจาก Admin
          </p>
          
          <div class="tracking-modal-field">
            <label class="tracking-modal-label">เหตุผลในการยกเลิก (ไม่บังคับ)</label>
            <textarea 
              v-model="cancelReason"
              class="tracking-modal-textarea"
              placeholder="ระบุเหตุผล..."
              rows="3"
              :disabled="cancelling"
            ></textarea>
          </div>
        </div>
        
        <div class="tracking-modal-footer">
          <button 
            class="tracking-modal-btn tracking-modal-btn-secondary" 
            type="button"
            :disabled="cancelling"
            @click="closeCancelModal"
          >
            ไม่ยกเลิก
          </button>
          <button 
            class="tracking-modal-btn tracking-modal-btn-danger" 
            type="button"
            :disabled="cancelling"
            @click="confirmCancel"
          >
            {{ cancelling ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิก' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

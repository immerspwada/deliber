<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDelivery, type DeliveryRequest } from '../composables/useDelivery'
import { supabase } from '../lib/supabase'
import { useToast } from '../composables/useToast'

// Import tracking-specific CSS
import '../styles/tracking.css'

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
const statusConfig: Record<string, { label: string; icon: string }> = {
  pending: { label: 'รอคนขับรับงาน', icon: '⏳' },
  matched: { label: 'คนขับรับงานแล้ว', icon: '👤' },
  pickup: { label: 'กำลังไปรับพัสดุ', icon: '🚗' },
  in_transit: { label: 'กำลังจัดส่ง', icon: '📦' },
  delivered: { label: 'ส่งสำเร็จ', icon: '✅' },
  failed: { label: 'ส่งไม่สำเร็จ', icon: '❌' },
  cancelled: { label: 'ยกเลิก', icon: '🚫' }
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
      const { data: result, error: queryError } = await supabase
        .from('delivery_requests')
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
        .eq('id', identifier)
        .single()
      
      if (queryError) {
        error.value = 'ไม่พบข้อมูลการจัดส่ง'
        return
      }
      data = result
    } else {
      data = await getDeliveryByTrackingId(identifier)
    }
    
    if (!data) {
      console.log('❌ [Tracking] No data found')
      error.value = 'ไม่พบข้อมูลการจัดส่ง'
      return
    }
    
    console.log('✅ [Tracking] Data loaded:', data)
    delivery.value = data
    
    if (data.id) {
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
    const { data, error: cancelError } = await supabase.rpc('cancel_request_with_pending_refund', {
      p_request_id: delivery.value.id,
      p_request_type: 'delivery',
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

onMounted(() => loadDelivery())
onUnmounted(() => {
  if (subscription) subscription.unsubscribe()
})
</script>

<template>
  <div class="tracking-page">
    <div class="tracking-container">
      <!-- Header -->
      <div class="tracking-header">
        <button class="tracking-back-btn" @click="goBack" type="button">
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
        <button class="tracking-retry-btn" @click="loadDelivery" type="button">
          🔄 ลองใหม่
        </button>
      </div>

      <!-- Content -->
      <div v-else-if="delivery" class="tracking-content">
        <!-- Status -->
        <div class="tracking-status">
          <div class="tracking-status-icon">{{ currentStatus?.icon }}</div>
          <h1 class="tracking-status-title">{{ currentStatus?.label }}</h1>
        </div>

        <!-- Tracking ID Card -->
        <div class="tracking-card">
          <div class="tracking-card-header">
            <h2 class="tracking-card-title">Tracking ID</h2>
            <button class="tracking-copy-btn" @click="copyTrackingId" type="button">
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

        <!-- Location Card -->
        <div class="tracking-card">
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

        <!-- Details Card -->
        <div class="tracking-card">
          <h2 class="tracking-card-title">รายละเอียดพัสดุ</h2>
          <div class="tracking-details">
            <div class="tracking-detail-row">
              <span class="tracking-detail-label">ประเภท</span>
              <span class="tracking-detail-value">{{ delivery.package_type }}</span>
            </div>
            <div class="tracking-detail-row">
              <span class="tracking-detail-label">น้ำหนัก</span>
              <span class="tracking-detail-value">{{ delivery.package_weight }} กก.</span>
            </div>
            <div class="tracking-detail-row">
              <span class="tracking-detail-label">ระยะทาง</span>
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

        <!-- Driver Card -->
        <div v-if="delivery.provider && 'first_name' in delivery.provider" class="tracking-card">
          <h2 class="tracking-card-title">ข้อมูลคนขับ</h2>
          <div class="tracking-driver">
            <div class="tracking-driver-avatar">👤</div>
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

        <!-- Help Section -->
        <div class="tracking-help">
          <p class="tracking-help-title">ต้องการความช่วยเหลือ?</p>
          <p class="tracking-help-text">กรุณาติดต่อฝ่ายสนับสนุนลูกค้า</p>
        </div>

        <!-- Cancel Button (only for pending/matched status) -->
        <div v-if="canCancel" class="tracking-actions">
          <button 
            class="tracking-cancel-btn" 
            @click="openCancelModal" 
            type="button"
            :disabled="cancelling"
          >
            🚫 ยกเลิกการจัดส่ง
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
          <button class="tracking-modal-close" @click="closeCancelModal" type="button">
            ✕
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
            @click="closeCancelModal"
            type="button"
            :disabled="cancelling"
          >
            ไม่ยกเลิก
          </button>
          <button 
            class="tracking-modal-btn tracking-modal-btn-danger" 
            @click="confirmCancel"
            type="button"
            :disabled="cancelling"
          >
            {{ cancelling ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิก' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

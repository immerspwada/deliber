<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const route = useRoute()
const router = useRouter()

const orderId = route.params.id as string
const loading = ref(true)
const error = ref<string | null>(null)
const order = ref<any>(null)
const orderType = ref<'ride' | 'delivery' | 'shopping' | 'queue' | 'moving' | 'laundry' | null>(null)

// Fetch order details from all possible tables
const fetchOrderDetails = async () => {
  loading.value = true
  error.value = null

  try {
    // Try ride_requests
    const { data: ride } = await supabase
      .from('ride_requests')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()

    if (ride) {
      order.value = ride
      orderType.value = 'ride'
      loading.value = false
      return
    }

    // Try delivery_requests
    const { data: delivery } = await supabase
      .from('delivery_requests')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()

    if (delivery) {
      order.value = delivery
      orderType.value = 'delivery'
      loading.value = false
      return
    }

    // Try shopping_requests
    const { data: shopping } = await supabase
      .from('shopping_requests')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()

    if (shopping) {
      order.value = shopping
      orderType.value = 'shopping'
      loading.value = false
      return
    }

    // Try queue_bookings
    const { data: queue } = await supabase
      .from('queue_bookings')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()

    if (queue) {
      order.value = queue
      orderType.value = 'queue'
      loading.value = false
      return
    }

    // Try moving_requests
    const { data: moving } = await supabase
      .from('moving_requests')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()

    if (moving) {
      order.value = moving
      orderType.value = 'moving'
      loading.value = false
      return
    }

    // Try laundry_requests
    const { data: laundry } = await supabase
      .from('laundry_requests')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()

    if (laundry) {
      order.value = laundry
      orderType.value = 'laundry'
      loading.value = false
      return
    }

    // Not found in any table
    error.value = 'ไม่พบข้อมูลใบเสร็จ'
  } catch (err: any) {
    console.error('Error fetching order:', err)
    error.value = 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
  } finally {
    loading.value = false
  }
}

// Computed properties for display
const serviceName = computed(() => {
  switch (orderType.value) {
    case 'ride': return 'เรียกรถ'
    case 'delivery': return 'ส่งของ'
    case 'shopping': return 'ซื้อของ'
    case 'queue': return 'จองคิว'
    case 'moving': return 'ขนย้าย'
    case 'laundry': return 'ซักรีด'
    default: return 'บริการ'
  }
})

const trackingId = computed(() => {
  return order.value?.tracking_id || '-'
})

const fromAddress = computed(() => {
  if (!order.value) return '-'
  
  switch (orderType.value) {
    case 'ride':
      return order.value.pickup_address || '-'
    case 'delivery':
      return order.value.sender_address || '-'
    case 'shopping':
      return order.value.store_name || order.value.store_address || '-'
    case 'queue':
      return order.value.category || '-'
    case 'moving':
      return order.value.pickup_address || '-'
    case 'laundry':
      return order.value.pickup_address || '-'
    default:
      return '-'
  }
})

const toAddress = computed(() => {
  if (!order.value) return '-'
  
  switch (orderType.value) {
    case 'ride':
      return order.value.destination_address || '-'
    case 'delivery':
      return order.value.recipient_address || '-'
    case 'shopping':
      return order.value.delivery_address || '-'
    case 'queue':
      return order.value.place_name || order.value.place_address || '-'
    case 'moving':
      return order.value.destination_address || '-'
    case 'laundry':
      return 'บริการซักรีด'
    default:
      return '-'
  }
})

const totalFare = computed(() => {
  if (!order.value) return 0
  
  switch (orderType.value) {
    case 'ride':
      return order.value.final_fare || order.value.estimated_fare || 0
    case 'delivery':
      return order.value.final_fee || order.value.estimated_fee || 0
    case 'shopping':
      return order.value.total_cost || order.value.service_fee || 0
    case 'queue':
      return order.value.final_fee || order.value.service_fee || 0
    case 'moving':
      return order.value.final_price || order.value.estimated_price || 0
    case 'laundry':
      return order.value.final_price || order.value.estimated_price || 0
    default:
      return 0
  }
})

const discount = computed(() => {
  return order.value?.promo_discount_amount || 0
})

const tip = computed(() => {
  return order.value?.tip_amount || 0
})

const createdDate = computed(() => {
  if (!order.value?.created_at) return '-'
  const date = new Date(order.value.created_at)
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

const createdTime = computed(() => {
  if (!order.value?.created_at) return '-'
  const date = new Date(order.value.created_at)
  return date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit'
  })
})

const statusText = computed(() => {
  if (!order.value) return '-'
  
  const status = order.value.status
  if (status === 'completed' || status === 'delivered') return 'สำเร็จ'
  if (status === 'cancelled') return 'ยกเลิก'
  return status
})

// Actions
const goBack = () => {
  router.back()
}

const shareReceipt = async () => {
  const text = `ใบเสร็จ ${serviceName.value}\nรหัส: ${trackingId.value}\nยอดรวม: ฿${totalFare.value.toLocaleString()}`
  
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'ใบเสร็จ',
        text
      })
    } catch (err) {
      console.log('Share cancelled')
    }
  } else {
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(text)
      alert('คัดลอกข้อมูลแล้ว')
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }
}

const downloadReceipt = () => {
  // TODO: Generate PDF receipt
  alert('ฟีเจอร์ดาวน์โหลด PDF กำลังพัฒนา')
}

const rebookService = () => {
  // Navigate to appropriate service page
  switch (orderType.value) {
    case 'ride':
      router.push('/customer/ride')
      break
    case 'delivery':
      router.push('/customer/delivery')
      break
    case 'shopping':
      router.push('/customer/shopping')
      break
    case 'queue':
      router.push('/customer/queue-booking')
      break
    default:
      router.push('/customer')
  }
}

onMounted(() => {
  fetchOrderDetails()
})
</script>

<template>
  <div class="receipt-page">
    <!-- Header -->
    <header class="receipt-header">
      <button class="back-btn" aria-label="กลับ" @click="goBack">
        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
      </button>
      <h1 class="page-title">ใบเสร็จ</h1>
      <div class="header-actions">
        <button 
          v-if="!loading && order"
          class="icon-btn" 
          aria-label="แชร์"
          @click="shareReceipt"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
          </svg>
        </button>
      </div>
    </header>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลด...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <svg width="64" height="64" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <h3>{{ error }}</h3>
      <button class="retry-btn" @click="fetchOrderDetails">ลองใหม่</button>
    </div>

    <!-- Receipt Content -->
    <div v-else-if="order" class="receipt-content">
      <!-- Receipt Card -->
      <div class="receipt-card">
        <!-- Status Badge -->
        <div class="status-section">
          <div :class="['status-badge', order.status]">
            <svg v-if="order.status === 'completed' || order.status === 'delivered'" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <svg v-else width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
            <span>{{ statusText }}</span>
          </div>
        </div>

        <!-- Service Type -->
        <div class="service-section">
          <h2 class="service-name">{{ serviceName }}</h2>
          <p class="tracking-id">รหัส: {{ trackingId }}</p>
        </div>

        <!-- Date & Time -->
        <div class="datetime-section">
          <div class="datetime-item">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <span>{{ createdDate }}</span>
          </div>
          <div class="datetime-item">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>{{ createdTime }}</span>
          </div>
        </div>

        <!-- Route Info -->
        <div class="route-section">
          <div class="route-item">
            <div class="route-icon start">
              <div class="dot"></div>
            </div>
            <div class="route-details">
              <span class="route-label">จาก</span>
              <span class="route-address">{{ fromAddress }}</span>
            </div>
          </div>
          <div class="route-line"></div>
          <div class="route-item">
            <div class="route-icon end">
              <div class="dot"></div>
            </div>
            <div class="route-details">
              <span class="route-label">ถึง</span>
              <span class="route-address">{{ toAddress }}</span>
            </div>
          </div>
        </div>

        <!-- Fare Breakdown -->
        <div class="fare-section">
          <h3 class="section-title">รายละเอียดค่าบริการ</h3>
          
          <div class="fare-row">
            <span class="fare-label">ค่าบริการ</span>
            <span class="fare-value">฿{{ totalFare.toLocaleString() }}</span>
          </div>

          <div v-if="discount > 0" class="fare-row discount">
            <span class="fare-label">ส่วนลด</span>
            <span class="fare-value">-฿{{ discount.toLocaleString() }}</span>
          </div>

          <div v-if="tip > 0" class="fare-row">
            <span class="fare-label">ทิป</span>
            <span class="fare-value">฿{{ tip.toLocaleString() }}</span>
          </div>

          <div class="fare-divider"></div>

          <div class="fare-row total">
            <span class="fare-label">ยอดรวม</span>
            <span class="fare-value">฿{{ (totalFare - discount + tip).toLocaleString() }}</span>
          </div>
        </div>

        <!-- Provider Info (if available) -->
        <div v-if="order.provider_id" class="provider-section">
          <h3 class="section-title">ข้อมูลผู้ให้บริการ</h3>
          <div class="provider-info">
            <div class="provider-avatar">
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <div class="provider-details">
              <p class="provider-name">ผู้ให้บริการ</p>
              <p class="provider-id">ID: {{ order.provider_id.slice(0, 8) }}...</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="actions-section">
        <button 
          v-if="orderType === 'ride' || orderType === 'delivery' || orderType === 'queue'"
          class="action-btn primary" 
          @click="rebookService"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          <span>จองอีกครั้ง</span>
        </button>
        
        <button class="action-btn secondary" @click="downloadReceipt">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <span>ดาวน์โหลด PDF</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.receipt-page {
  min-height: 100vh;
  background: #FAFAFA;
  padding-bottom: 100px;
}

/* Header */
.receipt-header {
  background: white;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #E5E5E5;
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  color: #1A1A1A;
}

.back-btn:active {
  transform: scale(0.95);
  background: #EBEBEB;
}

.page-title {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  color: #1A1A1A;
}

.icon-btn:active {
  transform: scale(0.95);
  background: #EBEBEB;
}

/* Loading & Error States */
.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #E5E5E5;
  border-top-color: #1A1A1A;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p,
.error-state h3 {
  margin-top: 16px;
  font-size: 16px;
  color: #6B6B6B;
}

.error-state svg {
  color: #6B6B6B;
}

.retry-btn {
  margin-top: 16px;
  padding: 12px 24px;
  background: #1A1A1A;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.retry-btn:active {
  transform: scale(0.95);
}

/* Receipt Content */
.receipt-content {
  max-width: 480px;
  margin: 0 auto;
  padding: 20px 16px;
}

.receipt-card {
  background: white;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

/* Status */
.status-section {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
}

.status-badge.completed,
.status-badge.delivered {
  background: #F5F5F5;
  color: #1A1A1A;
}

.status-badge.cancelled {
  background: #F5F5F5;
  color: #6B6B6B;
}

/* Service */
.service-section {
  text-align: center;
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #E5E5E5;
}

.service-name {
  font-size: 24px;
  font-weight: 700;
  color: #1A1A1A;
  margin-bottom: 8px;
}

.tracking-id {
  font-size: 14px;
  color: #6B6B6B;
  font-family: 'Courier New', monospace;
}

/* DateTime */
.datetime-section {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #E5E5E5;
}

.datetime-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #6B6B6B;
}

.datetime-item svg {
  color: #9CA3AF;
}

/* Route */
.route-section {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #E5E5E5;
}

.route-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.route-item + .route-line {
  margin: 8px 0 8px 11px;
}

.route-line {
  width: 2px;
  height: 24px;
  background: #E5E5E5;
}

.route-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.route-icon .dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.route-icon.start .dot {
  background: #1A1A1A;
}

.route-icon.end .dot {
  background: #6B6B6B;
  border: 2px solid #1A1A1A;
}

.route-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.route-label {
  font-size: 12px;
  color: #9CA3AF;
  font-weight: 500;
}

.route-address {
  font-size: 14px;
  color: #1A1A1A;
  line-height: 1.4;
}

/* Fare */
.fare-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #6B6B6B;
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.fare-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  font-size: 14px;
}

.fare-row.discount {
  color: #6B6B6B;
}

.fare-row.total {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
}

.fare-label {
  color: #6B6B6B;
}

.fare-row.total .fare-label {
  color: #1A1A1A;
}

.fare-value {
  font-weight: 600;
  color: #1A1A1A;
}

.fare-divider {
  height: 1px;
  background: #E5E5E5;
  margin: 8px 0;
}

/* Provider */
.provider-section {
  padding-top: 24px;
  border-top: 1px solid #E5E5E5;
}

.provider-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #FAFAFA;
  border-radius: 12px;
}

.provider-avatar {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 12px;
  color: #6B6B6B;
}

.provider-details {
  flex: 1;
}

.provider-name {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 2px;
}

.provider-id {
  font-size: 12px;
  color: #9CA3AF;
  font-family: 'Courier New', monospace;
}

/* Actions */
.actions-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 20px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.primary {
  background: #1A1A1A;
  color: white;
}

.action-btn.primary:active {
  transform: scale(0.98);
  background: #000000;
}

.action-btn.secondary {
  background: #F5F5F5;
  color: #1A1A1A;
}

.action-btn.secondary:active {
  transform: scale(0.98);
  background: #EBEBEB;
}
</style>

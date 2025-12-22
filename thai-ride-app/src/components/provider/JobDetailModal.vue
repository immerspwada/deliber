<script setup lang="ts">
/**
 * JobDetailModal - Modal แสดงรายละเอียดงานพร้อมปุ่ม action
 * Feature: F14 - Provider Dashboard Enhancement
 * 
 * Actions:
 * - โทรหาลูกค้า
 * - นำทาง (Google Maps / Apple Maps)
 * - อัพเดทสถานะ
 * - ยกเลิกงาน
 * 
 * MUNEEF Style: สีเขียว #00A86B
 */
import { ref, computed, watch } from 'vue'
import { useProviderDashboard } from '../../composables/useProviderDashboard'

interface Job {
  id: string
  tracking_id?: string
  type: 'ride' | 'delivery' | 'shopping' | 'queue' | 'moving' | 'laundry'
  status: string
  pickup_address: string
  destination_address: string
  estimated_fare: number
  final_fare?: number
  customer_name: string
  customer_phone?: string
  created_at: string
  matched_at?: string
  completed_at?: string
  cancelled_at?: string
  cancel_reason?: string
  rating?: number
  pickup_lat?: number
  pickup_lng?: number
  destination_lat?: number
  destination_lng?: number
}

const props = defineProps<{
  show: boolean
  job: Job | null
}>()

const emit = defineEmits<{
  close: []
  accept: [job: Job]
  updateStatus: [job: Job, status: string]
  cancel: [job: Job]
}>()

const { updateJobStatus } = useProviderDashboard()

const loading = ref(false)
const showCancelConfirm = ref(false)
const cancelReason = ref('')

// Status mapping
const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'รอรับงาน', color: '#F59E0B', bg: '#FEF3C7' },
  matched: { label: 'รับงานแล้ว', color: '#3B82F6', bg: '#DBEAFE' },
  arriving: { label: 'กำลังไปรับ', color: '#8B5CF6', bg: '#EDE9FE' },
  in_progress: { label: 'กำลังดำเนินการ', color: '#8B5CF6', bg: '#EDE9FE' },
  picked_up: { label: 'รับของแล้ว', color: '#06B6D4', bg: '#CFFAFE' },
  completed: { label: 'สำเร็จ', color: '#00A86B', bg: '#E8F5EF' },
  cancelled: { label: 'ยกเลิก', color: '#EF4444', bg: '#FEE2E2' }
}

// Type labels
const typeLabels: Record<string, { label: string; icon: string }> = {
  ride: { label: 'เรียกรถ', icon: 'car' },
  delivery: { label: 'ส่งของ', icon: 'package' },
  shopping: { label: 'ซื้อของ', icon: 'shopping-cart' },
  queue: { label: 'จองคิว', icon: 'ticket' },
  moving: { label: 'ขนย้าย', icon: 'truck' },
  laundry: { label: 'ซักผ้า', icon: 'shirt' }
}

// Next status options based on current status
const nextStatusOptions = computed(() => {
  if (!props.job) return []
  
  const statusFlow: Record<string, { value: string; label: string }[]> = {
    matched: [
      { value: 'arriving', label: 'กำลังไปรับ' },
      { value: 'in_progress', label: 'เริ่มงาน' }
    ],
    arriving: [
      { value: 'in_progress', label: 'เริ่มงาน' },
      { value: 'picked_up', label: 'รับของแล้ว' }
    ],
    in_progress: [
      { value: 'picked_up', label: 'รับของแล้ว' },
      { value: 'completed', label: 'จบงาน' }
    ],
    picked_up: [
      { value: 'completed', label: 'จบงาน' }
    ]
  }
  
  return statusFlow[props.job.status] || []
})

const canCancel = computed(() => {
  if (!props.job) return false
  return ['matched', 'arriving'].includes(props.job.status)
})

// Format date
const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('th-TH', { 
    day: 'numeric', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

// Format time ago
const formatTimeAgo = (dateStr: string): string => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  
  if (minutes < 1) return 'เมื่อสักครู่'
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`
  const days = Math.floor(hours / 24)
  return `${days} วันที่แล้ว`
}

// Haptic feedback
const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const patterns = { light: [10], medium: [20], heavy: [30, 10, 30] }
    navigator.vibrate(patterns[type])
  }
}

// Call customer
const callCustomer = () => {
  if (!props.job?.customer_phone) return
  triggerHaptic('light')
  window.location.href = `tel:${props.job.customer_phone}`
}

// Navigate to pickup
const navigateToPickup = () => {
  if (!props.job) return
  triggerHaptic('light')
  const address = encodeURIComponent(props.job.pickup_address)
  // Try Google Maps first, fallback to Apple Maps on iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  if (isIOS) {
    window.open(`maps://maps.apple.com/?daddr=${address}`, '_blank')
  } else {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${address}`, '_blank')
  }
}

// Navigate to destination
const navigateToDestination = () => {
  if (!props.job) return
  triggerHaptic('light')
  const address = encodeURIComponent(props.job.destination_address)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  if (isIOS) {
    window.open(`maps://maps.apple.com/?daddr=${address}`, '_blank')
  } else {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${address}`, '_blank')
  }
}

// Update status
const handleUpdateStatus = async (newStatus: string) => {
  if (!props.job) return
  loading.value = true
  triggerHaptic('medium')
  
  try {
    emit('updateStatus', props.job, newStatus)
  } finally {
    loading.value = false
  }
}

// Cancel job
const handleCancel = () => {
  if (!props.job) return
  triggerHaptic('heavy')
  emit('cancel', props.job)
  showCancelConfirm.value = false
  emit('close')
}

// Close modal
const closeModal = () => {
  triggerHaptic('light')
  emit('close')
}

// Reset state when modal closes
watch(() => props.show, (newVal) => {
  if (!newVal) {
    showCancelConfirm.value = false
    cancelReason.value = ''
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show && job" class="modal-overlay" @click.self="closeModal">
        <div class="modal-container">
          <!-- Header -->
          <div class="modal-header">
            <div class="job-type-badge">
              <svg v-if="job.type === 'ride'" class="type-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h8m-8 4h8m-4 4v4m-4-4h8a2 2 0 002-2V7a2 2 0 00-2-2H8a2 2 0 00-2 2v6a2 2 0 002 2z"/>
              </svg>
              <svg v-else-if="job.type === 'delivery'" class="type-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
              </svg>
              <svg v-else class="type-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              <span>{{ typeLabels[job.type]?.label || job.type }}</span>
            </div>
            <button class="close-btn" @click="closeModal">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Status Badge -->
          <div class="status-section">
            <div 
              class="status-badge"
              :style="{ 
                color: statusLabels[job.status]?.color || '#666',
                backgroundColor: statusLabels[job.status]?.bg || '#F5F5F5'
              }"
            >
              {{ statusLabels[job.status]?.label || job.status }}
            </div>
            <span class="tracking-id">{{ job.tracking_id || job.id.slice(0, 8) }}</span>
          </div>

          <!-- Customer Info -->
          <div class="customer-section">
            <div class="customer-avatar">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <div class="customer-info">
              <span class="customer-name">{{ job.customer_name }}</span>
              <span class="customer-phone" v-if="job.customer_phone">{{ job.customer_phone }}</span>
            </div>
            <button 
              v-if="job.customer_phone" 
              class="call-btn"
              @click="callCustomer"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
              </svg>
            </button>
          </div>

          <!-- Route Info -->
          <div class="route-section">
            <div class="route-point" @click="navigateToPickup">
              <div class="point-marker pickup"></div>
              <div class="point-content">
                <span class="point-label">จุดรับ</span>
                <span class="point-address">{{ job.pickup_address }}</span>
              </div>
              <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <div class="route-line"></div>
            <div class="route-point" @click="navigateToDestination">
              <div class="point-marker destination"></div>
              <div class="point-content">
                <span class="point-label">จุดส่ง</span>
                <span class="point-address">{{ job.destination_address }}</span>
              </div>
              <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
          </div>

          <!-- Fare & Time Info -->
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">ค่าบริการ</span>
              <span class="info-value fare">฿{{ (job.final_fare || job.estimated_fare).toLocaleString() }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">สร้างเมื่อ</span>
              <span class="info-value">{{ formatTimeAgo(job.created_at) }}</span>
            </div>
            <div class="info-item" v-if="job.matched_at">
              <span class="info-label">รับงานเมื่อ</span>
              <span class="info-value">{{ formatDate(job.matched_at) }}</span>
            </div>
            <div class="info-item" v-if="job.rating">
              <span class="info-label">คะแนน</span>
              <span class="info-value rating">
                <svg fill="currentColor" viewBox="0 0 20 20" width="16" height="16">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
                {{ job.rating }}
              </span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="action-section" v-if="job.status !== 'completed' && job.status !== 'cancelled'">
            <!-- Accept Button (for pending) -->
            <button 
              v-if="job.status === 'pending'"
              class="btn-primary"
              :disabled="loading"
              @click="emit('accept', job)"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              รับงาน
            </button>

            <!-- Status Update Buttons -->
            <div v-else-if="nextStatusOptions.length > 0" class="status-buttons">
              <button 
                v-for="option in nextStatusOptions"
                :key="option.value"
                class="btn-status"
                :disabled="loading"
                @click="handleUpdateStatus(option.value)"
              >
                {{ option.label }}
              </button>
            </div>

            <!-- Cancel Button -->
            <button 
              v-if="canCancel && !showCancelConfirm"
              class="btn-cancel"
              @click="showCancelConfirm = true"
            >
              ยกเลิกงาน
            </button>

            <!-- Cancel Confirmation -->
            <div v-if="showCancelConfirm" class="cancel-confirm">
              <p>ยืนยันการยกเลิกงาน?</p>
              <div class="cancel-actions">
                <button class="btn-outline" @click="showCancelConfirm = false">ไม่</button>
                <button class="btn-danger" @click="handleCancel">ยืนยัน</button>
              </div>
            </div>
          </div>

          <!-- Completed/Cancelled Info -->
          <div v-else class="completed-section">
            <div v-if="job.status === 'completed'" class="completed-badge">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span>งานสำเร็จเมื่อ {{ formatDate(job.completed_at) }}</span>
            </div>
            <div v-else-if="job.status.startsWith('cancelled')" class="cancelled-badge">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span>ยกเลิกเมื่อ {{ formatDate(job.cancelled_at) }}</span>
              <p v-if="job.cancel_reason" class="cancel-reason">{{ job.cancel_reason }}</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal-container {
  background: #FFFFFF;
  border-radius: 24px 24px 0 0;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 20px;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.job-type-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: #E8F5EF;
  border-radius: 20px;
  color: #00A86B;
  font-weight: 600;
  font-size: 14px;
}

.type-icon {
  width: 18px;
  height: 18px;
}

.close-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border: none;
  border-radius: 50%;
  color: #666666;
  cursor: pointer;
}

.status-section {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 600;
}

.tracking-id {
  font-size: 13px;
  color: #999999;
  font-family: monospace;
}

.customer-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #F9F9F9;
  border-radius: 16px;
  margin-bottom: 20px;
}

.customer-avatar {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #E8E8E8;
  border-radius: 50%;
  color: #666666;
}

.customer-avatar svg {
  width: 24px;
  height: 24px;
}

.customer-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.customer-name {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
}

.customer-phone {
  font-size: 14px;
  color: #666666;
}

.call-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #00A86B;
  border: none;
  border-radius: 50%;
  color: #FFFFFF;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.call-btn:active {
  transform: scale(0.95);
}

.route-section {
  margin-bottom: 20px;
}

.route-point {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.route-point:active {
  background: #F5F5F5;
}

.point-marker {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}

.point-marker.pickup {
  background: #00A86B;
}

.point-marker.destination {
  background: #E53935;
}

.point-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.point-label {
  font-size: 12px;
  color: #999999;
}

.point-address {
  font-size: 14px;
  color: #1A1A1A;
  line-height: 1.4;
}

.nav-icon {
  width: 20px;
  height: 20px;
  color: #00A86B;
  flex-shrink: 0;
}

.route-line {
  width: 2px;
  height: 20px;
  background: linear-gradient(to bottom, #00A86B, #E53935);
  margin-left: 17px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: #F9F9F9;
  border-radius: 12px;
}

.info-label {
  font-size: 12px;
  color: #999999;
}

.info-value {
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
}

.info-value.fare {
  color: #00A86B;
  font-size: 18px;
}

.info-value.rating {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #F59E0B;
}

.action-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 16px;
  background: #00A86B;
  color: #FFFFFF;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:active {
  transform: scale(0.98);
  background: #008F5B;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.status-buttons {
  display: flex;
  gap: 12px;
}

.btn-status {
  flex: 1;
  padding: 14px;
  background: #00A86B;
  color: #FFFFFF;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-status:active {
  transform: scale(0.98);
}

.btn-cancel {
  width: 100%;
  padding: 14px;
  background: transparent;
  color: #EF4444;
  border: 1px solid #EF4444;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.cancel-confirm {
  padding: 16px;
  background: #FEE2E2;
  border-radius: 12px;
  text-align: center;
}

.cancel-confirm p {
  margin: 0 0 12px;
  color: #EF4444;
  font-weight: 500;
}

.cancel-actions {
  display: flex;
  gap: 12px;
}

.btn-outline {
  flex: 1;
  padding: 12px;
  background: #FFFFFF;
  color: #666666;
  border: 1px solid #E8E8E8;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-danger {
  flex: 1;
  padding: 12px;
  background: #EF4444;
  color: #FFFFFF;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.completed-section {
  padding: 16px;
  border-radius: 12px;
}

.completed-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #00A86B;
  font-weight: 500;
}

.cancelled-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #EF4444;
  font-weight: 500;
}

.cancel-reason {
  margin: 8px 0 0;
  padding: 8px 12px;
  background: #FEE2E2;
  border-radius: 8px;
  font-size: 13px;
  color: #991B1B;
}

/* Transitions */
.modal-enter-active, .modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from, .modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container {
  animation: slideUp 0.3s ease-out;
}

.modal-leave-active .modal-container {
  animation: slideDown 0.3s ease-in;
}

@keyframes slideDown {
  from { transform: translateY(0); opacity: 1; }
  to { transform: translateY(100%); opacity: 0; }
}
</style>

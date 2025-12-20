<script setup lang="ts">
/**
 * Feature: Multi-Role Ride Booking System V3 - Admin Ride Detail
 * Task 7.4: AdminRideDetailViewV3.vue
 * 
 * Full ride details with audit trail and admin actions
 */
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAdminRideMonitoring } from '../composables/useAdminRideMonitoring'
import { useAdminCleanup } from '../composables/useAdminCleanup'

const router = useRouter()
const route = useRoute()
const { addCleanup } = useAdminCleanup()

const {
  isLoading,
  error,
  getRideDetails,
  cancelRide
} = useAdminRideMonitoring()

const rideDetails = ref<any>(null)
const showCancelModal = ref(false)
const cancelReason = ref('')
const isCancelling = ref(false)

const statusLabels: Record<string, string> = {
  pending: 'รอคนขับ',
  matched: 'จับคู่แล้ว',
  arriving: 'กำลังมารับ',
  picked_up: 'รับแล้ว',
  in_progress: 'กำลังเดินทาง',
  completed: 'เสร็จสิ้น',
  cancelled: 'ยกเลิก'
}

const handleCancelRide = async () => {
  if (!cancelReason.value || !rideDetails.value) return
  
  if (!confirm('ต้องการยกเลิกการเดินทางนี้หรือไม่?')) return
  
  isCancelling.value = true
  try {
    await cancelRide(rideDetails.value.ride.id, cancelReason.value)
    showCancelModal.value = false
    router.push('/admin/rides')
  } catch (err) {
    alert('ไม่สามารถยกเลิกได้')
  } finally {
    isCancelling.value = false
  }
}

const formatDateTime = (date: string) => {
  const d = new Date(date)
  return d.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatFare = (fare: number) => `฿${fare.toLocaleString()}`

onMounted(async () => {
  const rideId = route.params.id as string
  if (rideId) {
    const details = await getRideDetails(rideId)
    if (details) {
      rideDetails.value = details
    }
  }
})

// Register cleanup
addCleanup(() => {
  rideDetails.value = null
  showCancelModal.value = false
  cancelReason.value = ''
  isCancelling.value = false
  isLoading.value = false
  error.value = null
  console.log('[AdminRideDetailViewV3] Cleanup complete')
})
</script>

<template>
  <div class="admin-detail-page">
    <!-- Header -->
    <div class="header">
      <button class="back-btn" @click="router.back()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
      <h1>รายละเอียดการเดินทาง</h1>
      <div class="spacer"></div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <span>กำลังโหลด...</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>{{ error }}</span>
    </div>

    <!-- Content -->
    <div v-else-if="rideDetails" class="content">
      <!-- Ride Info Card -->
      <div class="info-card">
        <div class="card-header">
          <h2>ข้อมูลการเดินทาง</h2>
          <div class="tracking-id">{{ rideDetails.ride.tracking_id }}</div>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <span class="label">สถานะ</span>
            <span class="value status">{{ statusLabels[rideDetails.ride.status] }}</span>
          </div>
          <div class="info-item">
            <span class="label">ประเภทรถ</span>
            <span class="value">{{ rideDetails.ride.vehicle_type === 'car' ? 'รถเก๋ง' : rideDetails.ride.vehicle_type === 'motorcycle' ? 'มอเตอร์ไซค์' : 'รถตู้' }}</span>
          </div>
          <div class="info-item">
            <span class="label">ค่าโดยสารประมาณการ</span>
            <span class="value">{{ formatFare(rideDetails.ride.estimated_fare) }}</span>
          </div>
          <div class="info-item">
            <span class="label">สร้างเมื่อ</span>
            <span class="value">{{ formatDateTime(rideDetails.ride.created_at) }}</span>
          </div>
        </div>

        <!-- Locations -->
        <div class="locations-section">
          <h3>เส้นทาง</h3>
          <div class="location-item">
            <div class="location-dot pickup"></div>
            <div class="location-text">
              <span class="label">จุดรับ</span>
              <span class="address">{{ rideDetails.ride.pickup_address }}</span>
            </div>
          </div>
          <div class="location-connector"></div>
          <div class="location-item">
            <div class="location-dot destination"></div>
            <div class="location-text">
              <span class="label">จุดหมาย</span>
              <span class="address">{{ rideDetails.ride.destination_address }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Customer Info -->
      <div v-if="rideDetails.customer" class="info-card">
        <div class="card-header">
          <h2>ข้อมูลลูกค้า</h2>
        </div>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">ชื่อ</span>
            <span class="value">{{ rideDetails.customer.first_name }} {{ rideDetails.customer.last_name }}</span>
          </div>
          <div class="info-item">
            <span class="label">เบอร์โทร</span>
            <span class="value">{{ rideDetails.customer.phone_number }}</span>
          </div>
          <div class="info-item">
            <span class="label">Member UID</span>
            <span class="value">{{ rideDetails.customer.member_uid }}</span>
          </div>
        </div>
      </div>

      <!-- Provider Info -->
      <div v-if="rideDetails.provider" class="info-card">
        <div class="card-header">
          <h2>ข้อมูลคนขับ</h2>
        </div>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">ชื่อ</span>
            <span class="value">{{ rideDetails.provider.name }}</span>
          </div>
          <div class="info-item">
            <span class="label">เบอร์โทร</span>
            <span class="value">{{ rideDetails.provider.phone }}</span>
          </div>
          <div class="info-item">
            <span class="label">ทะเบียนรถ</span>
            <span class="value">{{ rideDetails.provider.vehicle_plate }}</span>
          </div>
          <div class="info-item">
            <span class="label">คะแนน</span>
            <span class="value">{{ rideDetails.provider.rating?.toFixed(1) || 'N/A' }} ⭐</span>
          </div>
        </div>
      </div>

      <!-- Wallet Hold -->
      <div v-if="rideDetails.wallet_hold" class="info-card">
        <div class="card-header">
          <h2>การระงับเงิน</h2>
        </div>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">จำนวนเงิน</span>
            <span class="value">{{ formatFare(rideDetails.wallet_hold.amount) }}</span>
          </div>
          <div class="info-item">
            <span class="label">สถานะ</span>
            <span class="value">{{ rideDetails.wallet_hold.status === 'held' ? 'ระงับอยู่' : rideDetails.wallet_hold.status === 'released' ? 'ปล่อยแล้ว' : 'ชำระแล้ว' }}</span>
          </div>
        </div>
      </div>

      <!-- Audit Log -->
      <div v-if="rideDetails.audit_log?.length" class="info-card">
        <div class="card-header">
          <h2>ประวัติการเปลี่ยนแปลง</h2>
        </div>
        <div class="audit-timeline">
          <div
            v-for="log in rideDetails.audit_log"
            :key="log.id"
            class="audit-item"
          >
            <div class="audit-dot"></div>
            <div class="audit-content">
              <div class="audit-header">
                <span class="audit-status">{{ statusLabels[log.new_status] }}</span>
                <span class="audit-time">{{ formatDateTime(log.created_at) }}</span>
              </div>
              <div class="audit-meta">
                <span>โดย: {{ log.changed_by_role === 'customer' ? 'ลูกค้า' : log.changed_by_role === 'provider' ? 'คนขับ' : 'Admin' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div v-if="!['completed', 'cancelled'].includes(rideDetails.ride.status)" class="actions-card">
        <button class="btn-cancel" @click="showCancelModal = true">
          ยกเลิกการเดินทาง
        </button>
      </div>
    </div>

    <!-- Cancel Modal -->
    <Teleport to="body">
      <div v-if="showCancelModal" class="modal-overlay" @click="showCancelModal = false">
        <div class="cancel-modal" @click.stop>
          <h3>ยกเลิกการเดินทาง</h3>
          <p>กรุณาระบุเหตุผล (Admin)</p>
          
          <textarea
            v-model="cancelReason"
            placeholder="เหตุผลในการยกเลิก..."
            class="cancel-textarea"
            rows="4"
          ></textarea>

          <div class="modal-actions">
            <button class="btn-secondary" @click="showCancelModal = false">
              ยกเลิก
            </button>
            <button
              class="btn-confirm"
              :disabled="!cancelReason || isCancelling"
              @click="handleCancelRide"
            >
              <span v-if="isCancelling">กำลังยกเลิก...</span>
              <span v-else>ยืนยัน</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.admin-detail-page {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.back-btn {
  width: 40px;
  height: 40px;
  background: #fff;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.header h1 {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
  flex: 1;
}

.spacer {
  width: 40px;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 60px 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #E8E8E8;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-card {
  background: #fff;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #E8E8E8;
}

.card-header h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.tracking-id {
  font-size: 13px;
  font-weight: 600;
  color: #666;
  font-family: monospace;
  padding: 6px 12px;
  background: #F8F8F8;
  border-radius: 6px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-item .label {
  font-size: 13px;
  color: #666;
}

.info-item .value {
  font-size: 15px;
  font-weight: 500;
  color: #1A1A1A;
}

.info-item .value.status {
  color: #00A86B;
}

.locations-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #E8E8E8;
}

.locations-section h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px;
}

.location-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 0;
}

.location-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}

.location-dot.pickup {
  background: #00A86B;
}

.location-dot.destination {
  background: #E53935;
}

.location-connector {
  width: 2px;
  height: 20px;
  background: #E8E8E8;
  margin-left: 5px;
}

.location-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.location-text .label {
  font-size: 12px;
  color: #666;
}

.location-text .address {
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
}

.audit-timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.audit-item {
  display: flex;
  gap: 16px;
  position: relative;
}

.audit-item:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 24px;
  bottom: -16px;
  width: 2px;
  background: #E8E8E8;
}

.audit-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #00A86B;
  margin-top: 4px;
  flex-shrink: 0;
  z-index: 1;
}

.audit-content {
  flex: 1;
}

.audit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.audit-status {
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
}

.audit-time {
  font-size: 13px;
  color: #666;
}

.audit-meta {
  font-size: 13px;
  color: #999;
}

.actions-card {
  background: #fff;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  padding: 20px;
}

.btn-cancel {
  width: 100%;
  padding: 14px;
  background: #fff;
  color: #E53935;
  border: 2px solid #E53935;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.cancel-modal {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  max-width: 480px;
  width: 100%;
}

.cancel-modal h3 {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px;
}

.cancel-modal p {
  font-size: 14px;
  color: #666;
  margin: 0 0 20px;
}

.cancel-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  margin-bottom: 20px;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.btn-secondary,
.btn-confirm {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary {
  background: #F8F8F8;
  color: #666;
}

.btn-confirm {
  background: #E53935;
  color: #fff;
}

.btn-confirm:disabled {
  background: #CCC;
  cursor: not-allowed;
}
</style>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAdvancedFeatures } from '../composables/useAdvancedFeatures'

const router = useRouter()
const {
  scheduledRides,
  loading,
  fetchScheduledRides,
  createScheduledRide,
  cancelScheduledRide
} = useAdvancedFeatures()

const showCreateModal = ref(false)
const showCancelConfirm = ref(false)
const selectedRideId = ref<string | null>(null)

// Form state
const newRide = ref({
  pickup: { lat: 13.7563, lng: 100.5018, address: '' },
  destination: { lat: 0, lng: 0, address: '' },
  date: '',
  time: '',
  rideType: 'standard' as 'standard' | 'premium',
  notes: ''
})

onMounted(async () => {
  await fetchScheduledRides()
})

const upcomingRides = computed(() => {
  return scheduledRides.value.filter(r => 
    new Date(r.scheduled_datetime) > new Date() && r.status === 'scheduled'
  )
})

const pastRides = computed(() => {
  return scheduledRides.value.filter(r => 
    new Date(r.scheduled_datetime) <= new Date() || r.status !== 'scheduled'
  )
})

const handleCreate = async () => {
  if (!newRide.value.pickup.address || !newRide.value.destination.address || !newRide.value.date || !newRide.value.time) {
    return
  }

  const scheduledDatetime = new Date(`${newRide.value.date}T${newRide.value.time}`).toISOString()
  
  await createScheduledRide({
    pickup: newRide.value.pickup,
    destination: newRide.value.destination,
    scheduledDatetime,
    rideType: newRide.value.rideType,
    notes: newRide.value.notes || undefined
  })

  showCreateModal.value = false
  resetForm()
}

const handleCancel = async () => {
  if (selectedRideId.value) {
    await cancelScheduledRide(selectedRideId.value as string)
    showCancelConfirm.value = false
    selectedRideId.value = null
  }
}

const confirmCancel = (rideId: string | null) => {
  if (rideId) {
    selectedRideId.value = rideId
    showCancelConfirm.value = true
  }
}

const resetForm = () => {
  newRide.value = {
    pickup: { lat: 13.7563, lng: 100.5018, address: '' },
    destination: { lat: 0, lng: 0, address: '' },
    date: '',
    time: '',
    rideType: 'standard',
    notes: ''
  }
}

const formatDateTime = (datetime: string) => {
  const date = new Date(datetime)
  return {
    date: date.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' }),
    time: date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  }
}

const getStatusText = (status: string | null) => {
  if (!status) return 'ไม่ทราบสถานะ'
  const statusMap: Record<string, string> = {
    scheduled: 'รอดำเนินการ',
    confirmed: 'ยืนยันแล้ว',
    cancelled: 'ยกเลิก',
    completed: 'เสร็จสิ้น',
    expired: 'หมดอายุ'
  }
  return statusMap[status] || status
}

const getMinDate = () => {
  const today = new Date()
  return today.toISOString().split('T')[0]
}
</script>

<template>
  <div class="scheduled-page">
    <!-- Header -->
    <header class="page-header">
      <button @click="router.back()" class="back-btn">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
      </button>
      <h1>จองล่วงหน้า</h1>
      <button @click="showCreateModal = true" class="add-btn">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
      </button>
    </header>

    <!-- Empty State -->
    <div v-if="scheduledRides.length === 0 && !loading" class="empty-state">
      <div class="empty-icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
      </div>
      <h3>ยังไม่มีการจองล่วงหน้า</h3>
      <p>จองการเดินทางล่วงหน้าเพื่อความสะดวก</p>
      <button @click="showCreateModal = true" class="btn-primary">
        จองเลย
      </button>
    </div>

    <!-- Rides List -->
    <div v-else class="rides-content">
      <!-- Upcoming -->
      <section v-if="upcomingRides.length > 0" class="rides-section">
        <h2 class="section-title">กำลังจะมาถึง</h2>
        <div class="rides-list">
          <div v-for="ride in upcomingRides" :key="ride.id" class="ride-card">
            <div class="ride-datetime">
              <span class="ride-date">{{ formatDateTime(ride.scheduled_datetime).date }}</span>
              <span class="ride-time">{{ formatDateTime(ride.scheduled_datetime).time }}</span>
            </div>
            <div class="ride-details">
              <div class="ride-route">
                <div class="route-point">
                  <div class="point-dot pickup"></div>
                  <span>{{ ride.pickup_address }}</span>
                </div>
                <div class="route-line"></div>
                <div class="route-point">
                  <div class="point-dot destination"></div>
                  <span>{{ ride.destination_address }}</span>
                </div>
              </div>
              <div class="ride-meta">
                <span class="ride-type">{{ ride.ride_type === 'premium' ? 'Premium' : 'Standard' }}</span>
                <span v-if="ride.estimated_fare" class="ride-fare">~฿{{ ride.estimated_fare }}</span>
              </div>
            </div>
            <div class="ride-actions">
              <button @click="confirmCancel(ride.id)" class="cancel-btn">
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Past -->
      <section v-if="pastRides.length > 0" class="rides-section">
        <h2 class="section-title">ประวัติ</h2>
        <div class="rides-list">
          <div v-for="ride in pastRides" :key="ride.id" class="ride-card past">
            <div class="ride-datetime">
              <span class="ride-date">{{ formatDateTime(ride.scheduled_datetime).date }}</span>
              <span class="ride-time">{{ formatDateTime(ride.scheduled_datetime).time }}</span>
            </div>
            <div class="ride-details">
              <div class="ride-route">
                <div class="route-point">
                  <div class="point-dot pickup"></div>
                  <span>{{ ride.pickup_address }}</span>
                </div>
                <div class="route-line"></div>
                <div class="route-point">
                  <div class="point-dot destination"></div>
                  <span>{{ ride.destination_address }}</span>
                </div>
              </div>
              <div class="ride-status" :class="ride.status">
                {{ getStatusText(ride.status) }}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Create Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click="showCreateModal = false">
      <div class="modal-content modal-large" @click.stop>
        <div class="modal-header">
          <h3>จองล่วงหน้า</h3>
          <button @click="showCreateModal = false" class="close-btn">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>จุดรับ</label>
            <input 
              v-model="newRide.pickup.address" 
              type="text" 
              placeholder="ระบุจุดรับ"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label>ปลายทาง</label>
            <input 
              v-model="newRide.destination.address" 
              type="text" 
              placeholder="ระบุปลายทาง"
              class="form-input"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>วันที่</label>
              <input 
                v-model="newRide.date" 
                type="date" 
                :min="getMinDate()"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label>เวลา</label>
              <input 
                v-model="newRide.time" 
                type="time" 
                class="form-input"
              />
            </div>
          </div>

          <div class="form-group">
            <label>ประเภทรถ</label>
            <div class="ride-type-options">
              <button 
                :class="['type-option', { active: newRide.rideType === 'standard' }]"
                @click="newRide.rideType = 'standard'"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 17h.01M16 17h.01M9 11h6M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11M5 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-6M5 11h14"/>
                </svg>
                <span>Standard</span>
              </button>
              <button 
                :class="['type-option', { active: newRide.rideType === 'premium' }]"
                @click="newRide.rideType = 'premium'"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3l3.5 7L12 6l3.5 4L19 3M5 21h14M5 17h14M5 13h14"/>
                </svg>
                <span>Premium</span>
              </button>
            </div>
          </div>

          <div class="form-group">
            <label>หมายเหตุ (ไม่บังคับ)</label>
            <textarea 
              v-model="newRide.notes" 
              placeholder="เช่น มีกระเป๋าใบใหญ่"
              class="form-textarea"
            ></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="showCreateModal = false" class="btn-secondary">ยกเลิก</button>
          <button 
            @click="handleCreate" 
            :disabled="loading || !newRide.pickup.address || !newRide.destination.address || !newRide.date || !newRide.time"
            class="btn-primary"
          >
            {{ loading ? 'กำลังจอง...' : 'ยืนยันการจอง' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Cancel Confirm Modal -->
    <div v-if="showCancelConfirm" class="modal-overlay" @click="showCancelConfirm = false">
      <div class="modal-content" @click.stop>
        <h3>ยกเลิกการจอง?</h3>
        <p>คุณแน่ใจหรือไม่ที่จะยกเลิกการจองนี้?</p>
        <div class="modal-actions">
          <button @click="showCancelConfirm = false" class="btn-secondary">ไม่</button>
          <button @click="handleCancel" class="btn-danger">ยกเลิกการจอง</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scheduled-page {
  min-height: 100vh;
  background: #f6f6f6;
  padding-bottom: 100px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #fff;
  border-bottom: 1px solid #e5e5e5;
  position: sticky;
  top: 0;
  z-index: 10;
}

.page-header h1 {
  font-size: 18px;
  font-weight: 600;
}

.back-btn, .add-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
}

.back-btn svg, .add-btn svg {
  width: 24px;
  height: 24px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
}

.empty-icon {
  width: 80px;
  height: 80px;
  background: #f0f0f0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.empty-icon svg {
  width: 40px;
  height: 40px;
  color: #999;
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.empty-state p {
  font-size: 14px;
  color: #6b6b6b;
  margin-bottom: 24px;
}

.rides-content {
  padding: 16px;
}

.rides-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #6b6b6b;
  margin-bottom: 12px;
  text-transform: uppercase;
}

.rides-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ride-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  gap: 16px;
}

.ride-card.past {
  opacity: 0.7;
}

.ride-datetime {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 60px;
  padding-right: 16px;
  border-right: 1px solid #e5e5e5;
}

.ride-date {
  font-size: 12px;
  color: #6b6b6b;
}

.ride-time {
  font-size: 18px;
  font-weight: 600;
}

.ride-details {
  flex: 1;
}

.ride-route {
  margin-bottom: 12px;
}

.route-point {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.point-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.point-dot.pickup {
  background: #000;
}

.point-dot.destination {
  background: #fff;
  border: 2px solid #000;
}

.route-line {
  width: 2px;
  height: 16px;
  background: #e5e5e5;
  margin-left: 4px;
}

.ride-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #6b6b6b;
}

.ride-status {
  display: inline-block;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  background: #f0f0f0;
}

.ride-status.completed {
  background: #dcfce7;
  color: #166534;
}

.ride-status.cancelled {
  background: #fee2e2;
  color: #991b1b;
}

.ride-actions {
  display: flex;
  align-items: center;
}

.cancel-btn {
  padding: 8px 16px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  background: #fff;
  font-size: 14px;
  color: #ef4444;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  background: #fff;
  border-radius: 16px 16px 0 0;
  padding: 24px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-large {
  max-width: 500px;
  margin: auto;
  border-radius: 16px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
}

.close-btn svg {
  width: 20px;
  height: 20px;
}

.modal-body {
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 16px;
}

.form-input:focus {
  outline: none;
  border-color: #000;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-row .form-group {
  flex: 1;
}

.form-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 14px;
  resize: none;
  height: 80px;
}

.ride-type-options {
  display: flex;
  gap: 12px;
}

.type-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  background: #fff;
}

.type-option.active {
  border-color: #000;
  background: #f6f6f6;
}

.type-option svg {
  width: 32px;
  height: 32px;
}

.modal-footer {
  display: flex;
  gap: 12px;
}

.modal-footer button {
  flex: 1;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.btn-primary {
  padding: 14px 24px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
}

.btn-primary:disabled {
  opacity: 0.5;
}

.btn-secondary {
  padding: 14px 24px;
  background: #f6f6f6;
  color: #000;
  border: none;
  border-radius: 8px;
  font-size: 16px;
}

.btn-danger {
  padding: 14px 24px;
  background: #ef4444;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
}

.modal-content h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.modal-content p {
  font-size: 14px;
  color: #6b6b6b;
}
</style>

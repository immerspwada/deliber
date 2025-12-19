<script setup lang="ts">
/**
 * Feature: Multi-Role Ride Booking System V3 - Provider Active Ride
 * Task 5.5: ProviderActiveRideV3.vue
 * 
 * Manage active ride with status updates and completion
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProviderDashboardV3 } from '../../composables/useProviderDashboardV3'
import MapView from '../../components/MapView.vue'

const router = useRouter()

const {
  currentRide,
  isLoading,
  error,
  updateRideStatus,
  completeRide,
  cancelRide,
  updateLocation,
  subscribeToCurrentRide
} = useProviderDashboardV3()

const showCancelSheet = ref(false)
const showCompleteSheet = ref(false)
const cancelReason = ref('')
const actualFare = ref<number | null>(null)
const isUpdating = ref(false)

// Location tracking
let locationInterval: NodeJS.Timeout | null = null

const statusFlow = [
  { key: 'matched', label: 'ยืนยันรับงาน', next: 'arriving' },
  { key: 'arriving', label: 'กำลังไปรับ', next: 'picked_up' },
  { key: 'picked_up', label: 'รับลูกค้าแล้ว', next: 'in_progress' },
  { key: 'in_progress', label: 'กำลังเดินทาง', next: 'completed' }
]

const currentStatusIndex = computed(() => 
  statusFlow.findIndex(s => s.key === currentRide.value?.status)
)

const nextStatus = computed(() => 
  statusFlow[currentStatusIndex.value + 1]
)

const canUpdateStatus = computed(() => 
  currentRide.value && nextStatus.value
)

const canComplete = computed(() => 
  currentRide.value?.status === 'in_progress'
)

const handleStatusUpdate = async () => {
  if (!currentRide.value || !nextStatus.value) return
  
  isUpdating.value = true
  try {
    await updateRideStatus(currentRide.value.id, nextStatus.value.key as any)
  } catch (err) {
    alert('ไม่สามารถอัพเดทสถานะได้')
  } finally {
    isUpdating.value = false
  }
}

const handleComplete = async () => {
  if (!currentRide.value) return
  
  isUpdating.value = true
  try {
    const result = await completeRide(
      currentRide.value.id,
      actualFare.value || undefined
    )
    
    if (result.success) {
      showCompleteSheet.value = false
      router.push('/provider/dashboard')
    }
  } catch (err) {
    alert('ไม่สามารถจบงานได้')
  } finally {
    isUpdating.value = false
  }
}

const handleCancel = async () => {
  if (!currentRide.value || !cancelReason.value) return
  
  if (!confirm('ต้องการยกเลิกงานนี้หรือไม่?')) return
  
  isUpdating.value = true
  try {
    await cancelRide(currentRide.value.id, cancelReason.value)
    showCancelSheet.value = false
    router.push('/provider/dashboard')
  } catch (err) {
    alert('ไม่สามารถยกเลิกได้')
  } finally {
    isUpdating.value = false
  }
}

const startLocationTracking = () => {
  if (!navigator.geolocation) return
  
  // Update location every 5 seconds
  locationInterval = setInterval(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateLocation(position.coords.latitude, position.coords.longitude)
      },
      (error) => {
        console.error('Location error:', error)
      },
      { enableHighAccuracy: true }
    )
  }, 5000)
}

const stopLocationTracking = () => {
  if (locationInterval) {
    clearInterval(locationInterval)
    locationInterval = null
  }
}

onMounted(async () => {
  await subscribeToCurrentRide()
  startLocationTracking()
})

onUnmounted(() => {
  stopLocationTracking()
})
</script>

<template>
  <div class="active-ride-page">
    <!-- Loading -->
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <span>กำลังโหลด...</span>
    </div>

    <!-- No Active Ride -->
    <div v-else-if="!currentRide" class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v4M12 16h.01"/>
      </svg>
      <h3>ไม่มีงานที่กำลังทำ</h3>
      <button class="btn-back" @click="router.push('/provider/dashboard')">
        กลับหน้าหลัก
      </button>
    </div>

    <!-- Active Ride -->
    <template v-else>
      <!-- Map -->
      <div class="map-section">
        <MapView
          :pickup="currentRide.pickup"
          :destination="currentRide.destination"
          :show-route="true"
          height="40vh"
        />
        
        <div class="top-bar">
          <button class="back-btn" @click="router.push('/provider/dashboard')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <div class="tracking-id">{{ currentRide.trackingId }}</div>
        </div>
      </div>

      <!-- Info Panel -->
      <div class="info-panel">
        <!-- Status Progress -->
        <div class="status-progress">
          <div
            v-for="(status, index) in statusFlow"
            :key="status.key"
            :class="['status-step', {
              active: currentRide.status === status.key,
              completed: index < currentStatusIndex
            }]"
          >
            <div class="step-circle">
              <svg v-if="index < currentStatusIndex" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              <span v-else>{{ index + 1 }}</span>
            </div>
            <span class="step-label">{{ status.label }}</span>
          </div>
        </div>

        <!-- Customer Info -->
        <div class="customer-card">
          <div class="customer-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div class="customer-info">
            <span class="customer-name">ลูกค้า</span>
            <span class="customer-phone">{{ currentRide.userId }}</span>
          </div>
        </div>

        <!-- Locations -->
        <div class="locations-section">
          <div class="location-item">
            <div class="location-dot pickup"></div>
            <div class="location-text">
              <span class="label">จุดรับ</span>
              <span class="address">{{ currentRide.pickup.address }}</span>
            </div>
          </div>
          <div class="location-connector"></div>
          <div class="location-item">
            <div class="location-dot destination"></div>
            <div class="location-text">
              <span class="label">จุดหมาย</span>
              <span class="address">{{ currentRide.destination.address }}</span>
            </div>
          </div>
        </div>

        <!-- Fare -->
        <div class="fare-display">
          <span>ค่าโดยสาร</span>
          <span class="fare-amount">฿{{ currentRide.estimatedFare.toLocaleString() }}</span>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">
          <!-- Next Status Button -->
          <button
            v-if="canUpdateStatus"
            class="btn-primary"
            :disabled="isUpdating"
            @click="handleStatusUpdate"
          >
            <span v-if="isUpdating" class="spinner-small"></span>
            <span v-else>{{ nextStatus?.label }}</span>
          </button>

          <!-- Complete Button -->
          <button
            v-if="canComplete"
            class="btn-complete"
            @click="showCompleteSheet = true"
          >
            จบงาน
          </button>

          <!-- Cancel Button -->
          <button
            class="btn-cancel"
            @click="showCancelSheet = true"
          >
            ยกเลิกงาน
          </button>
        </div>
      </div>
    </template>

    <!-- Complete Sheet -->
    <Teleport to="body">
      <div v-if="showCompleteSheet" class="sheet-overlay" @click="showCompleteSheet = false">
        <div class="complete-sheet" @click.stop>
          <div class="sheet-handle"></div>
          <h3>จบงาน</h3>
          <p>ยืนยันค่าโดยสาร</p>
          
          <div class="fare-input-group">
            <label>ค่าโดยสารจริง (ถ้าต่างจากประมาณการ)</label>
            <input
              v-model.number="actualFare"
              type="number"
              :placeholder="`฿${currentRide?.estimatedFare || 0}`"
              class="fare-input"
            />
          </div>

          <button
            class="btn-confirm"
            :disabled="isUpdating"
            @click="handleComplete"
          >
            <span v-if="isUpdating">กำลังดำเนินการ...</span>
            <span v-else>ยืนยันจบงาน</span>
          </button>
        </div>
      </div>
    </Teleport>

    <!-- Cancel Sheet -->
    <Teleport to="body">
      <div v-if="showCancelSheet" class="sheet-overlay" @click="showCancelSheet = false">
        <div class="cancel-sheet" @click.stop>
          <div class="sheet-handle"></div>
          <h3>ยกเลิกงาน</h3>
          <p>กรุณาระบุเหตุผล</p>
          
          <textarea
            v-model="cancelReason"
            placeholder="เหตุผลในการยกเลิก..."
            class="cancel-textarea"
            rows="4"
          ></textarea>

          <button
            class="btn-confirm-cancel"
            :disabled="!cancelReason || isUpdating"
            @click="handleCancel"
          >
            <span v-if="isUpdating">กำลังยกเลิก...</span>
            <span v-else>ยืนยันยกเลิก</span>
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.active-ride-page {
  min-height: 100vh;
  background: #F5F5F5;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 60px 20px;
  min-height: 100vh;
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

.empty-state svg {
  width: 64px;
  height: 64px;
  color: #CCC;
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.btn-back {
  padding: 12px 24px;
  background: #00A86B;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
}

.map-section {
  position: relative;
  height: 40vh;
}

.top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  padding-top: calc(12px + env(safe-area-inset-top));
}

.back-btn {
  width: 40px;
  height: 40px;
  background: #fff;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.tracking-id {
  padding: 8px 16px;
  background: rgba(255,255,255,0.95);
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: #666;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.info-panel {
  background: #fff;
  border-radius: 20px 20px 0 0;
  margin-top: -20px;
  padding: 20px 16px;
  position: relative;
  z-index: 10;
}

.status-progress {
  display: flex;
  justify-content: space-between;
  margin-bottom: 24px;
  padding: 0 8px;
}

.status-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.step-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #F0F0F0;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.3s;
}

.status-step.active .step-circle {
  background: #00A86B;
  color: #fff;
  box-shadow: 0 0 0 4px rgba(0, 168, 107, 0.2);
}

.status-step.completed .step-circle {
  background: #00A86B;
  color: #fff;
}

.step-circle svg {
  width: 18px;
  height: 18px;
}

.step-label {
  font-size: 11px;
  color: #666;
  text-align: center;
  line-height: 1.2;
}

.status-step.active .step-label {
  color: #00A86B;
  font-weight: 600;
}

.customer-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #F8F8F8;
  border-radius: 12px;
  margin-bottom: 16px;
}

.customer-avatar {
  width: 48px;
  height: 48px;
  background: #E8F5EF;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00A86B;
}

.customer-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.customer-name {
  font-size: 15px;
  font-weight: 600;
}

.customer-phone {
  font-size: 13px;
  color: #666;
}

.locations-section {
  margin-bottom: 16px;
}

.location-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 0;
}

.location-dot {
  width: 10px;
  height: 10px;
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
  height: 16px;
  background: #E8E8E8;
  margin-left: 4px;
}

.location-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.label {
  font-size: 12px;
  color: #666;
}

.address {
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
}

.fare-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #F8F8F8;
  border-radius: 12px;
  margin-bottom: 20px;
}

.fare-amount {
  font-size: 20px;
  font-weight: 700;
  color: #00A86B;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn-primary,
.btn-complete,
.btn-cancel {
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-primary {
  background: #00A86B;
  color: #fff;
}

.btn-primary:disabled {
  background: #CCC;
  cursor: not-allowed;
}

.btn-complete {
  background: #1976D2;
  color: #fff;
}

.btn-cancel {
  background: #fff;
  color: #E53935;
  border: 2px solid #E53935;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 9999;
  display: flex;
  align-items: flex-end;
}

.complete-sheet,
.cancel-sheet {
  width: 100%;
  background: #fff;
  border-radius: 20px 20px 0 0;
  padding: 20px 16px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
}

.sheet-handle {
  width: 40px;
  height: 4px;
  background: #E8E8E8;
  border-radius: 2px;
  margin: 0 auto 20px;
}

.complete-sheet h3,
.cancel-sheet h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px;
}

.complete-sheet p,
.cancel-sheet p {
  font-size: 14px;
  color: #666;
  margin: 0 0 20px;
}

.fare-input-group {
  margin-bottom: 20px;
}

.fare-input-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: #1A1A1A;
}

.fare-input {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 16px;
  outline: none;
}

.fare-input:focus {
  border-color: #00A86B;
}

.cancel-textarea {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  outline: none;
  margin-bottom: 20px;
}

.cancel-textarea:focus {
  border-color: #00A86B;
}

.btn-confirm,
.btn-confirm-cancel {
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.btn-confirm {
  background: #00A86B;
  color: #fff;
}

.btn-confirm-cancel {
  background: #E53935;
  color: #fff;
}

.btn-confirm:disabled,
.btn-confirm-cancel:disabled {
  background: #CCC;
  cursor: not-allowed;
}
</style>

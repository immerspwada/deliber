<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import LocationPicker from '../components/LocationPicker.vue'
import MapView from '../components/MapView.vue'
import { useLocation, type GeoLocation } from '../composables/useLocation'

const { calculateDistance } = useLocation()

// Sender info
const senderName = ref('')
const senderPhone = ref('')
const senderAddress = ref('')
const senderLocation = ref<GeoLocation | null>(null)

// Recipient info
const recipientName = ref('')
const recipientPhone = ref('')
const recipientAddress = ref('')
const recipientLocation = ref<GeoLocation | null>(null)

// Package info
const packageDescription = ref('')
const packageWeight = ref('')
const packageType = ref<'document' | 'small' | 'medium' | 'large'>('small')

// Results
const deliveryFee = ref(0)
const estimatedTime = ref(0)
const estimatedDistance = ref(0)
const isCalculating = ref(false)
const showResult = ref(false)

const packageTypes = [
  { value: 'document', label: 'เอกสาร', maxWeight: 0.5 },
  { value: 'small', label: 'เล็ก', maxWeight: 5 },
  { value: 'medium', label: 'กลาง', maxWeight: 15 },
  { value: 'large', label: 'ใหญ่', maxWeight: 30 }
] as const

const canCalculate = computed(() => 
  senderLocation.value && recipientLocation.value && packageWeight.value
)

const handleSenderLocationSelected = (location: GeoLocation) => {
  senderLocation.value = location
  showResult.value = false
}

const handleRecipientLocationSelected = (location: GeoLocation) => {
  recipientLocation.value = location
  showResult.value = false
}

const handleRouteCalculated = (data: { distance: number; duration: number }) => {
  estimatedDistance.value = data.distance
  estimatedTime.value = data.duration
}

const calculateDeliveryFee = async () => {
  if (!canCalculate.value || !senderLocation.value || !recipientLocation.value) return
  
  isCalculating.value = true
  
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // Calculate distance if not from map
  if (estimatedDistance.value === 0) {
    estimatedDistance.value = calculateDistance(
      senderLocation.value.lat, senderLocation.value.lng,
      recipientLocation.value.lat, recipientLocation.value.lng
    )
    // Estimate time: ~25 km/h average in Bangkok
    estimatedTime.value = Math.ceil((estimatedDistance.value / 25) * 60)
  }
  
  // Calculate fee
  const baseFee = 40
  const distanceFee = estimatedDistance.value * 8 // 8 baht per km
  const weight = parseFloat(packageWeight.value) || 0
  const weightFee = weight > 5 ? (weight - 5) * 5 : 0 // Extra fee for weight > 5kg
  
  const typeMultiplier = {
    document: 0.8,
    small: 1.0,
    medium: 1.3,
    large: 1.6
  }
  
  deliveryFee.value = Math.ceil((baseFee + distanceFee + weightFee) * typeMultiplier[packageType.value])
  showResult.value = true
  isCalculating.value = false
}

const createDeliveryRequest = () => {
  alert('ระบบส่งของจะพร้อมใช้งานเร็วๆ นี้')
}

watch(packageType, () => {
  if (showResult.value) {
    calculateDeliveryFee()
  }
})
</script>

<template>
  <div class="page-container">
    <div class="content-container">
      <div class="page-header">
        <h1 class="page-title">ส่งของ</h1>
        <p class="page-subtitle">กรอกข้อมูลการจัดส่ง</p>
      </div>

      <!-- Sender Section -->
      <div class="card form-card">
        <div class="card-header">
          <svg class="card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/>
          </svg>
          <h3 class="card-title">ผู้ส่ง</h3>
        </div>
        <div class="form-group">
          <input v-model="senderName" type="text" placeholder="ชื่อผู้ส่ง" class="input-field" />
        </div>
        <div class="form-group">
          <input v-model="senderPhone" type="tel" placeholder="เบอร์โทรผู้ส่ง" class="input-field" />
        </div>
        <div class="form-group">
          <LocationPicker
            v-model="senderAddress"
            placeholder="ที่อยู่ผู้ส่ง - ค้นหาหรือใช้ GPS"
            type="pickup"
            @location-selected="handleSenderLocationSelected"
          />
        </div>
      </div>

      <!-- Recipient Section -->
      <div class="card form-card">
        <div class="card-header">
          <svg class="card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          <h3 class="card-title">ผู้รับ</h3>
        </div>
        <div class="form-group">
          <input v-model="recipientName" type="text" placeholder="ชื่อผู้รับ" class="input-field" />
        </div>
        <div class="form-group">
          <input v-model="recipientPhone" type="tel" placeholder="เบอร์โทรผู้รับ" class="input-field" />
        </div>
        <div class="form-group">
          <LocationPicker
            v-model="recipientAddress"
            placeholder="ที่อยู่ผู้รับ - ค้นหาสถานที่"
            type="destination"
            @location-selected="handleRecipientLocationSelected"
          />
        </div>
      </div>

      <!-- Map -->
      <MapView
        :pickup="senderLocation"
        :destination="recipientLocation"
        :show-route="true"
        height="180px"
        @route-calculated="handleRouteCalculated"
      />

      <!-- Package Section -->
      <div class="card form-card">
        <div class="card-header">
          <svg class="card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
          </svg>
          <h3 class="card-title">ข้อมูลพัสดุ</h3>
        </div>
        
        <div class="form-group">
          <label class="label">ประเภทพัสดุ</label>
          <div class="package-type-grid">
            <button
              v-for="type in packageTypes"
              :key="type.value"
              @click="packageType = type.value"
              :class="['package-type-btn', { active: packageType === type.value }]"
            >
              <span class="package-type-label">{{ type.label }}</span>
              <span class="package-type-weight">สูงสุด {{ type.maxWeight }} กก.</span>
            </button>
          </div>
        </div>
        
        <div class="form-group">
          <input v-model="packageDescription" type="text" placeholder="รายละเอียดพัสดุ" class="input-field" />
        </div>
        <div class="form-group">
          <input v-model="packageWeight" type="number" step="0.1" min="0.1" placeholder="น้ำหนัก (กก.)" class="input-field" />
        </div>
      </div>

      <!-- Calculate Button -->
      <button
        @click="calculateDeliveryFee"
        :disabled="!canCalculate || isCalculating"
        class="btn-primary"
      >
        <span v-if="isCalculating" class="btn-loading">
          <svg class="spinner" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.3"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>กำลังคำนวณ</span>
        </span>
        <span v-else>คำนวณค่าส่ง</span>
      </button>

      <!-- Result -->
      <div v-if="showResult" class="fare-result">
        <div class="fare-details">
          <div class="fare-row">
            <span class="fare-label">ระยะทาง</span>
            <span class="fare-value">{{ estimatedDistance.toFixed(1) }} กม.</span>
          </div>
          <div class="fare-row">
            <span class="fare-label">เวลาโดยประมาณ</span>
            <span class="fare-value">{{ estimatedTime }} นาที</span>
          </div>
          <div class="fare-row fare-row-total">
            <span class="fare-label">ค่าส่งประมาณ</span>
            <span class="fare-amount">฿{{ deliveryFee }}</span>
          </div>
        </div>
        <button @click="createDeliveryRequest" class="btn-primary">
          <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          สร้างคำขอส่งของ
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  padding: 24px 0 16px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
}

.page-subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.form-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.card-icon {
  width: 20px;
  height: 20px;
  color: var(--color-text-secondary);
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.form-group {
  margin-bottom: 12px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.package-type-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.package-type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 4px;
  background-color: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.package-type-btn:hover {
  border-color: var(--color-text-muted);
}

.package-type-btn.active {
  border-color: var(--color-primary);
  background-color: var(--color-primary);
  color: white;
}

.package-type-label {
  font-size: 13px;
  font-weight: 500;
}

.package-type-weight {
  font-size: 10px;
  opacity: 0.7;
  margin-top: 2px;
}

.btn-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.spinner {
  width: 20px;
  height: 20px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.fare-result {
  margin-top: 24px;
  padding: 20px;
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
}

.fare-details {
  margin-bottom: 16px;
}

.fare-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.fare-row-total {
  border-top: 1px solid var(--color-border);
  margin-top: 8px;
  padding-top: 16px;
}

.fare-label {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.fare-value {
  font-size: 14px;
  font-weight: 500;
}

.fare-amount {
  font-size: 28px;
  font-weight: 700;
}

.btn-icon {
  width: 20px;
  height: 20px;
}
</style>

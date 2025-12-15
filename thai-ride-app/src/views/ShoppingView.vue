<script setup lang="ts">
import { ref, computed } from 'vue'
import LocationPicker from '../components/LocationPicker.vue'
import MapView from '../components/MapView.vue'
import { useLocation, type GeoLocation } from '../composables/useLocation'

const { calculateDistance } = useLocation()

// Store info
const storeName = ref('')
const storeAddress = ref('')
const storeLocation = ref<GeoLocation | null>(null)

// Delivery info
const deliveryAddress = ref('')
const deliveryLocation = ref<GeoLocation | null>(null)

// Shopping info
const itemList = ref('')
const budgetLimit = ref('')
const specialInstructions = ref('')

// Results
const serviceFee = ref(0)
const estimatedTime = ref(0)
const estimatedDistance = ref(0)
const isCalculating = ref(false)
const showResult = ref(false)

const canCalculate = computed(() => 
  storeLocation.value && deliveryLocation.value && itemList.value && budgetLimit.value
)

const handleStoreLocationSelected = (location: GeoLocation) => {
  storeLocation.value = location
  showResult.value = false
}

const handleDeliveryLocationSelected = (location: GeoLocation) => {
  deliveryLocation.value = location
  showResult.value = false
}

const handleRouteCalculated = (data: { distance: number; duration: number }) => {
  estimatedDistance.value = data.distance
  estimatedTime.value = data.duration
}

const calculateServiceFee = async () => {
  if (!canCalculate.value || !storeLocation.value || !deliveryLocation.value) return
  
  isCalculating.value = true
  
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // Calculate distance if not from map
  if (estimatedDistance.value === 0) {
    estimatedDistance.value = calculateDistance(
      storeLocation.value.lat, storeLocation.value.lng,
      deliveryLocation.value.lat, deliveryLocation.value.lng
    )
    estimatedTime.value = Math.ceil((estimatedDistance.value / 20) * 60) + 30 // +30 min for shopping
  }
  
  // Calculate fee
  const budget = parseFloat(budgetLimit.value) || 0
  const baseFee = 50
  const percentageFee = Math.min(budget * 0.1, 200) // 10% capped at 200
  const deliveryFee = Math.max(30, estimatedDistance.value * 6) // 6 baht per km, min 30
  
  serviceFee.value = Math.ceil(baseFee + percentageFee + deliveryFee)
  showResult.value = true
  isCalculating.value = false
}

const createShoppingRequest = () => {
  alert('ระบบซื้อของจะพร้อมใช้งานเร็วๆ นี้')
}

// Count items in list
const itemCount = computed(() => {
  if (!itemList.value.trim()) return 0
  return itemList.value.split('\n').filter(line => line.trim()).length
})
</script>

<template>
  <div class="page-container">
    <div class="content-container">
      <div class="page-header">
        <h1 class="page-title">ซื้อของ</h1>
        <p class="page-subtitle">ให้เราไปซื้อของให้คุณ</p>
      </div>

      <!-- Store Section -->
      <div class="card form-card">
        <div class="card-header">
          <svg class="card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
          <h3 class="card-title">ร้านค้า</h3>
        </div>
        <div class="form-group">
          <input v-model="storeName" type="text" placeholder="ชื่อร้าน (ถ้าทราบ)" class="input-field" />
        </div>
        <div class="form-group">
          <LocationPicker
            v-model="storeAddress"
            placeholder="ที่อยู่ร้าน - ค้นหาสถานที่"
            type="pickup"
            @location-selected="handleStoreLocationSelected"
          />
        </div>
      </div>

      <!-- Delivery Section -->
      <div class="card form-card">
        <div class="card-header">
          <svg class="card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
          </svg>
          <h3 class="card-title">ส่งถึง</h3>
        </div>
        <div class="form-group">
          <LocationPicker
            v-model="deliveryAddress"
            placeholder="ที่อยู่จัดส่ง - ค้นหาหรือใช้ GPS"
            type="destination"
            @location-selected="handleDeliveryLocationSelected"
          />
        </div>
      </div>

      <!-- Map -->
      <MapView
        :pickup="storeLocation"
        :destination="deliveryLocation"
        :show-route="true"
        height="160px"
        @route-calculated="handleRouteCalculated"
      />

      <!-- Items Section -->
      <div class="card form-card">
        <div class="card-header">
          <svg class="card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
          </svg>
          <h3 class="card-title">รายการสินค้า</h3>
          <span v-if="itemCount > 0" class="item-count">{{ itemCount }} รายการ</span>
        </div>
        <div class="form-group">
          <textarea 
            v-model="itemList" 
            placeholder="ระบุรายการสินค้า (บรรทัดละ 1 รายการ)&#10;เช่น:&#10;นมสด 1 กล่อง&#10;ขนมปัง 2 ห่อ&#10;ไข่ไก่ 1 แผง" 
            rows="5" 
            class="input-field textarea"
          ></textarea>
        </div>
      </div>

      <!-- Budget Section -->
      <div class="card form-card">
        <div class="card-header">
          <svg class="card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <h3 class="card-title">งบประมาณ</h3>
        </div>
        <div class="form-group">
          <div class="input-with-suffix">
            <input v-model="budgetLimit" type="number" placeholder="งบประมาณสูงสุด" class="input-field" />
            <span class="input-suffix">บาท</span>
          </div>
        </div>
        <div class="form-group">
          <textarea 
            v-model="specialInstructions" 
            placeholder="คำแนะนำพิเศษ (ถ้ามี) เช่น ยี่ห้อที่ต้องการ, ของทดแทนถ้าไม่มี" 
            rows="2" 
            class="input-field textarea"
          ></textarea>
        </div>
      </div>

      <!-- Calculate Button -->
      <button
        @click="calculateServiceFee"
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
        <span v-else>คำนวณค่าบริการ</span>
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
        </div>
        
        <div class="fee-breakdown">
          <div class="fee-row">
            <span>ค่าบริการพื้นฐาน</span>
            <span>฿50</span>
          </div>
          <div class="fee-row">
            <span>ค่าบริการ (10%)</span>
            <span>฿{{ Math.min(Math.ceil(parseFloat(budgetLimit) * 0.1), 200) }}</span>
          </div>
          <div class="fee-row">
            <span>ค่าส่ง</span>
            <span>฿{{ Math.max(30, Math.ceil(estimatedDistance * 6)) }}</span>
          </div>
        </div>
        
        <div class="fare-total">
          <span class="fare-label">ค่าบริการรวม</span>
          <span class="fare-amount">฿{{ serviceFee }}</span>
        </div>
        <p class="fare-note">ไม่รวมราคาสินค้า (งบประมาณ ฿{{ budgetLimit }})</p>
        
        <button @click="createShoppingRequest" class="btn-primary">
          <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          สร้างคำขอซื้อของ
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

.item-count {
  margin-left: auto;
  font-size: 12px;
  color: var(--color-text-muted);
  background-color: var(--color-secondary);
  padding: 2px 8px;
  border-radius: 10px;
}

.form-group {
  margin-bottom: 12px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.textarea {
  resize: none;
}

.input-with-suffix {
  position: relative;
}

.input-with-suffix .input-field {
  padding-right: 50px;
}

.input-suffix {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
  font-size: 14px;
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
  margin-bottom: 12px;
}

.fare-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: 14px;
}

.fare-label {
  color: var(--color-text-secondary);
}

.fare-value {
  font-weight: 500;
}

.fee-breakdown {
  background-color: var(--color-secondary);
  border-radius: var(--radius-sm);
  padding: 12px 16px;
  margin-bottom: 16px;
}

.fee-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 4px 0;
  color: var(--color-text-secondary);
}

.fare-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.fare-amount {
  font-size: 28px;
  font-weight: 700;
}

.fare-note {
  font-size: 12px;
  color: var(--color-text-muted);
  text-align: right;
  margin-bottom: 16px;
}

.btn-icon {
  width: 20px;
  height: 20px;
}
</style>

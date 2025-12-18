<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import AddressSearchInput from '../components/AddressSearchInput.vue'
import MapView from '../components/MapView.vue'
import { useLocation, type GeoLocation } from '../composables/useLocation'
import { useShopping } from '../composables/useShopping'
import { useServices } from '../composables/useServices'
import type { PlaceResult } from '../composables/usePlaceSearch'

const router = useRouter()
const { calculateDistance, currentLocation } = useLocation()
const { createShoppingRequest, calculateServiceFee, loading } = useShopping()
const { homePlace, workPlace, recentPlaces, fetchSavedPlaces, fetchRecentPlaces } = useServices()

// Fetch saved places
fetchSavedPlaces()
fetchRecentPlaces()

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

const itemCount = computed(() => {
  if (!itemList.value.trim()) return 0
  return itemList.value.split('\n').filter(line => line.trim()).length
})

// Handle search result selection
const handleStoreSearchSelect = (place: PlaceResult) => {
  storeAddress.value = place.name
  storeLocation.value = { lat: place.lat, lng: place.lng, address: place.address }
  showResult.value = false
}

const handleDeliverySearchSelect = (place: PlaceResult) => {
  deliveryAddress.value = place.name
  deliveryLocation.value = { lat: place.lat, lng: place.lng, address: place.address }
  showResult.value = false
}

// Handle saved place selection
const handleDeliveryHome = () => {
  if (homePlace.value) {
    deliveryAddress.value = homePlace.value.name
    deliveryLocation.value = { lat: homePlace.value.lat, lng: homePlace.value.lng, address: homePlace.value.address }
  }
}

const handleDeliveryWork = () => {
  if (workPlace.value) {
    deliveryAddress.value = workPlace.value.name
    deliveryLocation.value = { lat: workPlace.value.lat, lng: workPlace.value.lng, address: workPlace.value.address }
  }
}

const handleRecentSelect = (place: { name: string; address: string; lat?: number; lng?: number }, target: 'store' | 'delivery') => {
  if (target === 'store') {
    storeAddress.value = place.name
    if (place.lat && place.lng) {
      storeLocation.value = { lat: place.lat, lng: place.lng, address: place.address }
    }
  } else {
    deliveryAddress.value = place.name
    if (place.lat && place.lng) {
      deliveryLocation.value = { lat: place.lat, lng: place.lng, address: place.address }
    }
  }
}

const handleRouteCalculated = (data: { distance: number; duration: number }) => {
  estimatedDistance.value = data.distance
  estimatedTime.value = data.duration + 30 // +30 min for shopping
}

const calculateFee = async () => {
  if (!canCalculate.value || !storeLocation.value || !deliveryLocation.value) return
  
  isCalculating.value = true
  await new Promise(resolve => setTimeout(resolve, 300))
  
  if (estimatedDistance.value === 0) {
    estimatedDistance.value = calculateDistance(
      storeLocation.value.lat, storeLocation.value.lng,
      deliveryLocation.value.lat, deliveryLocation.value.lng
    )
    estimatedTime.value = Math.ceil((estimatedDistance.value / 20) * 60) + 30
  }
  
  serviceFee.value = calculateServiceFee(parseFloat(budgetLimit.value) || 0, estimatedDistance.value)
  showResult.value = true
  isCalculating.value = false
}

const handleCreateShopping = async () => {
  if (!storeLocation.value || !deliveryLocation.value) return
  
  const result = await createShoppingRequest({
    storeName: storeName.value,
    storeAddress: storeAddress.value,
    storeLocation: storeLocation.value,
    deliveryAddress: deliveryAddress.value,
    deliveryLocation: deliveryLocation.value,
    itemList: itemList.value,
    budgetLimit: parseFloat(budgetLimit.value) || 0,
    specialInstructions: specialInstructions.value,
    distanceKm: estimatedDistance.value
  })
  
  if (result) {
    router.push(`/tracking/${result.tracking_id}`)
  }
}
</script>

<template>
  <div class="page-container">
    <div class="content-container content-with-header">
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
          <AddressSearchInput
            v-model="storeAddress"
            placeholder="ค้นหาร้านค้าหรือสถานที่..."
            icon="pickup"
            :show-saved-places="false"
            :recent-places="recentPlaces"
            :current-lat="currentLocation?.lat"
            :current-lng="currentLocation?.lng"
            @select="handleStoreSearchSelect"
            @select-recent="(p) => handleRecentSelect(p, 'store')"
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
          <AddressSearchInput
            v-model="deliveryAddress"
            placeholder="ค้นหาที่อยู่จัดส่ง..."
            icon="destination"
            :home-place="homePlace"
            :work-place="workPlace"
            :recent-places="recentPlaces"
            :current-lat="currentLocation?.lat"
            :current-lng="currentLocation?.lng"
            @select="handleDeliverySearchSelect"
            @select-home="handleDeliveryHome"
            @select-work="handleDeliveryWork"
            @select-recent="(p) => handleRecentSelect(p, 'delivery')"
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
            placeholder="ระบุรายการสินค้า (บรรทัดละ 1 รายการ)&#10;เช่น:&#10;นมสด 1 กล่อง&#10;ขนมปัง 2 ห่อ" 
            rows="4" 
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
            placeholder="คำแนะนำพิเศษ (ถ้ามี)" 
            rows="2" 
            class="input-field textarea"
          ></textarea>
        </div>
      </div>

      <!-- Calculate Button -->
      <button @click="calculateFee" :disabled="!canCalculate || isCalculating" class="btn-primary">
        {{ isCalculating ? 'กำลังคำนวณ...' : 'คำนวณค่าบริการ' }}
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
        
        <div class="fare-total">
          <span class="fare-label">ค่าบริการรวม</span>
          <span class="fare-amount">฿{{ serviceFee }}</span>
        </div>
        <p class="fare-note">ไม่รวมราคาสินค้า (งบประมาณ ฿{{ budgetLimit }})</p>
        
        <button @click="handleCreateShopping" :disabled="loading" class="btn-primary">
          <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          {{ loading ? 'กำลังสร้าง...' : 'สร้างคำขอซื้อของ' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.content-with-header {
  padding-top: 16px;
}

.form-card { margin-bottom: 16px; }

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.card-icon { width: 20px; height: 20px; color: #6B6B6B; }
.card-title { font-size: 16px; font-weight: 600; }

.item-count {
  margin-left: auto;
  font-size: 12px;
  color: #6B6B6B;
  background: #F6F6F6;
  padding: 2px 8px;
  border-radius: 10px;
}

.form-group { margin-bottom: 12px; }
.form-group:last-child { margin-bottom: 0; }
.textarea { resize: none; }

.input-with-suffix { position: relative; }
.input-with-suffix .input-field { padding-right: 50px; }
.input-suffix {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #6B6B6B;
  font-size: 14px;
}

.btn-primary {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background: #00A86B;
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 16px;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
  transition: all 0.2s ease;
}

.btn-primary:hover { background: #008F5B; }
.btn-primary:disabled { background: #CCC; box-shadow: none; }
.btn-icon { width: 20px; height: 20px; }

.fare-result {
  margin-top: 24px;
  padding: 20px;
  background: #fff;
  border-radius: 16px;
}

.fare-details { margin-bottom: 12px; }
.fare-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 14px;
}

.fare-label { color: #6B6B6B; }
.fare-value { font-weight: 500; }

.fare-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #E5E5E5;
}

.fare-amount { font-size: 28px; font-weight: 700; }
.fare-note {
  font-size: 12px;
  color: #6B6B6B;
  text-align: right;
  margin-bottom: 16px;
}
</style>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import AddressSearchInput from '../components/AddressSearchInput.vue'
import MapView from '../components/MapView.vue'
import { useLocation, type GeoLocation } from '../composables/useLocation'
import { useDelivery } from '../composables/useDelivery'
import { useServices } from '../composables/useServices'
import type { PlaceResult } from '../composables/usePlaceSearch'

const router = useRouter()
const { calculateDistance, currentLocation } = useLocation()
const { createDeliveryRequest, calculateFee, loading } = useDelivery()
const { homePlace, workPlace, recentPlaces, fetchSavedPlaces, fetchRecentPlaces } = useServices()

// Fetch saved places on mount
fetchSavedPlaces()
fetchRecentPlaces()

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

// Handle search result selection
const handleSenderSearchSelect = (place: PlaceResult) => {
  senderAddress.value = place.name
  senderLocation.value = { lat: place.lat, lng: place.lng, address: place.address }
  showResult.value = false
}

const handleRecipientSearchSelect = (place: PlaceResult) => {
  recipientAddress.value = place.name
  recipientLocation.value = { lat: place.lat, lng: place.lng, address: place.address }
  showResult.value = false
}

// Handle saved place selection
const handleSenderHome = () => {
  if (homePlace.value) {
    senderAddress.value = homePlace.value.name
    senderLocation.value = { lat: homePlace.value.lat, lng: homePlace.value.lng, address: homePlace.value.address }
  }
}

const handleSenderWork = () => {
  if (workPlace.value) {
    senderAddress.value = workPlace.value.name
    senderLocation.value = { lat: workPlace.value.lat, lng: workPlace.value.lng, address: workPlace.value.address }
  }
}

const handleRecipientHome = () => {
  if (homePlace.value) {
    recipientAddress.value = homePlace.value.name
    recipientLocation.value = { lat: homePlace.value.lat, lng: homePlace.value.lng, address: homePlace.value.address }
  }
}

const handleRecipientWork = () => {
  if (workPlace.value) {
    recipientAddress.value = workPlace.value.name
    recipientLocation.value = { lat: workPlace.value.lat, lng: workPlace.value.lng, address: workPlace.value.address }
  }
}

const handleRecentSelect = (place: { name: string; address: string; lat?: number; lng?: number }, target: 'sender' | 'recipient') => {
  if (target === 'sender') {
    senderAddress.value = place.name
    if (place.lat && place.lng) {
      senderLocation.value = { lat: place.lat, lng: place.lng, address: place.address }
    }
  } else {
    recipientAddress.value = place.name
    if (place.lat && place.lng) {
      recipientLocation.value = { lat: place.lat, lng: place.lng, address: place.address }
    }
  }
}

const handleRouteCalculated = (data: { distance: number; duration: number }) => {
  estimatedDistance.value = data.distance
  estimatedTime.value = data.duration
}

const calculateDeliveryFee = async () => {
  if (!canCalculate.value || !senderLocation.value || !recipientLocation.value) return
  
  isCalculating.value = true
  
  await new Promise(resolve => setTimeout(resolve, 300))
  
  // Calculate distance if not from map
  if (estimatedDistance.value === 0) {
    estimatedDistance.value = calculateDistance(
      senderLocation.value.lat, senderLocation.value.lng,
      recipientLocation.value.lat, recipientLocation.value.lng
    )
    estimatedTime.value = Math.ceil((estimatedDistance.value / 25) * 60)
  }
  
  deliveryFee.value = calculateFee(estimatedDistance.value, packageType.value)
  showResult.value = true
  isCalculating.value = false
}

const handleCreateDelivery = async () => {
  if (!senderLocation.value || !recipientLocation.value) return
  
  const result = await createDeliveryRequest({
    senderName: senderName.value,
    senderPhone: senderPhone.value,
    senderAddress: senderAddress.value,
    senderLocation: senderLocation.value,
    recipientName: recipientName.value,
    recipientPhone: recipientPhone.value,
    recipientAddress: recipientAddress.value,
    recipientLocation: recipientLocation.value,
    packageType: packageType.value,
    packageWeight: parseFloat(packageWeight.value) || 1,
    packageDescription: packageDescription.value,
    distanceKm: estimatedDistance.value
  })
  
  if (result) {
    router.push(`/track/${result.tracking_id}`)
  }
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
        <button @click="router.back()" class="back-btn">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 class="page-title">ส่งของ</h1>
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
          <AddressSearchInput
            v-model="senderAddress"
            placeholder="ค้นหาที่อยู่ผู้ส่ง..."
            icon="pickup"
            :home-place="homePlace"
            :work-place="workPlace"
            :recent-places="recentPlaces"
            :current-lat="currentLocation?.lat"
            :current-lng="currentLocation?.lng"
            @select="handleSenderSearchSelect"
            @select-home="handleSenderHome"
            @select-work="handleSenderWork"
            @select-recent="(p) => handleRecentSelect(p, 'sender')"
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
          <AddressSearchInput
            v-model="recipientAddress"
            placeholder="ค้นหาที่อยู่ผู้รับ..."
            icon="destination"
            :home-place="homePlace"
            :work-place="workPlace"
            :recent-places="recentPlaces"
            :current-lat="currentLocation?.lat"
            :current-lng="currentLocation?.lng"
            @select="handleRecipientSearchSelect"
            @select-home="handleRecipientHome"
            @select-work="handleRecipientWork"
            @select-recent="(p) => handleRecentSelect(p, 'recipient')"
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
        <span v-if="isCalculating">กำลังคำนวณ...</span>
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
        <button @click="handleCreateDelivery" :disabled="loading" class="btn-primary">
          <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          {{ loading ? 'กำลังสร้าง...' : 'สร้างคำขอส่งของ' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
}

.back-btn {
  width: 40px;
  height: 40px;
  background: none;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.back-btn svg {
  width: 24px;
  height: 24px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
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
  color: #6B6B6B;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
}

.form-group {
  margin-bottom: 12px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.label {
  display: block;
  font-size: 14px;
  color: #6B6B6B;
  margin-bottom: 8px;
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
  background: #F6F6F6;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.package-type-btn:hover {
  border-color: #CCC;
}

.package-type-btn.active {
  border-color: #000;
  background: #000;
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

.btn-primary {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 16px;
}

.btn-primary:disabled {
  background: #CCC;
}

.btn-icon {
  width: 20px;
  height: 20px;
}

.fare-result {
  margin-top: 24px;
  padding: 20px;
  background: #fff;
  border-radius: 16px;
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
  border-top: 1px solid #E5E5E5;
  margin-top: 8px;
  padding-top: 16px;
}

.fare-label {
  font-size: 14px;
  color: #6B6B6B;
}

.fare-value {
  font-size: 14px;
  font-weight: 500;
}

.fare-amount {
  font-size: 28px;
  font-weight: 700;
}
</style>

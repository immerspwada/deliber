<script setup lang="ts">
/**
 * ActiveJobView - แสดง UI สำหรับงาน Delivery และ Shopping ที่กำลังดำเนินการ
 * Feature: F03, F04 - Delivery & Shopping Provider View
 */
import { computed } from 'vue'
import MapView from '../MapView.vue'

interface Customer {
  id: string
  name: string
  phone: string
  rating?: number
}

interface Location {
  lat: number
  lng: number
  address: string
}

interface ActiveJob {
  id: string
  tracking_id: string
  type: 'delivery' | 'shopping'
  customer: Customer
  pickup: Location
  destination: Location
  fare: number
  status: string
  distance?: number
  created_at: string
  // Delivery specific
  package_type?: string
  package_description?: string
  recipient_name?: string
  recipient_phone?: string
  // Shopping specific
  store_name?: string
  items?: any[]
  item_list?: string
  budget_limit?: number
}

const props = defineProps<{
  job: ActiveJob
  currentLocation?: { lat: number; lng: number }
}>()

const emit = defineEmits<{
  'update-status': [status: string]
  'call': []
  'chat': []
  'cancel': []
  'navigate': []
  'take-photo': []
}>()

// Delivery status steps
const deliverySteps = [
  { key: 'matched', label: 'รับงานแล้ว' },
  { key: 'pickup', label: 'ไปรับพัสดุ' },
  { key: 'in_transit', label: 'กำลังส่ง' },
  { key: 'delivered', label: 'ส่งแล้ว' }
]

// Shopping status steps
const shoppingSteps = [
  { key: 'matched', label: 'รับงานแล้ว' },
  { key: 'shopping', label: 'กำลังซื้อของ' },
  { key: 'delivering', label: 'กำลังส่ง' },
  { key: 'completed', label: 'เสร็จสิ้น' }
]

const statusSteps = computed(() => 
  props.job.type === 'delivery' ? deliverySteps : shoppingSteps
)

const currentStepIndex = computed(() => 
  statusSteps.value.findIndex(s => s.key === props.job.status)
)

const nextStatus = computed((): string | null => {
  const nextIndex = currentStepIndex.value + 1
  const nextStep = statusSteps.value[nextIndex]
  return nextStep?.key || null
})

const nextButtonText = computed(() => {
  if (props.job.type === 'delivery') {
    switch (props.job.status) {
      case 'matched': return 'ไปรับพัสดุ'
      case 'pickup': return 'รับพัสดุแล้ว - เริ่มส่ง'
      case 'in_transit': return 'ส่งพัสดุแล้ว'
      default: return 'ดำเนินการต่อ'
    }
  } else {
    switch (props.job.status) {
      case 'matched': return 'เริ่มซื้อของ'
      case 'shopping': return 'ซื้อเสร็จ - เริ่มส่ง'
      case 'delivering': return 'ส่งของแล้ว'
      default: return 'ดำเนินการต่อ'
    }
  }
})

const showPickupInfo = computed(() => {
  if (props.job.type === 'delivery') {
    return ['matched', 'pickup'].includes(props.job.status)
  }
  return ['matched', 'shopping'].includes(props.job.status)
})

const mapDestination = computed(() => {
  if (showPickupInfo.value) {
    return props.job.pickup
  }
  return props.job.destination
})

const jobTypeLabel = computed(() => 
  props.job.type === 'delivery' ? 'ส่งพัสดุ' : 'ซื้อของ'
)

const jobTypeIcon = computed(() => props.job.type)

const handleNextStep = () => {
  if (nextStatus.value) {
    emit('update-status', nextStatus.value)
  }
}

const canCancel = computed(() => 
  ['matched'].includes(props.job.status)
)

const showPhotoButton = computed(() => {
  if (props.job.type === 'delivery') {
    return ['pickup', 'in_transit'].includes(props.job.status)
  }
  return false
})
</script>

<template>
  <div class="active-job">
    <!-- Map -->
    <div class="job-map">
      <MapView
        :pickup="currentLocation ? { lat: currentLocation.lat, lng: currentLocation.lng, address: 'ตำแหน่งของคุณ' } : null"
        :destination="mapDestination"
        :show-route="true"
        height="100%"
      />
      
      <!-- Navigate button -->
      <button @click="$emit('navigate')" class="navigate-btn">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
        </svg>
        <span>นำทาง</span>
      </button>
    </div>

    <!-- Bottom Panel -->
    <div class="job-panel">
      <!-- Job Type Badge -->
      <div class="job-type-badge" :class="job.type">
        <svg v-if="job.type === 'delivery'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
        </svg>
        <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
        </svg>
        <span>{{ jobTypeLabel }}</span>
        <span class="tracking-id">{{ job.tracking_id }}</span>
      </div>

      <!-- Progress Steps -->
      <div class="progress-steps">
        <div 
          v-for="(step, index) in statusSteps" 
          :key="step.key"
          :class="['step', { active: index <= currentStepIndex, current: index === currentStepIndex }]"
        >
          <div class="step-dot"></div>
          <span v-if="index === currentStepIndex" class="step-label">{{ step.label }}</span>
        </div>
      </div>

      <!-- Customer Info -->
      <div class="customer-card">
        <div class="customer-info">
          <div class="customer-avatar">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
          </div>
          <div class="customer-details">
            <span class="customer-name">{{ job.customer.name }}</span>
            <span class="customer-phone">{{ job.customer.phone }}</span>
          </div>
        </div>
        <div class="contact-buttons">
          <button @click="$emit('call')" class="contact-btn">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
            </svg>
          </button>
          <button @click="$emit('chat')" class="contact-btn">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Delivery Specific: Package Info -->
      <div v-if="job.type === 'delivery' && job.package_type" class="package-info">
        <div class="package-header">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
          </svg>
          <span>ข้อมูลพัสดุ</span>
        </div>
        <div class="package-details">
          <div class="detail-row">
            <span class="detail-label">ประเภท:</span>
            <span class="detail-value">{{ job.package_type }}</span>
          </div>
          <div v-if="job.package_description" class="detail-row">
            <span class="detail-label">รายละเอียด:</span>
            <span class="detail-value">{{ job.package_description }}</span>
          </div>
          <div v-if="job.recipient_name" class="detail-row">
            <span class="detail-label">ผู้รับ:</span>
            <span class="detail-value">{{ job.recipient_name }}</span>
          </div>
        </div>
      </div>

      <!-- Shopping Specific: Items Info -->
      <div v-if="job.type === 'shopping'" class="shopping-info">
        <div class="shopping-header">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          <span>รายการสินค้า</span>
        </div>
        <div v-if="job.store_name" class="store-name">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
          </svg>
          <span>{{ job.store_name }}</span>
        </div>
        <div v-if="job.item_list" class="item-list">
          {{ job.item_list }}
        </div>
        <div v-else-if="job.items && job.items.length > 0" class="items-grid">
          <div v-for="(item, idx) in job.items.slice(0, 5)" :key="idx" class="item-chip">
            {{ item.name || item }}
          </div>
          <div v-if="job.items.length > 5" class="item-chip more">
            +{{ job.items.length - 5 }} รายการ
          </div>
        </div>
        <div v-if="job.budget_limit" class="budget-info">
          <span>งบประมาณ:</span>
          <span class="budget-value">฿{{ job.budget_limit.toLocaleString() }}</span>
        </div>
      </div>

      <!-- Location Info -->
      <div class="location-info">
        <div v-if="showPickupInfo" class="location-item pickup">
          <div class="location-dot"></div>
          <div class="location-text">
            <span class="location-label">{{ job.type === 'delivery' ? 'จุดรับพัสดุ' : 'ร้านค้า' }}</span>
            <span class="location-address">{{ job.pickup.address }}</span>
          </div>
        </div>
        <div v-else class="location-item destination">
          <div class="location-dot"></div>
          <div class="location-text">
            <span class="location-label">จุดส่ง</span>
            <span class="location-address">{{ job.destination.address }}</span>
          </div>
        </div>
      </div>

      <!-- Job Info -->
      <div class="job-info">
        <div v-if="job.distance" class="info-item">
          <span class="info-label">ระยะทาง</span>
          <span class="info-value">{{ job.distance.toFixed(1) }} กม.</span>
        </div>
        <div class="info-item fare">
          <span class="info-label">ค่าบริการ</span>
          <span class="info-value">฿{{ job.fare }}</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <!-- Photo Button for Delivery Proof -->
        <button 
          v-if="showPhotoButton"
          @click="$emit('take-photo')" 
          class="btn-photo"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          <span>ถ่ายรูปหลักฐาน</span>
        </button>

        <button 
          v-if="nextStatus"
          @click="handleNextStep" 
          class="btn-primary"
        >
          {{ nextButtonText }}
        </button>
        
        <button 
          v-if="canCancel"
          @click="$emit('cancel')" 
          class="btn-cancel"
        >
          ยกเลิกงาน
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.active-job {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #F6F6F6;
}

.job-map {
  flex: 1;
  position: relative;
  min-height: 35vh;
}

.navigate-btn {
  position: absolute;
  bottom: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #00A86B;
  color: white;
  border: none;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
  z-index: 100;
}

.navigate-btn svg {
  width: 20px;
  height: 20px;
}

.job-panel {
  background: white;
  border-radius: 24px 24px 0 0;
  padding: 16px 20px;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
  box-shadow: 0 -8px 32px rgba(0,0,0,0.1);
  max-height: 65vh;
  overflow-y: auto;
}

/* Job Type Badge */
.job-type-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 12px;
  margin-bottom: 16px;
  font-weight: 600;
  font-size: 14px;
}

.job-type-badge.delivery {
  background: #E8F5EF;
  color: #00A86B;
}

.job-type-badge.shopping {
  background: #FEF3C7;
  color: #D97706;
}

.job-type-badge svg {
  width: 20px;
  height: 20px;
}

.tracking-id {
  margin-left: auto;
  font-size: 12px;
  font-family: monospace;
  opacity: 0.7;
}

/* Progress Steps */
.progress-steps {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 0 8px;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
  position: relative;
}

.step:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 6px;
  left: 50%;
  width: 100%;
  height: 2px;
  background: #E5E5E5;
}

.step.active:not(:last-child)::after {
  background: #00A86B;
}

.step-dot {
  width: 14px;
  height: 14px;
  background: #E5E5E5;
  border-radius: 50%;
  z-index: 1;
  transition: all 0.3s ease;
}

.step.active .step-dot {
  background: #00A86B;
}

.step.current .step-dot {
  box-shadow: 0 0 0 4px rgba(0, 168, 107, 0.2);
}

.step-label {
  font-size: 11px;
  color: #00A86B;
  font-weight: 500;
  white-space: nowrap;
}

/* Customer Card */
.customer-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px;
  background: #F6F6F6;
  border-radius: 12px;
  margin-bottom: 12px;
}

.customer-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.customer-avatar {
  width: 44px;
  height: 44px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.customer-avatar svg {
  width: 24px;
  height: 24px;
  color: #666;
}

.customer-details {
  display: flex;
  flex-direction: column;
}

.customer-name {
  font-size: 15px;
  font-weight: 600;
}

.customer-phone {
  font-size: 13px;
  color: #666;
}

.contact-buttons {
  display: flex;
  gap: 8px;
}

.contact-btn {
  width: 40px;
  height: 40px;
  background: white;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.contact-btn:hover {
  background: #E5E5E5;
}

.contact-btn svg {
  width: 20px;
  height: 20px;
  color: #333;
}

/* Package Info (Delivery) */
.package-info {
  background: #F6F6F6;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 12px;
}

.package-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 10px;
  color: #333;
}

.package-header svg {
  width: 18px;
  height: 18px;
  color: #00A86B;
}

.package-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-row {
  display: flex;
  gap: 8px;
  font-size: 13px;
}

.detail-label {
  color: #666;
  min-width: 80px;
}

.detail-value {
  color: #333;
  font-weight: 500;
}

/* Shopping Info */
.shopping-info {
  background: #F6F6F6;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 12px;
}

.shopping-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 10px;
  color: #333;
}

.shopping-header svg {
  width: 18px;
  height: 18px;
  color: #D97706;
}

.store-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
}

.store-name svg {
  width: 16px;
  height: 16px;
}

.item-list {
  font-size: 13px;
  color: #333;
  line-height: 1.5;
  white-space: pre-wrap;
}

.items-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.item-chip {
  padding: 4px 10px;
  background: white;
  border-radius: 16px;
  font-size: 12px;
  color: #333;
}

.item-chip.more {
  background: #E5E5E5;
  color: #666;
}

.budget-info {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #E5E5E5;
  font-size: 13px;
}

.budget-value {
  font-weight: 600;
  color: #00A86B;
}

/* Location Info */
.location-info {
  margin-bottom: 12px;
}

.location-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: #F6F6F6;
  border-radius: 10px;
}

.location-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 4px;
}

.location-item.pickup .location-dot {
  background: #00A86B;
}

.location-item.destination .location-dot {
  background: #E53935;
}

.location-text {
  display: flex;
  flex-direction: column;
}

.location-label {
  font-size: 12px;
  color: #666;
}

.location-address {
  font-size: 14px;
  font-weight: 500;
}

/* Job Info */
.job-info {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.info-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: #F6F6F6;
  border-radius: 10px;
}

.info-item.fare {
  background: #00A86B;
  color: white;
}

.info-label {
  font-size: 11px;
  color: #666;
}

.info-item.fare .info-label {
  color: rgba(255,255,255,0.8);
}

.info-value {
  font-size: 16px;
  font-weight: 700;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn-photo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  background: #F6F6F6;
  color: #333;
  border: 2px dashed #CCC;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-photo svg {
  width: 20px;
  height: 20px;
}

.btn-primary {
  width: 100%;
  padding: 16px;
  background: #00A86B;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.btn-cancel {
  width: 100%;
  padding: 14px;
  background: none;
  color: #E53935;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
</style>

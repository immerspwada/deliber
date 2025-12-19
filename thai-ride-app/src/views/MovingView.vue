<script setup lang="ts">
/**
 * Feature: F159 - Moving Service
 * บริการยกของ/ขนย้าย
 */
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMoving } from '../composables/useMoving'
import { useToast } from '../composables/useToast'

const router = useRouter()
const { createMovingRequest, calculatePrice, loading, error, clearError } = useMoving()
const toast = useToast()

// Clear error on unmount
onUnmounted(() => {
  clearError()
})

const serviceTypes = [
  { id: 'small', name: 'ยกของชิ้นเล็ก', desc: 'กล่อง, กระเป๋า, เฟอร์นิเจอร์เล็ก', basePrice: 150, icon: 'small' },
  { id: 'medium', name: 'ยกของชิ้นกลาง', desc: 'ตู้เย็น, เครื่องซักผ้า, โซฟา', basePrice: 350, icon: 'medium' },
  { id: 'large', name: 'ขนย้ายบ้าน', desc: 'ย้ายบ้าน, ย้ายออฟฟิศ', basePrice: 1500, icon: 'large' }
]

const selectedType = ref<'small' | 'medium' | 'large' | ''>('')
const pickupAddress = ref('')
const pickupLat = ref<number | null>(null)
const pickupLng = ref<number | null>(null)
const destinationAddress = ref('')
const destinationLat = ref<number | null>(null)
const destinationLng = ref<number | null>(null)
const itemDescription = ref('')
const helperCount = ref(1)

// Exit confirmation
const showExitConfirm = ref(false)

// Haptic feedback
const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const patterns = { light: 10, medium: 25, heavy: 50 }
    navigator.vibrate(patterns[type])
  }
}

// Check if user has entered any data
const hasEnteredData = computed(() => {
  return selectedType.value || pickupAddress.value || destinationAddress.value || itemDescription.value
})

const goBack = () => router.back()

const goHome = () => {
  triggerHaptic('medium')
  if (hasEnteredData.value) {
    showExitConfirm.value = true
  } else {
    router.push('/customer')
  }
}

const confirmExit = () => {
  triggerHaptic('heavy')
  showExitConfirm.value = false
  router.push('/customer')
}

const cancelExit = () => {
  triggerHaptic('light')
  showExitConfirm.value = false
}

const selectType = (id: string) => {
  selectedType.value = id as typeof selectedType.value
}

// Calculate estimated price
const estimatedPrice = computed(() => {
  if (!selectedType.value) return 0
  return calculatePrice(selectedType.value, helperCount.value)
})

// Validation
const isFormValid = computed(() => {
  if (!selectedType.value) return false
  if (!pickupAddress.value.trim()) return false
  if (!destinationAddress.value.trim()) return false
  return true
})

// Show confirmation before submit
const showConfirmation = ref(false)

const confirmSubmit = () => {
  if (!isFormValid.value) return
  showConfirmation.value = true
}

const submitRequest = async () => {
  showConfirmation.value = false
  if (!isFormValid.value || !selectedType.value) return
  
  const result = await createMovingRequest({
    service_type: selectedType.value,
    pickup_address: pickupAddress.value,
    pickup_lat: pickupLat.value || undefined,
    pickup_lng: pickupLng.value || undefined,
    destination_address: destinationAddress.value,
    destination_lat: destinationLat.value || undefined,
    destination_lng: destinationLng.value || undefined,
    item_description: itemDescription.value || undefined,
    helper_count: helperCount.value
  })
  
  if (result) {
    toast.success('ส่งคำขอสำเร็จ! กำลังหาผู้ให้บริการ...')
    router.push({ name: 'moving-tracking', params: { id: result.id } })
  } else if (error.value) {
    toast.error(error.value)
  }
}

const cancelConfirmation = () => {
  showConfirmation.value = false
}

// Get selected service name
const selectedServiceName = computed(() => {
  if (!selectedType.value) return ''
  const service = serviceTypes.find(s => s.id === selectedType.value)
  return service?.name || ''
})

// Format price
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('th-TH').format(price)
}
</script>

<template>
  <div class="moving-page">
    <!-- Header -->
    <div class="header">
      <button class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
      <h1>บริการยกของ</h1>
      <button class="home-btn" @click="goHome" title="กลับหน้าหลัก">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        </svg>
      </button>
    </div>

    <div class="content">
      <!-- Error Message -->
      <div v-if="error" class="error-msg">{{ error }}</div>

      <!-- Service Type Selection -->
      <section class="section">
        <h2 class="section-title">เลือกประเภทบริการ <span class="required">*</span></h2>
        <div class="service-list">
          <button 
            v-for="service in serviceTypes" 
            :key="service.id"
            :class="['service-btn', { active: selectedType === service.id }]"
            @click="selectType(service.id)"
          >
            <div class="service-icon">
              <svg v-if="service.icon === 'small'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="4" y="4" width="16" height="16" rx="2"/>
                <path d="M4 10h16"/>
              </svg>
              <svg v-else-if="service.icon === 'medium'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M3 9h18M9 21V9"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="7" width="14" height="12" rx="1"/>
                <path d="M16 11h4l2 3v5h-6v-8z"/>
                <circle cx="6" cy="19" r="2"/>
                <circle cx="18" cy="19" r="2"/>
              </svg>
            </div>
            <div class="service-info">
              <span class="service-name">{{ service.name }}</span>
              <span class="service-desc">{{ service.desc }}</span>
              <span class="service-price">เริ่มต้น ฿{{ formatPrice(service.basePrice) }}</span>
            </div>
            <div v-if="selectedType === service.id" class="check-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
          </button>
        </div>
      </section>

      <!-- Locations -->
      <section class="section">
        <h2 class="section-title">สถานที่ <span class="required">*</span></h2>
        <div class="location-inputs">
          <div class="location-field">
            <div class="location-marker pickup"></div>
            <input 
              v-model="pickupAddress"
              type="text" 
              placeholder="ที่อยู่รับของ"
            />
          </div>
          <div class="location-field">
            <div class="location-marker destination"></div>
            <input 
              v-model="destinationAddress"
              type="text" 
              placeholder="ที่อยู่ส่งของ"
            />
          </div>
        </div>
      </section>

      <!-- Item Description -->
      <section class="section">
        <h2 class="section-title">รายละเอียดสิ่งของ</h2>
        <textarea 
          v-model="itemDescription"
          placeholder="ระบุรายการสิ่งของที่ต้องการขนย้าย เช่น ตู้เย็น 1 ตู้, กล่อง 5 ใบ..."
          class="item-input"
          rows="3"
        ></textarea>
      </section>

      <!-- Helpers -->
      <section class="section">
        <h2 class="section-title">จำนวนคนช่วยยก</h2>
        <div class="helpers-selector">
          <button 
            v-for="n in [1, 2, 3]"
            :key="n"
            :class="['helper-btn', { active: helperCount === n }]"
            @click="helperCount = n"
          >
            {{ n === 3 ? '3+ คน' : `${n} คน` }}
          </button>
        </div>
        <p class="helper-note">* คนช่วยยกเพิ่ม +฿100/คน</p>
      </section>

      <!-- Price Estimate -->
      <div v-if="selectedType" class="price-estimate">
        <div class="price-row">
          <span>ค่าบริการโดยประมาณ</span>
          <span class="price">฿{{ formatPrice(estimatedPrice) }}</span>
        </div>
        <p class="price-note">* ราคาอาจเปลี่ยนแปลงตามระยะทางและสิ่งของจริง</p>
      </div>
    </div>

    <!-- Submit Button -->
    <div class="footer">
      <button 
        class="submit-btn" 
        @click="confirmSubmit" 
        :disabled="!isFormValid || loading"
      >
        <span v-if="loading">กำลังส่งคำขอ...</span>
        <span v-else>ขอใบเสนอราคา</span>
      </button>
    </div>

    <!-- Exit Confirmation Modal -->
    <Transition name="modal">
      <div v-if="showExitConfirm" class="modal-overlay" @click.self="cancelExit">
        <div class="modal-content exit-modal">
          <div class="exit-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#F5A623" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h3>ออกจากหน้านี้?</h3>
          <p class="exit-message">ข้อมูลที่กรอกไว้จะหายไป</p>
          <div class="modal-actions">
            <button class="btn-cancel" @click="cancelExit">ยกเลิก</button>
            <button class="btn-exit" @click="confirmExit">ออก</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Confirmation Modal -->
    <div v-if="showConfirmation" class="modal-overlay" @click.self="cancelConfirmation">
      <div class="modal-content">
        <h3>ยืนยันคำขอบริการ</h3>
        <div class="confirm-details">
          <div class="detail-row">
            <span class="label">ประเภท:</span>
            <span class="value">{{ selectedServiceName }}</span>
          </div>
          <div class="detail-row">
            <span class="label">จุดรับ:</span>
            <span class="value truncate">{{ pickupAddress }}</span>
          </div>
          <div class="detail-row">
            <span class="label">จุดส่ง:</span>
            <span class="value truncate">{{ destinationAddress }}</span>
          </div>
          <div class="detail-row">
            <span class="label">คนช่วยยก:</span>
            <span class="value">{{ helperCount }} คน</span>
          </div>
          <div class="detail-row">
            <span class="label">ราคาประมาณ:</span>
            <span class="value price">฿{{ formatPrice(estimatedPrice) }}</span>
          </div>
        </div>
        <p class="confirm-note">* ราคาอาจเปลี่ยนแปลงตามระยะทางและสิ่งของจริง</p>
        <div class="modal-actions">
          <button class="btn-cancel" @click="cancelConfirmation">ยกเลิก</button>
          <button class="btn-confirm" @click="submitRequest" :disabled="loading">
            {{ loading ? 'กำลังส่ง...' : 'ยืนยัน' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.moving-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: #FFFFFF;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  padding-top: calc(16px + env(safe-area-inset-top));
  border-bottom: 1px solid #F0F0F0;
}

.back-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
}

.back-btn svg {
  width: 24px;
  height: 24px;
  color: #1A1A1A;
}

.home-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 168, 107, 0.1);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.home-btn svg {
  width: 22px;
  height: 22px;
  color: #00A86B;
}

.home-btn:active {
  transform: scale(0.95);
  background: rgba(0, 168, 107, 0.2);
}

.header h1 {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0;
}

.content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.error-msg {
  padding: 12px 16px;
  background: #FFEBEE;
  color: #E53935;
  border-radius: 10px;
  font-size: 14px;
  margin-bottom: 16px;
}

.section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #666666;
  margin: 0 0 12px;
}

.required {
  color: #E53935;
}

.service-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.service-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #FFFFFF;
  border: 2px solid #F0F0F0;
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
}

.service-btn.active {
  border-color: #2196F3;
  background: #E3F2FD;
}

.service-icon {
  width: 48px;
  height: 48px;
  background: #E3F2FD;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2196F3;
  flex-shrink: 0;
}

.service-icon svg {
  width: 26px;
  height: 26px;
}

.service-info {
  flex: 1;
  min-width: 0;
}

.service-name {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 2px;
}

.service-desc {
  display: block;
  font-size: 12px;
  color: #666666;
  margin-bottom: 4px;
}

.service-price {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #2196F3;
}

.check-icon {
  width: 28px;
  height: 28px;
  background: #2196F3;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
  flex-shrink: 0;
}

.check-icon svg {
  width: 16px;
  height: 16px;
}

.location-inputs {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.location-field {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #F5F5F5;
  border-radius: 12px;
}

.location-marker {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.location-marker.pickup {
  background: #00A86B;
}

.location-marker.destination {
  background: #E53935;
}

.location-field input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  outline: none;
}

.item-input {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 14px;
  resize: none;
}

.item-input:focus {
  outline: none;
  border-color: #2196F3;
}

.helpers-selector {
  display: flex;
  gap: 10px;
}

.helper-btn {
  flex: 1;
  padding: 12px;
  background: #FFFFFF;
  border: 2px solid #E8E8E8;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.helper-btn.active {
  border-color: #2196F3;
  background: #E3F2FD;
  color: #2196F3;
}

.helper-note {
  font-size: 12px;
  color: #999999;
  margin: 8px 0 0;
}

.price-estimate {
  padding: 16px;
  background: #E3F2FD;
  border-radius: 14px;
}

.price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.price-row span {
  font-size: 14px;
  color: #666666;
}

.price-row .price {
  font-size: 20px;
  font-weight: 700;
  color: #2196F3;
}

.price-note {
  font-size: 11px;
  color: #999999;
  margin: 8px 0 0;
}

.footer {
  padding: 16px 20px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  border-top: 1px solid #F0F0F0;
}

.submit-btn {
  width: 100%;
  padding: 16px;
  background: #2196F3;
  color: #FFFFFF;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.submit-btn:not(:disabled):active {
  opacity: 0.9;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: #FFFFFF;
  border-radius: 20px;
  padding: 24px;
  width: 100%;
  max-width: 340px;
}

.modal-content h3 {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0 0 20px;
  text-align: center;
}

.confirm-details {
  background: #F5F5F5;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #E8E8E8;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row .label {
  font-size: 14px;
  color: #666666;
  flex-shrink: 0;
}

.detail-row .value {
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
  text-align: right;
}

.detail-row .value.truncate {
  max-width: 180px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.detail-row .value.price {
  color: #2196F3;
  font-weight: 700;
}

.confirm-note {
  font-size: 12px;
  color: #999999;
  text-align: center;
  margin: 0 0 16px;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.btn-cancel {
  flex: 1;
  padding: 14px;
  background: #F5F5F5;
  color: #666666;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.btn-confirm {
  flex: 1;
  padding: 14px;
  background: #2196F3;
  color: #FFFFFF;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Exit Modal */
.exit-modal {
  text-align: center;
}

.exit-icon {
  width: 56px;
  height: 56px;
  background: #FFF3E0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.exit-icon svg {
  width: 28px;
  height: 28px;
}

.exit-message {
  font-size: 14px;
  color: #666666;
  margin: 8px 0 20px;
}

.btn-exit {
  flex: 1;
  padding: 14px;
  background: #E53935;
  color: #FFFFFF;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

/* Modal Transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.9);
}
</style>

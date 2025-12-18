<script setup lang="ts">
/**
 * Feature: F158 - Queue Booking Service
 * บริการจองคิวร้านค้า/โรงพยาบาล
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQueueBooking } from '../composables/useQueueBooking'
import { useToast } from '../composables/useToast'

const router = useRouter()
const { createQueueBooking, loading, error, categoryLabels, clearError } = useQueueBooking()
const toast = useToast()

// Clear error on unmount
onUnmounted(() => {
  clearError()
})

const categories = [
  { id: 'hospital', name: 'โรงพยาบาล', icon: 'hospital', color: '#E53935' },
  { id: 'bank', name: 'ธนาคาร', icon: 'bank', color: '#2196F3' },
  { id: 'government', name: 'หน่วยงานราชการ', icon: 'government', color: '#9C27B0' },
  { id: 'restaurant', name: 'ร้านอาหาร', icon: 'restaurant', color: '#F5A623' },
  { id: 'salon', name: 'ร้านเสริมสวย', icon: 'salon', color: '#E91E63' },
  { id: 'other', name: 'อื่นๆ', icon: 'other', color: '#607D8B' }
]

const selectedCategory = ref<'hospital' | 'bank' | 'government' | 'restaurant' | 'salon' | 'other' | ''>('')
const placeName = ref('')
const placeAddress = ref('')
const queueDetails = ref('')
const selectedDate = ref('')
const selectedTime = ref('')

// Set minimum date to today
const today = new Date().toISOString().split('T')[0]

const goBack = () => router.back()

const selectCategory = (id: string) => {
  selectedCategory.value = id as typeof selectedCategory.value
}

// Validation
const isFormValid = computed(() => {
  if (!selectedCategory.value) return false
  if (!selectedDate.value || !selectedTime.value) return false
  
  // Check if date/time is in the future
  const scheduledDateTime = new Date(`${selectedDate.value}T${selectedTime.value}`)
  if (scheduledDateTime <= new Date()) return false
  
  return true
})

// Show confirmation before submit
const showConfirmation = ref(false)

const confirmSubmit = () => {
  if (!isFormValid.value) return
  showConfirmation.value = true
}

const submitBooking = async () => {
  showConfirmation.value = false
  if (!isFormValid.value || !selectedCategory.value) return
  
  const result = await createQueueBooking({
    category: selectedCategory.value,
    place_name: placeName.value || undefined,
    place_address: placeAddress.value || undefined,
    details: queueDetails.value || undefined,
    scheduled_date: selectedDate.value,
    scheduled_time: selectedTime.value
  })
  
  if (result) {
    toast.success('จองคิวสำเร็จ!')
    router.push({ name: 'queue-tracking', params: { id: result.id } })
  } else if (error.value) {
    toast.error(error.value)
  }
}

const cancelConfirmation = () => {
  showConfirmation.value = false
}

// Format date for display
const formatDate = (date: string) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Format time for display
const formatTime = (time: string) => {
  if (!time) return ''
  return time.substring(0, 5) + ' น.'
}
</script>

<template>
  <div class="queue-page">
    <!-- Header -->
    <div class="header">
      <button class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
      <h1>จองคิว</h1>
      <div class="spacer"></div>
    </div>

    <div class="content">
      <!-- Error Message -->
      <div v-if="error" class="error-msg">{{ error }}</div>

      <!-- Category Selection -->
      <section class="section">
        <h2 class="section-title">เลือกประเภท <span class="required">*</span></h2>
        <div class="category-grid">
          <button 
            v-for="cat in categories" 
            :key="cat.id"
            :class="['category-btn', { active: selectedCategory === cat.id }]"
            :style="{ '--accent': cat.color }"
            @click="selectCategory(cat.id)"
          >
            <div class="cat-icon">
              <svg v-if="cat.icon === 'hospital'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 21h18M9 8h6M12 5v6M5 21V7l7-4 7 4v14"/>
              </svg>
              <svg v-else-if="cat.icon === 'bank'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/>
              </svg>
              <svg v-else-if="cat.icon === 'government'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 21h18M4 21V10l8-6 8 6v11M9 21v-6h6v6"/>
              </svg>
              <svg v-else-if="cat.icon === 'restaurant'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2v0a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
              </svg>
              <svg v-else-if="cat.icon === 'salon'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 3v18M18 3v18M6 8h12M6 16h12"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4M12 16h.01"/>
              </svg>
            </div>
            <span>{{ cat.name }}</span>
          </button>
        </div>
      </section>

      <!-- Place Details -->
      <section class="section">
        <h2 class="section-title">ชื่อสถานที่</h2>
        <input 
          v-model="placeName"
          type="text"
          placeholder="เช่น โรงพยาบาลรามา, ธนาคารกรุงเทพ สาขาสยาม..."
          class="text-input"
        />
      </section>

      <section class="section">
        <h2 class="section-title">ที่อยู่</h2>
        <input 
          v-model="placeAddress"
          type="text"
          placeholder="ที่อยู่สถานที่ (ถ้ามี)"
          class="text-input"
        />
      </section>

      <!-- Queue Details -->
      <section class="section">
        <h2 class="section-title">รายละเอียดการจอง</h2>
        <textarea 
          v-model="queueDetails"
          placeholder="ระบุรายละเอียดการจองคิว เช่น บริการที่ต้องการ, หมายเลขคิว..."
          class="details-input"
          rows="3"
        ></textarea>
      </section>

      <!-- Date & Time -->
      <section class="section">
        <h2 class="section-title">วันและเวลา <span class="required">*</span></h2>
        <div class="datetime-row">
          <div class="datetime-field">
            <label>วันที่</label>
            <input type="date" v-model="selectedDate" :min="today" />
          </div>
          <div class="datetime-field">
            <label>เวลา</label>
            <input type="time" v-model="selectedTime" />
          </div>
        </div>
      </section>

      <!-- Service Fee Info -->
      <div class="fee-info">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4M12 8h.01"/>
        </svg>
        <span>ค่าบริการจองคิว: <strong>฿50</strong></span>
      </div>
    </div>

    <!-- Submit Button -->
    <div class="footer">
      <button 
        class="submit-btn" 
        @click="confirmSubmit" 
        :disabled="!isFormValid || loading"
      >
        <span v-if="loading">กำลังจอง...</span>
        <span v-else>จองคิว</span>
      </button>
    </div>

    <!-- Confirmation Modal -->
    <div v-if="showConfirmation" class="modal-overlay" @click.self="cancelConfirmation">
      <div class="modal-content">
        <h3>ยืนยันการจองคิว</h3>
        <div class="confirm-details">
          <div class="detail-row">
            <span class="label">ประเภท:</span>
            <span class="value">{{ categoryLabels[selectedCategory as keyof typeof categoryLabels] }}</span>
          </div>
          <div v-if="placeName" class="detail-row">
            <span class="label">สถานที่:</span>
            <span class="value">{{ placeName }}</span>
          </div>
          <div class="detail-row">
            <span class="label">วันที่:</span>
            <span class="value">{{ formatDate(selectedDate) }}</span>
          </div>
          <div class="detail-row">
            <span class="label">เวลา:</span>
            <span class="value">{{ formatTime(selectedTime) }}</span>
          </div>
          <div class="detail-row">
            <span class="label">ค่าบริการ:</span>
            <span class="value price">฿50</span>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" @click="cancelConfirmation">ยกเลิก</button>
          <button class="btn-confirm" @click="submitBooking" :disabled="loading">
            {{ loading ? 'กำลังจอง...' : 'ยืนยัน' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.queue-page {
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

.header h1 {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0;
}

.spacer {
  width: 40px;
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

.category-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.category-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  background: #FFFFFF;
  border: 2px solid #F0F0F0;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.15s;
}

.category-btn.active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, white);
}

.cat-icon {
  width: 40px;
  height: 40px;
  background: color-mix(in srgb, var(--accent) 12%, white);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
}

.cat-icon svg {
  width: 22px;
  height: 22px;
}

.category-btn span {
  font-size: 12px;
  font-weight: 500;
  color: #1A1A1A;
}

.text-input {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 14px;
}

.text-input:focus {
  outline: none;
  border-color: #9C27B0;
}

.details-input {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 14px;
  resize: none;
}

.details-input:focus {
  outline: none;
  border-color: #9C27B0;
}

.datetime-row {
  display: flex;
  gap: 12px;
}

.datetime-field {
  flex: 1;
}

.datetime-field label {
  display: block;
  font-size: 12px;
  color: #666666;
  margin-bottom: 6px;
}

.datetime-field input {
  width: 100%;
  padding: 12px 14px;
  border: 2px solid #E8E8E8;
  border-radius: 10px;
  font-size: 14px;
}

.datetime-field input:focus {
  outline: none;
  border-color: #9C27B0;
}

.fee-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: #F3E5F5;
  border-radius: 12px;
}

.fee-info svg {
  width: 20px;
  height: 20px;
  color: #9C27B0;
  flex-shrink: 0;
}

.fee-info span {
  font-size: 14px;
  color: #666666;
}

.fee-info strong {
  color: #9C27B0;
}

.footer {
  padding: 16px 20px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  border-top: 1px solid #F0F0F0;
}

.submit-btn {
  width: 100%;
  padding: 16px;
  background: #9C27B0;
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
  margin-bottom: 20px;
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
}

.detail-row .value {
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
}

.detail-row .value.price {
  color: #9C27B0;
  font-weight: 700;
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
  background: #9C27B0;
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
</style>

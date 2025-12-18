<script setup lang="ts">
/**
 * Feature: F03 Enhancement - Delivery Proof Photo Capture
 * Component for rider to capture proof photo with GPS timestamp
 * MUNEEF Style UI
 */
import { ref, computed } from 'vue'

interface Props {
  deliveryId: string
  proofType: 'pickup' | 'delivery'
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<{
  'capture': [file: File]
  'skip': []
  'cancel': []
}>()

const photoFile = ref<File | null>(null)
const photoPreview = ref<string | null>(null)
const isCapturing = ref(false)
const gpsStatus = ref<'pending' | 'success' | 'error' | 'retrying'>('pending')
const gpsLocation = ref<{ lat: number; lng: number } | null>(null)
const gpsAccuracy = ref<number | null>(null)
const gpsRetryCount = ref(0)
const maxGpsRetries = 3
const fileInputRef = ref<HTMLInputElement | null>(null)

const proofTitle = computed(() => 
  props.proofType === 'pickup' ? 'ถ่ายรูปยืนยันรับพัสดุ' : 'ถ่ายรูปยืนยันส่งสำเร็จ'
)

const proofDescription = computed(() => 
  props.proofType === 'pickup' 
    ? 'ถ่ายรูปพัสดุที่รับมาเพื่อเป็นหลักฐาน' 
    : 'ถ่ายรูปพัสดุที่ส่งถึงผู้รับเพื่อยืนยัน'
)

// Get GPS location with auto-retry
const getGPSLocation = (isRetry = false) => {
  if (!navigator.geolocation) {
    gpsStatus.value = 'error'
    return
  }

  if (!isRetry) {
    gpsRetryCount.value = 0
  }

  gpsStatus.value = isRetry ? 'retrying' : 'pending'

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      gpsLocation.value = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      }
      gpsAccuracy.value = pos.coords.accuracy
      gpsStatus.value = 'success'
      gpsRetryCount.value = 0
    },
    () => {
      // Auto-retry if not exceeded max retries
      if (gpsRetryCount.value < maxGpsRetries) {
        gpsRetryCount.value++
        setTimeout(() => getGPSLocation(true), 1500)
      } else {
        gpsStatus.value = 'error'
      }
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  )
}

// Manual retry GPS
const retryGPS = () => {
  gpsRetryCount.value = 0
  getGPSLocation()
}

// Format accuracy level
const getAccuracyLevel = (accuracy: number | null): { label: string; color: string } => {
  if (!accuracy) return { label: 'ไม่ทราบ', color: '#999999' }
  if (accuracy <= 10) return { label: 'แม่นยำมาก', color: '#00A86B' }
  if (accuracy <= 30) return { label: 'แม่นยำ', color: '#00A86B' }
  if (accuracy <= 100) return { label: 'ปานกลาง', color: '#F5A623' }
  return { label: 'ต่ำ', color: '#E53935' }
}

// Trigger camera
const triggerCapture = () => {
  fileInputRef.value?.click()
}

// Handle photo capture
const handlePhotoCapture = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  
  isCapturing.value = true
  
  // Get GPS while processing photo
  getGPSLocation()
  
  // Create preview
  const reader = new FileReader()
  reader.onload = (e) => {
    photoPreview.value = e.target?.result as string
    photoFile.value = file
    isCapturing.value = false
  }
  reader.readAsDataURL(file)
}

// Retake photo
const retakePhoto = () => {
  photoFile.value = null
  photoPreview.value = null
  gpsStatus.value = 'pending'
  gpsLocation.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

// Confirm and submit
const confirmPhoto = () => {
  if (photoFile.value) {
    emit('capture', photoFile.value)
  }
}

// Format GPS coordinates
const formatGPS = (lat: number, lng: number) => {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
}
</script>

<template>
  <div class="proof-capture-overlay">
    <div class="proof-capture-modal">
      <!-- Header -->
      <div class="modal-header">
        <button class="close-btn" @click="emit('cancel')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
        <h2 class="modal-title">{{ proofTitle }}</h2>
        <div class="header-spacer"></div>
      </div>
      
      <!-- Content -->
      <div class="modal-content">
        <p class="proof-description">{{ proofDescription }}</p>
        
        <!-- Hidden file input -->
        <input 
          ref="fileInputRef"
          type="file" 
          accept="image/*" 
          capture="environment"
          class="hidden-input"
          @change="handlePhotoCapture"
        />
        
        <!-- Photo Preview or Capture Area -->
        <div v-if="!photoPreview" class="capture-area" @click="triggerCapture">
          <div class="capture-icon" :class="{ 'is-loading': isCapturing }">
            <template v-if="isCapturing">
              <div class="spinner"></div>
            </template>
            <template v-else>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </template>
          </div>
          <span class="capture-text">{{ isCapturing ? 'กำลังประมวลผล...' : 'แตะเพื่อถ่ายรูป' }}</span>
          <span class="capture-hint">ใช้กล้องหลังเพื่อความชัดเจน</span>
        </div>
        
        <div v-else class="photo-preview-container">
          <img :src="photoPreview" alt="Proof photo" class="preview-image" />
          
          <!-- GPS Status Badge with Accuracy -->
          <div class="gps-badge" :class="gpsStatus">
            <svg v-if="gpsStatus === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <svg v-else-if="gpsStatus === 'error'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M15 9l-6 6M9 9l6 6"/>
            </svg>
            <div v-else class="mini-spinner"></div>
            <div class="gps-info">
              <span v-if="gpsStatus === 'success' && gpsLocation" class="gps-coords">
                {{ formatGPS(gpsLocation.lat, gpsLocation.lng) }}
              </span>
              <span v-else-if="gpsStatus === 'error'" class="gps-error-text">ไม่พบ GPS</span>
              <span v-else-if="gpsStatus === 'retrying'" class="gps-retry-text">
                ลองใหม่ ({{ gpsRetryCount }}/{{ maxGpsRetries }})...
              </span>
              <span v-else>กำลังหา GPS...</span>
              
              <!-- Accuracy indicator -->
              <span 
                v-if="gpsStatus === 'success' && gpsAccuracy" 
                class="gps-accuracy"
                :style="{ color: getAccuracyLevel(gpsAccuracy).color }"
              >
                {{ getAccuracyLevel(gpsAccuracy).label }} (±{{ Math.round(gpsAccuracy) }}m)
              </span>
            </div>
            
            <!-- Retry button for error state -->
            <button v-if="gpsStatus === 'error'" class="gps-retry-btn" @click.stop="retryGPS">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 4v6h-6"/>
                <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
              </svg>
            </button>
          </div>
          
          <!-- Timestamp Badge -->
          <div class="timestamp-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
            <span>{{ new Date().toLocaleString('th-TH') }}</span>
          </div>
          
          <!-- Retake Button -->
          <button class="retake-btn" @click="retakePhoto">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 4v6h-6"/>
              <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
            </svg>
            ถ่ายใหม่
          </button>
        </div>
        
        <!-- Tips -->
        <div class="proof-tips">
          <div class="tip-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 12l2 2 4-4"/>
              <circle cx="12" cy="12" r="10"/>
            </svg>
            <span>ถ่ายให้เห็นพัสดุชัดเจน</span>
          </div>
          <div class="tip-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 12l2 2 4-4"/>
              <circle cx="12" cy="12" r="10"/>
            </svg>
            <span v-if="proofType === 'delivery'">ถ่ายให้เห็นหน้าบ้าน/สถานที่ส่ง</span>
            <span v-else>ถ่ายให้เห็นสภาพพัสดุก่อนรับ</span>
          </div>
        </div>
      </div>
      
      <!-- Footer Actions -->
      <div class="modal-footer">
        <button class="skip-btn" @click="emit('skip')" :disabled="loading">
          ข้ามขั้นตอนนี้
        </button>
        <button 
          class="confirm-btn" 
          :disabled="!photoFile || loading"
          @click="confirmPhoto"
        >
          <span v-if="loading" class="btn-spinner"></span>
          <span v-else>ยืนยันรูปภาพ</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.proof-capture-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  padding: 0;
}

.proof-capture-modal {
  background: #FFFFFF;
  border-radius: 24px 24px 0 0;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #F0F0F0;
}

.close-btn {
  width: 40px;
  height: 40px;
  background: #F5F5F5;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #666666;
}

.close-btn svg {
  width: 20px;
  height: 20px;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0;
}

.header-spacer {
  width: 40px;
}

.modal-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.proof-description {
  font-size: 14px;
  color: #666666;
  text-align: center;
  margin: 0 0 20px;
}

.hidden-input {
  display: none;
}

.capture-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px 24px;
  background: #F8F8F8;
  border: 2px dashed #CCCCCC;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.capture-area:hover {
  border-color: #00A86B;
  background: #FAFFFE;
}

.capture-area:active {
  transform: scale(0.98);
}

.capture-icon {
  width: 72px;
  height: 72px;
  background: #E8F5EF;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00A86B;
}

.capture-icon svg {
  width: 36px;
  height: 36px;
}

.capture-icon.is-loading {
  background: #F5F5F5;
}

.capture-text {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
}

.capture-hint {
  font-size: 13px;
  color: #999999;
}

/* Photo Preview */
.photo-preview-container {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  background: #000;
}

.preview-image {
  width: 100%;
  height: 280px;
  object-fit: cover;
  display: block;
}

.gps-badge, .timestamp-badge {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 20px;
  font-size: 11px;
  color: #FFFFFF;
}

.gps-badge {
  top: 12px;
  left: 12px;
  max-width: calc(100% - 140px);
}

.gps-badge > svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.gps-badge.success > svg {
  color: #00A86B;
}

.gps-badge.error > svg {
  color: #E53935;
}

.gps-badge.retrying > svg {
  color: #F5A623;
}

.gps-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.gps-coords {
  font-size: 10px;
  opacity: 0.9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gps-accuracy {
  font-size: 10px;
  font-weight: 500;
}

.gps-error-text {
  color: #E53935;
}

.gps-retry-text {
  color: #F5A623;
}

.gps-retry-btn {
  width: 24px;
  height: 24px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin-left: 4px;
  flex-shrink: 0;
}

.gps-retry-btn svg {
  width: 12px;
  height: 12px;
  color: #FFFFFF;
}

.timestamp-badge {
  top: 12px;
  right: 12px;
}

.timestamp-badge svg {
  width: 14px;
  height: 14px;
  color: #00A86B;
}

.retake-btn {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.95);
  border: none;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
  cursor: pointer;
}

.retake-btn svg {
  width: 16px;
  height: 16px;
}

/* Tips */
.proof-tips {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 20px;
  padding: 16px;
  background: #F8FBF9;
  border-radius: 12px;
}

.tip-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #666666;
}

.tip-item svg {
  width: 18px;
  height: 18px;
  color: #00A86B;
  flex-shrink: 0;
}

/* Footer */
.modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #F0F0F0;
  background: #FFFFFF;
}

.skip-btn {
  flex: 1;
  padding: 16px;
  background: #F5F5F5;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  color: #666666;
  cursor: pointer;
}

.skip-btn:disabled {
  opacity: 0.5;
}

.confirm-btn {
  flex: 2;
  padding: 16px;
  background: #00A86B;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  color: #FFFFFF;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.confirm-btn:disabled {
  background: #CCCCCC;
  box-shadow: none;
}

/* Spinners */
.spinner, .mini-spinner, .btn-spinner {
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner {
  width: 32px;
  height: 32px;
  border-width: 3px;
  border-top-color: #00A86B;
}

.mini-spinner {
  width: 14px;
  height: 14px;
  border-top-color: #FFFFFF;
}

.btn-spinner {
  width: 20px;
  height: 20px;
  border-top-color: #FFFFFF;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>

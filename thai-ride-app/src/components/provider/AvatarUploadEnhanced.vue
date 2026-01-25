<script setup lang="ts">
/**
 * AvatarUploadEnhanced - Enhanced Avatar Upload with Cropper
 * 
 * Features:
 * - Image Cropper (circular crop)
 * - Camera Capture
 * - Avatar Presets
 * - Drag & Drop
 */
import { ref, onUnmounted } from 'vue'
import { useProviderMedia } from '../../composables/useProviderMedia'

interface Props {
  currentAvatar?: string | null
}

interface Emits {
  (e: 'uploaded', url: string): void
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const {
  isUploading,
  uploadProgress,
  error,
  uploadAvatar
} = useProviderMedia()

// Tabs
type TabType = 'upload' | 'camera' | 'presets'
const activeTab = ref<TabType>('upload')

// Upload state
const fileInput = ref<HTMLInputElement | null>(null)
const dragOver = ref(false)

// Cropper state
const showCropper = ref(false)
const originalImage = ref<string | null>(null)
const cropperCanvas = ref<HTMLCanvasElement | null>(null)
const cropperImage = ref<HTMLImageElement | null>(null)

// Crop area
const cropArea = ref({ x: 0, y: 0, size: 200 })
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })

// Camera state
const videoRef = ref<HTMLVideoElement | null>(null)
const cameraStream = ref<MediaStream | null>(null)
const cameraError = ref<string | null>(null)
const cameraReady = ref(false)

// Avatar presets
const avatarPresets = [
  { id: 'driver-1', emoji: '🚗', bg: '#E3F2FD' },
  { id: 'driver-2', emoji: '🚕', bg: '#FFF3E0' },
  { id: 'driver-3', emoji: '🏍️', bg: '#E8F5E9' },
  { id: 'driver-4', emoji: '🛵', bg: '#FCE4EC' },
  { id: 'driver-5', emoji: '🚐', bg: '#F3E5F5' },
  { id: 'driver-6', emoji: '🚚', bg: '#E0F7FA' },
  { id: 'man-1', emoji: '👨', bg: '#FFECB3' },
  { id: 'man-2', emoji: '👨‍✈️', bg: '#B3E5FC' },
  { id: 'woman-1', emoji: '👩', bg: '#F8BBD9' },
  { id: 'woman-2', emoji: '👩‍✈️', bg: '#C8E6C9' },
  { id: 'person-1', emoji: '🧑', bg: '#D7CCC8' },
  { id: 'person-2', emoji: '🧑‍💼', bg: '#CFD8DC' }
]

// Handle file selection
function handleFileSelect(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) processFile(file)
}

// Handle drag & drop
function handleDrop(event: DragEvent): void {
  event.preventDefault()
  dragOver.value = false
  const file = event.dataTransfer?.files[0]
  if (file && file.type.startsWith('image/')) {
    processFile(file)
  }
}

function handleDragOver(event: DragEvent): void {
  event.preventDefault()
  dragOver.value = true
}

function handleDragLeave(): void {
  dragOver.value = false
}

// Process selected file
function processFile(file: File): void {
  if (!file.type.startsWith('image/')) {
    return
  }
  
  const reader = new FileReader()
  reader.onload = (e) => {
    originalImage.value = e.target?.result as string
    showCropper.value = true
    initCropper()
  }
  reader.readAsDataURL(file)
}

// Initialize cropper
function initCropper(): void {
  setTimeout(() => {
    if (!cropperImage.value || !cropperCanvas.value) return
    
    const img = cropperImage.value
    img.onload = () => {
      const canvas = cropperCanvas.value!
      const ctx = canvas.getContext('2d')!
      
      // Set canvas size
      const maxSize = Math.min(window.innerWidth - 48, 400)
      const scale = maxSize / Math.max(img.width, img.height)
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      
      // Draw image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      
      // Center crop area
      const size = Math.min(canvas.width, canvas.height) * 0.8
      cropArea.value = {
        x: (canvas.width - size) / 2,
        y: (canvas.height - size) / 2,
        size
      }
      
      drawCropOverlay()
    }
  }, 100)
}

// Draw crop overlay
function drawCropOverlay(): void {
  if (!cropperCanvas.value) return
  
  const canvas = cropperCanvas.value
  const ctx = canvas.getContext('2d')!
  const img = cropperImage.value!
  
  // Redraw image
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  
  // Draw dark overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  // Cut out circle
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath()
  const centerX = cropArea.value.x + cropArea.value.size / 2
  const centerY = cropArea.value.y + cropArea.value.size / 2
  ctx.arc(centerX, centerY, cropArea.value.size / 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  
  // Draw circle border
  ctx.strokeStyle = '#00A86B'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(centerX, centerY, cropArea.value.size / 2, 0, Math.PI * 2)
  ctx.stroke()
}

// Handle crop area drag
function startDrag(event: MouseEvent | TouchEvent): void {
  isDragging.value = true
  const pos = getEventPosition(event)
  dragStart.value = { x: pos.x - cropArea.value.x, y: pos.y - cropArea.value.y }
}

function onDrag(event: MouseEvent | TouchEvent): void {
  if (!isDragging.value || !cropperCanvas.value) return
  
  const pos = getEventPosition(event)
  const canvas = cropperCanvas.value
  
  let newX = pos.x - dragStart.value.x
  let newY = pos.y - dragStart.value.y
  
  // Constrain to canvas
  newX = Math.max(0, Math.min(newX, canvas.width - cropArea.value.size))
  newY = Math.max(0, Math.min(newY, canvas.height - cropArea.value.size))
  
  cropArea.value.x = newX
  cropArea.value.y = newY
  
  drawCropOverlay()
}

function endDrag(): void {
  isDragging.value = false
}

function getEventPosition(event: MouseEvent | TouchEvent): { x: number; y: number } {
  const canvas = cropperCanvas.value!
  const rect = canvas.getBoundingClientRect()
  
  if ('touches' in event) {
    return {
      x: event.touches[0].clientX - rect.left,
      y: event.touches[0].clientY - rect.top
    }
  }
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  }
}

// Crop and upload
async function cropAndUpload(): Promise<void> {
  if (!cropperImage.value || !cropperCanvas.value) return
  
  const img = cropperImage.value
  const canvas = cropperCanvas.value
  
  // Create output canvas (circular crop)
  const outputCanvas = document.createElement('canvas')
  const outputSize = 400
  outputCanvas.width = outputSize
  outputCanvas.height = outputSize
  const ctx = outputCanvas.getContext('2d')!
  
  // Calculate source coordinates
  const scaleX = img.width / canvas.width
  const scaleY = img.height / canvas.height
  const srcX = cropArea.value.x * scaleX
  const srcY = cropArea.value.y * scaleY
  const srcSize = cropArea.value.size * Math.max(scaleX, scaleY)
  
  // Draw circular crop
  ctx.beginPath()
  ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()
  
  ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, outputSize, outputSize)
  
  // Convert to blob
  outputCanvas.toBlob(async (blob) => {
    if (!blob) return
    
    const file = new File([blob], 'avatar.webp', { type: 'image/webp' })
    const result = await uploadAvatar(file)
    
    if (result.success && result.url) {
      emit('uploaded', result.url)
      emit('close')
    }
  }, 'image/webp', 0.9)
}

// Camera functions
async function startCamera(): Promise<void> {
  cameraError.value = null
  cameraReady.value = false
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: 640, height: 480 }
    })
    
    cameraStream.value = stream
    
    if (videoRef.value) {
      videoRef.value.srcObject = stream
      videoRef.value.onloadedmetadata = () => {
        videoRef.value?.play()
        cameraReady.value = true
      }
    }
  } catch (err) {
    console.error('[Camera] Error:', err)
    cameraError.value = 'ไม่สามารถเข้าถึงกล้องได้'
  }
}

function stopCamera(): void {
  if (cameraStream.value) {
    cameraStream.value.getTracks().forEach(track => track.stop())
    cameraStream.value = null
  }
  cameraReady.value = false
}

function capturePhoto(): void {
  if (!videoRef.value || !cameraReady.value) return
  
  const video = videoRef.value
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(video, 0, 0)
  
  originalImage.value = canvas.toDataURL('image/jpeg')
  stopCamera()
  showCropper.value = true
  initCropper()
}

// Select preset avatar
async function selectPreset(preset: typeof avatarPresets[0]): Promise<void> {
  // Create canvas with emoji
  const canvas = document.createElement('canvas')
  canvas.width = 400
  canvas.height = 400
  const ctx = canvas.getContext('2d')!
  
  // Draw background
  ctx.fillStyle = preset.bg
  ctx.beginPath()
  ctx.arc(200, 200, 200, 0, Math.PI * 2)
  ctx.fill()
  
  // Draw emoji
  ctx.font = '180px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(preset.emoji, 200, 210)
  
  // Convert to blob and upload
  canvas.toBlob(async (blob) => {
    if (!blob) return
    
    const file = new File([blob], 'avatar.webp', { type: 'image/webp' })
    const result = await uploadAvatar(file)
    
    if (result.success && result.url) {
      emit('uploaded', result.url)
      emit('close')
    }
  }, 'image/webp', 0.9)
}

// Cancel cropper
function cancelCrop(): void {
  showCropper.value = false
  originalImage.value = null
  if (fileInput.value) fileInput.value.value = ''
}

// Tab change
function changeTab(tab: TabType): void {
  if (activeTab.value === 'camera') {
    stopCamera()
  }
  activeTab.value = tab
  if (tab === 'camera') {
    startCamera()
  }
}

// Cleanup
onUnmounted(() => {
  stopCamera()
})
</script>

<template>
  <div class="avatar-upload-enhanced">
    <!-- Tabs -->
    <div class="tabs">
      <button 
        class="tab" 
        :class="{ active: activeTab === 'upload' }"
        @click="changeTab('upload')"
      >
        <span class="tab-icon">📁</span>
        อัพโหลด
      </button>
      <button 
        class="tab" 
        :class="{ active: activeTab === 'camera' }"
        @click="changeTab('camera')"
      >
        <span class="tab-icon">📷</span>
        ถ่ายรูป
      </button>
      <button 
        class="tab" 
        :class="{ active: activeTab === 'presets' }"
        @click="changeTab('presets')"
      >
        <span class="tab-icon">😊</span>
        เลือกรูป
      </button>
    </div>

    <!-- Upload Tab -->
    <div v-if="activeTab === 'upload' && !showCropper" class="tab-content">
      <div 
        class="drop-zone"
        :class="{ 'drag-over': dragOver }"
        @drop="handleDrop"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @click="fileInput?.click()"
      >
        <div class="drop-icon">📸</div>
        <p class="drop-text">ลากรูปมาวางที่นี่</p>
        <p class="drop-hint">หรือคลิกเพื่อเลือกไฟล์</p>
        <input
          ref="fileInput"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="hidden"
          @change="handleFileSelect"
        />
      </div>
    </div>

    <!-- Camera Tab -->
    <div v-if="activeTab === 'camera' && !showCropper" class="tab-content">
      <div class="camera-container">
        <video 
          ref="videoRef" 
          class="camera-video"
          :class="{ ready: cameraReady }"
          playsinline
          autoplay
          muted
        ></video>
        
        <div v-if="!cameraReady && !cameraError" class="camera-loading">
          <div class="spinner"></div>
          <p>กำลังเปิดกล้อง...</p>
        </div>
        
        <div v-if="cameraError" class="camera-error">
          <span class="error-icon">⚠️</span>
          <p>{{ cameraError }}</p>
          <button class="retry-btn" @click="startCamera">ลองใหม่</button>
        </div>
        
        <div v-if="cameraReady" class="camera-overlay">
          <div class="camera-circle"></div>
        </div>
      </div>
      
      <button 
        v-if="cameraReady"
        class="capture-btn"
        @click="capturePhoto"
      >
        <span class="capture-icon">📸</span>
        ถ่ายรูป
      </button>
    </div>

    <!-- Presets Tab -->
    <div v-if="activeTab === 'presets' && !showCropper" class="tab-content">
      <p class="presets-hint">เลือก Avatar สำเร็จรูป</p>
      <div class="presets-grid">
        <button
          v-for="preset in avatarPresets"
          :key="preset.id"
          class="preset-item"
          :style="{ backgroundColor: preset.bg }"
          :disabled="isUploading"
          @click="selectPreset(preset)"
        >
          <span class="preset-emoji">{{ preset.emoji }}</span>
        </button>
      </div>
    </div>

    <!-- Cropper -->
    <div v-if="showCropper" class="cropper-container">
      <p class="cropper-hint">ลากเพื่อปรับตำแหน่ง</p>
      
      <div class="cropper-wrapper">
        <img 
          ref="cropperImage"
          :src="originalImage!"
          class="cropper-source"
          crossorigin="anonymous"
        />
        <canvas
          ref="cropperCanvas"
          class="cropper-canvas"
          @mousedown="startDrag"
          @mousemove="onDrag"
          @mouseup="endDrag"
          @mouseleave="endDrag"
          @touchstart="startDrag"
          @touchmove="onDrag"
          @touchend="endDrag"
        ></canvas>
      </div>
      
      <div class="cropper-actions">
        <button class="btn-cancel" :disabled="isUploading" @click="cancelCrop">
          ยกเลิก
        </button>
        <button class="btn-confirm" :disabled="isUploading" @click="cropAndUpload">
          <span v-if="isUploading" class="spinner-small"></span>
          <span v-else>ใช้รูปนี้</span>
        </button>
      </div>
    </div>

    <!-- Progress -->
    <div v-if="isUploading" class="upload-progress">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: `${uploadProgress}%` }"></div>
      </div>
      <span class="progress-text">กำลังอัพโหลด {{ uploadProgress }}%</span>
    </div>

    <!-- Error -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<style scoped>
.avatar-upload-enhanced {
  padding: 16px;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  background: #F5F5F5;
  border: 2px solid transparent;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.tab.active {
  background: #E8F5EF;
  border-color: #00A86B;
  color: #00A86B;
}

.tab-icon {
  font-size: 20px;
}

/* Drop Zone */
.drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  border: 2px dashed #DDD;
  border-radius: 16px;
  background: #FAFAFA;
  cursor: pointer;
  transition: all 0.2s;
}

.drop-zone.drag-over {
  border-color: #00A86B;
  background: #E8F5EF;
}

.drop-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.drop-text {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 4px 0;
}

.drop-hint {
  font-size: 13px;
  color: #888;
  margin: 0;
}

.hidden {
  display: none;
}

/* Camera */
.camera-container {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  max-width: 320px;
  margin: 0 auto;
  border-radius: 16px;
  overflow: hidden;
  background: #000;
}

.camera-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.3s;
}

.camera-video.ready {
  opacity: 1;
}

.camera-loading,
.camera-error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #1a1a1a;
  color: #fff;
}

.camera-error {
  gap: 12px;
}

.error-icon {
  font-size: 40px;
}

.retry-btn {
  padding: 8px 20px;
  background: #00A86B;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.camera-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.camera-circle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  height: 80%;
  border: 3px solid #00A86B;
  border-radius: 50%;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.4);
}

.capture-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  max-width: 320px;
  margin: 16px auto 0;
  padding: 14px;
  background: #00A86B;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.capture-icon {
  font-size: 20px;
}

/* Presets */
.presets-hint {
  text-align: center;
  font-size: 14px;
  color: #666;
  margin: 0 0 16px 0;
}

.presets-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.preset-item {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid transparent;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-item:hover {
  transform: scale(1.1);
  border-color: #00A86B;
}

.preset-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.preset-emoji {
  font-size: 32px;
}

/* Cropper */
.cropper-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.cropper-hint {
  font-size: 14px;
  color: #666;
  margin: 0 0 12px 0;
}

.cropper-wrapper {
  position: relative;
  max-width: 100%;
}

.cropper-source {
  display: none;
}

.cropper-canvas {
  max-width: 100%;
  border-radius: 12px;
  cursor: move;
  touch-action: none;
}

.cropper-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  width: 100%;
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  padding: 14px;
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

.btn-cancel {
  background: #F5F5F5;
  color: #666;
}

.btn-confirm {
  background: #00A86B;
  color: #fff;
}

.btn-confirm:disabled,
.btn-cancel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Progress */
.upload-progress {
  margin-top: 16px;
  text-align: center;
}

.progress-bar {
  height: 6px;
  background: #E5E5E5;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: #00A86B;
  transition: width 0.3s;
}

.progress-text {
  font-size: 13px;
  color: #666;
}

/* Error */
.error-message {
  margin-top: 16px;
  padding: 12px;
  background: #FFEBEE;
  color: #D32F2F;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
}

/* Spinner */
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner-small {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 360px) {
  .presets-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .preset-emoji {
    font-size: 28px;
  }
}
</style>

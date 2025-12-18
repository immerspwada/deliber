<script setup lang="ts">
/**
 * Feature: F03c - Signature Capture for Delivery
 * Component for recipient to sign on screen as proof of delivery
 * MUNEEF Style UI
 */
import { ref, onMounted, onUnmounted } from 'vue'

interface Props {
  recipientName?: string
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  recipientName: '',
  loading: false
})

const emit = defineEmits<{
  'confirm': [signature: string, signerName: string]
  'skip': []
  'cancel': []
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const ctx = ref<CanvasRenderingContext2D | null>(null)
const isDrawing = ref(false)
const hasSignature = ref(false)
const signerName = ref(props.recipientName)

// Canvas setup
onMounted(() => {
  if (canvasRef.value) {
    ctx.value = canvasRef.value.getContext('2d')
    setupCanvas()
    window.addEventListener('resize', setupCanvas)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', setupCanvas)
})

const setupCanvas = () => {
  if (!canvasRef.value || !ctx.value) return
  
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  
  // Set canvas size to match display size
  canvas.width = rect.width * 2
  canvas.height = rect.height * 2
  
  // Scale context for retina displays
  ctx.value.scale(2, 2)
  
  // Set drawing style
  ctx.value.strokeStyle = '#1A1A1A'
  ctx.value.lineWidth = 2.5
  ctx.value.lineCap = 'round'
  ctx.value.lineJoin = 'round'
}

// Get position from event
const getPosition = (e: MouseEvent | TouchEvent) => {
  if (!canvasRef.value) return { x: 0, y: 0 }
  
  const rect = canvasRef.value.getBoundingClientRect()
  
  if ('touches' in e && e.touches[0]) {
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top
    }
  }
  
  return {
    x: (e as MouseEvent).clientX - rect.left,
    y: (e as MouseEvent).clientY - rect.top
  }
}

// Drawing handlers
const startDrawing = (e: MouseEvent | TouchEvent) => {
  e.preventDefault()
  isDrawing.value = true
  hasSignature.value = true
  
  const pos = getPosition(e)
  ctx.value?.beginPath()
  ctx.value?.moveTo(pos.x, pos.y)
}

const draw = (e: MouseEvent | TouchEvent) => {
  if (!isDrawing.value || !ctx.value) return
  e.preventDefault()
  
  const pos = getPosition(e)
  ctx.value.lineTo(pos.x, pos.y)
  ctx.value.stroke()
}

const stopDrawing = () => {
  isDrawing.value = false
}

// Clear signature
const clearSignature = () => {
  if (!canvasRef.value || !ctx.value) return
  
  ctx.value.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  hasSignature.value = false
}

// Get signature as base64
const getSignatureData = (): string => {
  if (!canvasRef.value) return ''
  return canvasRef.value.toDataURL('image/png')
}

// Confirm signature
const confirmSignature = () => {
  if (!hasSignature.value) return
  
  const signatureData = getSignatureData()
  emit('confirm', signatureData, signerName.value)
}

// Haptic feedback
const triggerHaptic = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(10)
  }
}
</script>

<template>
  <div class="signature-overlay">
    <div class="signature-modal">
      <!-- Header -->
      <div class="modal-header">
        <button class="close-btn" @click="emit('cancel')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
        <h2 class="modal-title">ลายเซ็นผู้รับ</h2>
        <div class="header-spacer"></div>
      </div>
      
      <!-- Content -->
      <div class="modal-content">
        <p class="signature-description">ให้ผู้รับเซ็นชื่อเพื่อยืนยันการรับพัสดุ</p>
        
        <!-- Signer Name Input -->
        <div class="name-input-section">
          <label class="input-label">ชื่อผู้รับ</label>
          <input 
            v-model="signerName"
            type="text"
            placeholder="กรอกชื่อผู้รับพัสดุ"
            class="name-input"
          />
        </div>
        
        <!-- Signature Canvas -->
        <div class="canvas-container">
          <canvas
            ref="canvasRef"
            class="signature-canvas"
            @mousedown="startDrawing"
            @mousemove="draw"
            @mouseup="stopDrawing"
            @mouseleave="stopDrawing"
            @touchstart="startDrawing"
            @touchmove="draw"
            @touchend="stopDrawing"
          />
          
          <!-- Placeholder text -->
          <div v-if="!hasSignature" class="canvas-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
            </svg>
            <span>เซ็นชื่อที่นี่</span>
          </div>
          
          <!-- Clear button -->
          <button 
            v-if="hasSignature" 
            class="clear-btn"
            @click="clearSignature; triggerHaptic()"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            ล้าง
          </button>
        </div>
        
        <!-- Tips -->
        <div class="signature-tips">
          <div class="tip-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
            <span>ใช้นิ้วหรือปากกา stylus เซ็นบนหน้าจอ</span>
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
          :disabled="!hasSignature || !signerName.trim() || loading"
          @click="confirmSignature"
        >
          <span v-if="loading" class="btn-spinner"></span>
          <span v-else>ยืนยันลายเซ็น</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.signature-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}

.signature-modal {
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

.signature-description {
  font-size: 14px;
  color: #666666;
  text-align: center;
  margin: 0 0 20px;
}

/* Name Input */
.name-input-section {
  margin-bottom: 16px;
}

.input-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #666666;
  margin-bottom: 8px;
}

.name-input {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 15px;
  color: #1A1A1A;
  outline: none;
  transition: border-color 0.2s ease;
}

.name-input:focus {
  border-color: #00A86B;
}

.name-input::placeholder {
  color: #999999;
}

/* Canvas Container */
.canvas-container {
  position: relative;
  background: #FAFAFA;
  border: 2px solid #E8E8E8;
  border-radius: 16px;
  overflow: hidden;
}

.signature-canvas {
  width: 100%;
  height: 200px;
  display: block;
  touch-action: none;
  cursor: crosshair;
}

.canvas-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  pointer-events: none;
  color: #CCCCCC;
}

.canvas-placeholder svg {
  width: 48px;
  height: 48px;
}

.canvas-placeholder span {
  font-size: 14px;
}

.clear-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #E8E8E8;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  color: #666666;
  cursor: pointer;
}

.clear-btn svg {
  width: 14px;
  height: 14px;
}

/* Tips */
.signature-tips {
  margin-top: 16px;
  padding: 12px 16px;
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

.btn-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid transparent;
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>

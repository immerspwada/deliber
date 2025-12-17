<script setup lang="ts">
/**
 * Feature: F269 - Signature Pad
 * Canvas-based signature capture
 */
import { ref, onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  width?: number
  height?: number
  strokeColor?: string
  strokeWidth?: number
  label?: string
}>(), {
  width: 300,
  height: 150,
  strokeColor: '#000',
  strokeWidth: 2
})

const emit = defineEmits<{
  'save': [dataUrl: string]
  'clear': []
}>()

const canvasRef = ref<HTMLCanvasElement>()
const isDrawing = ref(false)
const hasSignature = ref(false)
let ctx: CanvasRenderingContext2D | null = null

onMounted(() => {
  if (canvasRef.value) {
    ctx = canvasRef.value.getContext('2d')
    if (ctx) {
      ctx.strokeStyle = props.strokeColor
      ctx.lineWidth = props.strokeWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }
  }
})

const getCoords = (e: MouseEvent | TouchEvent) => {
  const canvas = canvasRef.value
  if (!canvas) return { x: 0, y: 0 }
  
  const rect = canvas.getBoundingClientRect()
  if ('touches' in e && e.touches[0]) {
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top
    }
  }
  if ('clientX' in e) {
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }
  return { x: 0, y: 0 }
}

const startDrawing = (e: MouseEvent | TouchEvent) => {
  if (!ctx) return
  isDrawing.value = true
  const { x, y } = getCoords(e)
  ctx.beginPath()
  ctx.moveTo(x, y)
}

const draw = (e: MouseEvent | TouchEvent) => {
  if (!isDrawing.value || !ctx) return
  e.preventDefault()
  const { x, y } = getCoords(e)
  ctx.lineTo(x, y)
  ctx.stroke()
  hasSignature.value = true
}

const stopDrawing = () => {
  isDrawing.value = false
}

const clear = () => {
  if (!ctx || !canvasRef.value) return
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  hasSignature.value = false
  emit('clear')
}

const save = () => {
  if (!canvasRef.value || !hasSignature.value) return
  const dataUrl = canvasRef.value.toDataURL('image/png')
  emit('save', dataUrl)
}

onUnmounted(() => {
  ctx = null
})
</script>

<template>
  <div class="signature-pad">
    <label v-if="label" class="label">{{ label }}</label>
    
    <div class="canvas-wrapper">
      <canvas
        ref="canvasRef"
        :width="width"
        :height="height"
        class="canvas"
        @mousedown="startDrawing"
        @mousemove="draw"
        @mouseup="stopDrawing"
        @mouseleave="stopDrawing"
        @touchstart="startDrawing"
        @touchmove="draw"
        @touchend="stopDrawing"
      />
      
      <div v-if="!hasSignature" class="placeholder">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
        </svg>
        <span>ลงลายเซ็นที่นี่</span>
      </div>
    </div>
    
    <div class="actions">
      <button type="button" class="btn-clear" :disabled="!hasSignature" @click="clear">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
        </svg>
        ล้าง
      </button>
      <button type="button" class="btn-save" :disabled="!hasSignature" @click="save">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
          <polyline points="17,21 17,13 7,13 7,21"/>
          <polyline points="7,3 7,8 15,8"/>
        </svg>
        บันทึก
      </button>
    </div>
  </div>
</template>

<style scoped>
.signature-pad {
  width: fit-content;
}

.label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #000;
  margin-bottom: 8px;
}

.canvas-wrapper {
  position: relative;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.canvas {
  display: block;
  cursor: crosshair;
  touch-action: none;
}

.placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #ccc;
  pointer-events: none;
}

.placeholder span {
  font-size: 13px;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.btn-clear,
.btn-save {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-clear {
  background: #f6f6f6;
  color: #000;
  border: none;
}

.btn-clear:hover:not(:disabled) {
  background: #e5e5e5;
}

.btn-save {
  background: #000;
  color: #fff;
  border: none;
}

.btn-save:hover:not(:disabled) {
  background: #333;
}

.btn-clear:disabled,
.btn-save:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>

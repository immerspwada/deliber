<script setup lang="ts">
/**
 * Feature: F270 - QR Code Display
 * Display QR code with optional actions
 */
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  value: string
  size?: number
  title?: string
  subtitle?: string
  showCopy?: boolean
  showShare?: boolean
  showDownload?: boolean
}>(), {
  size: 200,
  showCopy: true,
  showShare: false,
  showDownload: false
})

const emit = defineEmits<{
  'copy': []
  'share': []
  'download': []
}>()

// Generate simple QR code pattern (placeholder - in real app use qrcode library)
const qrPattern = computed((): boolean[][] => {
  const modules: boolean[][] = []
  const qrSize = 21 // QR code version 1
  
  // Generate pseudo-random pattern based on value
  for (let i = 0; i < qrSize; i++) {
    modules[i] = []
    for (let j = 0; j < qrSize; j++) {
      // Position patterns (corners)
      if ((i < 7 && j < 7) || (i < 7 && j >= qrSize - 7) || (i >= qrSize - 7 && j < 7)) {
        const isOuter = i === 0 || i === 6 || j === 0 || j === 6 || 
                       (i >= qrSize - 7 && (i === qrSize - 7 || i === qrSize - 1)) ||
                       (j >= qrSize - 7 && (j === qrSize - 7 || j === qrSize - 1))
        const isInner = (i >= 2 && i <= 4 && j >= 2 && j <= 4) ||
                       (i >= 2 && i <= 4 && j >= qrSize - 5 && j <= qrSize - 3) ||
                       (i >= qrSize - 5 && i <= qrSize - 3 && j >= 2 && j <= 4)
        modules[i]![j] = isOuter || isInner
      } else {
        // Data pattern (pseudo-random based on value)
        const hash = props.value.charCodeAt((i * qrSize + j) % props.value.length) || 0
        modules[i]![j] = (hash + i + j) % 3 === 0
      }
    }
  }
  return modules
})

const copyValue = async () => {
  try {
    await navigator.clipboard.writeText(props.value)
    emit('copy')
  } catch {
    // Fallback
  }
}

const shareValue = async () => {
  if (navigator.share) {
    try {
      await navigator.share({ text: props.value })
      emit('share')
    } catch {
      // User cancelled
    }
  }
}

const downloadQR = () => {
  emit('download')
}
</script>

<template>
  <div class="qr-display">
    <div v-if="title" class="header">
      <h3 class="title">{{ title }}</h3>
      <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
    </div>
    
    <div class="qr-wrapper" :style="{ width: size + 'px', height: size + 'px' }">
      <svg :width="size" :height="size" viewBox="0 0 25 25">
        <rect width="25" height="25" fill="#fff"/>
        <template v-for="(row, i) in qrPattern" :key="i">
          <rect
            v-for="(cell, j) in (row || [])"
            v-show="cell"
            :key="j"
            :x="j + 2"
            :y="i + 2"
            width="1"
            height="1"
            fill="#000"
          />
        </template>
      </svg>
    </div>
    
    <div class="value-display">
      <span class="value">{{ value }}</span>
    </div>
    
    <div class="actions">
      <button v-if="showCopy" type="button" class="action-btn" @click="copyValue">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
        </svg>
        คัดลอก
      </button>
      
      <button v-if="showShare" type="button" class="action-btn" @click="shareValue">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="18" cy="5" r="3"/>
          <circle cx="6" cy="12" r="3"/>
          <circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
        แชร์
      </button>
      
      <button v-if="showDownload" type="button" class="action-btn" @click="downloadQR">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="7,10 12,15 17,10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        ดาวน์โหลด
      </button>
    </div>
  </div>
</template>

<style scoped>
.qr-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
}

.header {
  text-align: center;
  margin-bottom: 20px;
}

.title {
  font-size: 18px;
  font-weight: 600;
  color: #000;
  margin: 0 0 4px;
}

.subtitle {
  font-size: 14px;
  color: #6b6b6b;
  margin: 0;
}

.qr-wrapper {
  padding: 16px;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
}

.value-display {
  margin-top: 16px;
  padding: 8px 16px;
  background: #f6f6f6;
  border-radius: 8px;
  max-width: 100%;
  overflow: hidden;
}

.value {
  font-size: 13px;
  font-family: monospace;
  color: #6b6b6b;
  word-break: break-all;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 20px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: #f6f6f6;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #000;
  cursor: pointer;
  transition: background 0.2s;
}

.action-btn:hover {
  background: #e5e5e5;
}
</style>

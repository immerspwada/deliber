<script setup lang="ts">
/**
 * Component: RideHeader
 * แสดง header พร้อมจุดรับและปุ่มกลับ
 * Enhanced UX: Haptic feedback, better touch targets, smooth animations
 */
import { ref } from 'vue'
import type { GeoLocation } from '../../composables/useLocation'

defineProps<{
  pickup: GeoLocation | null
  isGettingLocation: boolean
}>()

const emit = defineEmits<{
  back: []
  refresh: []
}>()

// Haptic feedback helper
function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'light'): void {
  if ('vibrate' in navigator) {
    const patterns = { light: 10, medium: 20, heavy: 30 }
    navigator.vibrate(patterns[style])
  }
}

// Button press states for visual feedback
const isBackPressed = ref(false)
const isRefreshPressed = ref(false)

function handleBack(): void {
  triggerHaptic('light')
  isBackPressed.value = true
  setTimeout(() => {
    isBackPressed.value = false
    emit('back')
  }, 100)
}

function handleRefresh(): void {
  triggerHaptic('medium')
  isRefreshPressed.value = true
  setTimeout(() => {
    isRefreshPressed.value = false
    emit('refresh')
  }, 100)
}
</script>

<template>
  <div class="header-section">
    <div class="header-row">
      <button 
        class="back-btn" 
        :class="{ pressed: isBackPressed }"
        @click="handleBack" 
        aria-label="กลับ"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>
      
      <div class="pickup-display">
        <div class="pickup-dot" :class="{ pulsing: isGettingLocation }"></div>
        <div class="pickup-info">
          <span class="pickup-label">จุดรับ</span>
          <Transition name="fade-slide" mode="out-in">
            <span v-if="pickup?.address" :key="pickup.address" class="pickup-address">
              {{ pickup.address }}
            </span>
            <span v-else key="loading" class="pickup-address loading">
              <span class="loading-dots">กำลังหาตำแหน่ง</span>
            </span>
          </Transition>
        </div>
        <button 
          v-if="isGettingLocation" 
          class="refresh-btn" 
          disabled
          aria-label="กำลังโหลด"
        >
          <svg class="spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 11-6.219-8.56" />
          </svg>
        </button>
        <button 
          v-else 
          class="refresh-btn" 
          :class="{ pressed: isRefreshPressed }"
          @click="handleRefresh"
          aria-label="รีเฟรชตำแหน่ง"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.header-section {
  background: linear-gradient(135deg, #00a86b 0%, #00875a 100%);
  padding: 12px 16px;
  padding-top: calc(12px + env(safe-area-inset-top));
}

.header-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
  flex-shrink: 0;
}

.back-btn:active,
.back-btn.pressed {
  background: rgba(255, 255, 255, 0.35);
  transform: scale(0.92);
}

.pickup-display {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 14px;
  padding: 12px 14px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  min-width: 0;
}

.pickup-dot {
  width: 14px;
  height: 14px;
  background: #fff;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
}

.pickup-dot.pulsing {
  animation: pulse-dot 1.5s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { 
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3);
    transform: scale(1);
  }
  50% { 
    box-shadow: 0 0 0 6px rgba(255, 255, 255, 0.1);
    transform: scale(1.1);
  }
}

.pickup-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 2px;
}

.pickup-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.pickup-address {
  font-size: 14px;
  color: #fff;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pickup-address.loading {
  opacity: 0.8;
}

.loading-dots::after {
  content: '';
  animation: loading-dots 1.5s infinite;
}

@keyframes loading-dots {
  0% { content: ''; }
  25% { content: '.'; }
  50% { content: '..'; }
  75% { content: '...'; }
}

.refresh-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.refresh-btn:active:not(:disabled),
.refresh-btn.pressed {
  background: rgba(255, 255, 255, 0.35);
  transform: scale(0.92);
}

.refresh-btn:disabled {
  opacity: 0.7;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Fade slide transition */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>

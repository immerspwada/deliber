<script setup lang="ts">
/**
 * Component: RideSearchingView
 * แสดงหน้าจอกำลังหาคนขับ
 */
defineProps<{
  searchingSeconds: number
}>()

const emit = defineEmits<{
  cancel: []
}>()

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="searching-view">
    <div class="searching-content">
      <!-- Animated pulse -->
      <div class="pulse-container">
        <div class="pulse-ring"></div>
        <div class="pulse-ring delay"></div>
        <div class="pulse-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 17h14v-5l-2-5H7l-2 5v5z" />
            <circle cx="7" cy="17" r="2" />
            <circle cx="17" cy="17" r="2" />
          </svg>
        </div>
      </div>
      
      <h2 class="searching-title">กำลังหาคนขับ</h2>
      <p class="searching-time">{{ formatTime(searchingSeconds) }}</p>
      <p class="searching-hint">โปรดรอสักครู่...</p>
      
      <!-- Progress dots -->
      <div class="progress-dots">
        <span class="dot" :class="{ active: searchingSeconds % 4 === 0 }"></span>
        <span class="dot" :class="{ active: searchingSeconds % 4 === 1 }"></span>
        <span class="dot" :class="{ active: searchingSeconds % 4 === 2 }"></span>
        <span class="dot" :class="{ active: searchingSeconds % 4 === 3 }"></span>
      </div>
      
      <button class="cancel-btn" @click="emit('cancel')">
        ยกเลิก
      </button>
    </div>
  </div>
</template>

<style scoped>
.searching-view {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  padding: 20px;
}

.searching-content {
  text-align: center;
  max-width: 300px;
}

/* Pulse Animation */
.pulse-container {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto 24px;
}

.pulse-ring {
  position: absolute;
  inset: 0;
  border: 3px solid #00a86b;
  border-radius: 50%;
  animation: pulse-ring 2s ease-out infinite;
}

.pulse-ring.delay {
  animation-delay: 1s;
}

@keyframes pulse-ring {
  0% {
    transform: scale(0.5);
    opacity: 1;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

.pulse-center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e8f5ef;
  border-radius: 50%;
  color: #00a86b;
}

/* Text */
.searching-title {
  font-size: 22px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.searching-time {
  font-size: 36px;
  font-weight: 700;
  color: #00a86b;
  margin-bottom: 8px;
  font-variant-numeric: tabular-nums;
}

.searching-hint {
  font-size: 14px;
  color: #666;
  margin-bottom: 24px;
}

/* Progress Dots */
.progress-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 32px;
}

.progress-dots .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e0e0e0;
  transition: all 0.3s ease;
}

.progress-dots .dot.active {
  background: #00a86b;
  transform: scale(1.3);
}

/* Cancel Button */
.cancel-btn {
  padding: 14px 40px;
  background: #f5f5f5;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn:active {
  background: #e8e8e8;
  transform: scale(0.98);
}
</style>

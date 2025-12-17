<script setup lang="ts">
/**
 * Feature: F179 - Searching Driver Card
 * Display searching for driver animation
 */

interface Props {
  vehicleType: string
  estimatedWait?: string
  searchRadius?: string
}

withDefaults(defineProps<Props>(), {
  estimatedWait: '2-5 นาที',
  searchRadius: '3 กม.'
})

const emit = defineEmits<{
  cancel: []
}>()
</script>

<template>
  <div class="searching-driver-card">
    <div class="search-animation">
      <div class="pulse-ring"></div>
      <div class="pulse-ring delay-1"></div>
      <div class="pulse-ring delay-2"></div>
      <div class="car-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2-4H8L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/>
          <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
        </svg>
      </div>
    </div>
    
    <h3 class="search-title">กำลังค้นหาคนขับ...</h3>
    <p class="search-subtitle">{{ vehicleType }}</p>
    
    <div class="search-info">
      <div class="info-item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
        </svg>
        <span>รอประมาณ {{ estimatedWait }}</span>
      </div>
      <div class="info-item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
        </svg>
        <span>ค้นหาในรัศมี {{ searchRadius }}</span>
      </div>
    </div>
    
    <button type="button" class="cancel-btn" @click="emit('cancel')">ยกเลิกการค้นหา</button>
  </div>
</template>

<style scoped>
.searching-driver-card {
  background: #fff;
  border-radius: 16px 16px 0 0;
  padding: 32px 16px 24px;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.search-animation {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto 24px;
}

.pulse-ring {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 2px solid #276ef1;
  border-radius: 50%;
  animation: pulse 2s ease-out infinite;
  opacity: 0;
}

.pulse-ring.delay-1 {
  animation-delay: 0.5s;
}

.pulse-ring.delay-2 {
  animation-delay: 1s;
}

@keyframes pulse {
  0% {
    transform: scale(0.5);
    opacity: 0.8;
  }
  100% {
    transform: scale(1.2);
    opacity: 0;
  }
}

.car-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #276ef1;
  border-radius: 50%;
  color: #fff;
}

.search-title {
  font-size: 20px;
  font-weight: 700;
  color: #000;
  margin: 0 0 4px;
}

.search-subtitle {
  font-size: 14px;
  color: #6b6b6b;
  margin: 0 0 24px;
}

.search-info {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 24px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6b6b6b;
}

.cancel-btn {
  padding: 12px 32px;
  background: #f6f6f6;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  color: #e11900;
  cursor: pointer;
}

.cancel-btn:hover {
  background: #ffebee;
}
</style>
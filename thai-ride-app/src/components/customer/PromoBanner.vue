<script setup lang="ts">
/**
 * PromoBanner - แบนเนอร์โปรโมชั่นแบบน่ารัก
 * MUNEEF Style: สีเขียว #00A86B, gradient สวย
 */
import { ref } from 'vue'
import { useHapticFeedback } from '../../composables/useHapticFeedback'

interface Props {
  title?: string
  subtitle?: string
  code?: string
  discount?: string
  bgColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'โปรโมชั่นพิเศษ',
  subtitle: 'ดูส่วนลดทั้งหมด',
  code: 'FIRST20',
  discount: '20%',
  bgColor: '#00A86B'
})

const emit = defineEmits<{
  'click': []
}>()

const haptic = useHapticFeedback()
const isPressed = ref(false)

const handleClick = () => {
  haptic.medium()
  emit('click')
}
</script>

<template>
  <button 
    class="promo-banner"
    :class="{ pressed: isPressed }"
    :style="{ '--bg-color': bgColor }"
    @mousedown="isPressed = true"
    @mouseup="isPressed = false"
    @mouseleave="isPressed = false"
    @touchstart="isPressed = true"
    @touchend="isPressed = false"
    @click="handleClick"
  >
    <!-- Background Pattern -->
    <div class="banner-bg">
      <svg class="pattern" viewBox="0 0 400 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="promoGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" :style="`stop-color:${bgColor};stop-opacity:1`" />
            <stop offset="100%" style="stop-color:#FFD700;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect fill="url(#promoGrad)" width="400" height="100"/>
        <circle cx="350" cy="20" r="40" fill="rgba(255,255,255,0.1)"/>
        <circle cx="30" cy="80" r="30" fill="rgba(255,255,255,0.08)"/>
      </svg>
    </div>
    
    <!-- Content -->
    <div class="banner-content">
      <!-- Icon -->
      <div class="promo-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
          <circle cx="7" cy="7" r="1" fill="currentColor"/>
        </svg>
      </div>
      
      <!-- Text -->
      <div class="promo-text">
        <span class="promo-discount">ส่วนลดสูงสุด {{ discount }}</span>
        <span class="promo-code">ใช้โค้ด: <strong>{{ code }}</strong></span>
      </div>
      
      <!-- Arrow -->
      <div class="promo-arrow">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </div>
    </div>
    
    <!-- Sparkles -->
    <div class="sparkles">
      <span class="sparkle s1"></span>
      <span class="sparkle s2"></span>
      <span class="sparkle s3"></span>
    </div>
  </button>
</template>

<style scoped>
.promo-banner {
  position: relative;
  width: 100%;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 18px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.2s ease;
}

.promo-banner:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 168, 107, 0.25);
}

.promo-banner.pressed {
  transform: scale(0.98);
}

.banner-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.banner-bg .pattern {
  width: 100%;
  height: 100%;
}

.banner-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
}

.promo-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 14px;
  flex-shrink: 0;
}

.promo-icon svg {
  width: 24px;
  height: 24px;
  color: #FFFFFF;
}

.promo-text {
  flex: 1;
  text-align: left;
}

.promo-discount {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: #FFFFFF;
  margin-bottom: 2px;
}

.promo-code {
  display: block;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
}

.promo-code strong {
  font-weight: 700;
  color: #FFD700;
}

.promo-arrow {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.promo-banner:hover .promo-arrow {
  transform: translateX(4px);
}

.promo-arrow svg {
  width: 18px;
  height: 18px;
  color: #FFFFFF;
}

/* Sparkles Animation */
.sparkles {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.sparkle {
  position: absolute;
  width: 6px;
  height: 6px;
  background: #FFFFFF;
  border-radius: 50%;
  opacity: 0;
  animation: sparkle 2s ease-in-out infinite;
}

.sparkle.s1 {
  top: 20%;
  right: 15%;
  animation-delay: 0s;
}

.sparkle.s2 {
  top: 60%;
  right: 25%;
  animation-delay: 0.5s;
}

.sparkle.s3 {
  top: 40%;
  right: 8%;
  animation-delay: 1s;
}

@keyframes sparkle {
  0%, 100% {
    opacity: 0;
    transform: scale(0);
  }
  50% {
    opacity: 0.8;
    transform: scale(1);
  }
}
</style>

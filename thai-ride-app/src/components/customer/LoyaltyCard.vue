<script setup lang="ts">
/**
 * LoyaltyCard - Card แสดงแต้มสะสมแบบน่ารัก
 * MUNEEF Style: สีทอง #FFD700, สีเขียว #00A86B
 */
import { computed } from 'vue'
import { useHapticFeedback } from '../../composables/useHapticFeedback'

interface Props {
  points?: number
  tierName?: string
  nextTierPoints?: number
  tierColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  points: 0,
  tierName: 'Bronze',
  nextTierPoints: 1000,
  tierColor: '#CD7F32'
})

const emit = defineEmits<{
  'click': []
}>()

const { vibrate } = useHapticFeedback()

const progress = computed(() => {
  if (props.nextTierPoints <= 0) return 100
  return Math.min((props.points / props.nextTierPoints) * 100, 100)
})

const pointsToNext = computed(() => {
  return Math.max(props.nextTierPoints - props.points, 0)
})

const handleClick = () => {
  vibrate('light')
  emit('click')
}
</script>

<template>
  <button class="loyalty-card" @click="handleClick">
    <!-- Background -->
    <div class="card-bg">
      <svg class="pattern" viewBox="0 0 300 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="loyaltyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#FFF8E1;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#FFE082;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect fill="url(#loyaltyGrad)" width="300" height="100"/>
        <circle cx="280" cy="20" r="50" fill="rgba(255,215,0,0.2)"/>
        <circle cx="20" cy="80" r="30" fill="rgba(255,215,0,0.15)"/>
      </svg>
    </div>
    
    <!-- Content -->
    <div class="card-content">
      <!-- Star Icon -->
      <div class="star-icon">
        <svg viewBox="0 0 24 24" fill="none">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="#FFD700"/>
          <polygon points="12,5 13.5,9.5 18,10 14.5,13 15.5,17.5 12,15 8.5,17.5 9.5,13 6,10 10.5,9.5" fill="#FFA000"/>
        </svg>
      </div>
      
      <!-- Info -->
      <div class="card-info">
        <div class="points-row">
          <span class="points-value">{{ points.toLocaleString() }}</span>
          <span class="points-label">แต้ม</span>
        </div>
        <div class="tier-row">
          <span class="tier-badge" :style="{ background: tierColor }">{{ tierName }}</span>
          <span v-if="pointsToNext > 0" class="next-tier">อีก {{ pointsToNext.toLocaleString() }} แต้มถึงระดับถัดไป</span>
        </div>
      </div>
      
      <!-- Arrow -->
      <div class="card-arrow">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </div>
    </div>
    
    <!-- Progress Bar -->
    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
    </div>
  </button>
</template>

<style scoped>
.loyalty-card {
  position: relative;
  width: 100%;
  padding: 0;
  min-height: 88px; /* Touch target optimization */
  background: transparent;
  border: 2px solid #FFD700;
  border-radius: 18px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.2s ease;
  /* Touch optimizations */
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
}

.loyalty-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(255, 215, 0, 0.25);
}

.loyalty-card:active {
  transform: scale(0.98);
}

/* Touch-specific styles */
@media (hover: none) {
  .loyalty-card:hover {
    transform: none;
    box-shadow: none;
  }
  
  .loyalty-card:active {
    transform: scale(0.98);
    box-shadow: 0 4px 12px rgba(255, 215, 0, 0.2);
  }
}

.card-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.card-bg .pattern {
  width: 100%;
  height: 100%;
}

.card-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
}

.star-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 14px;
  flex-shrink: 0;
}

.star-icon svg {
  width: 28px;
  height: 28px;
}

.card-info {
  flex: 1;
  text-align: left;
}

.points-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 4px;
}

.points-value {
  font-size: 24px;
  font-weight: 800;
  color: #1A1A1A;
}

.points-label {
  font-size: 14px;
  font-weight: 500;
  color: #666666;
}

.tier-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tier-badge {
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #FFFFFF;
}

.next-tier {
  font-size: 11px;
  color: #666666;
}

.card-arrow {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 10px;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.loyalty-card:hover .card-arrow {
  transform: translateX(4px);
}

.card-arrow svg {
  width: 18px;
  height: 18px;
  color: #1A1A1A;
}

.progress-bar {
  position: relative;
  z-index: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.5);
  margin: 0 18px 12px;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #FFD700, #FFA000);
  border-radius: 2px;
  transition: width 0.5s ease;
}
</style>

<script setup lang="ts">
/**
 * SavedPlacesRow - แถวสถานที่บันทึกแบบน่ารัก
 * MUNEEF Style: สีเขียว #00A86B, icons น่ารัก
 */
import { useHapticFeedback } from '../../composables/useHapticFeedback'

interface SavedPlace {
  id?: string
  name?: string
  address?: string
  type?: 'home' | 'work' | 'other'
  place_type?: 'home' | 'work' | 'other'
  lat?: number
  lng?: number
}

interface Props {
  homePlace?: SavedPlace | null | undefined
  workPlace?: SavedPlace | null | undefined
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'สถานที่บันทึก'
})

const emit = defineEmits<{
  'place-click': [type: 'home' | 'work']
  'manage-click': []
}>()

const haptic = useHapticFeedback()

const handlePlaceClick = (type: 'home' | 'work') => {
  haptic.light()
  emit('place-click', type)
}

const handleManage = () => {
  haptic.light()
  emit('manage-click')
}
</script>

<template>
  <section class="saved-places-section">
    <div class="section-header">
      <h3 class="section-title">{{ title }}</h3>
      <button class="manage-btn" @click="handleManage">จัดการ</button>
    </div>
    
    <div class="places-row">
      <!-- Home -->
      <button class="place-card" @click="handlePlaceClick('home')">
        <div class="place-icon home">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
          </svg>
        </div>
        <div class="place-info">
          <span class="place-name">{{ homePlace?.name || 'บ้าน' }}</span>
          <span class="place-hint">{{ homePlace?.address ? 'กดเพื่อไป' : 'กดเพื่อเพิ่ม' }}</span>
        </div>
        <div class="place-status" :class="{ active: homePlace?.lat }">
          <svg v-if="homePlace?.lat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12l5 5L20 7"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </div>
      </button>
      
      <!-- Work -->
      <button class="place-card" @click="handlePlaceClick('work')">
        <div class="place-icon work">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
          </svg>
        </div>
        <div class="place-info">
          <span class="place-name">{{ workPlace?.name || 'ที่ทำงาน' }}</span>
          <span class="place-hint">{{ workPlace?.address ? 'กดเพื่อไป' : 'กดเพื่อเพิ่ม' }}</span>
        </div>
        <div class="place-status" :class="{ active: workPlace?.lat }">
          <svg v-if="workPlace?.lat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12l5 5L20 7"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </div>
      </button>
    </div>
  </section>
</template>

<style scoped>
.saved-places-section {
  padding: 0 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
}

.manage-btn {
  padding: 8px 14px;
  min-height: 44px; /* Touch target min 44px */
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #00A86B;
  cursor: pointer;
  transition: all 0.2s ease;
  /* Touch optimizations */
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
}

.manage-btn:hover {
  background: #E8F5EF;
}

.manage-btn:active {
  transform: scale(0.95);
  background: #D4EDE3;
}

.places-row {
  display: flex;
  gap: 12px;
}

.place-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  min-height: 72px; /* Touch target optimization */
  background: #FFFFFF;
  border: 2px solid #F5F5F5;
  border-radius: 16px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  /* Touch optimizations */
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
}

.place-card:hover {
  border-color: #00A86B;
  background: #F8FBF9;
}

.place-card:active {
  transform: scale(0.98);
  border-color: #00A86B;
  background: #E8F5EF;
}

/* Touch-specific styles */
@media (hover: none) {
  .place-card:hover {
    border-color: #F5F5F5;
    background: #FFFFFF;
  }
  
  .place-card:active {
    border-color: #00A86B;
    background: #E8F5EF;
  }
}

.place-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  flex-shrink: 0;
}

.place-icon.home {
  background: #E8F5EF;
}

.place-icon.work {
  background: #E3F2FD;
}

.place-icon svg {
  width: 22px;
  height: 22px;
}

.place-icon.home svg {
  color: #00A86B;
}

.place-icon.work svg {
  color: #2196F3;
}

.place-info {
  flex: 1;
  min-width: 0;
}

.place-name {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.place-hint {
  display: block;
  font-size: 12px;
  color: #999999;
}

.place-status {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border-radius: 8px;
  flex-shrink: 0;
}

.place-status.active {
  background: #E8F5EF;
}

.place-status svg {
  width: 16px;
  height: 16px;
  color: #CCCCCC;
}

.place-status.active svg {
  color: #00A86B;
}
</style>

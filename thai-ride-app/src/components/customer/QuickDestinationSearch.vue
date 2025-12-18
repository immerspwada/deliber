<script setup lang="ts">
/**
 * QuickDestinationSearch - ช่องค้นหาจุดหมายแบบน่ารัก
 * MUNEEF Style: สีเขียว #00A86B, border-radius 16px
 */
import { ref } from 'vue'
import { useHapticFeedback } from '../../composables/useHapticFeedback'

const emit = defineEmits<{
  'search-click': []
  'voice-click': []
}>()

const haptic = useHapticFeedback()
const isPressed = ref(false)

const handleClick = () => {
  haptic.light()
  emit('search-click')
}

const handleVoice = (e: Event) => {
  e.stopPropagation()
  haptic.medium()
  emit('voice-click')
}
</script>

<template>
  <div 
    class="search-card"
    :class="{ pressed: isPressed }"
    @mousedown="isPressed = true"
    @mouseup="isPressed = false"
    @mouseleave="isPressed = false"
    @touchstart="isPressed = true"
    @touchend="isPressed = false"
    @click="handleClick"
    role="button"
    tabindex="0"
  >
    <!-- Destination Icon -->
    <div class="search-icon">
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="#E53935" stroke-width="2"/>
        <circle cx="12" cy="12" r="3" fill="#E53935"/>
        <path d="M12 4v2M12 18v2M4 12h2M18 12h2" stroke="#E53935" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </div>
    
    <!-- Search Text -->
    <div class="search-content">
      <span class="search-label">ไปไหนดี?</span>
      <span class="search-hint">ค้นหาจุดหมายปลายทาง...</span>
    </div>
    
    <!-- Voice Search -->
    <button class="voice-btn" @click="handleVoice" aria-label="ค้นหาด้วยเสียง">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
        <path d="M19 10v2a7 7 0 01-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>
    </button>
    
    <!-- Arrow -->
    <div class="search-arrow">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.search-card {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px 18px;
  background: #FFFFFF;
  border: 2px solid #F0F0F0;
  border-radius: 20px;
  cursor: pointer;
  text-align: left;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
}

.search-card:hover {
  border-color: #00A86B;
  box-shadow: 0 6px 20px rgba(0, 168, 107, 0.12);
}

.search-card.pressed {
  transform: scale(0.98);
  border-color: #00A86B;
  background: #F8FBF9;
}

.search-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFF5F5;
  border-radius: 14px;
  flex-shrink: 0;
}

.search-icon svg {
  width: 26px;
  height: 26px;
}

.search-content {
  flex: 1;
  min-width: 0;
}

.search-label {
  display: block;
  font-size: 17px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 2px;
}

.search-hint {
  display: block;
  font-size: 13px;
  color: #999999;
}

.voice-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #E8F5EF;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.voice-btn:active {
  transform: scale(0.9);
  background: #D0EBE0;
}

.voice-btn svg {
  width: 20px;
  height: 20px;
  color: #00A86B;
}

.search-arrow {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #CCCCCC;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.search-card:hover .search-arrow {
  transform: translateX(4px);
  color: #00A86B;
}

.search-arrow svg {
  width: 20px;
  height: 20px;
}
</style>

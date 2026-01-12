<script setup lang="ts">
/**
 * Component: RidePlacesList
 * แสดงรายการสถานที่บันทึก, ล่าสุด และใกล้เคียง
 * Enhanced UX: Better animations, haptic feedback, improved empty states
 */
import { ref } from 'vue'
import type { NearbyPlace } from '../../composables/useRideRequest'

interface SavedPlace {
  id: string
  name: string
  address: string
  lat: number
  lng: number
}

defineProps<{
  savedPlaces: SavedPlace[]
  recentPlaces: SavedPlace[]
  nearbyPlaces: NearbyPlace[]
  isLoadingNearby: boolean
}>()

const emit = defineEmits<{
  select: [place: SavedPlace | NearbyPlace]
}>()

// Haptic feedback helper
function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'light'): void {
  if ('vibrate' in navigator) {
    const patterns = { light: 10, medium: 20, heavy: 30 }
    navigator.vibrate(patterns[style])
  }
}

// Track pressed state for visual feedback
const pressedId = ref<string | null>(null)

function handleSelect(place: SavedPlace | NearbyPlace): void {
  triggerHaptic('medium')
  pressedId.value = place.id
  setTimeout(() => {
    pressedId.value = null
    emit('select', place)
  }, 100)
}

// Icon components for nearby places
const iconMap: Record<string, string> = {
  shopping: 'M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0',
  hospital: 'M3 3h18v18H3zM12 8v8M8 12h8',
  train: 'M4 3h16v16a2 2 0 01-2 2H6a2 2 0 01-2-2V3zM4 11h16M12 3v8M8 15h.01M16 15h.01M8 19l-2 3M16 19l2 3',
  plane: 'M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z',
  school: 'M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c0 2 2 3 6 3s6-1 6-3v-5',
  temple: 'M12 2L2 7h20L12 2zM4 7v10h16V7M4 17l8 5 8-5M9 7v10M15 7v10'
}

function getIconPath(icon: string): string {
  return iconMap[icon] || 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 10a3 3 0 100-6 3 3 0 000 6z'
}
</script>

<template>
  <div class="places-container">
    <!-- Saved Places -->
    <section class="places-section">
      <div class="section-header">
        <h3 class="section-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
          </svg>
          สถานที่บันทึก
        </h3>
      </div>
      <div v-if="savedPlaces && savedPlaces.length > 0" class="places-chips">
        <button
          v-for="(place, index) in savedPlaces.slice(0, 4)"
          :key="place.id"
          class="place-chip"
          :class="{ pressed: pressedId === place.id }"
          :style="{ '--delay': `${index * 50}ms` }"
          @click="handleSelect(place)"
        >
          <div class="chip-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
            </svg>
          </div>
          <span class="chip-text">{{ place.name }}</span>
        </button>
      </div>
      <div v-else class="empty-state">
        <div class="empty-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
          </svg>
        </div>
        <p class="empty-title">ยังไม่มีสถานที่บันทึก</p>
        <p class="empty-hint">บันทึกสถานที่ที่ใช้บ่อยเพื่อจองได้เร็วขึ้น</p>
      </div>
    </section>

    <!-- Recent Places -->
    <section class="places-section">
      <div class="section-header">
        <h3 class="section-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12,6 12,12 16,14" />
          </svg>
          ล่าสุด
        </h3>
      </div>
      <TransitionGroup v-if="recentPlaces && recentPlaces.length > 0" name="list" tag="div" class="recent-list">
        <button
          v-for="(place, index) in recentPlaces.slice(0, 3)"
          :key="place.id"
          class="recent-item"
          :class="{ pressed: pressedId === place.id }"
          :style="{ '--delay': `${index * 50}ms` }"
          @click="handleSelect(place)"
        >
          <div class="recent-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12,6 12,12 16,14" />
            </svg>
          </div>
          <div class="recent-text">
            <span class="recent-name">{{ place.name }}</span>
            <span class="recent-addr">{{ place.address }}</span>
          </div>
          <svg class="item-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </TransitionGroup>
      <div v-else class="empty-state">
        <div class="empty-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12,6 12,12 16,14" />
          </svg>
        </div>
        <p class="empty-title">ยังไม่มีประวัติการเดินทาง</p>
        <p class="empty-hint">เริ่มจองเที่ยวแรกของคุณเลย!</p>
      </div>
    </section>

    <!-- Nearby Places -->
    <section class="places-section">
      <div class="section-header">
        <h3 class="section-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          สถานที่ใกล้เคียง
        </h3>
      </div>
      
      <!-- Loading skeleton -->
      <div v-if="isLoadingNearby" class="nearby-loading">
        <div v-for="i in 3" :key="i" class="skeleton-nearby" :style="{ '--delay': `${i * 100}ms` }"></div>
      </div>
      
      <!-- Nearby list -->
      <TransitionGroup v-else-if="nearbyPlaces.length > 0" name="list" tag="div" class="nearby-list">
        <button
          v-for="(place, index) in nearbyPlaces"
          :key="place.id"
          class="nearby-item"
          :class="{ pressed: pressedId === place.id }"
          :style="{ '--delay': `${index * 50}ms` }"
          @click="handleSelect(place)"
        >
          <div class="nearby-icon" :class="place.type">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path :d="getIconPath(place.icon)" />
            </svg>
          </div>
          <div class="nearby-text">
            <span class="nearby-name">{{ place.name }}</span>
            <span class="nearby-addr">{{ place.address }}</span>
          </div>
          <span v-if="place.distance" class="nearby-distance">
            {{ place.distance.toFixed(1) }} กม.
          </span>
        </button>
      </TransitionGroup>
      
      <!-- Empty state -->
      <div v-else class="empty-state">
        <div class="empty-icon location">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <p class="empty-title">ไม่พบสถานที่ใกล้เคียง</p>
        <p class="empty-hint">ลองค้นหาสถานที่ที่ต้องการในช่องค้นหา</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.places-container {
  padding: 12px 16px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.places-section {
  margin-bottom: 20px;
}

.section-header {
  margin-bottom: 14px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.section-title svg {
  color: #00a86b;
}

/* Saved Places Chips */
.places-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.place-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #fff;
  border: 1.5px solid #e8e8e8;
  border-radius: 24px;
  font-size: 14px;
  color: #1a1a1a;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  -webkit-tap-highlight-color: transparent;
  animation: chip-appear 0.3s ease forwards;
  animation-delay: var(--delay, 0ms);
  opacity: 0;
}

@keyframes chip-appear {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.place-chip:active,
.place-chip.pressed {
  background: #e8f5ef;
  border-color: #00a86b;
  transform: scale(0.96);
}

.chip-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #e8f5ef;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00a86b;
  transition: all 0.2s ease;
}

.place-chip:active .chip-icon,
.place-chip.pressed .chip-icon {
  background: #00a86b;
  color: #fff;
}

.chip-text {
  font-weight: 500;
}

/* Recent List */
.recent-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  background: #fff;
  border: 1.5px solid #e8e8e8;
  border-radius: 14px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  -webkit-tap-highlight-color: transparent;
}

.recent-item:active,
.recent-item.pressed {
  background: #f0fdf4;
  border-color: #00a86b;
  transform: scale(0.98);
}

.recent-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.recent-item:active .recent-icon,
.recent-item.pressed .recent-icon {
  background: #e8f5ef;
  color: #00a86b;
}

.recent-text {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
  gap: 2px;
}

.recent-name {
  font-size: 15px;
  font-weight: 500;
  color: #1a1a1a;
}

.recent-addr {
  font-size: 13px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-arrow {
  color: #ccc;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.recent-item:active .item-arrow,
.recent-item.pressed .item-arrow {
  color: #00a86b;
  transform: translateX(4px);
}

/* Nearby Places */
.nearby-loading {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton-nearby {
  height: 68px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  animation-delay: var(--delay, 0ms);
  border-radius: 14px;
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.nearby-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.nearby-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  background: #fff;
  border: 1.5px solid #e8e8e8;
  border-radius: 14px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  -webkit-tap-highlight-color: transparent;
}

.nearby-item:active,
.nearby-item.pressed {
  background: #f0fdf4;
  border-color: #00a86b;
  transform: scale(0.98);
}

.nearby-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #f0f0f0;
  color: #666;
  transition: transform 0.2s ease;
}

.nearby-item:active .nearby-icon,
.nearby-item.pressed .nearby-icon {
  transform: scale(1.05);
}

.nearby-icon.mall,
.nearby-icon.shopping {
  background: #fff3e0;
  color: #f57c00;
}

.nearby-icon.hospital {
  background: #ffebee;
  color: #e53935;
}

.nearby-icon.station,
.nearby-icon.train {
  background: #e3f2fd;
  color: #1976d2;
}

.nearby-icon.airport,
.nearby-icon.plane {
  background: #e8f5e9;
  color: #388e3c;
}

.nearby-icon.university,
.nearby-icon.school {
  background: #f3e5f5;
  color: #7b1fa2;
}

.nearby-icon.temple {
  background: #fff8e1;
  color: #ffa000;
}

.nearby-text {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
  gap: 2px;
}

.nearby-name {
  font-size: 15px;
  font-weight: 500;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nearby-addr {
  font-size: 13px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nearby-distance {
  font-size: 12px;
  color: #666;
  flex-shrink: 0;
  background: #f5f5f5;
  padding: 6px 10px;
  border-radius: 16px;
  font-weight: 500;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 24px;
  background: #fafafa;
  border-radius: 16px;
  text-align: center;
}

.empty-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #bbb;
  margin-bottom: 4px;
}

.empty-icon.location {
  background: #e8f5ef;
  color: #00a86b;
}

.empty-title {
  font-size: 15px;
  font-weight: 500;
  color: #666;
  margin: 0;
}

.empty-hint {
  font-size: 13px;
  color: #999;
  margin: 0;
}

/* List transition */
.list-enter-active {
  transition: all 0.3s ease;
  transition-delay: var(--delay, 0ms);
}

.list-leave-active {
  transition: all 0.2s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}

.list-move {
  transition: transform 0.3s ease;
}
</style>

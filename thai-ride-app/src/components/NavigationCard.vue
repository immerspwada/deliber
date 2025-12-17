<script setup lang="ts">
/**
 * Feature: F212 - Navigation Card
 * Navigation info card for provider during trip
 */
defineProps<{
  nextTurn?: string
  distance?: string
  eta?: string
  destination: string
  isNavigating?: boolean
  onStartNavigation?: () => void
  onEndNavigation?: () => void
}>()
</script>

<template>
  <div class="navigation-card" :class="{ navigating: isNavigating }">
    <div v-if="isNavigating" class="nav-active">
      <div class="nav-turn">
        <div class="turn-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
        <div class="turn-info">
          <span class="turn-direction">{{ nextTurn || 'ตรงไป' }}</span>
          <span class="turn-distance">{{ distance || '...' }}</span>
        </div>
      </div>
      <div class="nav-eta">
        <span class="eta-label">ถึงใน</span>
        <span class="eta-value">{{ eta || '--' }}</span>
      </div>
    </div>

    <div class="nav-destination">
      <div class="dest-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
      <span class="dest-text">{{ destination }}</span>
    </div>

    <div class="nav-actions">
      <button v-if="!isNavigating && onStartNavigation" type="button" class="nav-btn primary" @click="onStartNavigation">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="3 11 22 2 13 21 11 13 3 11"/>
        </svg>
        เริ่มนำทาง
      </button>
      <button v-if="isNavigating && onEndNavigation" type="button" class="nav-btn" @click="onEndNavigation">
        หยุดนำทาง
      </button>
    </div>
  </div>
</template>

<style scoped>
.navigation-card { background: #fff; border-radius: 16px; padding: 16px; border: 1px solid #e5e5e5; }
.navigation-card.navigating { background: #000; border-color: #000; }
.nav-active { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #333; }
.nav-turn { display: flex; align-items: center; gap: 12px; }
.turn-icon { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: #333; border-radius: 12px; color: #fff; }
.turn-info { display: flex; flex-direction: column; }
.turn-direction { font-size: 18px; font-weight: 700; color: #fff; }
.turn-distance { font-size: 14px; color: #999; }
.nav-eta { text-align: right; }
.eta-label { display: block; font-size: 12px; color: #999; }
.eta-value { font-size: 24px; font-weight: 700; color: #fff; }
.nav-destination { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.dest-icon { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: #f6f6f6; border-radius: 10px; color: #ef4444; }
.navigating .dest-icon { background: #333; }
.dest-text { font-size: 14px; color: #000; flex: 1; }
.navigating .dest-text { color: #fff; }
.nav-actions { display: flex; gap: 12px; }
.nav-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; background: #f6f6f6; color: #000; border: none; }
.nav-btn:hover { background: #e5e5e5; }
.nav-btn.primary { background: #000; color: #fff; }
.nav-btn.primary:hover { background: #333; }
.navigating .nav-btn { background: #333; color: #fff; }
.navigating .nav-btn:hover { background: #444; }
</style>

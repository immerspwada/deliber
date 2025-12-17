<script setup lang="ts">
/**
 * Feature: F216 - Hotspot Card
 * Display demand hotspot for provider
 */
defineProps<{
  name: string
  distance: number
  demandLevel: 'low' | 'medium' | 'high' | 'surge'
  estimatedWait?: number
  surgeMultiplier?: number
  onNavigate?: () => void
}>()

const demandConfig = {
  low: { label: 'ปกติ', color: '#6b6b6b', bg: '#f6f6f6' },
  medium: { label: 'ปานกลาง', color: '#f59e0b', bg: '#fef3c7' },
  high: { label: 'สูง', color: '#ef4444', bg: '#fee2e2' },
  surge: { label: 'Surge', color: '#fff', bg: '#ef4444' }
}
</script>

<template>
  <div class="hotspot-card" :class="demandLevel">
    <div class="hotspot-icon">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
    </div>
    <div class="hotspot-info">
      <div class="hotspot-header">
        <h4 class="hotspot-name">{{ name }}</h4>
        <span class="demand-badge" :style="{ color: demandConfig[demandLevel].color, background: demandConfig[demandLevel].bg }">
          {{ demandConfig[demandLevel].label }}
          <span v-if="surgeMultiplier && demandLevel === 'surge'">{{ surgeMultiplier }}x</span>
        </span>
      </div>
      <div class="hotspot-meta">
        <span class="meta-item">{{ distance.toFixed(1) }} กม.</span>
        <span v-if="estimatedWait" class="meta-item">รอ ~{{ estimatedWait }} นาที</span>
      </div>
    </div>
    <button v-if="onNavigate" type="button" class="navigate-btn" @click="onNavigate">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="3 11 22 2 13 21 11 13 3 11"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.hotspot-card { display: flex; align-items: center; gap: 14px; padding: 14px; background: #fff; border-radius: 12px; border: 1px solid #e5e5e5; }
.hotspot-card.surge { border-color: #ef4444; background: #fffbfb; }
.hotspot-icon { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: #f6f6f6; border-radius: 10px; color: #ef4444; }
.hotspot-card.surge .hotspot-icon { background: #fee2e2; }
.hotspot-info { flex: 1; min-width: 0; }
.hotspot-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.hotspot-name { font-size: 14px; font-weight: 600; color: #000; margin: 0; }
.demand-badge { font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 8px; }
.hotspot-meta { display: flex; gap: 12px; }
.meta-item { font-size: 12px; color: #6b6b6b; }
.navigate-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #000; color: #fff; border: none; border-radius: 10px; cursor: pointer; }
.navigate-btn:hover { background: #333; }
</style>

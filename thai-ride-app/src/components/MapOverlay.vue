<script setup lang="ts">
/**
 * Feature: F205 - Map Overlay
 * Overlay component for map with info panels
 */
import { ref } from 'vue'

interface OverlayInfo {
  title: string
  value: string | number
  icon?: string
}

const props = withDefaults(defineProps<{
  infos?: OverlayInfo[]
  showSearch?: boolean
  showControls?: boolean
}>(), {
  infos: () => [],
  showSearch: true,
  showControls: true
})

const emit = defineEmits<{
  search: [query: string]
  zoomIn: []
  zoomOut: []
  locate: []
  layerChange: [layer: string]
}>()

const searchQuery = ref('')
const activeLayer = ref('default')

const layers = [
  { key: 'default', label: 'แผนที่ปกติ' },
  { key: 'satellite', label: 'ดาวเทียม' },
  { key: 'traffic', label: 'การจราจร' }
]
</script>

<template>
  <div class="map-overlay">
    <!-- Search Bar -->
    <div v-if="showSearch" class="overlay-search">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg>
      <input v-model="searchQuery" type="text" placeholder="ค้นหาสถานที่..." 
        @keyup.enter="emit('search', searchQuery)" />
    </div>

    <!-- Info Cards -->
    <div v-if="infos.length" class="overlay-infos">
      <div v-for="(info, i) in infos" :key="i" class="info-card">
        <span v-if="info.icon" class="info-icon" v-html="info.icon" />
        <div class="info-content">
          <span class="info-value">{{ info.value }}</span>
          <span class="info-title">{{ info.title }}</span>
        </div>
      </div>
    </div>

    <!-- Map Controls -->
    <div v-if="showControls" class="overlay-controls">
      <button type="button" class="control-btn" @click="emit('zoomIn')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
      <button type="button" class="control-btn" @click="emit('zoomOut')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
      <div class="control-divider" />
      <button type="button" class="control-btn" @click="emit('locate')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
        </svg>
      </button>
    </div>

    <!-- Layer Selector -->
    <div class="overlay-layers">
      <button v-for="layer in layers" :key="layer.key" type="button" class="layer-btn"
        :class="{ active: activeLayer === layer.key }"
        @click="activeLayer = layer.key; emit('layerChange', layer.key)">
        {{ layer.label }}
      </button>
    </div>

    <slot />
  </div>
</template>

<style scoped>
.map-overlay { position: absolute; inset: 0; pointer-events: none; }
.map-overlay > * { pointer-events: auto; }
.overlay-search { position: absolute; top: 16px; left: 16px; right: 16px; display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.overlay-search svg { color: #6b6b6b; flex-shrink: 0; }
.overlay-search input { flex: 1; border: none; background: transparent; font-size: 15px; outline: none; }
.overlay-infos { position: absolute; top: 80px; left: 16px; display: flex; flex-direction: column; gap: 8px; }
.info-card { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.info-icon { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: #f6f6f6; border-radius: 8px; }
.info-content { display: flex; flex-direction: column; }
.info-value { font-size: 16px; font-weight: 700; color: #000; }
.info-title { font-size: 11px; color: #6b6b6b; }
.overlay-controls { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 4px; background: #fff; border-radius: 12px; padding: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.control-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: transparent; border: none; border-radius: 8px; cursor: pointer; color: #000; }
.control-btn:hover { background: #f6f6f6; }
.control-divider { height: 1px; background: #e5e5e5; margin: 4px 0; }
.overlay-layers { position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%); display: flex; gap: 4px; background: #fff; border-radius: 20px; padding: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.layer-btn { padding: 8px 16px; background: transparent; border: none; border-radius: 16px; font-size: 12px; font-weight: 500; color: #6b6b6b; cursor: pointer; }
.layer-btn:hover { background: #f6f6f6; }
.layer-btn.active { background: #000; color: #fff; }
</style>

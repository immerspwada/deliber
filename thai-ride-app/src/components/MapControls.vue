<script setup lang="ts">
/**
 * Feature: F187 - Map Controls
 * Map zoom and location controls
 */

interface Props {
  showZoom?: boolean
  showLocation?: boolean
  showLayers?: boolean
}

withDefaults(defineProps<Props>(), {
  showZoom: true,
  showLocation: true,
  showLayers: false
})

const emit = defineEmits<{
  zoomIn: []
  zoomOut: []
  locate: []
  layers: []
}>()
</script>

<template>
  <div class="map-controls">
    <div v-if="showZoom" class="control-group">
      <button type="button" class="control-btn" @click="emit('zoomIn')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </button>
      <button type="button" class="control-btn" @click="emit('zoomOut')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 12h14"/>
        </svg>
      </button>
    </div>
    
    <button v-if="showLocation" type="button" class="control-btn location" @click="emit('locate')">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>
      </svg>
    </button>
    
    <button v-if="showLayers" type="button" class="control-btn" @click="emit('layers')">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.map-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-group {
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.control-group .control-btn {
  border-radius: 0;
}

.control-group .control-btn:first-child {
  border-bottom: 1px solid #e5e5e5;
}

.control-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: none;
  border-radius: 8px;
  color: #000;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: background 0.2s;
}

.control-btn:hover {
  background: #f6f6f6;
}

.control-btn.location {
  color: #276ef1;
}
</style>
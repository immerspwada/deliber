<script setup lang="ts">
/**
 * Feature: F307 - Stops List
 * Multi-stop ride stops list
 */
interface Stop {
  id: string
  name: string
  address: string
}

defineProps<{
  stops: Stop[]
  maxStops?: number
}>()

const emit = defineEmits<{
  'add': []
  'remove': [id: string]
  'reorder': [stops: Stop[]]
}>()
</script>

<template>
  <div class="stops-list">
    <div v-for="(stop, index) in stops" :key="stop.id" class="stop-item">
      <div class="stop-marker">
        <span class="number">{{ index + 1 }}</span>
        <div v-if="index < stops.length - 1" class="line"></div>
      </div>
      <div class="stop-info">
        <span class="name">{{ stop.name }}</span>
        <span class="address">{{ stop.address }}</span>
      </div>
      <button type="button" class="remove-btn" @click="emit('remove', stop.id)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
    
    <button
      v-if="!maxStops || stops.length < maxStops"
      type="button"
      class="add-btn"
      @click="emit('add')"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      เพิ่มจุดแวะ
    </button>
  </div>
</template>

<style scoped>
.stops-list {
  padding: 12px;
  background: #f6f6f6;
  border-radius: 12px;
}

.stop-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 0;
}

.stop-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.number {
  width: 24px;
  height: 24px;
  background: #000;
  color: #fff;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.line {
  width: 2px;
  height: 24px;
  background: #ccc;
  margin: 4px 0;
}

.stop-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.name {
  font-size: 14px;
  font-weight: 500;
}

.address {
  font-size: 12px;
  color: #6b6b6b;
}

.remove-btn {
  padding: 4px;
  background: transparent;
  border: none;
  color: #6b6b6b;
  cursor: pointer;
}

.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 12px;
  margin-top: 8px;
  background: #fff;
  border: 1px dashed #ccc;
  border-radius: 8px;
  font-size: 14px;
  color: #6b6b6b;
  cursor: pointer;
}
</style>

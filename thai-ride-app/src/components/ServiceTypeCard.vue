<script setup lang="ts">
/**
 * Feature: F165 - Service Type Card
 * Display service type selection card
 */

interface Props {
  type: 'ride' | 'delivery' | 'shopping'
  title: string
  description: string
  price?: string
  eta?: string
  selected?: boolean
  disabled?: boolean
}

withDefaults(defineProps<Props>(), {
  selected: false,
  disabled: false
})

const emit = defineEmits<{
  select: []
}>()

const typeIcons = {
  ride: 'M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2-4H8L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2M7 17a2 2 0 100-4 2 2 0 000 4zM17 17a2 2 0 100-4 2 2 0 000 4z',
  delivery: 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12',
  shopping: 'M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0'
}
</script>

<template>
  <button
    type="button"
    class="service-type-card"
    :class="{ selected, disabled }"
    :disabled="disabled"
    @click="emit('select')"
  >
    <div class="card-icon">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path :d="typeIcons[type]" />
      </svg>
    </div>
    
    <div class="card-content">
      <h4 class="card-title">{{ title }}</h4>
      <p class="card-desc">{{ description }}</p>
      <div v-if="price || eta" class="card-meta">
        <span v-if="price" class="meta-price">{{ price }}</span>
        <span v-if="price && eta" class="meta-divider">•</span>
        <span v-if="eta" class="meta-eta">{{ eta }}</span>
      </div>
    </div>
    
    <div class="card-check">
      <svg v-if="selected" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
      <div v-else class="check-circle"></div>
    </div>
  </button>
</template>

<style scoped>
.service-type-card {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px;
  background: #fff;
  border: 2px solid #e5e5e5;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.service-type-card:hover:not(.disabled) {
  border-color: #000;
}

.service-type-card.selected {
  border-color: #000;
  background: #f6f6f6;
}

.service-type-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.card-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border-radius: 12px;
  color: #000;
  flex-shrink: 0;
}

.service-type-card.selected .card-icon {
  background: #000;
  color: #fff;
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #000;
  margin: 0 0 4px;
}

.card-desc {
  font-size: 13px;
  color: #6b6b6b;
  margin: 0;
  line-height: 1.4;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}

.meta-price {
  font-size: 14px;
  font-weight: 600;
  color: #000;
}

.meta-divider {
  color: #ccc;
}

.meta-eta {
  font-size: 12px;
  color: #6b6b6b;
}

.card-check {
  flex-shrink: 0;
}

.check-circle {
  width: 20px;
  height: 20px;
  border: 2px solid #e5e5e5;
  border-radius: 50%;
}

.service-type-card.selected .card-check {
  color: #000;
}
</style>
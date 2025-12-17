<script setup lang="ts">
/**
 * Feature: F126 - Service Card
 * Display service option (ride, delivery, shopping)
 */

interface Props {
  type: 'ride' | 'delivery' | 'shopping' | 'food'
  title: string
  description?: string
  available?: boolean
  badge?: string
  onClick?: () => void
}

const props = withDefaults(defineProps<Props>(), {
  available: true
})

const emit = defineEmits<{
  click: []
}>()

const handleClick = () => {
  if (props.available) {
    emit('click')
  }
}
</script>

<template>
  <button
    type="button"
    class="service-card"
    :class="{ unavailable: !available }"
    :disabled="!available"
    @click="handleClick"
  >
    <div class="service-icon">
      <!-- Ride -->
      <svg v-if="type === 'ride'" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M5 17h14v-5H5v5zM19 12l-2-6H7L5 12"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>
      </svg>
      <!-- Delivery -->
      <svg v-else-if="type === 'delivery'" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
      <!-- Shopping -->
      <svg v-else-if="type === 'shopping'" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 01-8 0"/>
      </svg>
      <!-- Food -->
      <svg v-else width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><path d="M6 1v3M10 1v3M14 1v3"/>
      </svg>
    </div>
    
    <div class="service-content">
      <div class="service-header">
        <span class="service-title">{{ title }}</span>
        <span v-if="badge" class="service-badge">{{ badge }}</span>
      </div>
      <p v-if="description" class="service-description">{{ description }}</p>
      <span v-if="!available" class="unavailable-text">ไม่พร้อมให้บริการ</span>
    </div>
    
    <div class="service-arrow">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </div>
  </button>
</template>

<style scoped>
.service-card {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 20px;
  background: #fff;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.service-card:hover:not(.unavailable) {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.service-card:active:not(.unavailable) {
  transform: translateY(0);
}

.service-card.unavailable {
  opacity: 0.5;
  cursor: not-allowed;
}

.service-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border-radius: 16px;
  color: #000;
  flex-shrink: 0;
}

.service-content {
  flex: 1;
  min-width: 0;
}

.service-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.service-title {
  font-size: 18px;
  font-weight: 600;
  color: #000;
}

.service-badge {
  background: #000;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
  text-transform: uppercase;
}

.service-description {
  font-size: 14px;
  color: #6b6b6b;
  margin: 0;
  line-height: 1.4;
}

.unavailable-text {
  font-size: 13px;
  color: #e11900;
  margin-top: 4px;
  display: block;
}

.service-arrow {
  color: #ccc;
  flex-shrink: 0;
}

.service-card:hover:not(.unavailable) .service-arrow {
  color: #000;
}
</style>

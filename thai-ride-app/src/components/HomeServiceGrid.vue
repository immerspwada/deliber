<script setup lang="ts">
/**
 * Feature: F175 - Home Service Grid
 * Display main services on home screen
 */

interface Service {
  id: string
  name: string
  icon: string
  description?: string
  badge?: string
  disabled?: boolean
}

interface Props {
  services?: Service[]
}

withDefaults(defineProps<Props>(), {
  services: () => [
    { id: 'ride', name: 'เรียกรถ', icon: 'ride', description: 'ไปไหนก็ได้' },
    { id: 'delivery', name: 'ส่งพัสดุ', icon: 'delivery', description: 'ส่งด่วนทันใจ' },
    { id: 'shopping', name: 'ซื้อของ', icon: 'shopping', description: 'ฝากซื้อได้เลย' },
    { id: 'food', name: 'อาหาร', icon: 'food', description: 'เร็วๆ นี้', badge: 'เร็วๆ นี้', disabled: true }
  ]
})

const emit = defineEmits<{
  select: [id: string]
}>()

const iconPaths: Record<string, string> = {
  ride: 'M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2-4H8L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2M7 17a2 2 0 100-4 2 2 0 000 4zM17 17a2 2 0 100-4 2 2 0 000 4z',
  delivery: 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12',
  shopping: 'M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0',
  food: 'M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3'
}
</script>

<template>
  <div class="home-service-grid">
    <button
      v-for="service in services"
      :key="service.id"
      type="button"
      class="service-item"
      :class="{ disabled: service.disabled }"
      :disabled="service.disabled"
      @click="emit('select', service.id)"
    >
      <div class="service-icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path :d="iconPaths[service.icon] || iconPaths.ride"/>
        </svg>
      </div>
      <span class="service-name">{{ service.name }}</span>
      <span v-if="service.description" class="service-desc">{{ service.description }}</span>
      <span v-if="service.badge" class="service-badge">{{ service.badge }}</span>
    </button>
  </div>
</template>

<style scoped>
.home-service-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 0 16px;
}

.service-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 16px;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.service-item:hover:not(.disabled) {
  border-color: #000;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.service-item.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.service-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border-radius: 16px;
  color: #000;
  margin-bottom: 12px;
}

.service-item:hover:not(.disabled) .service-icon {
  background: #000;
  color: #fff;
}

.service-name {
  font-size: 15px;
  font-weight: 600;
  color: #000;
  margin-bottom: 4px;
}

.service-desc {
  font-size: 12px;
  color: #6b6b6b;
}

.service-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 9px;
  font-weight: 600;
  padding: 3px 8px;
  background: #f6f6f6;
  color: #6b6b6b;
  border-radius: 10px;
  text-transform: uppercase;
}
</style>
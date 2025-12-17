<script setup lang="ts">
/**
 * Feature: F303 - Service Selector
 * Service type selection grid
 */
defineProps<{
  selected?: string
}>()

const emit = defineEmits<{
  'select': [service: string]
}>()

const services = [
  { id: 'ride', name: 'เรียกรถ', desc: 'เดินทางสะดวก', icon: 'car' },
  { id: 'delivery', name: 'ส่งของ', desc: 'ส่งพัสดุด่วน', icon: 'package' },
  { id: 'shopping', name: 'ซื้อของ', desc: 'ฝากซื้อสินค้า', icon: 'shopping' }
]

const icons: Record<string, string> = {
  car: 'M5 17a2 2 0 104 0M15 17a2 2 0 104 0M5 17H3v-4l2-5h10l4 5v4h-2M5 17h10',
  package: 'M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12',
  shopping: 'M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0'
}
</script>

<template>
  <div class="service-selector">
    <button
      v-for="service in services"
      :key="service.id"
      type="button"
      class="service-btn"
      :class="{ selected: selected === service.id }"
      @click="emit('select', service.id)"
    >
      <div class="icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path :d="icons[service.icon]"/>
        </svg>
      </div>
      <span class="name">{{ service.name }}</span>
      <span class="desc">{{ service.desc }}</span>
    </button>
  </div>
</template>

<style scoped>
.service-selector {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.service-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 12px;
  background: #fff;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.service-btn:hover {
  border-color: #ccc;
}

.service-btn.selected {
  border-color: #000;
  background: #fafafa;
}

.icon {
  width: 56px;
  height: 56px;
  background: #f6f6f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
}

.service-btn.selected .icon {
  background: #000;
  color: #fff;
}

.name {
  font-size: 14px;
  font-weight: 600;
  color: #000;
}

.desc {
  font-size: 11px;
  color: #6b6b6b;
  margin-top: 2px;
}
</style>

<script setup lang="ts">
/**
 * Feature: F301 - Destination Card
 * Destination selection card with address
 */
defineProps<{
  name: string
  address: string
  distance?: number
  type?: 'recent' | 'saved' | 'search'
  icon?: 'home' | 'work' | 'location'
}>()

const emit = defineEmits<{
  'select': []
}>()

const icons = {
  home: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10',
  work: 'M20 7h-4V3H8v4H4a2 2 0 00-2 2v11a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z',
  location: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z M12 10m-3 0a3 3 0 106 0 3 3 0 00-6 0'
}
</script>

<template>
  <button type="button" class="destination-card" @click="emit('select')">
    <div class="icon" :class="type">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path :d="icons[icon || 'location']"/>
      </svg>
    </div>
    <div class="info">
      <span class="name">{{ name }}</span>
      <span class="address">{{ address }}</span>
    </div>
    <span v-if="distance" class="distance">{{ (distance / 1000).toFixed(1) }} กม.</span>
  </button>
</template>

<style scoped>
.destination-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  background: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
}

.destination-card:hover {
  background: #f6f6f6;
}

.icon {
  width: 40px;
  height: 40px;
  background: #f6f6f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon.saved { background: #e8f4ff; color: #276ef1; }
.icon.recent { background: #f6f6f6; color: #6b6b6b; }

.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.name {
  font-size: 14px;
  font-weight: 500;
  color: #000;
}

.address {
  font-size: 12px;
  color: #6b6b6b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.distance {
  font-size: 12px;
  color: #6b6b6b;
}
</style>

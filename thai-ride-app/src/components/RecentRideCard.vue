<script setup lang="ts">
/**
 * Feature: F176 - Recent Ride Card
 * Display recent ride for quick rebooking
 */

interface Props {
  destination: string
  address: string
  lastUsed: string
  price?: number
}

defineProps<Props>()

const emit = defineEmits<{
  book: []
}>()
</script>

<template>
  <button type="button" class="recent-ride-card" @click="emit('book')">
    <div class="ride-icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
      </svg>
    </div>
    <div class="ride-info">
      <span class="ride-destination">{{ destination }}</span>
      <span class="ride-address">{{ address }}</span>
      <span class="ride-meta">{{ lastUsed }}<template v-if="price"> • ฿{{ price }}</template></span>
    </div>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M9 18l6-6-6-6"/>
    </svg>
  </button>
</template>

<style scoped>
.recent-ride-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.recent-ride-card:hover {
  border-color: #000;
  background: #f6f6f6;
}

.ride-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e3f2fd;
  border-radius: 12px;
  color: #276ef1;
  flex-shrink: 0;
}

.ride-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ride-destination {
  font-size: 15px;
  font-weight: 600;
  color: #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ride-address {
  font-size: 12px;
  color: #6b6b6b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ride-meta {
  font-size: 11px;
  color: #999;
}
</style>

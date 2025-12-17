<script setup lang="ts">
/**
 * Feature: F294 - Ride Type Card
 * Selectable ride type option card
 */
defineProps<{
  type: 'standard' | 'premium' | 'xl' | 'motorcycle'
  name: string
  description?: string
  price: number
  eta: number
  capacity: number
  selected?: boolean
  surge?: number
}>()

const emit = defineEmits<{
  'select': []
}>()

const icons: Record<string, string> = {
  standard: 'M5 17a2 2 0 104 0M15 17a2 2 0 104 0M5 17H3v-4l2-5h10l4 5v4h-2M5 17h10',
  premium: 'M5 17a2 2 0 104 0M15 17a2 2 0 104 0M5 17H3v-4l2-5h10l4 5v4h-2M5 17h10M7 8h10',
  xl: 'M1 14h12v7H1zM13 17h8v4h-8zM13 14l4-4h4v7M5 21a2 2 0 100-4M17 21a2 2 0 100-4',
  motorcycle: 'M5 17a2 2 0 100 0M19 17a2 2 0 100 0M5 17h2l3-6h4l2 3h3M12 11V8'
}
</script>

<template>
  <button
    type="button"
    class="ride-type-card"
    :class="{ selected }"
    @click="emit('select')"
  >
    <div class="icon">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path :d="icons[type]"/>
      </svg>
    </div>
    
    <div class="info">
      <div class="header">
        <span class="name">{{ name }}</span>
        <span v-if="surge && surge > 1" class="surge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/>
          </svg>
          {{ surge }}x
        </span>
      </div>
      <p v-if="description" class="description">{{ description }}</p>
      <div class="meta">
        <span class="eta">{{ eta }} นาที</span>
        <span class="capacity">{{ capacity }} ที่นั่ง</span>
      </div>
    </div>
    
    <div class="price">
      <span class="amount">฿{{ price }}</span>
    </div>
    
    <div v-if="selected" class="check">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3">
        <polyline points="20,6 9,17 4,12"/>
      </svg>
    </div>
  </button>
</template>

<style scoped>
.ride-type-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px;
  background: #fff;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
  position: relative;
}

.ride-type-card:hover {
  border-color: #ccc;
}

.ride-type-card.selected {
  border-color: #000;
  background: #fafafa;
}

.icon {
  width: 56px;
  height: 56px;
  background: #f6f6f6;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.info {
  flex: 1;
  min-width: 0;
}

.header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.name {
  font-size: 16px;
  font-weight: 600;
  color: #000;
}

.surge {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 11px;
  font-weight: 600;
  color: #f5a623;
}

.description {
  font-size: 12px;
  color: #6b6b6b;
  margin: 2px 0 0;
}

.meta {
  display: flex;
  gap: 12px;
  margin-top: 4px;
  font-size: 12px;
  color: #6b6b6b;
}

.price {
  text-align: right;
}

.amount {
  font-size: 18px;
  font-weight: 700;
  color: #000;
}

.check {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  background: #000;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

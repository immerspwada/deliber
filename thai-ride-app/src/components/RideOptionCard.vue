<script setup lang="ts">
/**
 * Feature: F172 - Ride Option Card
 * Display ride option with price and ETA
 */

interface Props {
  id: string
  name: string
  description?: string
  price: number
  originalPrice?: number
  eta: string
  capacity: number
  selected?: boolean
  surge?: number
  promo?: boolean
}

withDefaults(defineProps<Props>(), {
  selected: false,
  surge: 1
})

const emit = defineEmits<{
  select: [id: string]
}>()

const vehicleIcons: Record<string, string> = {
  economy: 'M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2-4H8L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2M7 17a2 2 0 100-4 2 2 0 000 4zM17 17a2 2 0 100-4 2 2 0 000 4z',
  comfort: 'M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2-4H8L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2M7 17a2 2 0 100-4 2 2 0 000 4zM17 17a2 2 0 100-4 2 2 0 000 4z',
  premium: 'M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2-4H8L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2M7 17a2 2 0 100-4 2 2 0 000 4zM17 17a2 2 0 100-4 2 2 0 000 4z',
  bike: 'M5 18a3 3 0 100-6 3 3 0 000 6zM19 18a3 3 0 100-6 3 3 0 000 6zM12 18V9l-3 3M12 9l3 3M12 9V6'
}
</script>

<template>
  <button
    type="button"
    class="ride-option-card"
    :class="{ selected }"
    @click="emit('select', id)"
  >
    <div class="option-icon">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path :d="vehicleIcons[id] || vehicleIcons.economy"/>
      </svg>
    </div>
    
    <div class="option-info">
      <div class="option-header">
        <span class="option-name">{{ name }}</span>
        <span v-if="surge > 1" class="surge-badge">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          {{ surge }}x
        </span>
        <span v-if="promo" class="promo-badge">โปรโมชั่น</span>
      </div>
      <div class="option-meta">
        <span class="option-eta">{{ eta }}</span>
        <span class="option-capacity">{{ capacity }} ที่นั่ง</span>
      </div>
      <p v-if="description" class="option-desc">{{ description }}</p>
    </div>
  </button>
</template>

    <div class="option-price">
      <span v-if="originalPrice && originalPrice > price" class="original-price">฿{{ originalPrice }}</span>
      <span class="current-price">฿{{ price.toLocaleString() }}</span>
    </div>
    
    <div class="option-check">
      <svg v-if="selected" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
      <div v-else class="check-circle"></div>
    </div>
  </button>
</template>

<style scoped>
.ride-option-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px;
  background: #fff;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.ride-option-card:hover {
  border-color: #000;
}

.ride-option-card.selected {
  border-color: #000;
  background: #f6f6f6;
}

.option-icon {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border-radius: 12px;
  color: #000;
  flex-shrink: 0;
}

.ride-option-card.selected .option-icon {
  background: #000;
  color: #fff;
}

.option-info {
  flex: 1;
  min-width: 0;
}

.option-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.option-name {
  font-size: 15px;
  font-weight: 600;
  color: #000;
}

.surge-badge {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  background: #fff3e0;
  color: #ef6c00;
  border-radius: 4px;
}

.promo-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  background: #e3f2fd;
  color: #276ef1;
  border-radius: 4px;
}

.option-meta {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: #6b6b6b;
}

.option-desc {
  font-size: 11px;
  color: #999;
  margin: 4px 0 0;
}

.option-price {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.original-price {
  font-size: 12px;
  color: #999;
  text-decoration: line-through;
}

.current-price {
  font-size: 16px;
  font-weight: 700;
  color: #000;
}

.option-check {
  flex-shrink: 0;
}

.check-circle {
  width: 20px;
  height: 20px;
  border: 2px solid #e5e5e5;
  border-radius: 50%;
}

.ride-option-card.selected .option-check {
  color: #000;
}
</style>
<script setup lang="ts">
/**
 * Feature: F283 - Turn By Turn
 * Navigation turn-by-turn instruction display
 */
import { computed } from 'vue'

const props = defineProps<{
  instruction: string
  distance: number
  maneuver: 'straight' | 'left' | 'right' | 'slight-left' | 'slight-right' | 'u-turn' | 'arrive'
  streetName?: string
}>()

const maneuverIcons: Record<string, string> = {
  'straight': 'M12 19V5M12 5l-4 4M12 5l4 4',
  'left': 'M9 18l-6-6 6-6M3 12h18',
  'right': 'M15 18l6-6-6-6M21 12H3',
  'slight-left': 'M17 17l-5-5 5-5M12 12H3',
  'slight-right': 'M7 17l5-5-5-5M12 12h9',
  'u-turn': 'M9 14l-4-4 4-4M5 10h11a4 4 0 014 4v1',
  'arrive': 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z M12 10m-3 0a3 3 0 106 0 3 3 0 00-6 0'
}

const formattedDistance = computed(() => {
  if (props.distance >= 1000) {
    return (props.distance / 1000).toFixed(1) + ' กม.'
  }
  return Math.round(props.distance) + ' ม.'
})
</script>

<template>
  <div class="turn-by-turn">
    <div class="maneuver-icon" :class="maneuver">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path :d="maneuverIcons[maneuver]"/>
      </svg>
    </div>
    
    <div class="instruction-content">
      <div class="distance">{{ formattedDistance }}</div>
      <div class="instruction">{{ instruction }}</div>
      <div v-if="streetName" class="street-name">{{ streetName }}</div>
    </div>
  </div>
</template>

<style scoped>
.turn-by-turn {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #000;
  border-radius: 12px;
  color: #fff;
}

.maneuver-icon {
  width: 56px;
  height: 56px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.maneuver-icon.arrive {
  background: #276ef1;
}

.instruction-content {
  flex: 1;
  min-width: 0;
}

.distance {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 4px;
}

.instruction {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.9);
}

.street-name {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>

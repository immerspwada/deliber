<script setup lang="ts">
/**
 * Feature: F284 - Lane Guidance
 * Lane guidance display for navigation
 */
defineProps<{
  lanes: Array<{
    directions: ('left' | 'straight' | 'right')[]
    active: boolean
  }>
}>()

const getArrowPath = (dir: string) => {
  switch (dir) {
    case 'left': return 'M9 18l-6-6 6-6'
    case 'right': return 'M15 18l6-6-6-6'
    default: return 'M12 19V5'
  }
}
</script>

<template>
  <div class="lane-guidance">
    <div v-for="(lane, index) in lanes" :key="index" class="lane" :class="{ active: lane.active }">
      <svg v-for="(dir, i) in lane.directions" :key="i" width="20" height="20" viewBox="0 0 24 24" 
           fill="none" stroke="currentColor" stroke-width="2.5">
        <path :d="getArrowPath(dir)"/>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.lane-guidance {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  background: #000;
  border-radius: 8px;
}

.lane {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.4);
}

.lane.active {
  background: #276ef1;
  color: #fff;
}
</style>

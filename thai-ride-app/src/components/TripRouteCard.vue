<script setup lang="ts">
/**
 * Feature: F236 - Trip Route Card
 * Display trip route with pickup and dropoff
 */
defineProps<{
  pickup: string
  dropoff: string
  distance?: number
  duration?: number
  stops?: string[]
}>()
</script>

<template>
  <div class="trip-route-card">
    <div class="route-point pickup">
      <span class="point-dot" />
      <div class="point-info">
        <span class="point-label">จุดรับ</span>
        <span class="point-address">{{ pickup }}</span>
      </div>
    </div>
    <div v-if="stops?.length" class="route-stops">
      <div v-for="(stop, i) in stops" :key="i" class="route-point stop">
        <span class="point-dot" />
        <span class="point-address">{{ stop }}</span>
      </div>
    </div>
    <div class="route-line" />
    <div class="route-point dropoff">
      <span class="point-dot" />
      <div class="point-info">
        <span class="point-label">จุดส่ง</span>
        <span class="point-address">{{ dropoff }}</span>
      </div>
    </div>
    <div v-if="distance || duration" class="route-meta">
      <span v-if="distance">{{ distance.toFixed(1) }} กม.</span>
      <span v-if="distance && duration" class="meta-dot" />
      <span v-if="duration">{{ duration }} นาที</span>
    </div>
  </div>
</template>

<style scoped>
.trip-route-card { padding: 16px; background: #fff; border-radius: 12px; border: 1px solid #e5e5e5; position: relative; }
.route-point { display: flex; align-items: flex-start; gap: 12px; position: relative; z-index: 1; }
.route-point.pickup { margin-bottom: 16px; }
.route-point.dropoff { margin-top: 16px; }
.route-point.stop { margin: 8px 0 8px 4px; }
.point-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; margin-top: 4px; }
.pickup .point-dot { background: #10b981; }
.dropoff .point-dot { background: #ef4444; }
.stop .point-dot { width: 8px; height: 8px; background: #6b6b6b; }
.point-info { flex: 1; }
.point-label { display: block; font-size: 11px; color: #6b6b6b; margin-bottom: 2px; }
.point-address { font-size: 14px; color: #000; }
.route-line { position: absolute; left: 21px; top: 40px; bottom: 40px; width: 2px; background: #e5e5e5; }
.route-meta { display: flex; align-items: center; gap: 8px; margin-top: 16px; padding-top: 12px; border-top: 1px solid #e5e5e5; font-size: 13px; color: #6b6b6b; }
.meta-dot { width: 4px; height: 4px; background: #ccc; border-radius: 50%; }
</style>

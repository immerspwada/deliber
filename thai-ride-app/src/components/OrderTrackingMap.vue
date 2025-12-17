<script setup lang="ts">
/**
 * Feature: F331 - Order Tracking Map
 * Map component for tracking delivery/shopping orders
 */
import { ref, onMounted, onUnmounted, watch } from 'vue'

interface Location {
  lat: number
  lng: number
}

interface TrackingData {
  pickup: Location
  dropoff: Location
  currentLocation?: Location
  status: 'pending' | 'picking_up' | 'in_transit' | 'delivered'
}

const props = withDefaults(defineProps<{
  tracking: TrackingData | null
  showRoute?: boolean
  autoCenter?: boolean
}>(), {
  showRoute: true,
  autoCenter: true
})

const mapInstance = ref<any>(null)

onMounted(() => {
  // Map initialization would go here
  console.log('Map mounted')
})

onUnmounted(() => {
  if (mapInstance.value) {
    mapInstance.value = null
  }
})

watch(() => props.tracking?.currentLocation, (newLoc) => {
  if (newLoc && props.autoCenter && mapInstance.value) {
    // Center map on current location
  }
})
</script>

<template>
  <div class="tracking-map">
    <div class="map-container">
      <div v-if="!tracking" class="map-placeholder">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5"/>
        </svg>
        <span>กำลังโหลดแผนที่...</span>
      </div>
    </div>
    
    <div v-if="tracking" class="status-overlay">
      <div class="status-badge" :class="tracking.status">
        <span v-if="tracking.status === 'pending'">รอรับออเดอร์</span>
        <span v-else-if="tracking.status === 'picking_up'">กำลังรับสินค้า</span>
        <span v-else-if="tracking.status === 'in_transit'">กำลังจัดส่ง</span>
        <span v-else-if="tracking.status === 'delivered'">ส่งสำเร็จ</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tracking-map {
  position: relative;
  width: 100%;
  height: 200px;
  border-radius: 12px;
  overflow: hidden;
}

.map-container {
  width: 100%;
  height: 100%;
  background: #f6f6f6;
}

.map-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #6b6b6b;
}

.map-placeholder span {
  font-size: 13px;
}

.status-overlay {
  position: absolute;
  top: 12px;
  left: 12px;
}

.status-badge {
  padding: 6px 12px;
  background: #fff;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.status-badge.pending {
  color: #6b6b6b;
}

.status-badge.picking_up {
  color: #276ef1;
}

.status-badge.in_transit {
  color: #000;
}

.status-badge.delivered {
  color: #2e7d32;
}
</style>

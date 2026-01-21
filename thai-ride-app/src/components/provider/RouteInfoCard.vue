<!--
  RouteInfoCard Component
  Display pickup and dropoff locations with visual route line
  Design: Clear hierarchy, Easy to scan
-->
<script setup lang="ts">
interface Props {
  pickupAddress: string
  dropoffAddress: string
}

defineProps<Props>()
</script>

<template>
  <article class="route-card" aria-label="เส้นทาง">
    <!-- Pickup Point -->
    <div class="route-point">
      <span class="point-marker pickup" aria-hidden="true"></span>
      <div class="point-content">
        <span class="point-label">จุดรับ</span>
        <span class="point-address">{{ pickupAddress }}</span>
      </div>
    </div>

    <!-- Route Line -->
    <div class="route-line" aria-hidden="true"></div>

    <!-- Dropoff Point -->
    <div class="route-point">
      <span class="point-marker dropoff" aria-hidden="true"></span>
      <div class="point-content">
        <span class="point-label">จุดส่ง</span>
        <span class="point-address">{{ dropoffAddress }}</span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.route-card {
  margin: 0 16px 16px;
  background: #FFFFFF;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

/* Route Point */
.route-point {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

/* Point Marker */
.point-marker {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}

.point-marker.pickup {
  background: #00A86B;
  border-radius: 50%;
}

.point-marker.dropoff {
  background: #EF4444;
  border-radius: 4px;
}

/* Point Content */
.point-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.point-label {
  font-size: 11px;
  color: #6B7280;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  line-height: 1;
}

.point-address {
  font-size: 14px;
  color: #111827;
  line-height: 1.5;
  font-weight: 500;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

/* Route Line */
.route-line {
  width: 2px;
  height: 24px;
  background: linear-gradient(to bottom, #00A86B, #EF4444);
  margin: 4px 0 4px 9px;
  border-radius: 1px;
}

/* Responsive */
@media (max-width: 360px) {
  .route-card {
    margin: 0 16px 16px;
    padding: 16px;
  }
  
  .point-address {
    font-size: 13px;
  }
}
</style>

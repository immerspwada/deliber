<!--
  ETADisplayCard Component
  Display estimated time of arrival with distance
  Design: Clean, Readable, Real-time updates
-->
<script setup lang="ts">
interface ETAData {
  formattedTime: string
  formattedDistance: string
}

interface Props {
  eta: ETAData | null
  destination: string
  arrivalTime?: string
}

defineProps<Props>()
</script>

<template>
  <article v-if="eta" class="eta-card" aria-label="เวลาโดยประมาณ">
    <!-- Header -->
    <div class="eta-header">
      <span class="eta-icon" aria-hidden="true">⏱️</span>
      <span class="eta-label">ถึง{{ destination }}</span>
    </div>

    <!-- Content -->
    <div class="eta-content">
      <!-- Time -->
      <div class="eta-time">
        <span class="eta-value">{{ eta.formattedTime }}</span>
        <span v-if="arrivalTime" class="eta-arrival">
          ถึงประมาณ {{ arrivalTime }}
        </span>
      </div>

      <!-- Distance -->
      <div class="eta-distance">
        <span class="eta-km">{{ eta.formattedDistance }}</span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.eta-card {
  margin: 0 16px 16px;
  background: #E8F5EF;
  border: 1px solid #A7F3D0;
  border-radius: 16px;
  padding: 16px;
}

/* Header */
.eta-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.eta-icon {
  font-size: 20px;
  line-height: 1;
}

.eta-label {
  font-size: 13px;
  color: #047857;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  line-height: 1;
}

/* Content */
.eta-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

/* Time */
.eta-time {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.eta-value {
  font-size: 28px;
  font-weight: 700;
  color: #065F46;
  line-height: 1;
}

.eta-arrival {
  font-size: 13px;
  color: #047857;
  font-weight: 500;
  line-height: 1.3;
}

/* Distance */
.eta-distance {
  flex-shrink: 0;
}

.eta-km {
  font-size: 18px;
  font-weight: 700;
  color: #065F46;
  line-height: 1;
}

/* Responsive */
@media (max-width: 360px) {
  .eta-card {
    margin: 0 16px 16px;
    padding: 14px;
  }
  
  .eta-value {
    font-size: 24px;
  }
  
  .eta-km {
    font-size: 16px;
  }
}
</style>

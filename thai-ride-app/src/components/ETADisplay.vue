<script setup lang="ts">
import { computed } from 'vue'
import { useETA, type ETAResult } from '../composables/useETA'

const props = defineProps<{
  eta?: ETAResult | null
  fromLat?: number
  fromLng?: number
  toLat?: number
  toLng?: number
  showTraffic?: boolean
  showArrival?: boolean
  compact?: boolean
}>()

const { 
  calculateETA, 
  formatETA, 
  getArrivalTime, 
  getTrafficText, 
  getTrafficColor 
} = useETA()

// Calculate ETA if coordinates provided
const displayETA = computed(() => {
  if (props.eta) return props.eta
  
  if (props.fromLat && props.fromLng && props.toLat && props.toLng) {
    return calculateETA(props.fromLat, props.fromLng, props.toLat, props.toLng)
  }
  
  return null
})

const formattedTime = computed(() => {
  if (!displayETA.value) return '--'
  return formatETA(displayETA.value.minutes)
})

const arrivalTime = computed(() => {
  if (!displayETA.value) return '--'
  return getArrivalTime(displayETA.value.minutes)
})

const trafficText = computed(() => {
  if (!displayETA.value) return ''
  return getTrafficText(displayETA.value.trafficLevel)
})

const trafficColor = computed(() => {
  if (!displayETA.value) return '#6B6B6B'
  return getTrafficColor(displayETA.value.trafficLevel)
})
</script>

<template>
  <div class="eta-display" :class="{ compact }">
    <div class="eta-main">
      <div class="eta-icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <div class="eta-content">
        <span class="eta-time">{{ formattedTime }}</span>
        <span v-if="showArrival && displayETA" class="eta-arrival">
          ถึงประมาณ {{ arrivalTime }}
        </span>
      </div>
    </div>

    <div v-if="showTraffic && displayETA" class="eta-traffic">
      <span class="traffic-dot" :style="{ background: trafficColor }"></span>
      <span class="traffic-text">{{ trafficText }}</span>
    </div>

    <div v-if="displayETA && !compact" class="eta-details">
      <div class="detail-item">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
        </svg>
        <span>{{ displayETA.distance }} กม.</span>
      </div>
      <div class="detail-item confidence">
        <span>ความแม่นยำ {{ displayETA.confidence }}%</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.eta-display {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #E5E5E5;
}

.eta-display.compact {
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.eta-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.eta-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #F6F6F6;
  display: flex;
  align-items: center;
  justify-content: center;
}

.eta-icon svg {
  width: 20px;
  height: 20px;
  color: #000;
}

.compact .eta-icon {
  width: 32px;
  height: 32px;
}

.compact .eta-icon svg {
  width: 16px;
  height: 16px;
}

.eta-content {
  display: flex;
  flex-direction: column;
}

.eta-time {
  font-size: 20px;
  font-weight: 700;
  color: #000;
}

.compact .eta-time {
  font-size: 16px;
}

.eta-arrival {
  font-size: 13px;
  color: #6B6B6B;
}

.eta-traffic {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #F6F6F6;
}

.compact .eta-traffic {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
  margin-left: auto;
}

.traffic-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.traffic-text {
  font-size: 13px;
  color: #6B6B6B;
}

.eta-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #F6F6F6;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6B6B6B;
}

.detail-item svg {
  width: 16px;
  height: 16px;
}

.detail-item.confidence {
  font-size: 11px;
  color: #999;
}
</style>

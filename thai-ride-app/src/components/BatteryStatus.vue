<script setup lang="ts">
/**
 * Feature: F279 - Battery Status
 * Device battery level indicator
 */
import { ref, onMounted, computed } from 'vue'

const props = withDefaults(defineProps<{
  showPercentage?: boolean
  warningLevel?: number
  criticalLevel?: number
}>(), {
  showPercentage: true,
  warningLevel: 20,
  criticalLevel: 10
})

const level = ref(100)
const charging = ref(false)
const supported = ref(true)

const status = computed(() => {
  if (level.value <= props.criticalLevel) return 'critical'
  if (level.value <= props.warningLevel) return 'warning'
  return 'normal'
})

onMounted(async () => {
  try {
    const battery = await (navigator as any).getBattery?.()
    if (battery) {
      level.value = Math.round(battery.level * 100)
      charging.value = battery.charging
      
      battery.addEventListener('levelchange', () => {
        level.value = Math.round(battery.level * 100)
      })
      battery.addEventListener('chargingchange', () => {
        charging.value = battery.charging
      })
    } else {
      supported.value = false
    }
  } catch {
    supported.value = false
  }
})
</script>

<template>
  <div v-if="supported" class="battery-status" :class="status">
    <div class="battery-icon">
      <div class="battery-body">
        <div class="battery-level" :style="{ width: level + '%' }"></div>
      </div>
      <div class="battery-tip"></div>
    </div>
    
    <svg v-if="charging" class="charging-icon" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/>
    </svg>
    
    <span v-if="showPercentage" class="percentage">{{ level }}%</span>
  </div>
</template>

<style scoped>
.battery-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.battery-icon {
  display: flex;
  align-items: center;
}

.battery-body {
  width: 24px;
  height: 12px;
  border: 1.5px solid currentColor;
  border-radius: 2px;
  padding: 1px;
  position: relative;
}

.battery-level {
  height: 100%;
  background: currentColor;
  border-radius: 1px;
  transition: width 0.3s;
}

.battery-tip {
  width: 2px;
  height: 6px;
  background: currentColor;
  border-radius: 0 1px 1px 0;
  margin-left: 1px;
}

.charging-icon {
  margin-left: 2px;
}

.percentage {
  font-size: 12px;
  font-weight: 500;
  margin-left: 2px;
}

.battery-status.normal {
  color: #000;
}

.battery-status.warning {
  color: #f5a623;
}

.battery-status.critical {
  color: #e11900;
}
</style>

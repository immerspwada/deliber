<script setup lang="ts">
/**
 * Feature: F300 - Waiting Timer
 * Driver waiting time display
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  startTime: Date | string
  freeWaitMinutes?: number
  chargePerMinute?: number
}>(), {
  freeWaitMinutes: 5,
  chargePerMinute: 2
})

const elapsed = ref(0)
let interval: ReturnType<typeof setInterval> | null = null

const minutes = computed(() => Math.floor(elapsed.value / 60))
const seconds = computed(() => elapsed.value % 60)
const isCharging = computed(() => minutes.value >= props.freeWaitMinutes)
const extraCharge = computed(() => {
  const chargeMinutes = Math.max(0, minutes.value - props.freeWaitMinutes)
  return chargeMinutes * props.chargePerMinute
})

onMounted(() => {
  const start = new Date(props.startTime).getTime()
  interval = setInterval(() => {
    elapsed.value = Math.floor((Date.now() - start) / 1000)
  }, 1000)
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
})
</script>

<template>
  <div class="waiting-timer" :class="{ charging: isCharging }">
    <div class="timer">
      <span class="time">{{ String(minutes).padStart(2, '0') }}:{{ String(seconds).padStart(2, '0') }}</span>
      <span class="label">เวลารอ</span>
    </div>
    <div v-if="isCharging" class="charge-info">
      <span class="charge">+฿{{ extraCharge }}</span>
      <span class="rate">฿{{ chargePerMinute }}/นาที</span>
    </div>
    <div v-else class="free-info">
      <span>ฟรี {{ freeWaitMinutes - minutes }} นาที</span>
    </div>
  </div>
</template>

<style scoped>
.waiting-timer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f6f6f6;
  border-radius: 8px;
}

.waiting-timer.charging {
  background: #fff3e0;
}

.timer {
  display: flex;
  flex-direction: column;
}

.time {
  font-size: 24px;
  font-weight: 700;
  font-family: monospace;
}

.label {
  font-size: 11px;
  color: #6b6b6b;
}

.charge-info {
  text-align: right;
}

.charge {
  display: block;
  font-size: 18px;
  font-weight: 600;
  color: #f5a623;
}

.rate {
  font-size: 11px;
  color: #6b6b6b;
}

.free-info {
  font-size: 13px;
  color: #6b6b6b;
}
</style>

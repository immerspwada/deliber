<script setup lang="ts">
/**
 * Feature: F228 - Countdown Timer
 * Display countdown timer
 */
import { ref, onMounted, onUnmounted, computed } from 'vue'

const props = defineProps<{
  seconds: number
  autoStart?: boolean
  showProgress?: boolean
}>()

const emit = defineEmits<{
  complete: []
  tick: [remaining: number]
}>()

const remaining = ref(props.seconds)
const isRunning = ref(false)
let interval: ReturnType<typeof setInterval> | null = null

const progress = computed(() => ((props.seconds - remaining.value) / props.seconds) * 100)

const formatTime = (secs: number) => {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const start = () => {
  if (isRunning.value) return
  isRunning.value = true
  interval = setInterval(() => {
    remaining.value--
    emit('tick', remaining.value)
    if (remaining.value <= 0) {
      stop()
      emit('complete')
    }
  }, 1000)
}

const stop = () => {
  isRunning.value = false
  if (interval) clearInterval(interval)
}

const reset = () => {
  stop()
  remaining.value = props.seconds
}

onMounted(() => { if (props.autoStart) start() })
onUnmounted(() => stop())

defineExpose({ start, stop, reset })
</script>

<template>
  <div class="countdown-timer">
    <div v-if="showProgress" class="timer-progress">
      <div class="progress-fill" :style="{ width: `${progress}%` }" />
    </div>
    <span class="timer-value" :class="{ warning: remaining <= 10 }">{{ formatTime(remaining) }}</span>
  </div>
</template>

<style scoped>
.countdown-timer { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.timer-progress { width: 100%; height: 4px; background: #e5e5e5; border-radius: 2px; overflow: hidden; }
.progress-fill { height: 100%; background: #000; transition: width 1s linear; }
.timer-value { font-size: 24px; font-weight: 700; color: #000; font-variant-numeric: tabular-nums; }
.timer-value.warning { color: #ef4444; }
</style>

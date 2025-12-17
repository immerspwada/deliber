<script setup lang="ts">
/**
 * Feature: F395 - Countdown
 * Countdown timer component
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const props = withDefaults(defineProps<{
  targetDate: string | Date
  format?: string
}>(), {
  format: 'DD:HH:mm:ss'
})

const emit = defineEmits<{ (e: 'finish'): void }>()

const now = ref(Date.now())
let timer: ReturnType<typeof setInterval>

const target = computed(() => new Date(props.targetDate).getTime())
const diff = computed(() => Math.max(0, target.value - now.value))

const days = computed(() => Math.floor(diff.value / (1000 * 60 * 60 * 24)))
const hours = computed(() => Math.floor((diff.value % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)))
const minutes = computed(() => Math.floor((diff.value % (1000 * 60 * 60)) / (1000 * 60)))
const seconds = computed(() => Math.floor((diff.value % (1000 * 60)) / 1000))

const formatted = computed(() => {
  return props.format
    .replace('DD', String(days.value).padStart(2, '0'))
    .replace('HH', String(hours.value).padStart(2, '0'))
    .replace('mm', String(minutes.value).padStart(2, '0'))
    .replace('ss', String(seconds.value).padStart(2, '0'))
})

watch(diff, (val) => {
  if (val === 0) emit('finish')
})

onMounted(() => {
  timer = setInterval(() => { now.value = Date.now() }, 1000)
})

onUnmounted(() => {
  clearInterval(timer)
})
</script>

<template>
  <div class="countdown">
    <div class="countdown-value">{{ formatted }}</div>
    <div v-if="diff > 0" class="countdown-parts">
      <div v-if="days > 0" class="part"><span class="num">{{ days }}</span><span class="label">วัน</span></div>
      <div class="part"><span class="num">{{ String(hours).padStart(2, '0') }}</span><span class="label">ชม.</span></div>
      <div class="part"><span class="num">{{ String(minutes).padStart(2, '0') }}</span><span class="label">นาที</span></div>
      <div class="part"><span class="num">{{ String(seconds).padStart(2, '0') }}</span><span class="label">วินาที</span></div>
    </div>
    <div v-else class="countdown-finished">
      <slot name="finished">หมดเวลา</slot>
    </div>
  </div>
</template>

<style scoped>
.countdown { text-align: center; }
.countdown-value { font-size: 32px; font-weight: 700; font-family: monospace; color: #000; }
.countdown-parts { display: flex; justify-content: center; gap: 16px; margin-top: 8px; }
.part { text-align: center; }
.num { display: block; font-size: 24px; font-weight: 700; color: #000; }
.label { font-size: 12px; color: #6b6b6b; }
.countdown-finished { font-size: 18px; color: #e11900; font-weight: 500; }
</style>

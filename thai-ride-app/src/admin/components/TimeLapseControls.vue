<script setup lang="ts">
/**
 * Component: TimeLapseControls
 * Controls สำหรับ time-lapse playback
 * 
 * Features:
 * - Play/Pause/Stop controls
 * - Speed adjustment
 * - Duration selection
 * - Progress bar
 * - Current timestamp display
 */

import { ref } from 'vue'

interface Props {
  isPlaying: boolean
  progress: number
  currentTimestamp: Date
  duration: '1h' | '6h' | '24h'
}

const props = defineProps<Props>()

const emit = defineEmits<{
  start: []
  pause: []
  stop: []
  speedChange: [speed: number]
  durationChange: [duration: '1h' | '6h' | '24h']
}>()

// Local state
const speed = ref(1)

// Speed options
const speedOptions = [
  { value: 0.5, label: '0.5x' },
  { value: 1, label: '1x' },
  { value: 2, label: '2x' },
  { value: 4, label: '4x' }
]

// Duration options
const durationOptions = [
  { value: '1h' as const, label: '1 ชั่วโมง' },
  { value: '6h' as const, label: '6 ชั่วโมง' },
  { value: '24h' as const, label: '24 ชั่วโมง' }
]

// Handle speed change
function handleSpeedChange(newSpeed: number): void {
  speed.value = newSpeed
  emit('speedChange', newSpeed)
}

// Handle duration change
function handleDurationChange(newDuration: '1h' | '6h' | '24h'): void {
  emit('durationChange', newDuration)
}

// Format timestamp
function formatTimestamp(date: Date): string {
  return date.toLocaleString('th-TH', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
    <div class="flex items-center gap-4">
      <!-- Play/Pause/Stop Controls -->
      <div class="flex items-center gap-2">
        <button
          v-if="!isPlaying"
          type="button"
          class="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          aria-label="Play"
          @click="$emit('start')"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
          </svg>
        </button>

        <button
          v-else
          type="button"
          class="p-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          aria-label="Pause"
          @click="$emit('pause')"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z"/>
          </svg>
        </button>

        <button
          type="button"
          class="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          aria-label="Stop"
          @click="$emit('stop')"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5.25 3A2.25 2.25 0 003 5.25v9.5A2.25 2.25 0 005.25 17h9.5A2.25 2.25 0 0017 14.75v-9.5A2.25 2.25 0 0014.75 3h-9.5z"/>
          </svg>
        </button>
      </div>

      <!-- Progress Bar -->
      <div class="flex-1">
        <div class="flex items-center justify-between text-xs text-gray-600 mb-1">
          <span>{{ formatTimestamp(currentTimestamp) }}</span>
          <span>{{ progress.toFixed(0) }}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div
            class="bg-blue-600 h-2 rounded-full transition-all duration-300"
            :style="{ width: `${progress}%` }"
          ></div>
        </div>
      </div>

      <!-- Speed Control -->
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-600">ความเร็ว:</span>
        <div class="flex gap-1">
          <button
            v-for="option in speedOptions"
            :key="option.value"
            type="button"
            :class="[
              'px-3 py-1 text-sm rounded-lg transition-colors',
              speed === option.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
            @click="handleSpeedChange(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <!-- Duration Control -->
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-600">ช่วงเวลา:</span>
        <select
          :value="duration"
          class="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          @change="handleDurationChange(($event.target as HTMLSelectElement).value as '1h' | '6h' | '24h')"
        >
          <option v-for="option in durationOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- Info -->
    <div class="mt-3 pt-3 border-t border-gray-200">
      <p class="text-xs text-gray-500">
        🎬 Time-lapse mode: แสดงการเคลื่อนไหวของ provider ย้อนหลัง {{ duration === '1h' ? '1 ชั่วโมง' : duration === '6h' ? '6 ชั่วโมง' : '24 ชั่วโมง' }}
      </p>
    </div>
  </div>
</template>

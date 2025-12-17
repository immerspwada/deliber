<script setup lang="ts">
/**
 * Feature: F251 - Time Ago
 * Display relative time (e.g., "5 นาทีที่แล้ว")
 */
import { computed } from 'vue'

const props = defineProps<{
  date: string | Date
}>()

const timeAgo = computed(() => {
  const now = new Date()
  const past = new Date(props.date)
  const diff = now.getTime() - past.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (seconds < 60) return 'เมื่อสักครู่'
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`
  if (days < 7) return `${days} วันที่แล้ว`
  return past.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
})
</script>

<template>
  <span class="time-ago">{{ timeAgo }}</span>
</template>

<style scoped>
.time-ago { font-size: 12px; color: #6b6b6b; }
</style>

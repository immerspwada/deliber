<script setup lang="ts">
/**
 * Feature: F190 - Date Range Picker
 * Select date range for filtering
 */
import { ref } from 'vue'

interface Props {
  startDate?: string
  endDate?: string
  presets?: { id: string; label: string; days: number }[]
}

withDefaults(defineProps<Props>(), {
  presets: () => [
    { id: 'today', label: 'วันนี้', days: 0 },
    { id: 'week', label: '7 วัน', days: 7 },
    { id: 'month', label: '30 วัน', days: 30 },
    { id: 'quarter', label: '90 วัน', days: 90 }
  ]
})

const emit = defineEmits<{
  change: [start: string, end: string]
}>()

const isOpen = ref(false)
const activePreset = ref('week')

const formatDate = (date?: string) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

const selectPreset = (presetId: string, days: number) => {
  activePreset.value = presetId
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  const startStr = start.toISOString().split('T')[0] ?? ''
  const endStr = end.toISOString().split('T')[0] ?? ''
  emit('change', startStr, endStr)
  isOpen.value = false
}
</script>

<template>
  <div class="date-range-picker" :class="{ open: isOpen }">
    <button type="button" class="picker-trigger" @click="isOpen = !isOpen">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
      </svg>
      <span v-if="startDate && endDate">{{ formatDate(startDate || '') }} - {{ formatDate(endDate || '') }}</span>
      <span v-else>เลือกช่วงเวลา</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6 9l6 6 6-6"/>
      </svg>
    </button>
    
    <div v-if="isOpen" class="picker-dropdown">
      <div class="preset-list">
        <button
          v-for="preset in presets"
          :key="preset.id"
          type="button"
          class="preset-btn"
          :class="{ active: activePreset === preset.id }"
          @click="selectPreset(preset.id, preset.days)"
        >
          {{ preset.label }}
        </button>
      </div>
    </div>
    
    <div v-if="isOpen" class="picker-backdrop" @click="isOpen = false"></div>
  </div>
</template>

<style scoped>
.date-range-picker {
  position: relative;
}

.picker-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 10px;
  font-size: 13px;
  color: #000;
  cursor: pointer;
  transition: border-color 0.2s;
}

.picker-trigger:hover,
.date-range-picker.open .picker-trigger {
  border-color: #000;
}

.picker-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  z-index: 100;
  overflow: hidden;
  min-width: 200px;
}

.preset-list {
  display: flex;
  flex-direction: column;
  padding: 8px;
}

.preset-btn {
  padding: 10px 14px;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  color: #000;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s;
}

.preset-btn:hover {
  background: #f6f6f6;
}

.preset-btn.active {
  background: #000;
  color: #fff;
}

.picker-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 99;
}
</style>
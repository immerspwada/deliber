<script setup lang="ts">
/**
 * Feature: F305 - Passenger Count
 * Passenger count selector
 */
const props = withDefaults(defineProps<{
  modelValue: number
  min?: number
  max?: number
}>(), {
  min: 1,
  max: 4
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const decrease = () => {
  if (props.modelValue > props.min) {
    emit('update:modelValue', props.modelValue - 1)
  }
}

const increase = () => {
  if (props.modelValue < props.max) {
    emit('update:modelValue', props.modelValue + 1)
  }
}
</script>

<template>
  <div class="passenger-count">
    <div class="label">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
      <span>จำนวนผู้โดยสาร</span>
    </div>
    <div class="controls">
      <button type="button" class="btn" :disabled="modelValue <= min" @click="decrease">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
      <span class="count">{{ modelValue }}</span>
      <button type="button" class="btn" :disabled="modelValue >= max" @click="increase">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.passenger-count {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f6f6f6;
  border-radius: 8px;
}

.label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #000;
}

.controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn {
  width: 36px;
  height: 36px;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.count {
  font-size: 18px;
  font-weight: 600;
  min-width: 24px;
  text-align: center;
}
</style>

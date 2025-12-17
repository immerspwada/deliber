<script setup lang="ts">
/**
 * Feature: F346 - Provider Status Toggle
 * Toggle for provider online/offline status
 */
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: boolean
  loading?: boolean
  disabled?: boolean
}>(), {
  loading: false,
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const isOnline = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})
</script>

<template>
  <div class="status-toggle" :class="{ online: isOnline, disabled }">
    <div class="toggle-content">
      <div class="status-indicator">
        <div class="indicator-dot" :class="{ pulse: isOnline }" />
      </div>
      <div class="status-info">
        <span class="status-label">{{ isOnline ? 'ออนไลน์' : 'ออฟไลน์' }}</span>
        <span class="status-desc">{{ isOnline ? 'พร้อมรับงาน' : 'ไม่รับงาน' }}</span>
      </div>
    </div>
    
    <button 
      type="button"
      class="toggle-btn"
      :class="{ active: isOnline }"
      :disabled="loading || disabled"
      @click="isOnline = !isOnline"
    >
      <span v-if="loading" class="spinner" />
      <span v-else class="toggle-knob" />
    </button>
  </div>
</template>

<style scoped>
.status-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #f6f6f6;
  border-radius: 12px;
  transition: background 0.3s;
}

.status-toggle.online {
  background: #e8f5e9;
}

.status-toggle.disabled {
  opacity: 0.6;
}

.toggle-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-indicator {
  width: 40px;
  height: 40px;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.indicator-dot {
  width: 12px;
  height: 12px;
  background: #6b6b6b;
  border-radius: 50%;
  transition: background 0.3s;
}

.status-toggle.online .indicator-dot {
  background: #2e7d32;
}

.indicator-dot.pulse {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.7; }
}

.status-info {
  display: flex;
  flex-direction: column;
}

.status-label {
  font-size: 16px;
  font-weight: 600;
  color: #000;
}

.status-desc {
  font-size: 13px;
  color: #6b6b6b;
}

.toggle-btn {
  width: 56px;
  height: 32px;
  background: #ccc;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  position: relative;
  transition: background 0.3s;
}

.toggle-btn.active {
  background: #000;
}

.toggle-btn:disabled {
  cursor: not-allowed;
}

.toggle-knob {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 24px;
  height: 24px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.3s;
}

.toggle-btn.active .toggle-knob {
  transform: translateX(24px);
}

.spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: translate(-50%, -50%) rotate(360deg); }
}
</style>

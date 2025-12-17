<script setup lang="ts">
/**
 * Feature: F191 - Export Button
 * Export data button with format options
 */
import { ref } from 'vue'

interface Props {
  formats?: string[]
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  formats: () => ['CSV', 'Excel', 'PDF'],
  loading: false
})

const emit = defineEmits<{
  export: [format: string]
}>()

const isOpen = ref(false)

const handleExport = (format: string) => {
  emit('export', format)
  isOpen.value = false
}
</script>

<template>
  <div class="export-button" :class="{ open: isOpen }">
    <button type="button" class="export-trigger" :disabled="loading" @click="isOpen = !isOpen">
      <svg v-if="!loading" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
      </svg>
      <div v-else class="loading-spinner"></div>
      <span>ส่งออก</span>
    </button>
    
    <div v-if="isOpen && !loading" class="export-menu">
      <button
        v-for="format in formats"
        :key="format"
        type="button"
        class="export-option"
        @click="handleExport(format)"
      >
        {{ format }}
      </button>
    </div>
    
    <div v-if="isOpen" class="export-backdrop" @click="isOpen = false"></div>
  </div>
</template>

<style scoped>
.export-button {
  position: relative;
}

.export-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.export-trigger:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.export-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
  overflow: hidden;
  min-width: 100px;
}

.export-option {
  display: block;
  width: 100%;
  padding: 10px 14px;
  background: transparent;
  border: none;
  font-size: 13px;
  color: #000;
  cursor: pointer;
  text-align: left;
}

.export-option:hover {
  background: #f6f6f6;
}

.export-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 99;
}
</style>
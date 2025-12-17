<script setup lang="ts">
/**
 * Feature: F192 - Refresh Button
 * Refresh data button with loading state
 */

interface Props {
  loading?: boolean
  lastUpdated?: string
}

withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<{
  refresh: []
}>()
</script>

<template>
  <button type="button" class="refresh-button" :class="{ loading }" :disabled="loading" @click="emit('refresh')">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="{ spinning: loading }">
      <path d="M23 4v6h-6M1 20v-6h6"/>
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
    </svg>
    <span v-if="lastUpdated" class="last-updated">{{ lastUpdated }}</span>
  </button>
</template>

<style scoped>
.refresh-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #f6f6f6;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  color: #6b6b6b;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-button:hover:not(:disabled) {
  background: #e5e5e5;
  color: #000;
}

.refresh-button:disabled {
  cursor: not-allowed;
}

.refresh-button svg.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.last-updated {
  font-size: 11px;
}
</style>
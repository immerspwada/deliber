<script setup lang="ts">
/**
 * Feature: F112 - Info Row
 * Label-value pair display
 */
interface Props {
  label: string
  value?: string | number
  copyable?: boolean
  monospace?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  value: '',
  copyable: false,
  monospace: false
})

const emit = defineEmits<{
  copy: [value: string]
}>()

const handleCopy = async () => {
  if (!props.copyable || !props.value) return
  
  try {
    await navigator.clipboard.writeText(String(props.value))
    emit('copy', String(props.value))
  } catch {
    console.error('Failed to copy')
  }
}
</script>

<template>
  <div class="info-row">
    <span class="info-label">{{ label }}</span>
    <div class="info-value-wrapper">
      <span class="info-value" :class="{ monospace }">
        <slot>{{ value }}</slot>
      </span>
      <button v-if="copyable && value" type="button" class="copy-btn" @click="handleCopy">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 12px 0;
}

.info-label {
  font-size: 14px;
  color: #6b6b6b;
  flex-shrink: 0;
}

.info-value-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.info-value {
  font-size: 14px;
  font-weight: 500;
  color: #000;
  text-align: right;
  word-break: break-word;
}

.info-value.monospace {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
  font-size: 13px;
}

.copy-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border: none;
  border-radius: 6px;
  color: #6b6b6b;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: #e5e5e5;
  color: #000;
}

.copy-btn:active {
  transform: scale(0.95);
}
</style>

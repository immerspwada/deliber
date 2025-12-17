<script setup lang="ts">
/**
 * Feature: F111 - Collapsible Section
 * Expandable/collapsible content section
 */
import { ref } from 'vue'

interface Props {
  title: string
  defaultOpen?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  defaultOpen: false,
  disabled: false
})

const isOpen = ref(props.defaultOpen)

const toggle = () => {
  if (!props.disabled) {
    isOpen.value = !isOpen.value
  }
}
</script>

<template>
  <div class="collapsible" :class="{ open: isOpen, disabled }">
    <button type="button" class="collapsible-header" :disabled="disabled" @click="toggle">
      <span class="collapsible-title">{{ title }}</span>
      <svg class="collapsible-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>
    
    <div class="collapsible-content">
      <div class="collapsible-body">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.collapsible {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
}

.collapsible.disabled {
  opacity: 0.6;
}

.collapsible-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: none;
  border: none;
  font-size: 16px;
  font-weight: 600;
  color: #000;
  cursor: pointer;
  transition: background 0.2s;
  text-align: left;
}

.collapsible-header:hover:not(:disabled) {
  background: #f6f6f6;
}

.collapsible-header:disabled {
  cursor: not-allowed;
}

.collapsible-icon {
  color: #6b6b6b;
  transition: transform 0.2s;
  flex-shrink: 0;
}

.collapsible.open .collapsible-icon {
  transform: rotate(180deg);
}

.collapsible-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.collapsible.open .collapsible-content {
  max-height: 1000px;
}

.collapsible-body {
  padding: 0 20px 20px;
}
</style>

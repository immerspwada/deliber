<script setup lang="ts">
/**
 * Feature: F375 - Collapsible
 * Collapsible content panel
 */
import { ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  open?: boolean
  title?: string
  disabled?: boolean
}>(), {
  open: false,
  disabled: false
})

const emit = defineEmits<{ (e: 'toggle', open: boolean): void }>()

const isOpen = ref(props.open)
watch(() => props.open, (v) => { isOpen.value = v })

const toggle = () => {
  if (props.disabled) return
  isOpen.value = !isOpen.value
  emit('toggle', isOpen.value)
}
</script>

<template>
  <div class="collapsible" :class="{ open: isOpen, disabled }">
    <button type="button" class="collapsible-header" @click="toggle">
      <slot name="header">
        <span class="collapsible-title">{{ title }}</span>
      </slot>
      <svg class="chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
    </button>
    <div class="collapsible-content" :style="{ maxHeight: isOpen ? '1000px' : '0' }">
      <div class="collapsible-inner">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.collapsible { border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden; }
.collapsible-header { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; background: #fff; border: none; cursor: pointer; text-align: left; }
.collapsible.disabled .collapsible-header { cursor: not-allowed; opacity: 0.6; }
.collapsible-title { font-size: 14px; font-weight: 500; color: #000; }
.chevron { transition: transform 0.2s; color: #6b6b6b; }
.collapsible.open .chevron { transform: rotate(180deg); }
.collapsible-content { max-height: 0; overflow: hidden; transition: max-height 0.3s ease; }
.collapsible-inner { padding: 0 16px 16px; }
</style>

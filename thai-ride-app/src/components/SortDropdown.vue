<script setup lang="ts">
/**
 * Feature: F189 - Sort Dropdown
 * Sorting options dropdown
 */
import { ref } from 'vue'

interface SortOption {
  id: string
  label: string
}

interface Props {
  options: SortOption[]
  selected?: string
  label?: string
}

withDefaults(defineProps<Props>(), {
  label: 'เรียงตาม'
})

const emit = defineEmits<{
  change: [id: string]
}>()

const isOpen = ref(false)

const selectOption = (id: string) => {
  emit('change', id)
  isOpen.value = false
}

const getSelectedLabel = (options: SortOption[], selected?: string) => {
  return options.find(o => o.id === selected)?.label || options[0]?.label || ''
}
</script>

<template>
  <div class="sort-dropdown" :class="{ open: isOpen }">
    <button type="button" class="dropdown-trigger" @click="isOpen = !isOpen">
      <span class="trigger-label">{{ label }}:</span>
      <span class="trigger-value">{{ getSelectedLabel(options, selected) }}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6 9l6 6 6-6"/>
      </svg>
    </button>
    
    <div v-if="isOpen" class="dropdown-menu">
      <button
        v-for="option in options"
        :key="option.id"
        type="button"
        class="dropdown-item"
        :class="{ active: selected === option.id }"
        @click="selectOption(option.id)"
      >
        {{ option.label }}
        <svg v-if="selected === option.id" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
      </button>
    </div>
    
    <div v-if="isOpen" class="dropdown-backdrop" @click="isOpen = false"></div>
  </div>
</template>

<style scoped>
.sort-dropdown {
  position: relative;
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.dropdown-trigger:hover,
.sort-dropdown.open .dropdown-trigger {
  border-color: #000;
}

.trigger-label {
  color: #6b6b6b;
}

.trigger-value {
  color: #000;
  font-weight: 500;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  min-width: 160px;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
  overflow: hidden;
}

.dropdown-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 12px 14px;
  background: transparent;
  border: none;
  font-size: 13px;
  color: #000;
  cursor: pointer;
  text-align: left;
}

.dropdown-item:hover {
  background: #f6f6f6;
}

.dropdown-item.active {
  font-weight: 600;
}

.dropdown-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 99;
}
</style>
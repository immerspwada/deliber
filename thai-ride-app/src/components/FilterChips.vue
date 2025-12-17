<script setup lang="ts">
/**
 * Feature: F188 - Filter Chips
 * Horizontal scrollable filter chips
 */

interface FilterOption {
  id: string
  label: string
  count?: number
}

interface Props {
  options: FilterOption[]
  selected?: string[]
  multiple?: boolean
}

withDefaults(defineProps<Props>(), {
  selected: () => [],
  multiple: false
})

const emit = defineEmits<{
  change: [selected: string[]]
}>()

const toggleFilter = (id: string, selected: string[], multiple: boolean) => {
  if (multiple) {
    const newSelected = selected.includes(id)
      ? selected.filter(s => s !== id)
      : [...selected, id]
    emit('change', newSelected)
  } else {
    emit('change', selected.includes(id) ? [] : [id])
  }
}
</script>

<template>
  <div class="filter-chips">
    <button
      v-for="option in options"
      :key="option.id"
      type="button"
      class="filter-chip"
      :class="{ active: selected.includes(option.id) }"
      @click="toggleFilter(option.id, selected, multiple)"
    >
      {{ option.label }}
      <span v-if="option.count !== undefined" class="chip-count">{{ option.count }}</span>
    </button>
  </div>
</template>

<style scoped>
.filter-chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 0;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.filter-chips::-webkit-scrollbar {
  display: none;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #f6f6f6;
  border: 1px solid transparent;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  color: #6b6b6b;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-chip:hover {
  border-color: #000;
  color: #000;
}

.filter-chip.active {
  background: #000;
  color: #fff;
  border-color: #000;
}

.chip-count {
  font-size: 11px;
  padding: 1px 6px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
}

.filter-chip.active .chip-count {
  background: rgba(255, 255, 255, 0.2);
}
</style>
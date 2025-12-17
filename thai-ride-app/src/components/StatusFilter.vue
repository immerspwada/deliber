<script setup lang="ts">
/**
 * Feature: F193 - Status Filter
 * Filter by status with counts
 */

interface StatusOption {
  id: string
  label: string
  count: number
  color?: string
}

interface Props {
  options: StatusOption[]
  selected?: string
}

withDefaults(defineProps<Props>(), {
  selected: 'all'
})

const emit = defineEmits<{
  change: [status: string]
}>()

const totalCount = (options: StatusOption[]) => options.reduce((sum, o) => sum + o.count, 0)
</script>

<template>
  <div class="status-filter">
    <button
      type="button"
      class="status-btn"
      :class="{ active: selected === 'all' }"
      @click="emit('change', 'all')"
    >
      <span class="status-label">ทั้งหมด</span>
      <span class="status-count">{{ totalCount(options) }}</span>
    </button>
    <button
      v-for="option in options"
      :key="option.id"
      type="button"
      class="status-btn"
      :class="{ active: selected === option.id }"
      @click="emit('change', option.id)"
    >
      <span v-if="option.color" class="status-dot" :style="{ background: option.color }"></span>
      <span class="status-label">{{ option.label }}</span>
      <span class="status-count">{{ option.count }}</span>
    </button>
  </div>
</template>

<style scoped>
.status-filter {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.status-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 20px;
  font-size: 13px;
  color: #6b6b6b;
  cursor: pointer;
  transition: all 0.2s;
}

.status-btn:hover {
  border-color: #000;
  color: #000;
}

.status-btn.active {
  background: #000;
  border-color: #000;
  color: #fff;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-label {
  font-weight: 500;
}

.status-count {
  font-size: 11px;
  padding: 1px 6px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 10px;
}

.status-btn.active .status-count {
  background: rgba(255, 255, 255, 0.2);
}
</style>
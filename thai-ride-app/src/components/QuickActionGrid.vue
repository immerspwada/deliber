<script setup lang="ts">
/**
 * Feature: F164 - Quick Action Grid
 * Display grid of quick action buttons
 */

interface QuickAction {
  id: string
  label: string
  icon: string
  badge?: number
  disabled?: boolean
}

interface Props {
  actions: QuickAction[]
  columns?: number
}

withDefaults(defineProps<Props>(), {
  columns: 4
})

const emit = defineEmits<{
  action: [id: string]
}>()

const getIconPath = (icon: string) => {
  const icons: Record<string, string> = {
    ride: 'M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2-4H8L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2M7 17a2 2 0 100-4 2 2 0 000 4zM17 17a2 2 0 100-4 2 2 0 000 4z',
    delivery: 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12',
    shopping: 'M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0',
    wallet: 'M21 4H3a2 2 0 00-2 2v12a2 2 0 002 2h18a2 2 0 002-2V6a2 2 0 00-2-2zM1 10h22',
    promo: 'M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01',
    history: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    help: 'M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01M22 12a10 10 0 11-20 0 10 10 0 0120 0z',
    settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z'
  }
  return icons[icon] || icons.help
}
</script>

<template>
  <div class="quick-action-grid" :style="{ gridTemplateColumns: `repeat(${columns}, 1fr)` }">
    <button
      v-for="action in actions"
      :key="action.id"
      type="button"
      class="action-item"
      :class="{ disabled: action.disabled }"
      :disabled="action.disabled"
      @click="emit('action', action.id)"
    >
      <div class="action-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path :d="getIconPath(action.icon)" />
        </svg>
        <span v-if="action.badge" class="action-badge">{{ action.badge > 99 ? '99+' : action.badge }}</span>
      </div>
      <span class="action-label">{{ action.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.quick-action-grid {
  display: grid;
  gap: 12px;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-item:hover:not(.disabled) {
  background: #E8F5EF;
  border-color: #00A86B;
}

.action-item:hover:not(.disabled) .action-icon {
  background: #00A86B;
  color: #fff;
}

.action-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-icon {
  position: relative;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border-radius: 12px;
  color: #000;
}

.action-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #00A86B;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  border-radius: 9px;
  padding: 0 4px;
}

.action-label {
  font-size: 12px;
  color: #000;
  text-align: center;
  line-height: 1.3;
}
</style>
<script setup lang="ts">
/**
 * Feature: F149 - Menu List
 * Settings/Profile menu list
 */

interface MenuItem {
  key: string
  label: string
  icon?: string
  badge?: string | number
  danger?: boolean
}

interface Props {
  items: MenuItem[]
}

defineProps<Props>()

const emit = defineEmits<{
  select: [key: string]
}>()
</script>

<template>
  <div class="menu-list">
    <button
      v-for="item in items"
      :key="item.key"
      type="button"
      class="menu-item"
      :class="{ danger: item.danger }"
      @click="emit('select', item.key)"
    >
      <div v-if="item.icon" class="menu-icon" v-html="item.icon" />
      <span class="menu-label">{{ item.label }}</span>
      <span v-if="item.badge" class="menu-badge">{{ item.badge }}</span>
      <svg class="menu-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.menu-list {
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px 20px;
  background: transparent;
  border: none;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.2s;
  text-align: left;
}


.menu-item:last-child {
  border-bottom: none;
}

.menu-item:hover {
  background: #f6f6f6;
}

.menu-item.danger {
  color: #c62828;
}

.menu-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b6b6b;
}

.menu-item.danger .menu-icon {
  color: #c62828;
}

.menu-label {
  flex: 1;
  font-size: 15px;
  font-weight: 500;
  color: #000;
}

.menu-item.danger .menu-label {
  color: #c62828;
}

.menu-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  background: #e11900;
  color: #fff;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}

.menu-arrow {
  color: #ccc;
  flex-shrink: 0;
}
</style>

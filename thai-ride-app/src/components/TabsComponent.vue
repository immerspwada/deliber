<script setup lang="ts">
/**
 * Feature: F84 - Tabs Component
 * Tab navigation with content panels
 */
import { provide, computed } from 'vue'

interface Tab {
  id: string
  label: string
  icon?: string
  disabled?: boolean
  badge?: string | number
}

interface Props {
  tabs: Tab[]
  modelValue?: string
  variant?: 'default' | 'pills' | 'underline'
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  variant: 'default'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const activeTab = computed({
  get: () => props.modelValue || props.tabs[0]?.id || '',
  set: (value: string) => emit('update:modelValue', value)
})

const selectTab = (tab: Tab) => {
  if (tab.disabled) return
  activeTab.value = tab.id
}

provide('activeTab', activeTab)
</script>

<template>
  <div class="tabs-container">
    <div class="tabs-header" :class="variant" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id, disabled: tab.disabled }"
        :disabled="tab.disabled"
        role="tab"
        :aria-selected="activeTab === tab.id"
        @click="selectTab(tab)"
      >
        <!-- Home icon -->
        <svg v-if="tab.icon === 'home'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <!-- History icon -->
        <svg v-else-if="tab.icon === 'history'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        <!-- Settings icon -->
        <svg v-else-if="tab.icon === 'settings'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
        </svg>
        <!-- User icon -->
        <svg v-else-if="tab.icon === 'user'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
        
        <span>{{ tab.label }}</span>
        
        <span v-if="tab.badge" class="tab-badge">{{ tab.badge }}</span>
      </button>
    </div>
    
    <div class="tabs-content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.tabs-container {
  width: 100%;
}

.tabs-header {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.tabs-header::-webkit-scrollbar {
  display: none;
}

/* Default variant */
.tabs-header.default {
  background: #f6f6f6;
  padding: 4px;
  border-radius: 12px;
}

.default .tab-btn {
  flex: 1;
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #6b6b6b;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  white-space: nowrap;
}

.default .tab-btn:hover:not(.disabled) {
  color: #000;
}

.default .tab-btn.active {
  background: #fff;
  color: #000;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

/* Pills variant */
.tabs-header.pills {
  gap: 8px;
}

.pills .tab-btn {
  padding: 10px 20px;
  background: #f6f6f6;
  border: none;
  border-radius: 100px;
  font-size: 14px;
  font-weight: 500;
  color: #6b6b6b;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.pills .tab-btn:hover:not(.disabled) {
  background: #e5e5e5;
}

.pills .tab-btn.active {
  background: #000;
  color: #fff;
}

/* Underline variant */
.tabs-header.underline {
  border-bottom: 1px solid #e5e5e5;
  gap: 0;
}

.underline .tab-btn {
  padding: 12px 20px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  font-size: 14px;
  font-weight: 500;
  color: #6b6b6b;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.underline .tab-btn:hover:not(.disabled) {
  color: #000;
}

.underline .tab-btn.active {
  color: #000;
  border-bottom-color: #000;
}

/* Disabled state */
.tab-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Badge */
.tab-badge {
  background: #e11900;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 100px;
  min-width: 18px;
  text-align: center;
}

.tabs-content {
  padding-top: 16px;
}
</style>

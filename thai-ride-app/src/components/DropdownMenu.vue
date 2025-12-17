<script setup lang="ts">
/**
 * Feature: F109 - Dropdown Menu
 * Dropdown menu with options
 */
import { ref, onMounted, onUnmounted } from 'vue'

interface MenuItem {
  id: string
  label: string
  icon?: string
  disabled?: boolean
  divider?: boolean
  danger?: boolean
}

interface Props {
  items: MenuItem[]
  position?: 'left' | 'right'
}

const props = withDefaults(defineProps<Props>(), {
  position: 'left'
})

const emit = defineEmits<{
  select: [item: MenuItem]
}>()

const isOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)

const toggle = () => {
  isOpen.value = !isOpen.value
}

const close = () => {
  isOpen.value = false
}

const handleSelect = (item: MenuItem) => {
  if (item.disabled || item.divider) return
  emit('select', item)
  close()
}

const handleClickOutside = (e: MouseEvent) => {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div ref="menuRef" class="dropdown-menu">
    <div class="dropdown-trigger" @click="toggle">
      <slot name="trigger">
        <button type="button" class="default-trigger">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
          </svg>
        </button>
      </slot>
    </div>
    
    <Transition name="dropdown">
      <div v-if="isOpen" class="dropdown-content" :class="position">
        <template v-for="item in items" :key="item.id">
          <div v-if="item.divider" class="dropdown-divider" />
          <button
            v-else
            type="button"
            class="dropdown-item"
            :class="{ disabled: item.disabled, danger: item.danger }"
            :disabled="item.disabled"
            @click="handleSelect(item)"
          >
            <!-- Edit icon -->
            <svg v-if="item.icon === 'edit'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            <!-- Delete icon -->
            <svg v-else-if="item.icon === 'delete'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
            <!-- Copy icon -->
            <svg v-else-if="item.icon === 'copy'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
            <!-- Share icon -->
            <svg v-else-if="item.icon === 'share'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            <!-- View icon -->
            <svg v-else-if="item.icon === 'view'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
            <span>{{ item.label }}</span>
          </button>
        </template>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dropdown-menu {
  position: relative;
  display: inline-flex;
}

.default-trigger {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 8px;
  color: #6b6b6b;
  cursor: pointer;
  transition: all 0.2s;
}

.default-trigger:hover {
  background: #f6f6f6;
  color: #000;
}

.dropdown-content {
  position: absolute;
  top: calc(100% + 4px);
  min-width: 180px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  padding: 8px;
  z-index: 100;
}

.dropdown-content.left {
  left: 0;
}

.dropdown-content.right {
  right: 0;
}

.dropdown-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: none;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  color: #000;
  cursor: pointer;
  transition: background 0.2s;
  text-align: left;
}

.dropdown-item:hover:not(.disabled) {
  background: #f6f6f6;
}

.dropdown-item.disabled {
  color: #ccc;
  cursor: not-allowed;
}

.dropdown-item.danger {
  color: #e11900;
}

.dropdown-item.danger:hover:not(.disabled) {
  background: rgba(225, 25, 0, 0.08);
}

.dropdown-divider {
  height: 1px;
  background: #e5e5e5;
  margin: 8px 0;
}

/* Animation */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>

<template>
  <div 
    class="place-card"
    :class="{ 'place-card--empty': !place }"
    @click="handleClick"
    @touchstart="startLongPress"
    @touchend="endLongPress"
    @touchcancel="endLongPress"
    @contextmenu.prevent="showActions = true"
  >
    <!-- Icon -->
    <div class="place-icon" :class="iconClass">
      <span v-if="place">{{ icon }}</span>
      <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
    </div>

    <!-- Content -->
    <div class="place-content">
      <div class="place-name">
        {{ displayName }}
      </div>
      <div v-if="place" class="place-address">
        {{ place.address }}
      </div>
    </div>

    <!-- Actions Menu (on long press) -->
    <div v-if="showActions && place" class="actions-menu">
      <button class="action-btn" @click.stop="handleEdit">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        แก้ไข
      </button>
      <button class="action-btn action-btn--danger" @click.stop="handleDelete">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        ลบ
      </button>
    </div>

    <!-- Backdrop for actions -->
    <div 
      v-if="showActions" 
      class="actions-backdrop"
      @click="showActions = false"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { SavedPlace } from '../composables/useSavedPlaces'

interface Props {
  place: SavedPlace | null
  type: 'home' | 'work' | 'favorite'
  emptyText?: string
}

const props = withDefaults(defineProps<Props>(), {
  emptyText: 'เพิ่มสถานที่'
})

const emit = defineEmits<{
  (e: 'click'): void
  (e: 'edit', place: SavedPlace): void
  (e: 'delete', place: SavedPlace): void
}>()

// State
const showActions = ref(false)
let longPressTimer: ReturnType<typeof setTimeout> | null = null

// Computed
const icon = computed(() => {
  if (!props.place) return ''
  switch (props.type) {
    case 'home': return '🏠'
    case 'work': return '💼'
    default: return '⭐'
  }
})

const iconClass = computed(() => {
  switch (props.type) {
    case 'home': return 'icon-home'
    case 'work': return 'icon-work'
    default: return 'icon-favorite'
  }
})

const displayName = computed(() => {
  if (!props.place) return props.emptyText
  if (props.place.customName) return props.place.customName
  switch (props.type) {
    case 'home': return 'บ้าน'
    case 'work': return 'ที่ทำงาน'
    default: return props.place.name
  }
})

// Handlers
function handleClick() {
  if (!showActions.value) {
    emit('click')
  }
}

function startLongPress() {
  longPressTimer = setTimeout(() => {
    if (props.place) {
      showActions.value = true
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50)
      }
    }
  }, 500)
}

function endLongPress() {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

function handleEdit() {
  if (props.place) {
    emit('edit', props.place)
    showActions.value = false
  }
}

function handleDelete() {
  if (props.place) {
    emit('delete', props.place)
    showActions.value = false
  }
}
</script>

<style scoped>
.place-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background-color: white;
  border-radius: 0.75rem;
  border: 1px solid #f3f4f6;
  cursor: pointer;
  transition: all 0.2s;
}

.place-card:active {
  background-color: #f9fafb;
  transform: scale(0.98);
}

.place-card--empty {
  border-style: dashed;
  border-color: #d1d5db;
  background-color: #f9fafb;
}

.place-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
}

.icon-home {
  background-color: #dbeafe;
  color: #2563eb;
}

.icon-work {
  background-color: #f3e8ff;
  color: #9333ea;
}

.icon-favorite {
  background-color: #fef3c7;
  color: #f59e0b;
}

.place-card--empty .place-icon {
  background-color: #e5e7eb;
  color: #9ca3af;
}

.place-content {
  flex: 1;
  min-width: 0;
}

.place-name {
  font-weight: 500;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.place-card--empty .place-name {
  color: #6b7280;
}

.place-address {
  font-size: 0.875rem;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.actions-menu {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  border: 1px solid #f3f4f6;
  overflow: hidden;
  z-index: 20;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  color: #374151;
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  cursor: pointer;
}

.action-btn:hover {
  background-color: #f9fafb;
}

.action-btn--danger {
  color: #dc2626;
}

.action-btn--danger:hover {
  background-color: #fef2f2;
}

.actions-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10;
}
</style>

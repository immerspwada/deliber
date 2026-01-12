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
  @apply relative flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 cursor-pointer transition-all;
}

.place-card:active {
  @apply bg-gray-50 scale-[0.98];
}

.place-card--empty {
  @apply border-dashed border-gray-300 bg-gray-50;
}

.place-icon {
  @apply w-10 h-10 rounded-full flex items-center justify-center text-lg;
}

.icon-home {
  @apply bg-blue-100 text-blue-600;
}

.icon-work {
  @apply bg-purple-100 text-purple-600;
}

.icon-favorite {
  @apply bg-amber-100 text-amber-600;
}

.place-card--empty .place-icon {
  @apply bg-gray-200 text-gray-400;
}

.place-content {
  @apply flex-1 min-w-0;
}

.place-name {
  @apply font-medium text-gray-900 truncate;
}

.place-card--empty .place-name {
  @apply text-gray-500;
}

.place-address {
  @apply text-sm text-gray-500 truncate;
}

.actions-menu {
  @apply absolute right-2 top-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden z-20;
}

.action-btn {
  @apply flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 w-full;
}

.action-btn--danger {
  @apply text-red-600 hover:bg-red-50;
}

.actions-backdrop {
  @apply fixed inset-0 z-10;
}
</style>

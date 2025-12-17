<script setup lang="ts">
/**
 * Feature: F69 - Bottom Sheet
 * Reusable bottom sheet component with drag-to-dismiss
 */
import { ref, watch, onMounted, onUnmounted } from 'vue'

interface Props {
  modelValue: boolean
  title?: string
  height?: 'auto' | 'half' | 'full'
  closable?: boolean
  persistent?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  height: 'auto',
  closable: true,
  persistent: false
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
}>()

const isDragging = ref(false)
const startY = ref(0)
const currentY = ref(0)
const translateY = ref(0)

const close = () => {
  if (!props.closable) return
  emit('update:modelValue', false)
  emit('close')
}

const handleOverlayClick = () => {
  if (!props.persistent) {
    close()
  }
}

const handleDragStart = (e: TouchEvent | MouseEvent) => {
  if (!props.closable) return
  isDragging.value = true
  const clientY = 'touches' in e ? e.touches[0]?.clientY ?? 0 : e.clientY
  startY.value = clientY
  currentY.value = clientY
}

const handleDragMove = (e: TouchEvent | MouseEvent) => {
  if (!isDragging.value) return
  currentY.value = 'touches' in e ? e.touches[0]?.clientY ?? 0 : e.clientY
  const diff = currentY.value - startY.value
  if (diff > 0) {
    translateY.value = diff
  }
}

const handleDragEnd = () => {
  if (!isDragging.value) return
  isDragging.value = false
  if (translateY.value > 100) {
    close()
  }
  translateY.value = 0
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.modelValue && props.closable && !props.persistent) {
    close()
  }
}

watch(() => props.modelValue, (val) => {
  if (val) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
    translateY.value = 0
  }
})

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="modelValue" class="bottom-sheet-overlay" @click="handleOverlayClick">
        <div
          ref="sheetRef"
          class="bottom-sheet"
          :class="[`height-${height}`]"
          :style="{ transform: `translateY(${translateY}px)` }"
          @click.stop
          @touchstart="handleDragStart"
          @touchmove="handleDragMove"
          @touchend="handleDragEnd"
          @mousedown="handleDragStart"
          @mousemove="handleDragMove"
          @mouseup="handleDragEnd"
          @mouseleave="handleDragEnd"
        >
          <div class="sheet-handle" />
          
          <div v-if="title || closable" class="sheet-header">
            <h3 v-if="title" class="sheet-title">{{ title }}</h3>
            <button v-if="closable" class="close-btn" @click="close">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          <div class="sheet-content">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.bottom-sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.bottom-sheet {
  width: 100%;
  background: #fff;
  border-radius: 16px 16px 0 0;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  touch-action: none;
}

.height-auto {
  max-height: 90vh;
}

.height-half {
  height: 50vh;
}

.height-full {
  height: 90vh;
}

.sheet-handle {
  width: 40px;
  height: 4px;
  background: #e5e5e5;
  border-radius: 2px;
  margin: 12px auto;
  cursor: grab;
}

.sheet-handle:active {
  cursor: grabbing;
}

.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px 16px;
  border-bottom: 1px solid #e5e5e5;
}

.sheet-title {
  font-size: 18px;
  font-weight: 600;
  color: #000;
  margin: 0;
}

.close-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.2s;
}

.close-btn:hover {
  background: #e5e5e5;
}

.sheet-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.3s ease;
}

.sheet-enter-active .bottom-sheet,
.sheet-leave-active .bottom-sheet {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .bottom-sheet,
.sheet-leave-to .bottom-sheet {
  transform: translateY(100%);
}
</style>

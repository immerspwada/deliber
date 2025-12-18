<!--
  Admin Modal Component - MUNEEF Style
  
  Modern modal dialog with backdrop, animations, and responsive design
  Features: size variants, close prevention, custom actions
-->

<template>
  <Teleport to="body">
    <Transition name="modal" appear>
      <div v-if="modelValue" class="modal-overlay" @click="handleOverlayClick">
        <div 
          :class="modalClasses"
          @click.stop
          role="dialog"
          :aria-labelledby="titleId"
          aria-modal="true"
        >
          <!-- Modal Header -->
          <div v-if="$slots.header || title" class="modal-header">
            <div class="header-content">
              <h3 v-if="title" :id="titleId" class="modal-title">{{ title }}</h3>
              <slot name="header" />
            </div>
            <AdminButton
              v-if="closable"
              variant="ghost"
              size="sm"
              :icon="CloseIcon"
              @click="handleClose"
              class="close-button"
            />
          </div>

          <!-- Modal Body -->
          <div class="modal-body">
            <slot />
          </div>

          <!-- Modal Footer -->
          <div v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch, nextTick } from 'vue'
import AdminButton from './AdminButton.vue'

// Close Icon Component
const CloseIcon = {
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>
  `
}

interface Props {
  modelValue: boolean
  title?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
  closable?: boolean
  closeOnOverlay?: boolean
  preventClose?: boolean
  persistent?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  closable: true,
  closeOnOverlay: true
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'close': []
  'open': []
}>()

const titleId = computed(() => `modal-title-${Math.random().toString(36).substr(2, 9)}`)

const modalClasses = computed(() => [
  'modal-content',
  `size-${props.size}`
])

const handleClose = () => {
  if (props.preventClose) return
  emit('update:modelValue', false)
  emit('close')
}

const handleOverlayClick = () => {
  if (props.closeOnOverlay && !props.persistent) {
    handleClose()
  }
}

// Handle body scroll lock
watch(() => props.modelValue, (isOpen) => {
  nextTick(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      emit('open')
    } else {
      document.body.style.overflow = ''
    }
  })
})

// Cleanup on unmount
import { onUnmounted } from 'vue'
onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal-content {
  background: #FFFFFF;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* Size Variants */
.size-xs {
  width: 100%;
  max-width: 320px;
}

.size-sm {
  width: 100%;
  max-width: 480px;
}

.size-md {
  width: 100%;
  max-width: 640px;
}

.size-lg {
  width: 100%;
  max-width: 800px;
}

.size-xl {
  width: 100%;
  max-width: 1024px;
}

.size-full {
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  border-radius: 0;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 24px 0 24px;
  flex-shrink: 0;
}

.header-content {
  flex: 1;
  min-width: 0;
}

.modal-title {
  font-size: 20px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0;
  line-height: 1.3;
}

.close-button {
  flex-shrink: 0;
  margin: -8px -8px 0 0;
}

.modal-body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  min-height: 0;
}

.modal-header + .modal-body {
  padding-top: 16px;
}

.modal-footer {
  padding: 0 24px 24px 24px;
  flex-shrink: 0;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

/* Animations */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.9) translateY(20px);
}

.modal-enter-to .modal-content,
.modal-leave-from .modal-content {
  transform: scale(1) translateY(0);
}

/* Responsive */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 8px;
    align-items: flex-end;
  }

  .modal-content {
    border-radius: 20px 20px 0 0;
    max-height: 95vh;
  }

  .size-full {
    border-radius: 0;
    max-height: 100vh;
  }

  .modal-header {
    padding: 20px 20px 0 20px;
  }

  .modal-body {
    padding: 20px;
  }

  .modal-footer {
    padding: 0 20px 20px 20px;
    flex-direction: column-reverse;
  }

  .modal-title {
    font-size: 18px;
  }

  /* Mobile slide up animation */
  .modal-enter-from .modal-content,
  .modal-leave-to .modal-content {
    transform: translateY(100%);
  }

  .modal-enter-to .modal-content,
  .modal-leave-from .modal-content {
    transform: translateY(0);
  }
}

/* Focus trap styles */
.modal-content:focus {
  outline: none;
}

/* Scrollbar styling for modal body */
.modal-body::-webkit-scrollbar {
  width: 6px;
}

.modal-body::-webkit-scrollbar-track {
  background: #F5F5F5;
  border-radius: 3px;
}

.modal-body::-webkit-scrollbar-thumb {
  background: #CCCCCC;
  border-radius: 3px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: #999999;
}
</style>
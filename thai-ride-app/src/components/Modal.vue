<script setup lang="ts">
/**
 * Feature: F92 - Modal Component
 * Reusable modal dialog
 */
import { watch, onMounted, onUnmounted } from 'vue'

interface Props {
  modelValue: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'full'
  closable?: boolean
  persistent?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  size: 'md',
  closable: true,
  persistent: false
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
}>()

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
    <Transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click="handleOverlayClick">
        <div class="modal" :class="`size-${size}`" @click.stop>
          <div v-if="title || closable" class="modal-header">
            <h2 v-if="title" class="modal-title">{{ title }}</h2>
            <button v-if="closable" class="close-btn" @click="close">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          <div class="modal-body">
            <slot />
          </div>
          
          <div v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal {
  background: #fff;
  border-radius: 16px;
  max-height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Size variants */
.size-sm {
  width: 100%;
  max-width: 360px;
}

.size-md {
  width: 100%;
  max-width: 480px;
}

.size-lg {
  width: 100%;
  max-width: 640px;
}

.size-full {
  width: 100%;
  height: 100%;
  max-width: none;
  border-radius: 0;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e5e5;
}

.modal-title {
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
  margin: -8px -8px -8px 0;
}

.close-btn:hover {
  background: #e5e5e5;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #e5e5e5;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

/* Animation */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .modal,
.modal-leave-active .modal {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal,
.modal-leave-to .modal {
  transform: scale(0.95);
}
</style>

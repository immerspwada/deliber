<!--
  Admin Modal Component
  ====================
  Reusable modal dialog
-->

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="admin-modal" @click.self="handleClose">
        <div :class="['admin-modal__dialog', `admin-modal__dialog--${size}`]">
          <div class="admin-modal__header">
            <h3 class="admin-modal__title">{{ title }}</h3>
            <button class="admin-modal__close" @click="handleClose">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <div class="admin-modal__body">
            <slot />
          </div>
          <div v-if="$slots.footer" class="admin-modal__footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean
  title: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeOnClickOutside?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  closeOnClickOutside: true
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const handleClose = () => {
  if (props.closeOnClickOutside) {
    emit('update:modelValue', false)
  }
}
</script>

<style scoped>
.admin-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.admin-modal__dialog {
  background: white;
  border-radius: 12px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.admin-modal__dialog--sm {
  width: 100%;
  max-width: 400px;
}

.admin-modal__dialog--md {
  width: 100%;
  max-width: 600px;
}

.admin-modal__dialog--lg {
  width: 100%;
  max-width: 800px;
}

.admin-modal__dialog--xl {
  width: 100%;
  max-width: 1200px;
}

.admin-modal__header {
  padding: 20px 24px;
  border-bottom: 1px solid #E5E7EB;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.admin-modal__title {
  font-size: 18px;
  font-weight: 600;
  color: #1F2937;
  margin: 0;
}

.admin-modal__close {
  padding: 4px;
  border: none;
  background: none;
  color: #6B7280;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s;
}

.admin-modal__close:hover {
  background: #F3F4F6;
  color: #1F2937;
}

.admin-modal__body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.admin-modal__footer {
  padding: 16px 24px;
  border-top: 1px solid #E5E7EB;
  background: #F9FAFB;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .admin-modal__dialog,
.modal-leave-active .admin-modal__dialog {
  transition: transform 0.2s;
}

.modal-enter-from .admin-modal__dialog,
.modal-leave-to .admin-modal__dialog {
  transform: scale(0.95);
}
</style>

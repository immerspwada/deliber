<script setup lang="ts">
/**
 * Feature: F70 - Action Sheet
 * iOS-style action sheet with multiple options
 */
import { onMounted, onUnmounted, watch } from 'vue'

interface ActionItem {
  id: string
  label: string
  icon?: string
  destructive?: boolean
  disabled?: boolean
}

interface Props {
  modelValue: boolean
  title?: string
  message?: string
  actions: ActionItem[]
  cancelLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  message: '',
  cancelLabel: 'ยกเลิก'
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  select: [actionId: string]
  cancel: []
}>()

const close = () => {
  emit('update:modelValue', false)
}

const handleSelect = (action: ActionItem) => {
  if (action.disabled) return
  emit('select', action.id)
  close()
}

const handleCancel = () => {
  emit('cancel')
  close()
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.modelValue) {
    handleCancel()
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
    <Transition name="action-sheet">
      <div v-if="modelValue" class="action-sheet-overlay" @click="handleCancel">
        <div class="action-sheet" @click.stop>
          <div class="action-group">
            <div v-if="title || message" class="action-header">
              <p v-if="title" class="action-title">{{ title }}</p>
              <p v-if="message" class="action-message">{{ message }}</p>
            </div>
            
            <button
              v-for="action in actions"
              :key="action.id"
              class="action-item"
              :class="{ destructive: action.destructive, disabled: action.disabled }"
              :disabled="action.disabled"
              @click="handleSelect(action)"
            >
              <!-- Phone icon -->
              <svg v-if="action.icon === 'phone'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
              </svg>
              <!-- Message icon -->
              <svg v-else-if="action.icon === 'message'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
              <!-- Share icon -->
              <svg v-else-if="action.icon === 'share'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              <!-- Report icon -->
              <svg v-else-if="action.icon === 'report'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
              </svg>
              <!-- Block icon -->
              <svg v-else-if="action.icon === 'block'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
              </svg>
              <!-- Delete icon -->
              <svg v-else-if="action.icon === 'delete'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
              <!-- Edit icon -->
              <svg v-else-if="action.icon === 'edit'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              <!-- Copy icon -->
              <svg v-else-if="action.icon === 'copy'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
              </svg>
              <span>{{ action.label }}</span>
            </button>
          </div>
          
          <button class="cancel-btn" @click="handleCancel">
            {{ cancelLabel }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.action-sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 8px;
}

.action-sheet {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-group {
  background: #fff;
  border-radius: 14px;
  overflow: hidden;
}

.action-header {
  padding: 16px;
  text-align: center;
  border-bottom: 1px solid #e5e5e5;
}

.action-title {
  font-size: 13px;
  font-weight: 600;
  color: #6b6b6b;
  margin: 0 0 4px;
}

.action-message {
  font-size: 13px;
  color: #6b6b6b;
  margin: 0;
}

.action-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background: none;
  border: none;
  border-bottom: 1px solid #e5e5e5;
  font-size: 18px;
  color: #000;
  cursor: pointer;
  transition: background 0.2s;
}

.action-item:last-child {
  border-bottom: none;
}

.action-item:hover:not(.disabled) {
  background: #f6f6f6;
}

.action-item.destructive {
  color: #e11900;
}

.action-item.disabled {
  color: #ccc;
  cursor: not-allowed;
}

.cancel-btn {
  width: 100%;
  padding: 16px;
  background: #fff;
  border: none;
  border-radius: 14px;
  font-size: 18px;
  font-weight: 600;
  color: #000;
  cursor: pointer;
  transition: background 0.2s;
}

.cancel-btn:hover {
  background: #f6f6f6;
}

.action-sheet-enter-active,
.action-sheet-leave-active {
  transition: opacity 0.3s ease;
}

.action-sheet-enter-active .action-sheet,
.action-sheet-leave-active .action-sheet {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}

.action-sheet-enter-from,
.action-sheet-leave-to {
  opacity: 0;
}

.action-sheet-enter-from .action-sheet,
.action-sheet-leave-to .action-sheet {
  transform: translateY(100%);
}
</style>

<!--
  Feature: F67 - Toast Container Component
  
  แสดง Toast notifications
  - Stack จากล่างขึ้นบน
  - Animation เข้า/ออก
  - รองรับ action button
-->
<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div 
          v-for="toast in toasts" 
          :key="toast.id"
          class="toast"
          :class="toast.type"
        >
          <!-- Icon -->
          <div class="toast-icon">
            <svg v-if="toast.type === 'success'" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            <svg v-else-if="toast.type === 'error'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <svg v-else-if="toast.type === 'warning'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          </div>

          <!-- Message -->
          <div class="toast-content">
            <span class="toast-message">{{ toast.message }}</span>
            <button 
              v-if="toast.action" 
              class="toast-action"
              @click="handleAction(toast)"
            >
              {{ toast.action.label }}
            </button>
          </div>

          <!-- Close Button -->
          <button class="toast-close" @click="removeToast(toast.id)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToast, type Toast } from '../composables/useToast'

const { toasts, removeToast } = useToast()

const handleAction = (toast: Toast) => {
  if (toast.action?.callback) {
    toast.action.callback()
  }
  removeToast(toast.id)
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  bottom: calc(80px + env(safe-area-inset-bottom));
  left: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 9999;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #000000;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  pointer-events: auto;
}

.toast.success {
  background: #22c55e;
}

.toast.error {
  background: #e11900;
}

.toast.warning {
  background: #f59e0b;
}

.toast.info {
  background: #276ef1;
}

.toast-icon {
  flex-shrink: 0;
  color: #ffffff;
}

.toast-content {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.toast-message {
  font-size: 14px;
  color: #ffffff;
}

.toast-action {
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  color: #ffffff;
  cursor: pointer;
  white-space: nowrap;
}

.toast-action:hover {
  background: rgba(255, 255, 255, 0.3);
}

.toast-close {
  flex-shrink: 0;
  padding: 4px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  border-radius: 4px;
}

.toast-close:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.1);
}

/* Transitions */
.toast-enter-active {
  animation: toast-in 0.3s ease;
}

.toast-leave-active {
  animation: toast-out 0.2s ease;
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes toast-out {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
}
</style>

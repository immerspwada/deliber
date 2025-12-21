<template>
  <Teleport to="body">
    <div 
      :class="[
        'toast-container',
        `toast-container-${position}`
      ]"
      role="region"
      aria-label="การแจ้งเตือน"
      aria-live="polite"
    >
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="[
            'toast',
            `toast-${toast.type}`
          ]"
          role="alert"
          :aria-labelledby="`toast-title-${toast.id}`"
          :aria-describedby="`toast-message-${toast.id}`"
        >
          <!-- Icon -->
          <div class="toast-icon">
            <svg
              v-if="toast.icon === 'loading'"
              class="toast-icon-loading"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10" opacity="0.25"/>
              <path d="M12 2 A10 10 0 0 1 22 12" stroke-linecap="round"/>
            </svg>
            
            <svg
              v-else-if="toast.type === 'success'"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
            
            <svg
              v-else-if="toast.type === 'error'"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10"/>
              <path d="m15 9-6 6m0-6 6 6"/>
            </svg>
            
            <svg
              v-else-if="toast.type === 'warning'"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <path d="M12 9v4m0 4h.01"/>
            </svg>
            
            <svg
              v-else
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4m0-4h.01"/>
            </svg>
          </div>
          
          <!-- Content -->
          <div class="toast-content">
            <div
              v-if="toast.title"
              :id="`toast-title-${toast.id}`"
              class="toast-title"
            >
              {{ toast.title }}
            </div>
            <div
              :id="`toast-message-${toast.id}`"
              class="toast-message"
            >
              {{ toast.message }}
            </div>
            
            <!-- Actions -->
            <div v-if="toast.actions && toast.actions.length > 0" class="toast-actions">
              <button
                v-for="(action, index) in toast.actions"
                :key="index"
                :class="[
                  'toast-action-btn',
                  `toast-action-btn-${action.style || 'secondary'}`
                ]"
                @click="handleAction(toast.id, action.action)"
              >
                {{ action.label }}
              </button>
            </div>
          </div>
          
          <!-- Close button -->
          <button
            v-if="!toast.persistent || toast.actions"
            class="toast-close"
            @click="removeToast(toast.id)"
            aria-label="ปิดการแจ้งเตือน"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m18 6-12 12m0-12 12 12"/>
            </svg>
          </button>
          
          <!-- Progress bar for auto-dismiss -->
          <div
            v-if="!toast.persistent && toast.duration"
            class="toast-progress"
            :style="{
              animationDuration: `${toast.duration}ms`
            }"
          />
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToast } from '../composables/useToast'

interface Props {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
}

const props = withDefaults(defineProps<Props>(), {
  position: 'top-right'
})

const { toasts, removeToast } = useToast({ position: props.position })

const handleAction = (toastId: string, action: () => void) => {
  action()
  removeToast(toastId)
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;
  max-width: min(400px, calc(100vw - 32px));
}

.toast-container-top-right {
  top: 16px;
  right: 16px;
}

.toast-container-top-left {
  top: 16px;
  left: 16px;
}

.toast-container-bottom-right {
  bottom: 16px;
  right: 16px;
}

.toast-container-bottom-left {
  bottom: 16px;
  left: 16px;
}

.toast-container-top-center {
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
}

.toast-container-bottom-center {
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
}

.toast {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  pointer-events: auto;
  overflow: hidden;
  font-family: 'Sarabun', sans-serif;
  backdrop-filter: blur(10px);
  min-width: 300px;
}

.toast-success {
  background-color: #F0FDF4;
  border: 2px solid #BBF7D0;
  color: #14532D;
}

.toast-error {
  background-color: #FEF2F2;
  border: 2px solid #FECACA;
  color: #7F1D1D;
}

.toast-warning {
  background-color: #FFFBEB;
  border: 2px solid #FED7AA;
  color: #9A3412;
}

.toast-info {
  background-color: #EFF6FF;
  border: 2px solid #BFDBFE;
  color: #1E3A8A;
}

.toast-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.toast-success .toast-icon {
  color: #00A86B;
}

.toast-error .toast-icon {
  color: #E53935;
}

.toast-warning .toast-icon {
  color: #F5A623;
}

.toast-info .toast-icon {
  color: #1565C0;
}

.toast-icon-loading {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 4px;
}

.toast-message {
  font-size: 14px;
  line-height: 1.5;
}

.toast-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.toast-action-btn {
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  border: none;
  cursor: pointer;
}

.toast-action-btn-primary {
  background-color: #00A86B;
  color: white;
}

.toast-action-btn-primary:hover {
  background-color: #008F5B;
}

.toast-action-btn-secondary {
  background-color: #E5E7EB;
  color: #374151;
}

.toast-action-btn-secondary:hover {
  background-color: #D1D5DB;
}

.toast-close {
  flex-shrink: 0;
  padding: 4px;
  border-radius: 8px;
  transition: all 0.2s ease;
  background: transparent;
  border: none;
  cursor: pointer;
}

.toast-close:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 4px;
  background: currentColor;
  opacity: 0.3;
  animation: toast-progress linear forwards;
  width: 100%;
}

@keyframes toast-progress {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

/* Toast transitions */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.toast-container-top-left .toast-enter-from,
.toast-container-bottom-left .toast-enter-from {
  transform: translateX(-100%);
}

.toast-container-top-center .toast-enter-from,
.toast-container-bottom-center .toast-enter-from {
  transform: translateX(0) translateY(-16px);
}

/* Responsive */
@media (max-width: 640px) {
  .toast-container {
    left: 16px;
    right: 16px;
    max-width: calc(100vw - 32px);
  }
  
  .toast-container-top-center,
  .toast-container-bottom-center {
    left: 16px;
    right: 16px;
    transform: translateX(0);
  }
  
  .toast {
    min-width: 0;
    width: 100%;
  }
  
  .toast-title {
    font-size: 14px;
  }
  
  .toast-message {
    font-size: 12px;
  }
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .toast-success {
    background-color: rgba(20, 83, 45, 0.9);
    border-color: #166534;
    color: #BBF7D0;
  }
  
  .toast-error {
    background-color: rgba(127, 29, 29, 0.9);
    border-color: #B91C1C;
    color: #FECACA;
  }
  
  .toast-warning {
    background-color: rgba(154, 52, 18, 0.9);
    border-color: #C2410C;
    color: #FED7AA;
  }
  
  .toast-info {
    background-color: rgba(30, 58, 138, 0.9);
    border-color: #1D4ED8;
    color: #BFDBFE;
  }
  
  .toast-action-btn-secondary {
    background-color: #374151;
    color: #F3F4F6;
  }
  
  .toast-action-btn-secondary:hover {
    background-color: #4B5563;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .toast {
    border-width: 4px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active {
    transition: none;
  }
  
  .toast-icon-loading {
    animation: none;
  }
  
  .toast-progress {
    display: none;
  }
}
</style>

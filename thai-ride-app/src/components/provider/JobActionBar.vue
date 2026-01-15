<!--
  JobActionBar Component
  Fixed bottom action bar with primary actions
  Design: Touch-friendly, Clear hierarchy, Safe area support
-->
<script setup lang="ts">
interface Props {
  canUpdate: boolean
  updating: boolean
  isCompleted: boolean
  isCancelled: boolean
  nextAction?: string
  isLastStep?: boolean
}

interface Emits {
  (e: 'navigate'): void
  (e: 'updateStatus'): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  isLastStep: false
})

const emit = defineEmits<Emits>()
</script>

<template>
  <div 
    v-if="!isCompleted && !isCancelled" 
    class="action-bar"
    role="toolbar"
    aria-label="การดำเนินการ"
  >
    <!-- Navigate Button -->
    <button 
      class="btn-navigate"
      @click="emit('navigate')"
      type="button"
      aria-label="เปิดแผนที่นำทาง"
    >
      <!-- Navigation Icon -->
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <polygon points="3 11 22 2 13 21 11 13 3 11"/>
      </svg>
      <span>นำทาง</span>
    </button>

    <!-- Update Status Button -->
    <button 
      v-if="canUpdate && nextAction"
      class="btn-primary"
      :class="{ completing: isLastStep }"
      :disabled="updating"
      @click="emit('updateStatus')"
      type="button"
    >
      <!-- Loading Spinner -->
      <span v-if="updating" class="spinner" aria-hidden="true"></span>
      <span v-else>{{ nextAction }}</span>
    </button>

    <!-- Cancel Button -->
    <button 
      class="btn-cancel"
      @click="emit('cancel')"
      type="button"
      aria-label="ยกเลิกงาน"
    >
      ยกเลิกงาน
    </button>
  </div>
</template>

<style scoped>
.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  background: #FFFFFF;
  border-top: 1px solid #E5E7EB;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 20;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.08);
}

/* Navigate Button */
.btn-navigate {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px;
  min-height: 52px;
  background: #FFFFFF;
  color: #00A86B;
  border: 2px solid #00A86B;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-navigate svg {
  width: 20px;
  height: 20px;
}

.btn-navigate:active {
  background: #00A86B;
  color: #fff;
}

.btn-navigate:focus-visible {
  outline: 2px solid #00A86B;
  outline-offset: 2px;
}

/* Primary Button */
.btn-primary {
  padding: 16px;
  background: #00A86B;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 56px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-primary:active:not(:disabled) {
  background: #008F5B;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary:focus-visible {
  outline: 2px solid #00A86B;
  outline-offset: 2px;
}

.btn-primary.completing {
  background: #059669;
}

/* Cancel Button */
.btn-cancel {
  padding: 12px;
  background: #FFFFFF;
  color: #6B7280;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 44px;
}

.btn-cancel:active {
  background: #F3F4F6;
  color: #374151;
}

.btn-cancel:focus-visible {
  outline: 2px solid #6B7280;
  outline-offset: 2px;
}

/* Loading Spinner */
.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 360px) {
  .action-bar {
    padding: 14px 16px;
    padding-bottom: calc(14px + env(safe-area-inset-bottom));
    gap: 10px;
  }
  
  .btn-navigate {
    min-height: 48px;
    font-size: 14px;
  }
  
  .btn-primary {
    min-height: 52px;
    font-size: 15px;
  }
}
</style>

<!--
  JobActionBar Component - Professional Redesign
  
  Design Standards (Uber/Grab/Bolt):
  - Primary action always visible and prominent
  - Navigation as secondary action
  - Cancel tucked away but accessible
  - Touch targets ≥ 48px
  - Clear visual hierarchy
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
    <!-- Top Row: Navigate + Cancel -->
    <div class="action-row-secondary">
      <!-- Navigate Button -->
      <button 
        class="btn-navigate"
        type="button"
        aria-label="เปิดแผนที่นำทาง"
        @click="emit('navigate')"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M21 3L3 10.53v.98l6.84 2.65L12.48 21h.98L21 3z"/>
        </svg>
        <span>นำทาง</span>
      </button>

      <!-- Cancel Button (Small) -->
      <button 
        class="btn-cancel-small"
        type="button"
        aria-label="ยกเลิกงาน"
        @click="emit('cancel')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <path d="M15 9l-6 6M9 9l6 6"/>
        </svg>
        <span>ยกเลิก</span>
      </button>
    </div>

    <!-- Primary Action Button - Full Width -->
    <button 
      v-if="canUpdate && nextAction"
      class="btn-primary"
      :class="{ 
        completing: isLastStep,
        'pulse-animation': !updating 
      }"
      :disabled="updating"
      type="button"
      @click="emit('updateStatus')"
    >
      <span v-if="updating" class="spinner" aria-hidden="true"></span>
      <template v-else>
        <svg v-if="isLastStep" class="check-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
        </svg>
        <span>{{ nextAction }}</span>
        <svg v-if="!isLastStep" class="arrow-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z"/>
        </svg>
      </template>
    </button>
  </div>
</template>

<style scoped>
.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  background: #FFFFFF;
  border-top: 1px solid #E5E7EB;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 20;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
}

/* Secondary Row */
.action-row-secondary {
  display: flex;
  gap: 10px;
}

/* Navigate Button */
.btn-navigate {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  min-height: 48px;
  background: #F3F4F6;
  color: #374151;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-navigate svg {
  width: 20px;
  height: 20px;
  color: #00A86B;
}

.btn-navigate:active {
  background: #E5E7EB;
  transform: scale(0.98);
}

/* Cancel Button (Small) */
.btn-cancel-small {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 16px;
  min-height: 48px;
  background: #FEF2F2;
  color: #DC2626;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-cancel-small svg {
  width: 18px;
  height: 18px;
}

.btn-cancel-small:active {
  background: #FEE2E2;
  transform: scale(0.98);
}

/* Primary Button */
.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 18px 24px;
  min-height: 60px;
  background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%);
  color: #FFFFFF;
  border: none;
  border-radius: 14px;
  font-size: 17px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.btn-primary svg {
  width: 22px;
  height: 22px;
}

.btn-primary:active:not(:disabled) {
  transform: scale(0.98);
  box-shadow: 0 2px 8px rgba(0, 168, 107, 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-primary.completing {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
}

/* Pulse Animation for attention */
.btn-primary.pulse-animation {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
  }
  50% {
    box-shadow: 0 4px 20px rgba(0, 168, 107, 0.5);
  }
}

/* Icons */
.check-icon {
  color: #FFFFFF;
}

.arrow-icon {
  color: rgba(255, 255, 255, 0.8);
}

/* Loading Spinner */
.spinner {
  display: inline-block;
  width: 22px;
  height: 22px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Focus States */
.btn-navigate:focus-visible,
.btn-cancel-small:focus-visible,
.btn-primary:focus-visible {
  outline: 2px solid #00A86B;
  outline-offset: 2px;
}

/* Responsive */
@media (max-width: 360px) {
  .action-bar {
    padding: 10px 14px;
    padding-bottom: calc(10px + env(safe-area-inset-bottom));
    gap: 10px;
  }
  
  .btn-navigate,
  .btn-cancel-small {
    min-height: 44px;
    font-size: 13px;
    padding: 10px 12px;
  }
  
  .btn-primary {
    min-height: 54px;
    font-size: 15px;
    padding: 14px 20px;
  }
  
  .btn-primary svg {
    width: 20px;
    height: 20px;
  }
}
</style>

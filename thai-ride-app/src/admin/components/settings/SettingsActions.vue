<template>
  <div class="settings-actions">
    <button
      v-if="showReset"
      type="button"
      class="btn btn-ghost"
      @click="$emit('reset')"
      :disabled="loading || !hasChanges"
    >
      รีเซ็ต
    </button>
    
    <div class="actions-right">
      <button
        v-if="showCancel"
        type="button"
        class="btn btn-secondary"
        @click="$emit('cancel')"
        :disabled="loading"
      >
        ยกเลิก
      </button>
      
      <button
        type="submit"
        class="btn btn-primary"
        :disabled="loading || !hasChanges"
        :aria-busy="loading"
      >
        <svg 
          v-if="loading" 
          class="animate-spin h-5 w-5 mr-2" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span v-if="loading">{{ loadingText }}</span>
        <span v-else>{{ saveText }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  loading?: boolean
  hasChanges?: boolean
  showCancel?: boolean
  showReset?: boolean
  saveText?: string
  loadingText?: string
}

withDefaults(defineProps<Props>(), {
  loading: false,
  hasChanges: false,
  showCancel: true,
  showReset: false,
  saveText: 'บันทึก',
  loadingText: 'กำลังบันทึก...'
})

defineEmits<{
  cancel: []
  reset: []
}>()
</script>

<style scoped>
.settings-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.actions-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-left: auto;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 500;
  transition: all 0.2s;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn:focus {
  outline: none;
  ring: 2px;
  ring-offset: 2px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #2563eb;
}

.btn-primary:active:not(:disabled) {
  transform: scale(0.95);
}

.btn-primary:focus {
  ring-color: #3b82f6;
}

.btn-secondary {
  background-color: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #e5e7eb;
}

.btn-secondary:active:not(:disabled) {
  transform: scale(0.95);
}

.btn-secondary:focus {
  ring-color: #6b7280;
}

.btn-ghost {
  color: #4b5563;
}

.btn-ghost:hover:not(:disabled) {
  background-color: #f3f4f6;
}

.btn-ghost:active:not(:disabled) {
  transform: scale(0.95);
}

.btn-ghost:focus {
  ring-color: #6b7280;
}

@media (max-width: 640px) {
  .settings-actions {
    flex-direction: column;
  }
  
  .actions-right {
    width: 100%;
  }
  
  .btn {
    width: 100%;
  }
}
</style>

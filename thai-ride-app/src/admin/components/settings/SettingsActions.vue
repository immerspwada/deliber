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
  @apply flex items-center justify-between gap-3 pt-6 border-t border-gray-200;
}

.actions-right {
  @apply flex items-center gap-3 ml-auto;
}

.btn {
  @apply px-4 py-2 rounded-lg font-medium transition-all duration-200;
  @apply focus:outline-none focus:ring-2 focus:ring-offset-2;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
  @apply min-h-[44px] flex items-center justify-center;
}

.btn-primary {
  @apply bg-primary-600 text-white;
  @apply hover:bg-primary-700 active:scale-95;
  @apply focus:ring-primary-500;
}

.btn-secondary {
  @apply bg-gray-100 text-gray-700;
  @apply hover:bg-gray-200 active:scale-95;
  @apply focus:ring-gray-500;
}

.btn-ghost {
  @apply text-gray-600;
  @apply hover:bg-gray-100 active:scale-95;
  @apply focus:ring-gray-500;
}

@media (max-width: 640px) {
  .settings-actions {
    @apply flex-col;
  }
  
  .actions-right {
    @apply w-full;
  }
  
  .btn {
    @apply w-full;
  }
}
</style>

<template>
  <div class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
    <button
      type="button"
      :disabled="!hasChanges"
      class="min-h-[44px] px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      :aria-label="resetLabel"
      @click="$emit('reset')"
    >
      รีเซ็ต
    </button>
    <button
      type="button"
      :disabled="!hasChanges || saving"
      class="min-h-[44px] px-4 py-2.5 text-sm font-medium text-white bg-gray-900 border border-transparent rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
      :aria-label="saveLabel"
      @click="$emit('save')"
    >
      <LoadingSpinner v-if="saving" size="sm" />
      <span>{{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import LoadingSpinner from '@/components/LoadingSpinner.vue'

interface Props {
  hasChanges: boolean
  saving: boolean
  resetLabel?: string
  saveLabel?: string
}

withDefaults(defineProps<Props>(), {
  resetLabel: 'รีเซ็ตการตั้งค่า',
  saveLabel: 'บันทึกการตั้งค่า'
})

defineEmits<{
  reset: []
  save: []
}>()
</script>

<template>
  <Teleport to="body">
    <div 
      v-if="modelValue" 
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="handleCancel"
      @keydown.esc="handleCancel"
    >
      <div 
        role="dialog"
        aria-modal="true"
        :aria-labelledby="modalTitleId"
        class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
        @click.stop
      >
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 :id="modalTitleId" class="text-lg font-semibold text-gray-900">
            เหตุผลในการเปลี่ยนแปลง
          </h3>
        </div>
        <div class="px-6 py-4">
          <label :for="textareaId" class="sr-only">เหตุผลในการเปลี่ยนแปลง</label>
          <textarea
            :id="textareaId"
            ref="textareaRef"
            :value="reason"
            @input="$emit('update:reason', ($event.target as HTMLTextAreaElement).value)"
            rows="3"
            class="w-full min-h-[88px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            :placeholder="placeholder"
            aria-required="true"
          ></textarea>
        </div>
        <div class="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            @click="handleCancel"
            class="min-h-[44px] px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            @click="$emit('confirm')"
            :disabled="!reason.trim()"
            class="min-h-[44px] px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { generateUniqueId } from '@/utils/generateId'

interface Props {
  modelValue: boolean
  reason: string
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'กรุณาระบุเหตุผลในการเปลี่ยนแปลง'
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:reason': [value: string]
  'confirm': []
}>()

const textareaRef = ref<HTMLTextAreaElement>()
const modalTitleId = generateUniqueId('modal-title')
const textareaId = generateUniqueId('textarea')

function handleCancel() {
  emit('update:modelValue', false)
}

watch(() => props.modelValue, async (isOpen) => {
  if (isOpen) {
    await nextTick()
    textareaRef.value?.focus()
  }
})
</script>

<script setup lang="ts">
/**
 * Feature: F324 - Delivery Notes
 * Component for adding notes to delivery
 */
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  maxLength?: number
}>(), {
  modelValue: '',
  placeholder: 'เพิ่มหมายเหตุสำหรับผู้จัดส่ง...',
  maxLength: 200
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const charCount = computed(() => props.modelValue.length)
const isNearLimit = computed(() => charCount.value > props.maxLength * 0.8)

const quickNotes = [
  'วางไว้หน้าประตู',
  'โทรก่อนส่ง',
  'ของแตกง่าย ระวังด้วย',
  'ส่งให้รปภ.',
  'ไม่ต้องกดกริ่ง'
]

const addQuickNote = (note: string) => {
  const current = props.modelValue
  const newValue = current ? `${current}, ${note}` : note
  if (newValue.length <= props.maxLength) {
    emit('update:modelValue', newValue)
  }
}
</script>

<template>
  <div class="delivery-notes">
    <label class="notes-label">หมายเหตุการจัดส่ง</label>
    
    <div class="quick-notes">
      <button
        v-for="note in quickNotes"
        :key="note"
        type="button"
        class="quick-btn"
        @click="addQuickNote(note)"
      >
        {{ note }}
      </button>
    </div>
    
    <div class="textarea-wrapper">
      <textarea
        :value="modelValue"
        :placeholder="placeholder"
        :maxlength="maxLength"
        class="notes-textarea"
        rows="3"
        @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      />
      <span class="char-count" :class="{ warning: isNearLimit }">
        {{ charCount }}/{{ maxLength }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.delivery-notes {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notes-label {
  font-size: 14px;
  font-weight: 500;
  color: #000;
}

.quick-notes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.quick-btn {
  padding: 6px 12px;
  background: #f6f6f6;
  border: none;
  border-radius: 16px;
  font-size: 13px;
  color: #000;
  cursor: pointer;
  transition: background 0.2s;
}

.quick-btn:hover {
  background: #e5e5e5;
}

.textarea-wrapper {
  position: relative;
}

.notes-textarea {
  width: 100%;
  padding: 12px 16px;
  padding-bottom: 28px;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  font-size: 15px;
  font-family: inherit;
  resize: none;
  outline: none;
  transition: border-color 0.2s;
}

.notes-textarea:focus {
  border-color: #000;
}

.char-count {
  position: absolute;
  bottom: 8px;
  right: 12px;
  font-size: 12px;
  color: #6b6b6b;
}

.char-count.warning {
  color: #e11900;
}
</style>

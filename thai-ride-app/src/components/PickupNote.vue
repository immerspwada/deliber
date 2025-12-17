<script setup lang="ts">
/**
 * Feature: F295 - Pickup Note
 * Note for driver about pickup location
 */
import { ref, computed } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string
  maxLength?: number
  placeholder?: string
}>(), {
  maxLength: 100,
  placeholder: 'เช่น หน้าร้านสะดวกซื้อ, ประตูทางเข้าหลัก'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const focused = ref(false)
const charCount = computed(() => props.modelValue.length)

const quickNotes = [
  'หน้าร้านสะดวกซื้อ',
  'ประตูทางเข้าหลัก',
  'ใต้ตึก',
  'ป้ายรถเมล์'
]

const handleInput = (e: Event) => {
  const value = (e.target as HTMLTextAreaElement).value
  if (value.length <= props.maxLength) {
    emit('update:modelValue', value)
  }
}

const addQuickNote = (note: string) => {
  const newValue = props.modelValue ? props.modelValue + ' ' + note : note
  if (newValue.length <= props.maxLength) {
    emit('update:modelValue', newValue)
  }
}
</script>

<template>
  <div class="pickup-note">
    <label class="label">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
      หมายเหตุถึงคนขับ
    </label>
    
    <div class="input-wrapper" :class="{ focused }">
      <textarea
        :value="modelValue"
        :placeholder="placeholder"
        :maxlength="maxLength"
        rows="2"
        @input="handleInput"
        @focus="focused = true"
        @blur="focused = false"
      ></textarea>
      <span class="char-count">{{ charCount }}/{{ maxLength }}</span>
    </div>
    
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
  </div>
</template>

<style scoped>
.pickup-note {
  width: 100%;
}

.label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #000;
  margin-bottom: 8px;
}

.input-wrapper {
  position: relative;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  transition: border-color 0.2s;
}

.input-wrapper.focused {
  border-color: #000;
}

textarea {
  width: 100%;
  padding: 12px;
  padding-bottom: 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  resize: none;
  outline: none;
}

.char-count {
  position: absolute;
  bottom: 8px;
  right: 12px;
  font-size: 11px;
  color: #999;
}

.quick-notes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.quick-btn {
  padding: 6px 12px;
  background: #f6f6f6;
  border: none;
  border-radius: 16px;
  font-size: 12px;
  color: #6b6b6b;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-btn:hover {
  background: #e5e5e5;
  color: #000;
}
</style>

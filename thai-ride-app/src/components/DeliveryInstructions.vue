<script setup lang="ts">
/**
 * Feature: F313 - Delivery Instructions
 * Delivery instructions input
 */
import { ref, computed } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string
  maxLength?: number
}>(), {
  maxLength: 200
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const selectedOption = ref('')
const charCount = computed(() => props.modelValue.length)

const quickOptions = [
  'วางไว้หน้าประตู',
  'ฝากไว้กับรปภ.',
  'โทรเมื่อถึง',
  'ห้ามกดกริ่ง'
]

const selectOption = (opt: string) => {
  if (selectedOption.value === opt) {
    selectedOption.value = ''
    emit('update:modelValue', '')
  } else {
    selectedOption.value = opt
    emit('update:modelValue', opt)
  }
}

const handleInput = (e: Event) => {
  const value = (e.target as HTMLTextAreaElement).value
  if (value.length <= props.maxLength) {
    emit('update:modelValue', value)
    selectedOption.value = ''
  }
}
</script>

<template>
  <div class="delivery-instructions">
    <label class="label">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
      คำแนะนำในการจัดส่ง
    </label>
    
    <div class="quick-options">
      <button
        v-for="opt in quickOptions"
        :key="opt"
        type="button"
        class="option"
        :class="{ active: selectedOption === opt }"
        @click="selectOption(opt)"
      >
        {{ opt }}
      </button>
    </div>
    
    <div class="input-wrapper">
      <textarea
        :value="modelValue"
        :maxlength="maxLength"
        placeholder="หรือพิมพ์คำแนะนำเพิ่มเติม..."
        rows="3"
        @input="handleInput"
      ></textarea>
      <span class="char-count">{{ charCount }}/{{ maxLength }}</span>
    </div>
  </div>
</template>

<style scoped>
.delivery-instructions {
  width: 100%;
}

.label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #000;
  margin-bottom: 12px;
}

.quick-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.option {
  padding: 8px 14px;
  background: #f6f6f6;
  border: none;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.option:hover {
  background: #e5e5e5;
}

.option.active {
  background: #000;
  color: #fff;
}

.input-wrapper {
  position: relative;
}

textarea {
  width: 100%;
  padding: 12px;
  padding-bottom: 28px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 14px;
  resize: none;
  outline: none;
}

textarea:focus {
  border-color: #000;
}

.char-count {
  position: absolute;
  bottom: 8px;
  right: 12px;
  font-size: 11px;
  color: #999;
}
</style>

<script setup lang="ts">
/**
 * Feature: F116 - OTP Input
 * One-time password input with auto-focus
 */
import { ref, watch, nextTick } from 'vue'

interface Props {
  modelValue: string
  length?: number
  disabled?: boolean
  error?: string
  autoFocus?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  length: 6,
  disabled: false,
  error: '',
  autoFocus: true
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  complete: [value: string]
}>()

const inputs = ref<HTMLInputElement[]>([])
const values = ref<string[]>(Array(props.length).fill(''))

// Initialize values from modelValue
watch(() => props.modelValue, (newVal) => {
  const chars = newVal.split('').slice(0, props.length)
  values.value = [...chars, ...Array(props.length - chars.length).fill('')]
}, { immediate: true })

const focusInput = (index: number) => {
  nextTick(() => {
    if (inputs.value[index]) {
      inputs.value[index].focus()
    }
  })
}

const handleInput = (index: number, e: Event) => {
  const target = e.target as HTMLInputElement
  const value = target.value.replace(/\D/g, '').slice(-1)
  
  values.value[index] = value
  const newValue = values.value.join('')
  emit('update:modelValue', newValue)
  
  if (value && index < props.length - 1) {
    focusInput(index + 1)
  }
  
  if (newValue.length === props.length) {
    emit('complete', newValue)
  }
}

const handleKeydown = (index: number, e: KeyboardEvent) => {
  if (e.key === 'Backspace' && !values.value[index] && index > 0) {
    focusInput(index - 1)
  }
  
  if (e.key === 'ArrowLeft' && index > 0) {
    focusInput(index - 1)
  }
  
  if (e.key === 'ArrowRight' && index < props.length - 1) {
    focusInput(index + 1)
  }
}

const handlePaste = (e: ClipboardEvent) => {
  e.preventDefault()
  const pastedData = e.clipboardData?.getData('text').replace(/\D/g, '').slice(0, props.length)
  if (!pastedData) return
  
  const chars = pastedData.split('')
  values.value = [...chars, ...Array(props.length - chars.length).fill('')]
  emit('update:modelValue', pastedData)
  
  if (pastedData.length === props.length) {
    emit('complete', pastedData)
  } else {
    focusInput(pastedData.length)
  }
}

const setInputRef = (el: HTMLInputElement | null, index: number) => {
  if (el) {
    inputs.value[index] = el
  }
}
</script>

<template>
  <div class="otp-input" :class="{ error: !!error, disabled }">
    <div class="otp-boxes">
      <input
        v-for="(_, index) in length"
        :key="index"
        :ref="(el) => setInputRef(el as HTMLInputElement, index)"
        type="text"
        inputmode="numeric"
        maxlength="1"
        :value="values[index]"
        :disabled="disabled"
        :autofocus="autoFocus && index === 0"
        class="otp-box"
        @input="handleInput(index, $event)"
        @keydown="handleKeydown(index, $event)"
        @paste="handlePaste"
      />
    </div>
    
    <p v-if="error" class="otp-error">{{ error }}</p>
  </div>
</template>

<style scoped>
.otp-input {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.otp-boxes {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.otp-box {
  width: 48px;
  height: 56px;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  font-size: 24px;
  font-weight: 600;
  text-align: center;
  color: #000;
  background: #fff;
  transition: border-color 0.2s;
  outline: none;
}

.otp-box:focus {
  border-color: #000;
}

.otp-box:disabled {
  background: #f6f6f6;
  color: #999;
  cursor: not-allowed;
}

.error .otp-box {
  border-color: #e11900;
}

.otp-error {
  font-size: 13px;
  color: #e11900;
  text-align: center;
  margin: 0;
}

.disabled {
  opacity: 0.6;
}
</style>

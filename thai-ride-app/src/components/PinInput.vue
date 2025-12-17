<script setup lang="ts">
/**
 * Feature: F273 - PIN Input
 * Secure PIN code input with masked display
 */
import { ref, computed } from 'vue'

const props = withDefaults(defineProps<{
  length?: number
  title?: string
  subtitle?: string
  error?: string
  masked?: boolean
}>(), {
  length: 6,
  title: 'กรอกรหัส PIN',
  masked: true
})

const emit = defineEmits<{
  'complete': [pin: string]
  'change': [pin: string]
}>()

const digits = ref<string[]>(Array(props.length).fill(''))
const activeIndex = computed(() => digits.value.findIndex(d => d === ''))

const handleKeyPress = (num: number | 'delete') => {
  if (num === 'delete') {
    let lastFilledIndex = -1
    for (let i = digits.value.length - 1; i >= 0; i--) {
      if (digits.value[i] !== '') {
        lastFilledIndex = i
        break
      }
    }
    if (lastFilledIndex >= 0) {
      digits.value[lastFilledIndex] = ''
      emit('change', digits.value.join(''))
    }
  } else {
    const emptyIndex = digits.value.findIndex(d => d === '')
    if (emptyIndex >= 0) {
      digits.value[emptyIndex] = num.toString()
      emit('change', digits.value.join(''))
      
      if (emptyIndex === props.length - 1) {
        emit('complete', digits.value.join(''))
      }
    }
  }
}

const clear = () => {
  digits.value = Array(props.length).fill('')
  emit('change', '')
}

defineExpose({ clear })
</script>

<template>
  <div class="pin-input">
    <h2 v-if="title" class="title">{{ title }}</h2>
    <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
    
    <div class="dots">
      <div
        v-for="(digit, index) in digits"
        :key="index"
        class="dot"
        :class="{ filled: digit !== '', active: index === activeIndex, error: !!error }"
      >
        <span v-if="digit && !masked">{{ digit }}</span>
      </div>
    </div>
    
    <p v-if="error" class="error">{{ error }}</p>
    
    <div class="keypad">
      <button v-for="num in [1,2,3,4,5,6,7,8,9]" :key="num" type="button" class="key" @click="handleKeyPress(num)">
        {{ num }}
      </button>
      <div class="key empty"></div>
      <button type="button" class="key" @click="handleKeyPress(0)">0</button>
      <button type="button" class="key delete" @click="handleKeyPress('delete')">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/>
          <line x1="18" y1="9" x2="12" y2="15"/>
          <line x1="12" y1="9" x2="18" y2="15"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.pin-input {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
}

.title {
  font-size: 22px;
  font-weight: 700;
  color: #000;
  margin: 0 0 8px;
}

.subtitle {
  font-size: 14px;
  color: #6b6b6b;
  margin: 0 0 32px;
}

.dots {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #e5e5e5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
}

.dot.filled {
  background: #000;
}

.dot.active {
  transform: scale(1.2);
  box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.1);
}

.dot.error {
  background: #e11900;
  animation: shake 0.3s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

.error {
  font-size: 13px;
  color: #e11900;
  margin: 0 0 16px;
}

.keypad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  width: 100%;
  max-width: 280px;
}

.key {
  height: 64px;
  background: #f6f6f6;
  border: none;
  border-radius: 50%;
  font-size: 24px;
  font-weight: 500;
  color: #000;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.key:hover {
  background: #e5e5e5;
}

.key:active {
  background: #ccc;
}

.key.empty {
  background: transparent;
  cursor: default;
}

.key.delete {
  background: transparent;
}

.key.delete:hover {
  background: #f6f6f6;
}
</style>

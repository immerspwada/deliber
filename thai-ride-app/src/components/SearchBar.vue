<script setup lang="ts">
/**
 * Feature: F95 - Search Bar
 * Search input with icon and clear button
 */
import { computed } from 'vue'

interface Props {
  modelValue: string
  placeholder?: string
  autofocus?: boolean
  disabled?: boolean
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'ค้นหา...',
  autofocus: false,
  disabled: false,
  loading: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  search: [value: string]
  clear: []
  focus: []
  blur: []
}>()

const hasValue = computed(() => props.modelValue.length > 0)

const handleInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    emit('search', props.modelValue)
  }
}

const handleClear = () => {
  emit('update:modelValue', '')
  emit('clear')
}
</script>

<template>
  <div class="search-bar" :class="{ disabled, loading }">
    <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
    
    <input
      type="search"
      :value="modelValue"
      :placeholder="placeholder"
      :autofocus="autofocus"
      :disabled="disabled"
      class="search-input"
      @input="handleInput"
      @keydown="handleKeydown"
      @focus="emit('focus')"
      @blur="emit('blur')"
    />
    
    <span v-if="loading" class="spinner" />
    
    <button
      v-else-if="hasValue"
      type="button"
      class="clear-btn"
      :disabled="disabled"
      @click="handleClear"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f6f6f6;
  border-radius: 12px;
  padding: 12px 16px;
  transition: background 0.2s;
}

.search-bar:focus-within {
  background: #fff;
  box-shadow: 0 0 0 2px #00A86B;
}

.search-bar.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.search-icon {
  color: #6b6b6b;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: none;
  border: none;
  font-size: 16px;
  color: #000;
  outline: none;
  min-width: 0;
}

.search-input::placeholder {
  color: #999;
}

.search-input:disabled {
  cursor: not-allowed;
}

/* Hide default search cancel button */
.search-input::-webkit-search-cancel-button {
  display: none;
}

.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  background: none;
  border: none;
  color: #6b6b6b;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.2s;
}

.clear-btn:hover:not(:disabled) {
  color: #000;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid #e5e5e5;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

<script setup lang="ts">
/**
 * Feature: F266 - Autocomplete Input
 * Input with autocomplete suggestions dropdown
 */
import { ref, computed, watch } from 'vue'

interface Suggestion {
  id: string
  label: string
  sublabel?: string
}

const props = withDefaults(defineProps<{
  modelValue: string
  suggestions: Suggestion[]
  placeholder?: string
  label?: string
  loading?: boolean
  minChars?: number
  disabled?: boolean
}>(), {
  placeholder: 'พิมพ์เพื่อค้นหา...',
  minChars: 2,
  loading: false,
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'select': [suggestion: Suggestion]
  'search': [query: string]
}>()

const showDropdown = ref(false)
const highlightedIndex = ref(-1)

const filteredSuggestions = computed(() => {
  if (props.modelValue.length < props.minChars) return []
  return props.suggestions
})

const handleInput = (e: Event) => {
  const value = (e.target as HTMLInputElement).value
  emit('update:modelValue', value)
  if (value.length >= props.minChars) {
    emit('search', value)
    showDropdown.value = true
  } else {
    showDropdown.value = false
  }
  highlightedIndex.value = -1
}

const selectSuggestion = (suggestion: Suggestion) => {
  emit('update:modelValue', suggestion.label)
  emit('select', suggestion)
  showDropdown.value = false
}

const handleKeydown = (e: KeyboardEvent) => {
  if (!showDropdown.value || filteredSuggestions.value.length === 0) return
  
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    highlightedIndex.value = Math.min(highlightedIndex.value + 1, filteredSuggestions.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
  } else if (e.key === 'Enter' && highlightedIndex.value >= 0) {
    e.preventDefault()
    const suggestion = filteredSuggestions.value[highlightedIndex.value]
    if (suggestion) selectSuggestion(suggestion)
  } else if (e.key === 'Escape') {
    showDropdown.value = false
  }
}

const handleBlur = () => {
  setTimeout(() => { showDropdown.value = false }, 200)
}

watch(() => props.suggestions, () => {
  if (props.suggestions.length > 0) showDropdown.value = true
})
</script>

<template>
  <div class="autocomplete">
    <label v-if="label" class="label">{{ label }}</label>
    <div class="input-wrapper">
      <input
        ref="inputRef"
        type="text"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        class="input"
        @input="handleInput"
        @keydown="handleKeydown"
        @focus="showDropdown = filteredSuggestions.length > 0"
        @blur="handleBlur"
      />
      <div v-if="loading" class="loader">
        <svg class="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"/>
        </svg>
      </div>
    </div>
    
    <div v-if="showDropdown && filteredSuggestions.length > 0" class="dropdown">
      <button
        v-for="(suggestion, index) in filteredSuggestions"
        :key="suggestion.id"
        type="button"
        class="suggestion"
        :class="{ highlighted: index === highlightedIndex }"
        @click="selectSuggestion(suggestion)"
        @mouseenter="highlightedIndex = index"
      >
        <span class="suggestion-label">{{ suggestion.label }}</span>
        <span v-if="suggestion.sublabel" class="suggestion-sublabel">{{ suggestion.sublabel }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.autocomplete {
  position: relative;
}

.label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #000;
  margin-bottom: 6px;
}

.input-wrapper {
  position: relative;
}

.input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
}

.input:focus {
  border-color: #000;
}

.input:disabled {
  background: #f6f6f6;
  color: #999;
}

.loader {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
}

.spinner {
  animation: spin 1s linear infinite;
  color: #6b6b6b;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-height: 240px;
  overflow-y: auto;
  z-index: 100;
}

.suggestion {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.suggestion:hover,
.suggestion.highlighted {
  background: #f6f6f6;
}

.suggestion-label {
  font-size: 14px;
  color: #000;
}

.suggestion-sublabel {
  font-size: 12px;
  color: #6b6b6b;
  margin-top: 2px;
}
</style>

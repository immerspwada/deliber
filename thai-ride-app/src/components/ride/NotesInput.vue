<script setup lang="ts">
/**
 * Notes Input Component
 * Allows customers to add notes/instructions for providers
 */
import { ref, computed, watch } from 'vue'

interface Props {
  modelValue: string
  maxLength?: number
  placeholder?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  maxLength: 500,
  placeholder: 'เพิ่มข้อความถึงคนขับ เช่น รอที่ล็อบบี้, โทรเมื่อถึง...',
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// Local state
const isFocused = ref(false)
const showWarning = ref(false)

// Computed
const charCount = computed(() => props.modelValue.length)
const isNearLimit = computed(() => charCount.value >= props.maxLength * 0.9)
const isAtLimit = computed(() => charCount.value >= props.maxLength)

// Sanitize input (basic XSS prevention)
function sanitizeInput(text: string): string {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

// Handle input
function handleInput(event: Event): void {
  const target = event.target as HTMLTextAreaElement
  let value = target.value

  // Truncate if exceeds max length
  if (value.length > props.maxLength) {
    value = value.slice(0, props.maxLength)
    showWarning.value = true
    setTimeout(() => { showWarning.value = false }, 2000)
  }

  emit('update:modelValue', value)
}

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
  if (newValue.length > props.maxLength) {
    emit('update:modelValue', newValue.slice(0, props.maxLength))
  }
})
</script>

<template>
  <div class="notes-input">
    <label class="notes-label">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="label-icon">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
      <span>หมายเหตุถึงคนขับ</span>
      <span class="optional-badge">ไม่บังคับ</span>
    </label>

    <div 
      class="textarea-wrapper"
      :class="{ 
        focused: isFocused, 
        'near-limit': isNearLimit,
        'at-limit': isAtLimit,
        disabled: disabled
      }"
    >
      <textarea
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :maxlength="maxLength"
        rows="2"
        class="notes-textarea"
        @input="handleInput"
        @focus="isFocused = true"
        @blur="isFocused = false"
      />
      
      <div class="textarea-footer">
        <span 
          v-if="showWarning" 
          class="warning-text"
        >
          ข้อความถูกตัดให้สั้นลง
        </span>
        <span 
          class="char-count"
          :class="{ 'near-limit': isNearLimit, 'at-limit': isAtLimit }"
        >
          {{ charCount }}/{{ maxLength }}
        </span>
      </div>
    </div>

    <!-- Quick suggestions -->
    <div v-if="!modelValue && !disabled" class="quick-suggestions">
      <button 
        type="button"
        class="suggestion-chip"
        @click="emit('update:modelValue', 'รอที่ล็อบบี้')"
      >
        รอที่ล็อบบี้
      </button>
      <button 
        type="button"
        class="suggestion-chip"
        @click="emit('update:modelValue', 'โทรเมื่อถึง')"
      >
        โทรเมื่อถึง
      </button>
      <button 
        type="button"
        class="suggestion-chip"
        @click="emit('update:modelValue', 'มีสัมภาระ')"
      >
        มีสัมภาระ
      </button>
    </div>
  </div>
</template>

<style scoped>
.notes-input {
  margin-bottom: 16px;
}

.notes-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.label-icon {
  width: 16px;
  height: 16px;
  color: #6b7280;
}

.optional-badge {
  font-size: 11px;
  font-weight: 400;
  color: #9ca3af;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
}

.textarea-wrapper {
  position: relative;
  border: 1.5px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  transition: all 0.2s;
}

.textarea-wrapper.focused {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.textarea-wrapper.near-limit {
  border-color: #f59e0b;
}

.textarea-wrapper.at-limit {
  border-color: #ef4444;
}

.textarea-wrapper.disabled {
  background: #f9fafb;
  opacity: 0.7;
}

.notes-textarea {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  color: #111827;
  background: transparent;
  resize: none;
  outline: none;
}

.notes-textarea::placeholder {
  color: #9ca3af;
}

.notes-textarea:disabled {
  cursor: not-allowed;
}

.textarea-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 12px 8px;
}

.warning-text {
  font-size: 12px;
  color: #ef4444;
  animation: fadeIn 0.2s;
}

.char-count {
  font-size: 12px;
  color: #9ca3af;
  margin-left: auto;
}

.char-count.near-limit {
  color: #f59e0b;
}

.char-count.at-limit {
  color: #ef4444;
  font-weight: 500;
}

.quick-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.suggestion-chip {
  padding: 6px 12px;
  font-size: 13px;
  color: #4b5563;
  background: #f3f4f6;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.suggestion-chip:active {
  background: #e5e7eb;
  transform: scale(0.98);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>

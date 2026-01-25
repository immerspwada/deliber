<script setup lang="ts">
/**
 * Feature: F260 - Tag Input
 * Input for adding multiple tags
 */
import { ref } from 'vue'

defineProps<{
  modelValue: string[]
  placeholder?: string
  maxTags?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const inputValue = ref('')

const addTag = (tags: string[], max?: number) => {
  const tag = inputValue.value.trim()
  if (tag && !tags.includes(tag) && (!max || tags.length < max)) {
    emit('update:modelValue', [...tags, tag])
    inputValue.value = ''
  }
}

const removeTag = (tags: string[], index: number) => {
  emit('update:modelValue', tags.filter((_, i) => i !== index))
}
</script>

<template>
  <div class="tag-input">
    <div class="tags-container">
      <span v-for="(tag, i) in modelValue" :key="i" class="tag">
        {{ tag }}
        <button type="button" class="remove-btn" @click="removeTag(modelValue, i)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </span>
      <input
        v-model="inputValue" type="text" :placeholder="modelValue.length ? '' : (placeholder || 'เพิ่มแท็ก...')"
        :disabled="maxTags !== undefined && modelValue.length >= maxTags"
        @keydown.enter.prevent="addTag(modelValue, maxTags)" @keydown.tab.prevent="addTag(modelValue, maxTags)"
      />
    </div>
  </div>
</template>

<style scoped>
.tag-input { border: 1px solid #e5e5e5; border-radius: 10px; padding: 8px 12px; }
.tag-input:focus-within { border-color: #000; }
.tags-container { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.tag { display: flex; align-items: center; gap: 4px; padding: 6px 10px; background: #f6f6f6; border-radius: 16px; font-size: 13px; }
.remove-btn { display: flex; padding: 0; background: none; border: none; color: #6b6b6b; cursor: pointer; }
.remove-btn:hover { color: #ef4444; }
.tags-container input { flex: 1; min-width: 100px; padding: 6px 0; border: none; font-size: 14px; outline: none; }
</style>

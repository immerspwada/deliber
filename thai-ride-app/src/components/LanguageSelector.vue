<script setup lang="ts">
/**
 * Feature: F145 - Language Selector
 * Select app language
 */

interface Language {
  code: string
  name: string
  nativeName: string
  flag?: string
}

interface Props {
  modelValue: string
  languages: Language[]
}

defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="language-selector">
    <button
      v-for="lang in languages"
      :key="lang.code"
      type="button"
      class="language-item"
      :class="{ selected: modelValue === lang.code }"
      @click="emit('update:modelValue', lang.code)"
    >
      <span v-if="lang.flag" class="lang-flag">{{ lang.flag }}</span>
      <div class="lang-info">
        <span class="lang-native">{{ lang.nativeName }}</span>
        <span class="lang-name">{{ lang.name }}</span>
      </div>
      <div class="check-indicator">
        <svg v-if="modelValue === lang.code" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
        </svg>
      </div>
    </button>
  </div>
</template>

<style scoped>
.language-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
}


.language-item {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px;
  background: #fff;
  border: 2px solid transparent;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.language-item:hover {
  background: #f6f6f6;
}

.language-item.selected {
  border-color: #000;
  background: #f9f9f9;
}

.lang-flag {
  font-size: 28px;
  line-height: 1;
}

.lang-info {
  flex: 1;
}

.lang-native {
  font-size: 16px;
  font-weight: 600;
  color: #000;
  display: block;
}

.lang-name {
  font-size: 13px;
  color: #6b6b6b;
}

.check-indicator {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000;
}
</style>

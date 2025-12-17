<script setup lang="ts">
/**
 * Feature: F385 - Cascader
 * Cascading selection component
 */
import { ref, computed } from 'vue'

interface Option { value: string; label: string; children?: Option[] }

const props = withDefaults(defineProps<{
  options: Option[]
  modelValue: string[]
  placeholder?: string
}>(), {
  placeholder: 'เลือก...'
})

const emit = defineEmits<{ (e: 'update:modelValue', value: string[]): void }>()

const isOpen = ref(false)
const activeMenus = ref<Option[][]>([props.options])

const displayText = computed(() => {
  if (!props.modelValue.length) return props.placeholder
  const labels: string[] = []
  let current = props.options
  for (const val of props.modelValue) {
    const found = current.find(o => o.value === val)
    if (found) { labels.push(found.label); current = found.children || [] }
  }
  return labels.join(' / ')
})

const selectOption = (opt: Option, level: number) => {
  const newValue = [...props.modelValue.slice(0, level), opt.value]
  if (opt.children?.length) {
    activeMenus.value = [...activeMenus.value.slice(0, level + 1), opt.children]
    emit('update:modelValue', newValue)
  } else {
    emit('update:modelValue', newValue)
    isOpen.value = false
    activeMenus.value = [props.options]
  }
}

const isSelected = (val: string, level: number) => props.modelValue[level] === val
</script>

<template>
  <div class="cascader" :class="{ open: isOpen }">
    <div class="cascader-trigger" @click="isOpen = !isOpen">
      <span :class="{ placeholder: !modelValue.length }">{{ displayText }}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
    </div>
    <div v-if="isOpen" class="cascader-dropdown">
      <div v-for="(menu, level) in activeMenus" :key="level" class="cascader-menu">
        <div v-for="opt in menu" :key="opt.value" class="cascader-option" :class="{ selected: isSelected(opt.value, level), 'has-children': opt.children?.length }" @click="selectOption(opt, level)">
          <span>{{ opt.label }}</span>
          <svg v-if="opt.children?.length" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cascader { position: relative; }
.cascader-trigger { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border: 1px solid #e5e5e5; border-radius: 8px; cursor: pointer; background: #fff; }
.cascader.open .cascader-trigger { border-color: #000; }
.placeholder { color: #6b6b6b; }
.cascader-dropdown { position: absolute; top: 100%; left: 0; margin-top: 4px; display: flex; background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 10; }
.cascader-menu { min-width: 150px; max-height: 250px; overflow-y: auto; border-right: 1px solid #e5e5e5; }
.cascader-menu:last-child { border-right: none; }
.cascader-option { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; cursor: pointer; }
.cascader-option:hover { background: #f6f6f6; }
.cascader-option.selected { background: #f0f0f0; font-weight: 500; }
</style>

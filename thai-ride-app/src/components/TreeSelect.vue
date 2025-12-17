<script setup lang="ts">
/**
 * Feature: F384 - Tree Select
 * Tree selection dropdown
 */
import { ref, computed } from 'vue'

interface TreeNode { key: string; label: string; children?: TreeNode[]; disabled?: boolean }

const props = withDefaults(defineProps<{
  options: TreeNode[]
  modelValue: string | string[]
  multiple?: boolean
  placeholder?: string
}>(), {
  multiple: false,
  placeholder: 'เลือก...'
})

const emit = defineEmits<{ (e: 'update:modelValue', value: string | string[]): void }>()

const isOpen = ref(false)
const expandedKeys = ref<string[]>([])

const toggleExpand = (key: string) => {
  const idx = expandedKeys.value.indexOf(key)
  if (idx >= 0) expandedKeys.value.splice(idx, 1)
  else expandedKeys.value.push(key)
}

const selectNode = (node: TreeNode) => {
  if (node.disabled || node.children?.length) return
  if (props.multiple) {
    const arr = Array.isArray(props.modelValue) ? [...props.modelValue] : []
    const idx = arr.indexOf(node.key)
    if (idx >= 0) arr.splice(idx, 1)
    else arr.push(node.key)
    emit('update:modelValue', arr)
  } else {
    emit('update:modelValue', node.key)
    isOpen.value = false
  }
}

const isSelected = (key: string) => {
  if (props.multiple) return Array.isArray(props.modelValue) && props.modelValue.includes(key)
  return props.modelValue === key
}

const displayText = computed(() => {
  if (!props.modelValue || (Array.isArray(props.modelValue) && !props.modelValue.length)) return props.placeholder
  const findLabel = (nodes: TreeNode[], key: string): string | null => {
    for (const n of nodes) {
      if (n.key === key) return n.label
      if (n.children) { const found = findLabel(n.children, key); if (found) return found }
    }
    return null
  }
  if (Array.isArray(props.modelValue)) return props.modelValue.map(k => findLabel(props.options, k)).filter(Boolean).join(', ')
  return findLabel(props.options, props.modelValue as string) || props.placeholder
})
</script>

<template>
  <div class="tree-select" :class="{ open: isOpen }">
    <div class="tree-select-trigger" @click="isOpen = !isOpen">
      <span class="trigger-text">{{ displayText }}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
    </div>
    <div v-if="isOpen" class="tree-select-dropdown">
      <template v-for="node in options" :key="node.key">
        <div class="tree-node" :class="{ selected: isSelected(node.key), disabled: node.disabled, expandable: node.children?.length }" @click="node.children?.length ? toggleExpand(node.key) : selectNode(node)">
          <svg v-if="node.children?.length" class="expand-icon" :class="{ expanded: expandedKeys.includes(node.key) }" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
          <span>{{ node.label }}</span>
        </div>
        <div v-if="node.children?.length && expandedKeys.includes(node.key)" class="tree-children">
          <div v-for="child in node.children" :key="child.key" class="tree-node child" :class="{ selected: isSelected(child.key), disabled: child.disabled }" @click="selectNode(child)">
            <span>{{ child.label }}</span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.tree-select { position: relative; }
.tree-select-trigger { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border: 1px solid #e5e5e5; border-radius: 8px; cursor: pointer; background: #fff; }
.tree-select.open .tree-select-trigger { border-color: #000; }
.trigger-text { color: #000; }
.tree-select-dropdown { position: absolute; top: 100%; left: 0; right: 0; margin-top: 4px; background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-height: 300px; overflow-y: auto; z-index: 10; }
.tree-node { display: flex; align-items: center; gap: 8px; padding: 10px 16px; cursor: pointer; }
.tree-node:hover { background: #f6f6f6; }
.tree-node.selected { background: #f0f0f0; font-weight: 500; }
.tree-node.disabled { opacity: 0.5; cursor: not-allowed; }
.tree-children { padding-left: 24px; }
.expand-icon { transition: transform 0.2s; }
.expand-icon.expanded { transform: rotate(90deg); }
</style>

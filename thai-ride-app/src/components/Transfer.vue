<script setup lang="ts">
/**
 * Feature: F383 - Transfer
 * Transfer list component
 */
import { ref, computed } from 'vue'

interface Item { key: string; label: string; disabled?: boolean }

const props = defineProps<{
  sourceItems: Item[]
  targetItems: Item[]
  sourceTitle?: string
  targetTitle?: string
}>()

const emit = defineEmits<{ (e: 'change', source: Item[], target: Item[]): void }>()

const sourceSelected = ref<string[]>([])
const targetSelected = ref<string[]>([])

const moveToTarget = () => {
  const toMove = props.sourceItems.filter(i => sourceSelected.value.includes(i.key) && !i.disabled)
  const newSource = props.sourceItems.filter(i => !sourceSelected.value.includes(i.key))
  const newTarget = [...props.targetItems, ...toMove]
  sourceSelected.value = []
  emit('change', newSource, newTarget)
}

const moveToSource = () => {
  const toMove = props.targetItems.filter(i => targetSelected.value.includes(i.key) && !i.disabled)
  const newTarget = props.targetItems.filter(i => !targetSelected.value.includes(i.key))
  const newSource = [...props.sourceItems, ...toMove]
  targetSelected.value = []
  emit('change', newSource, newTarget)
}

const canMoveToTarget = computed(() => sourceSelected.value.length > 0)
const canMoveToSource = computed(() => targetSelected.value.length > 0)
</script>

<template>
  <div class="transfer">
    <div class="transfer-list">
      <div class="transfer-header">{{ sourceTitle || 'Source' }} ({{ sourceItems.length }})</div>
      <div class="transfer-body">
        <label v-for="item in sourceItems" :key="item.key" class="transfer-item" :class="{ disabled: item.disabled }">
          <input type="checkbox" v-model="sourceSelected" :value="item.key" :disabled="item.disabled" />
          <span>{{ item.label }}</span>
        </label>
      </div>
    </div>
    <div class="transfer-actions">
      <button type="button" :disabled="!canMoveToTarget" @click="moveToTarget">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
      </button>
      <button type="button" :disabled="!canMoveToSource" @click="moveToSource">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
    </div>
    <div class="transfer-list">
      <div class="transfer-header">{{ targetTitle || 'Target' }} ({{ targetItems.length }})</div>
      <div class="transfer-body">
        <label v-for="item in targetItems" :key="item.key" class="transfer-item" :class="{ disabled: item.disabled }">
          <input type="checkbox" v-model="targetSelected" :value="item.key" :disabled="item.disabled" />
          <span>{{ item.label }}</span>
        </label>
      </div>
    </div>
  </div>
</template>

<style scoped>
.transfer { display: flex; gap: 16px; align-items: stretch; }
.transfer-list { flex: 1; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden; }
.transfer-header { padding: 12px 16px; background: #f6f6f6; font-size: 14px; font-weight: 500; border-bottom: 1px solid #e5e5e5; }
.transfer-body { max-height: 300px; overflow-y: auto; }
.transfer-item { display: flex; align-items: center; gap: 8px; padding: 10px 16px; cursor: pointer; }
.transfer-item:hover { background: #f6f6f6; }
.transfer-item.disabled { opacity: 0.5; cursor: not-allowed; }
.transfer-item input { accent-color: #000; }
.transfer-actions { display: flex; flex-direction: column; justify-content: center; gap: 8px; }
.transfer-actions button { width: 32px; height: 32px; background: #f6f6f6; border: 1px solid #e5e5e5; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.transfer-actions button:disabled { opacity: 0.5; cursor: not-allowed; }
</style>

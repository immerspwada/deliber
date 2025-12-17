<script setup lang="ts">
/**
 * Feature: F257 - Expandable Text
 * Text with show more/less toggle
 */
import { ref, computed } from 'vue'

const props = defineProps<{
  text: string
  maxLength?: number
}>()

const expanded = ref(false)
const limit = props.maxLength || 150
const needsTruncate = computed(() => props.text.length > limit)
const displayText = computed(() => {
  if (!needsTruncate.value || expanded.value) return props.text
  return props.text.slice(0, limit) + '...'
})
</script>

<template>
  <div class="expandable-text">
    <p class="text-content">{{ displayText }}</p>
    <button v-if="needsTruncate" type="button" class="toggle-btn" @click="expanded = !expanded">
      {{ expanded ? 'แสดงน้อยลง' : 'แสดงเพิ่มเติม' }}
    </button>
  </div>
</template>

<style scoped>
.expandable-text { }
.text-content { font-size: 14px; color: #000; line-height: 1.6; margin: 0; }
.toggle-btn { margin-top: 8px; padding: 0; background: none; border: none; font-size: 13px; color: #276ef1; cursor: pointer; }
.toggle-btn:hover { text-decoration: underline; }
</style>

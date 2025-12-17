<script setup lang="ts">
/**
 * Feature: F262 - Star Rating
 * Interactive star rating input
 */
import { ref } from 'vue'

const props = defineProps<{
  modelValue: number
  max?: number
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const hoverValue = ref(0)
const stars = props.max || 5
</script>

<template>
  <div class="star-rating" :class="[size || 'md', { readonly }]">
    <button v-for="i in stars" :key="i" type="button" class="star-btn" :disabled="readonly"
      @mouseenter="hoverValue = i" @mouseleave="hoverValue = 0" @click="emit('update:modelValue', i)">
      <svg viewBox="0 0 24 24" :fill="i <= (hoverValue || modelValue) ? '#f59e0b' : '#e5e5e5'" stroke="none">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.star-rating { display: flex; gap: 4px; }
.star-btn { padding: 0; background: none; border: none; cursor: pointer; transition: transform 0.1s; }
.star-btn:hover:not(:disabled) { transform: scale(1.1); }
.star-btn:disabled { cursor: default; }
.star-rating.sm .star-btn svg { width: 20px; height: 20px; }
.star-rating.md .star-btn svg { width: 28px; height: 28px; }
.star-rating.lg .star-btn svg { width: 36px; height: 36px; }
</style>

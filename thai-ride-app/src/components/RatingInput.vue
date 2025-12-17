<script setup lang="ts">
/**
 * Feature: F133 - Rating Input
 * Interactive star rating input
 */
import { ref } from 'vue'

interface Props {
  modelValue: number
  maxRating?: number
  size?: 'sm' | 'md' | 'lg'
  readonly?: boolean
  showLabel?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  maxRating: 5,
  size: 'md',
  readonly: false,
  showLabel: true
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const hoverRating = ref(0)

const labels = ['', 'แย่มาก', 'แย่', 'ปานกลาง', 'ดี', 'ดีมาก']

const setRating = (rating: number) => {
  if (!props.readonly) {
    emit('update:modelValue', rating)
  }
}

const sizeClass = {
  sm: 'size-sm',
  md: 'size-md',
  lg: 'size-lg'
}
</script>

<template>
  <div class="rating-input" :class="[sizeClass[size], { readonly }]">
    <div class="stars">
      <button
        v-for="i in maxRating"
        :key="i"
        type="button"
        class="star-btn"
        :class="{ filled: i <= (hoverRating || modelValue) }"
        :disabled="readonly"
        @click="setRating(i)"
        @mouseenter="hoverRating = i"
        @mouseleave="hoverRating = 0"
      >
        <svg viewBox="0 0 24 24" :fill="i <= (hoverRating || modelValue) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.5">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      </button>
    </div>
    <span v-if="showLabel && modelValue > 0" class="rating-label">
      {{ labels[modelValue] }}
    </span>
  </div>
</template>

<style scoped>
.rating-input {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.stars {
  display: flex;
  gap: 4px;
}

.star-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #e5e5e5;
  transition: all 0.15s;
}

.star-btn:not(:disabled):hover {
  transform: scale(1.1);
}

.star-btn.filled {
  color: #ffc107;
}

.readonly .star-btn {
  cursor: default;
}

/* Sizes */
.size-sm .star-btn svg { width: 24px; height: 24px; }
.size-md .star-btn svg { width: 36px; height: 36px; }
.size-lg .star-btn svg { width: 48px; height: 48px; }

.rating-label {
  font-size: 14px;
  font-weight: 500;
  color: #000;
}

.size-lg .rating-label {
  font-size: 18px;
}
</style>

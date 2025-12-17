<script setup lang="ts">
/**
 * Feature: F71 - Rating Stars
 * Reusable star rating component (display & interactive)
 */
import { computed } from 'vue'

interface Props {
  modelValue?: number
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
  maxStars?: number
  showValue?: boolean
  showCount?: boolean
  count?: number
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 0,
  readonly: false,
  size: 'md',
  maxStars: 5,
  showValue: false,
  showCount: false,
  count: 0
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const starSize = computed(() => {
  switch (props.size) {
    case 'sm': return 16
    case 'lg': return 32
    default: return 24
  }
})

const stars = computed(() => {
  const result = []
  for (let i = 1; i <= props.maxStars; i++) {
    if (i <= Math.floor(props.modelValue)) {
      result.push('full')
    } else if (i - 0.5 <= props.modelValue) {
      result.push('half')
    } else {
      result.push('empty')
    }
  }
  return result
})

const handleClick = (index: number) => {
  if (props.readonly) return
  emit('update:modelValue', index)
}

const handleHover = (_index: number) => {
  if (props.readonly) return
  // Could add hover preview here
}

const formattedValue = computed(() => {
  return props.modelValue.toFixed(1)
})

const formattedCount = computed(() => {
  if (props.count >= 1000) {
    return `${(props.count / 1000).toFixed(1)}k`
  }
  return props.count.toString()
})
</script>

<template>
  <div class="rating-stars" :class="[`size-${size}`, { readonly, interactive: !readonly }]">
    <div class="stars-container">
      <button
        v-for="(star, index) in stars"
        :key="index"
        class="star-btn"
        :class="star"
        :disabled="readonly"
        @click="handleClick(index + 1)"
        @mouseenter="handleHover(index + 1)"
      >
        <!-- Full star -->
        <svg v-if="star === 'full'" :width="starSize" :height="starSize" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        <!-- Half star -->
        <svg v-else-if="star === 'half'" :width="starSize" :height="starSize" viewBox="0 0 24 24">
          <defs>
            <linearGradient :id="`half-${index}`">
              <stop offset="50%" stop-color="currentColor"/>
              <stop offset="50%" stop-color="#e5e5e5"/>
            </linearGradient>
          </defs>
          <path :fill="`url(#half-${index})`" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        <!-- Empty star -->
        <svg v-else :width="starSize" :height="starSize" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      </button>
    </div>
    
    <div v-if="showValue || showCount" class="rating-info">
      <span v-if="showValue" class="rating-value">{{ formattedValue }}</span>
      <span v-if="showCount" class="rating-count">({{ formattedCount }})</span>
    </div>
  </div>
</template>

<style scoped>
.rating-stars {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.stars-container {
  display: flex;
  gap: 2px;
}

.star-btn {
  padding: 0;
  background: none;
  border: none;
  color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.star-btn.empty {
  color: #e5e5e5;
}

.interactive .star-btn {
  cursor: pointer;
  transition: transform 0.15s ease;
}

.interactive .star-btn:hover {
  transform: scale(1.1);
}

.interactive .star-btn:active {
  transform: scale(0.95);
}

.readonly .star-btn {
  cursor: default;
}

.rating-info {
  display: flex;
  align-items: center;
  gap: 4px;
}

.rating-value {
  font-weight: 600;
  color: #000;
}

.rating-count {
  color: #6b6b6b;
}

/* Size variants */
.size-sm .rating-value {
  font-size: 12px;
}

.size-sm .rating-count {
  font-size: 12px;
}

.size-md .rating-value {
  font-size: 14px;
}

.size-md .rating-count {
  font-size: 14px;
}

.size-lg .rating-value {
  font-size: 18px;
}

.size-lg .rating-count {
  font-size: 16px;
}
</style>

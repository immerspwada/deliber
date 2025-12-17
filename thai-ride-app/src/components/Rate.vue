<script setup lang="ts">
/**
 * Feature: F382 - Rate
 * Star rating input component
 */
import { ref, computed } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: number
  count?: number
  allowHalf?: boolean
  disabled?: boolean
  size?: number
  color?: string
  emptyColor?: string
}>(), {
  count: 5,
  allowHalf: false,
  disabled: false,
  size: 24,
  color: '#FFB800',
  emptyColor: '#e5e5e5'
})

const emit = defineEmits<{ (e: 'update:modelValue', value: number): void; (e: 'change', value: number): void }>()

const hoverValue = ref(0)
const displayValue = computed(() => hoverValue.value || props.modelValue)

const onClick = (index: number, isHalf: boolean) => {
  if (props.disabled) return
  const value = props.allowHalf && isHalf ? index + 0.5 : index + 1
  emit('update:modelValue', value)
  emit('change', value)
}

const onMouseMove = (e: MouseEvent, index: number) => {
  if (props.disabled) return
  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const isHalf = props.allowHalf && (e.clientX - rect.left) < rect.width / 2
  hoverValue.value = isHalf ? index + 0.5 : index + 1
}

const onMouseLeave = () => { hoverValue.value = 0 }
</script>

<template>
  <div class="rate" :class="{ disabled }" @mouseleave="onMouseLeave">
    <span v-for="i in count" :key="i" class="rate-star" :style="{ width: size + 'px', height: size + 'px' }" @mousemove="(e) => onMouseMove(e, i - 1)" @click="(e) => onClick(i - 1, allowHalf && (e.offsetX < size / 2))">
      <svg :width="size" :height="size" viewBox="0 0 24 24" :fill="i <= Math.floor(displayValue) ? color : emptyColor" :stroke="i <= Math.floor(displayValue) ? color : emptyColor" stroke-width="1">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
      <svg v-if="allowHalf && displayValue > i - 1 && displayValue < i" class="half-star" :width="size" :height="size" viewBox="0 0 24 24" :fill="color" :stroke="color" stroke-width="1" style="clip-path: inset(0 50% 0 0);">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    </span>
  </div>
</template>

<style scoped>
.rate { display: inline-flex; gap: 4px; }
.rate.disabled { opacity: 0.6; pointer-events: none; }
.rate-star { position: relative; cursor: pointer; }
.half-star { position: absolute; top: 0; left: 0; }
</style>

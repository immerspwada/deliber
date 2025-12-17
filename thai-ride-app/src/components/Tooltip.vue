<script setup lang="ts">
/**
 * Feature: F86 - Tooltip
 * Hover tooltip for additional info
 */
import { ref } from 'vue'

interface Props {
  text: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

const props = withDefaults(defineProps<Props>(), {
  position: 'top',
  delay: 200
})

const isVisible = ref(false)
let timeout: ReturnType<typeof setTimeout> | null = null

const show = () => {
  timeout = setTimeout(() => {
    isVisible.value = true
  }, props.delay)
}

const hide = () => {
  if (timeout) {
    clearTimeout(timeout)
    timeout = null
  }
  isVisible.value = false
}
</script>

<template>
  <div
    class="tooltip-wrapper"
    @mouseenter="show"
    @mouseleave="hide"
    @focus="show"
    @blur="hide"
  >
    <slot />
    <Transition name="tooltip">
      <div v-if="isVisible" class="tooltip" :class="position">
        {{ text }}
        <span class="tooltip-arrow" />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.tooltip-wrapper {
  position: relative;
  display: inline-flex;
}

.tooltip {
  position: absolute;
  background: #000;
  color: #fff;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  white-space: nowrap;
  z-index: 1000;
  pointer-events: none;
}

.tooltip-arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #000;
  transform: rotate(45deg);
}

/* Positions */
.tooltip.top {
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
}

.tooltip.top .tooltip-arrow {
  bottom: -4px;
  left: 50%;
  margin-left: -4px;
}

.tooltip.bottom {
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
}

.tooltip.bottom .tooltip-arrow {
  top: -4px;
  left: 50%;
  margin-left: -4px;
}

.tooltip.left {
  right: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
}

.tooltip.left .tooltip-arrow {
  right: -4px;
  top: 50%;
  margin-top: -4px;
}

.tooltip.right {
  left: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
}

.tooltip.right .tooltip-arrow {
  left: -4px;
  top: 50%;
  margin-top: -4px;
}

/* Animation */
.tooltip-enter-active,
.tooltip-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
}

.tooltip.top.tooltip-enter-from,
.tooltip.top.tooltip-leave-to {
  transform: translateX(-50%) translateY(4px);
}

.tooltip.bottom.tooltip-enter-from,
.tooltip.bottom.tooltip-leave-to {
  transform: translateX(-50%) translateY(-4px);
}

.tooltip.left.tooltip-enter-from,
.tooltip.left.tooltip-leave-to {
  transform: translateY(-50%) translateX(4px);
}

.tooltip.right.tooltip-enter-from,
.tooltip.right.tooltip-leave-to {
  transform: translateY(-50%) translateX(-4px);
}
</style>

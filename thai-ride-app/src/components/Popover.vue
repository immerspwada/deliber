<script setup lang="ts">
/**
 * Feature: F87 - Popover
 * Click-triggered popover with content
 */
import { ref, onMounted, onUnmounted } from 'vue'

interface Props {
  position?: 'top' | 'bottom' | 'left' | 'right'
  trigger?: 'click' | 'hover'
  closeOnClickOutside?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  position: 'bottom',
  trigger: 'click',
  closeOnClickOutside: true
})

const isVisible = ref(false)
const popoverRef = ref<HTMLElement | null>(null)

const toggle = () => {
  if (props.trigger === 'click') {
    isVisible.value = !isVisible.value
  }
}

const show = () => {
  if (props.trigger === 'hover') {
    isVisible.value = true
  }
}

const hide = () => {
  if (props.trigger === 'hover') {
    isVisible.value = false
  }
}

const handleClickOutside = (e: MouseEvent) => {
  if (props.closeOnClickOutside && popoverRef.value && !popoverRef.value.contains(e.target as Node)) {
    isVisible.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div
    ref="popoverRef"
    class="popover-wrapper"
    @mouseenter="show"
    @mouseleave="hide"
  >
    <div class="popover-trigger" @click="toggle">
      <slot name="trigger" />
    </div>
    
    <Transition name="popover">
      <div v-if="isVisible" class="popover" :class="position">
        <slot />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.popover-wrapper {
  position: relative;
  display: inline-flex;
}

.popover-trigger {
  cursor: pointer;
}

.popover {
  position: absolute;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 200px;
  overflow: hidden;
}

/* Positions */
.popover.top {
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
}

.popover.bottom {
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
}

.popover.left {
  right: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
}

.popover.right {
  left: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
}

/* Animation */
.popover-enter-active,
.popover-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.popover-enter-from,
.popover-leave-to {
  opacity: 0;
}

.popover.top.popover-enter-from,
.popover.top.popover-leave-to {
  transform: translateX(-50%) translateY(8px);
}

.popover.bottom.popover-enter-from,
.popover.bottom.popover-leave-to {
  transform: translateX(-50%) translateY(-8px);
}

.popover.left.popover-enter-from,
.popover.left.popover-leave-to {
  transform: translateY(-50%) translateX(8px);
}

.popover.right.popover-enter-from,
.popover.right.popover-leave-to {
  transform: translateY(-50%) translateX(-8px);
}
</style>

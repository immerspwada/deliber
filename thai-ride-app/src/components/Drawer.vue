<script setup lang="ts">
/**
 * Feature: F376 - Drawer
 * Side drawer component
 */
const props = withDefaults(defineProps<{
  visible: boolean
  position?: 'left' | 'right' | 'top' | 'bottom'
  size?: string
  overlay?: boolean
}>(), {
  position: 'right',
  size: '300px',
  overlay: true
})

const emit = defineEmits<{ (e: 'close'): void }>()

const positionStyles = {
  left: { left: '0', top: '0', bottom: '0', width: props.size, transform: 'translateX(-100%)' },
  right: { right: '0', top: '0', bottom: '0', width: props.size, transform: 'translateX(100%)' },
  top: { top: '0', left: '0', right: '0', height: props.size, transform: 'translateY(-100%)' },
  bottom: { bottom: '0', left: '0', right: '0', height: props.size, transform: 'translateY(100%)' }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="visible" class="drawer-wrapper">
        <div v-if="overlay" class="drawer-overlay" @click="emit('close')"></div>
        <div class="drawer" :style="{ ...positionStyles[position], transform: 'translate(0)' }">
          <div class="drawer-header">
            <slot name="header"></slot>
            <button type="button" class="close-btn" @click="emit('close')">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="drawer-content"><slot></slot></div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-wrapper { position: fixed; inset: 0; z-index: 1000; }
.drawer-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); }
.drawer { position: absolute; background: #fff; display: flex; flex-direction: column; transition: transform 0.3s ease; z-index: 1; }
.drawer-header { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid #e5e5e5; }
.close-btn { background: none; border: none; padding: 4px; cursor: pointer; color: #6b6b6b; }
.drawer-content { flex: 1; overflow-y: auto; padding: 16px; }
.drawer-enter-active, .drawer-leave-active { transition: opacity 0.3s; }
.drawer-enter-from, .drawer-leave-to { opacity: 0; }
</style>

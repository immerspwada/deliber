<script setup lang="ts">
/**
 * Feature: F110 - Floating Action Button
 * FAB with optional speed dial
 */
import { ref } from 'vue'

interface SpeedDialItem {
  id: string
  label: string
  icon: string
}

interface Props {
  icon?: string
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center'
  size?: 'md' | 'lg'
  speedDial?: SpeedDialItem[]
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  icon: 'plus',
  position: 'bottom-right',
  size: 'lg',
  speedDial: () => [],
  disabled: false
})

const emit = defineEmits<{
  click: []
  speedDialClick: [item: SpeedDialItem]
}>()

const isExpanded = ref(false)

const handleClick = () => {
  if (props.disabled) return
  
  if (props.speedDial.length > 0) {
    isExpanded.value = !isExpanded.value
  } else {
    emit('click')
  }
}

const handleSpeedDialClick = (item: SpeedDialItem) => {
  emit('speedDialClick', item)
  isExpanded.value = false
}
</script>

<template>
  <div class="fab-container" :class="position">
    <!-- Speed Dial Items -->
    <Transition name="speed-dial">
      <div v-if="isExpanded && speedDial.length > 0" class="speed-dial">
        <button
          v-for="(item, index) in speedDial"
          :key="item.id"
          class="speed-dial-item"
          :style="{ transitionDelay: `${index * 50}ms` }"
          @click="handleSpeedDialClick(item)"
        >
          <span class="speed-dial-label">{{ item.label }}</span>
          <span class="speed-dial-icon">
            <!-- Car icon -->
            <svg v-if="item.icon === 'car'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 17h14v-5H5v5zM19 12l-2-6H7L5 12"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>
            </svg>
            <!-- Package icon -->
            <svg v-else-if="item.icon === 'package'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
            </svg>
            <!-- Shopping icon -->
            <svg v-else-if="item.icon === 'shopping'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
            </svg>
          </span>
        </button>
      </div>
    </Transition>

    <!-- Main FAB -->
    <button
      type="button"
      class="fab"
      :class="[`size-${size}`, { expanded: isExpanded, disabled }]"
      :disabled="disabled"
      @click="handleClick"
    >
      <!-- Plus icon -->
      <svg v-if="icon === 'plus'" class="fab-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      <!-- Close icon (when expanded) -->
      <svg v-if="speedDial.length > 0 && isExpanded" class="fab-icon close" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>

    <!-- Overlay -->
    <div v-if="isExpanded" class="fab-overlay" @click="isExpanded = false" />
  </div>
</template>

<style scoped>
.fab-container {
  position: fixed;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.fab-container.bottom-right {
  bottom: 24px;
  right: 24px;
}

.fab-container.bottom-left {
  bottom: 24px;
  left: 24px;
}

.fab-container.bottom-center {
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
}

.fab {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  transition: all 0.2s;
  position: relative;
  z-index: 2;
}

.fab.size-md {
  width: 48px;
  height: 48px;
}

.fab.size-lg {
  width: 56px;
  height: 56px;
}

.fab:hover:not(.disabled) {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
}

.fab:active:not(.disabled) {
  transform: scale(0.95);
}

.fab.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.fab-icon {
  transition: transform 0.2s;
}

.fab.expanded .fab-icon:not(.close) {
  opacity: 0;
  transform: rotate(45deg);
}

.fab-icon.close {
  position: absolute;
}

.speed-dial {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.speed-dial-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: none;
  border: none;
  cursor: pointer;
  animation: slideUp 0.2s ease forwards;
}

.speed-dial-label {
  background: #fff;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  white-space: nowrap;
}

.speed-dial-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 50%;
  color: #000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.speed-dial-item:hover .speed-dial-icon {
  transform: scale(1.1);
}

.fab-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 1;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.speed-dial-enter-active,
.speed-dial-leave-active {
  transition: opacity 0.2s ease;
}

.speed-dial-enter-from,
.speed-dial-leave-to {
  opacity: 0;
}
</style>

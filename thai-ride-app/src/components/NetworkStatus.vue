<script setup lang="ts">
/**
 * Feature: F278 - Network Status
 * Network connectivity status indicator
 */
import { ref, onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  showOnline?: boolean
  autoHide?: boolean
  hideDelay?: number
}>(), {
  showOnline: false,
  autoHide: true,
  hideDelay: 3000
})

const isOnline = ref(navigator.onLine)
const visible = ref(!navigator.onLine)
let hideTimeout: ReturnType<typeof setTimeout> | null = null

const handleOnline = () => {
  isOnline.value = true
  if (props.showOnline) {
    visible.value = true
    if (props.autoHide) {
      hideTimeout = setTimeout(() => { visible.value = false }, props.hideDelay)
    }
  } else {
    visible.value = false
  }
}

const handleOffline = () => {
  isOnline.value = false
  visible.value = true
  if (hideTimeout) clearTimeout(hideTimeout)
}

onMounted(() => {
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
})

onUnmounted(() => {
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
  if (hideTimeout) clearTimeout(hideTimeout)
})
</script>

<template>
  <Transition name="slide">
    <div v-if="visible" class="network-status" :class="{ online: isOnline, offline: !isOnline }">
      <svg v-if="isOnline" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M5 12.55a11 11 0 0114.08 0"/>
        <path d="M1.42 9a16 16 0 0121.16 0"/>
        <path d="M8.53 16.11a6 6 0 016.95 0"/>
        <circle cx="12" cy="20" r="1"/>
      </svg>
      <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="1" y1="1" x2="23" y2="23"/>
        <path d="M16.72 11.06A10.94 10.94 0 0119 12.55"/>
        <path d="M5 12.55a10.94 10.94 0 015.17-2.39"/>
        <path d="M10.71 5.05A16 16 0 0122.58 9"/>
        <path d="M1.42 9a15.91 15.91 0 014.7-2.88"/>
        <path d="M8.53 16.11a6 6 0 016.95 0"/>
        <circle cx="12" cy="20" r="1"/>
      </svg>
      <span>{{ isOnline ? 'กลับมาออนไลน์แล้ว' : 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต' }}</span>
    </div>
  </Transition>
</template>

<style scoped>
.network-status {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 500;
  z-index: 9999;
}

.network-status.online {
  background: #276ef1;
  color: #fff;
}

.network-status.offline {
  background: #e11900;
  color: #fff;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateY(-100%);
}
</style>

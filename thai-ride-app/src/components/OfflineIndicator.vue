<script setup lang="ts">
/**
 * Offline Indicator Banner
 * แสดงสถานะ offline และ pending sync items
 */
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useBackgroundSync } from '../composables/useBackgroundSync'

const { isOnline, isSyncing, pendingCount, processQueue } = useBackgroundSync()

const wasOffline = ref(false)

// Show banner when offline or syncing
const shouldShow = computed(() => {
  return !isOnline.value || (wasOffline.value && isSyncing.value)
})

// Status text
const statusText = computed(() => {
  if (!isOnline.value) {
    return 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต'
  }
  if (isSyncing.value) {
    return `กำลังซิงค์ข้อมูล... (${pendingCount.value} รายการ)`
  }
  return ''
})

// Handle online/offline
const handleOnline = () => {
  if (wasOffline.value) {
    // Show syncing message briefly
    setTimeout(() => {
      if (!isSyncing.value) {
        wasOffline.value = false
      }
    }, 2000)
  }
}

const handleOffline = () => {
  wasOffline.value = true
}

onMounted(() => {
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  
  // Check initial state
  if (!navigator.onLine) {
    wasOffline.value = true
  }
})

onUnmounted(() => {
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
})

// Manual retry
const handleRetry = () => {
  if (isOnline.value) {
    processQueue()
  }
}
</script>

<template>
  <Transition name="slide">
    <div v-if="shouldShow" class="offline-banner" :class="{ syncing: isSyncing }">
      <div class="banner-content">
        <!-- Offline icon -->
        <svg v-if="!isOnline" class="banner-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3"/>
        </svg>
        
        <!-- Syncing spinner -->
        <div v-else-if="isSyncing" class="spinner"></div>
        
        <span class="banner-text">{{ statusText }}</span>
        
        <!-- Pending count badge -->
        <span v-if="!isOnline && pendingCount > 0" class="pending-badge">
          {{ pendingCount }} รอซิงค์
        </span>
        
        <!-- Retry button -->
        <button v-if="isOnline && pendingCount > 0 && !isSyncing" class="retry-btn" @click="handleRetry">
          ซิงค์เลย
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.offline-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: #000;
  color: #fff;
  z-index: 9999;
  padding: 12px 16px;
  padding-top: calc(12px + env(safe-area-inset-top));
}

.offline-banner.syncing {
  background: #276EF1;
}

.banner-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  max-width: 480px;
  margin: 0 auto;
}

.banner-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.banner-text {
  font-size: 14px;
  font-weight: 500;
}

.pending-badge {
  font-size: 12px;
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 10px;
  border-radius: 12px;
}

.retry-btn {
  font-size: 13px;
  font-weight: 500;
  color: #fff;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  padding: 6px 14px;
  border-radius: 16px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.retry-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.retry-btn:active {
  transform: scale(0.95);
}

/* Slide animation */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>

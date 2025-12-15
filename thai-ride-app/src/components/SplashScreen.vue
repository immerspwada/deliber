<script setup lang="ts">
import { ref, onMounted } from 'vue'

const emit = defineEmits<{
  complete: []
}>()

const isVisible = ref(true)
const isAnimating = ref(false)

onMounted(() => {
  setTimeout(() => {
    isAnimating.value = true
    setTimeout(() => {
      isVisible.value = false
      emit('complete')
    }, 500)
  }, 1500)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="isVisible" :class="['splash-screen', { 'fade-out': isAnimating }]">
      <div class="splash-content">
        <div class="logo-container">
          <svg class="logo-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
          </svg>
        </div>
        <h1 class="logo-text">ThaiRide</h1>
        <p class="tagline">เดินทางสะดวก ทุกที่ทั่วไทย</p>
        <div class="loading-bar">
          <div class="loading-progress"></div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.splash-screen {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-surface);
  z-index: 9999;
  transition: opacity 0.5s ease;
}

.splash-screen.fade-out {
  opacity: 0;
}

.splash-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.logo-container {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-primary);
  border-radius: 20px;
  margin-bottom: 16px;
  animation: pulse 1.5s ease-in-out infinite;
}

.logo-icon {
  width: 44px;
  height: 44px;
  color: white;
}

.logo-text {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
  letter-spacing: -0.5px;
}

.tagline {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: 32px;
}

.loading-bar {
  width: 120px;
  height: 3px;
  background-color: var(--color-border);
  border-radius: 2px;
  overflow: hidden;
}

.loading-progress {
  height: 100%;
  background-color: var(--color-primary);
  animation: loading 1.5s ease-in-out;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

@keyframes loading {
  0% { width: 0%; }
  100% { width: 100%; }
}
</style>

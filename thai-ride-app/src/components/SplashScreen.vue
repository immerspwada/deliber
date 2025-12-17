<script setup lang="ts">
/**
 * Feature: F274 - Splash Screen
 * App loading splash screen
 */
import { ref, onMounted } from 'vue'

const props = withDefaults(defineProps<{
  appName?: string
  tagline?: string
  duration?: number
  showProgress?: boolean
}>(), {
  appName: 'Thai Ride',
  tagline: 'เดินทางสะดวก ปลอดภัย',
  duration: 2000,
  showProgress: true
})

const emit = defineEmits<{
  'complete': []
}>()

const progress = ref(0)
const visible = ref(true)

onMounted(() => {
  const interval = setInterval(() => {
    progress.value += 2
    if (progress.value >= 100) {
      clearInterval(interval)
      setTimeout(() => {
        visible.value = false
        emit('complete')
      }, 200)
    }
  }, props.duration / 50)
})
</script>

<template>
  <Transition name="fade">
    <div v-if="visible" class="splash-screen">
      <div class="content">
        <div class="logo">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
        </div>
        
        <h1 class="app-name">{{ appName }}</h1>
        <p class="tagline">{{ tagline }}</p>
        
        <div v-if="showProgress" class="progress-container">
          <div class="progress-bar" :style="{ width: progress + '%' }"></div>
        </div>
      </div>
      
      <div class="footer">
        <p>Powered by Thai Ride</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.splash-screen {
  position: fixed;
  inset: 0;
  background: #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.logo {
  width: 100px;
  height: 100px;
  background: #fff;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  animation: pulse 2s ease-in-out infinite;
}

.logo svg {
  color: #000;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.app-name {
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 8px;
}

.tagline {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 48px;
}

.progress-container {
  width: 200px;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: #fff;
  border-radius: 2px;
  transition: width 0.1s linear;
}

.footer {
  position: absolute;
  bottom: 32px;
}

.footer p {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
}

.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-leave-to {
  opacity: 0;
}
</style>

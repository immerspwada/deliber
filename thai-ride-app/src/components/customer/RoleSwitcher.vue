<script setup lang="ts">
/**
 * RoleSwitcher - สลับระหว่าง Customer และ Provider mode
 * สำหรับ drivers/riders ที่ต้องการใช้งานทั้งสองโหมด
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useRoleAccess } from '../../composables/useRoleAccess'
import { useHapticFeedback } from '../../composables/useHapticFeedback'

interface Props {
  currentMode: 'customer' | 'provider'
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'switch': [mode: 'customer' | 'provider']
}>()

const router = useRouter()
const { canSwitchToProviderMode, getRoleBadge, getRoleColor } = useRoleAccess()
const { vibrate } = useHapticFeedback()

const showSwitcher = computed(() => canSwitchToProviderMode.value)

const handleSwitch = () => {
  vibrate('medium')
  
  if (props.currentMode === 'customer') {
    // Switch to provider mode
    router.push('/provider')
    emit('switch', 'provider')
  } else {
    // Switch to customer mode
    router.push('/customer')
    emit('switch', 'customer')
  }
}
</script>

<template>
  <button
    v-if="showSwitcher"
    class="role-switcher"
    :class="{ 'provider-mode': currentMode === 'provider' }"
    @click="handleSwitch"
  >
    <div class="switcher-icon">
      <!-- Customer Icon -->
      <svg
        v-if="currentMode === 'customer'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M20 21a8 8 0 10-16 0" />
      </svg>
      
      <!-- Provider Icon -->
      <svg
        v-else
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    </div>
    
    <div class="switcher-text">
      <span class="mode-label">โหมด</span>
      <span class="mode-name">
        {{ currentMode === 'customer' ? 'ลูกค้า' : getRoleBadge() }}
      </span>
    </div>
    
    <div class="switcher-arrow">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M7 16l5-5-5-5M12 16l5-5-5-5" />
      </svg>
    </div>
  </button>
</template>

<style scoped>
.role-switcher {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: linear-gradient(135deg, #e8f5ef 0%, #d4ede1 100%);
  border: 2px solid #00a86b;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  user-select: none;
}

.role-switcher:active {
  transform: scale(0.97);
}

.role-switcher.provider-mode {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border-color: #2196f3;
}

.switcher-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border-radius: 10px;
  color: #00a86b;
  flex-shrink: 0;
}

.provider-mode .switcher-icon {
  color: #2196f3;
}

.switcher-icon svg {
  width: 18px;
  height: 18px;
}

.switcher-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.mode-label {
  font-size: 10px;
  font-weight: 500;
  color: #666666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.mode-name {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.switcher-arrow {
  width: 20px;
  height: 20px;
  color: #00a86b;
  flex-shrink: 0;
}

.provider-mode .switcher-arrow {
  color: #2196f3;
}

.switcher-arrow svg {
  width: 100%;
  height: 100%;
}

/* Animation */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.role-switcher:hover .switcher-arrow {
  animation: pulse 1.5s ease-in-out infinite;
}
</style>

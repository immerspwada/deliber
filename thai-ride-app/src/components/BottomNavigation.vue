<script setup lang="ts">
/**
 * Feature: F180 - Bottom Navigation
 * MUNEEF Style bottom navigation bar
 */

interface NavItem {
  id: string
  label: string
  icon: string
  badge?: number
}

interface Props {
  items?: NavItem[]
  activeId?: string
}

withDefaults(defineProps<Props>(), {
  items: () => [
    { id: 'home', label: 'หน้าหลัก', icon: 'home' },
    { id: 'help', label: 'ช่วยเหลือ', icon: 'help' },
    { id: 'activity', label: 'กิจกรรม', icon: 'activity' },
    { id: 'profile', label: 'โปรไฟล์', icon: 'profile' }
  ],
  activeId: 'home'
})

const emit = defineEmits<{
  navigate: [id: string]
}>()
</script>

<template>
  <nav class="bottom-navigation">
    <button
      v-for="item in items"
      :key="item.id"
      type="button"
      class="nav-item"
      :class="{ active: activeId === item.id }"
      @click="emit('navigate', item.id)"
    >
      <div class="nav-icon">
        <!-- Home -->
        <svg v-if="item.icon === 'home'" viewBox="0 0 24 24" :fill="activeId === item.id ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        </svg>
        <!-- Help -->
        <svg v-else-if="item.icon === 'help'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
          <circle cx="12" cy="17" r="1" :fill="activeId === item.id ? 'currentColor' : 'none'"/>
        </svg>
        <!-- Activity -->
        <svg v-else-if="item.icon === 'activity'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12,6 12,12 16,14"/>
        </svg>
        <!-- Profile -->
        <svg v-else-if="item.icon === 'profile'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="8" r="4"/>
          <path d="M20 21a8 8 0 10-16 0"/>
        </svg>
        <!-- Wallet -->
        <svg v-else-if="item.icon === 'wallet'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="5" width="20" height="14" rx="2"/>
          <path d="M2 10h20"/>
          <circle cx="17" cy="14" r="2" :fill="activeId === item.id ? 'currentColor' : 'none'"/>
        </svg>
        <!-- Default -->
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
        </svg>
        
        <span v-if="item.badge" class="nav-badge">{{ item.badge > 99 ? '99+' : item.badge }}</span>
      </div>
      <span class="nav-label">{{ item.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
.bottom-navigation {
  display: flex;
  justify-content: space-around;
  align-items: center;
  background: #FFFFFF;
  border-top: 1px solid #F0F0F0;
  padding: 8px 0;
  padding-bottom: calc(8px + env(safe-area-inset-bottom));
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 20px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 64px;
}

.nav-item:active {
  transform: scale(0.95);
}

.nav-icon {
  position: relative;
  width: 24px;
  height: 24px;
  color: #999999;
}

.nav-icon svg {
  width: 100%;
  height: 100%;
}

.nav-item.active .nav-icon {
  color: #00A86B;
}

.nav-badge {
  position: absolute;
  top: -6px;
  right: -10px;
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #E53935;
  color: #FFFFFF;
  font-size: 10px;
  font-weight: 600;
  border-radius: 9px;
  padding: 0 5px;
}

.nav-label {
  font-size: 11px;
  font-weight: 500;
  color: #999999;
}

.nav-item.active .nav-label {
  color: #00A86B;
  font-weight: 600;
}
</style>

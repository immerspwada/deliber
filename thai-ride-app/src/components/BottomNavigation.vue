<script setup lang="ts">
/**
 * Feature: F180 - Bottom Navigation
 * Main bottom navigation bar
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
    { id: 'home', label: 'หน้าแรก', icon: 'home' },
    { id: 'activity', label: 'กิจกรรม', icon: 'activity' },
    { id: 'wallet', label: 'กระเป๋า', icon: 'wallet' },
    { id: 'account', label: 'บัญชี', icon: 'account' }
  ],
  activeId: 'home'
})

const emit = defineEmits<{
  navigate: [id: string]
}>()

const iconPaths: Record<string, string> = {
  home: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  activity: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  wallet: 'M21 4H3a2 2 0 00-2 2v12a2 2 0 002 2h18a2 2 0 002-2V6a2 2 0 00-2-2zM1 10h22',
  account: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z'
}
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
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path :d="iconPaths[item.icon] || iconPaths.home"/>
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
  background: #fff;
  border-top: 1px solid #e5e5e5;
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
  padding: 8px 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-icon {
  position: relative;
  color: #6b6b6b;
}

.nav-item.active .nav-icon {
  color: #000;
}

.nav-badge {
  position: absolute;
  top: -6px;
  right: -10px;
  min-width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e11900;
  color: #fff;
  font-size: 9px;
  font-weight: 600;
  border-radius: 8px;
  padding: 0 4px;
}

.nav-label {
  font-size: 11px;
  color: #6b6b6b;
}

.nav-item.active .nav-label {
  color: #000;
  font-weight: 600;
}
</style>
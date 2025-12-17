<script setup lang="ts">
/**
 * Feature: F345 - Provider Navigation Bar
 * Bottom navigation bar for provider app
 */
const props = withDefaults(defineProps<{
  activeTab: string
  hasNewOrders?: boolean
}>(), {
  hasNewOrders: false
})

const emit = defineEmits<{
  'navigate': [tab: string]
}>()

const tabs = [
  { id: 'home', label: 'หน้าหลัก', icon: 'home' },
  { id: 'orders', label: 'งาน', icon: 'orders' },
  { id: 'earnings', label: 'รายได้', icon: 'earnings' },
  { id: 'profile', label: 'โปรไฟล์', icon: 'profile' }
]
</script>

<template>
  <nav class="provider-nav">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      class="nav-item"
      :class="{ active: activeTab === tab.id }"
      @click="emit('navigate', tab.id)"
    >
      <div class="nav-icon">
        <svg v-if="tab.icon === 'home'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          <path d="M9 22V12h6v10"/>
        </svg>
        <svg v-else-if="tab.icon === 'orders'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
        </svg>
        <svg v-else-if="tab.icon === 'earnings'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
          <path d="M1 10h22"/>
        </svg>
        <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <span v-if="tab.id === 'orders' && hasNewOrders" class="badge" />
      </div>
      <span class="nav-label">{{ tab.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
.provider-nav {
  display: flex;
  justify-content: space-around;
  padding: 8px 0;
  padding-bottom: calc(8px + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid #e5e5e5;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: none;
  border: none;
  cursor: pointer;
  color: #6b6b6b;
  transition: color 0.2s;
}

.nav-item.active {
  color: #000;
}

.nav-icon {
  position: relative;
}

.badge {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 8px;
  height: 8px;
  background: #e11900;
  border-radius: 50%;
}

.nav-label {
  font-size: 11px;
  font-weight: 500;
}
</style>

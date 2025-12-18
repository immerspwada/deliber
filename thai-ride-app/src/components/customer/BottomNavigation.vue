<script setup lang="ts">
/**
 * BottomNavigation - Navigation bar ด้านล่างแบบน่ารัก
 * MUNEEF Style: สีเขียว #00A86B
 */
import { useHapticFeedback } from '../../composables/useHapticFeedback'

interface NavItem {
  id: string
  name: string
  route: string
}

interface Props {
  activeTab?: string
}

const props = withDefaults(defineProps<Props>(), {
  activeTab: 'home'
})

const emit = defineEmits<{
  'navigate': [route: string]
}>()

const haptic = useHapticFeedback()

const navItems: NavItem[] = [
  { id: 'home', name: 'หน้าแรก', route: '/customer' },
  { id: 'services', name: 'บริการ', route: '/customer/services' },
  { id: 'history', name: 'กิจกรรม', route: '/customer/history' },
  { id: 'profile', name: 'โปรไฟล์', route: '/customer/profile' }
]

const handleClick = (item: NavItem) => {
  haptic.light()
  emit('navigate', item.route)
}
</script>

<template>
  <nav class="bottom-nav">
    <button
      v-for="item in navItems"
      :key="item.id"
      class="nav-item"
      :class="{ active: activeTab === item.id }"
      @click="handleClick(item)"
    >
      <!-- Home -->
      <svg v-if="item.id === 'home'" viewBox="0 0 24 24" :fill="activeTab === item.id ? 'currentColor' : 'none'" :stroke="activeTab === item.id ? 'none' : 'currentColor'" stroke-width="2">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
      </svg>
      
      <!-- Services -->
      <svg v-else-if="item.id === 'services'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
      
      <!-- History -->
      <svg v-else-if="item.id === 'history'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12,6 12,12 16,14"/>
      </svg>
      
      <!-- Profile -->
      <svg v-else-if="item.id === 'profile'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="8" r="4"/>
        <path d="M20 21a8 8 0 10-16 0"/>
      </svg>
      
      <span>{{ item.name }}</span>
    </button>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 8px 16px;
  padding-bottom: calc(8px + env(safe-area-inset-bottom));
  background: #FFFFFF;
  border-top: 1px solid #F0F0F0;
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
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 64px;
}

.nav-item:active {
  transform: scale(0.95);
}

.nav-item svg {
  width: 24px;
  height: 24px;
  color: #999999;
  transition: all 0.2s ease;
}

.nav-item span {
  font-size: 11px;
  font-weight: 500;
  color: #999999;
  transition: all 0.2s ease;
}

.nav-item.active {
  background: #E8F5EF;
}

.nav-item.active svg {
  color: #00A86B;
}

.nav-item.active span {
  color: #00A86B;
  font-weight: 600;
}
</style>

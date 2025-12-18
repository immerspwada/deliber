<script setup lang="ts">
/**
 * BottomNavigation - Navigation bar ด้านล่างแบบน่ารัก
 * MUNEEF Style: สีเขียว #00A86B
 * รองรับ notification badge สำหรับแสดงจำนวนรายการที่ต้องดำเนินการ
 */
import { useHapticFeedback } from '../../composables/useHapticFeedback'

interface NavItem {
  id: string
  name: string
  route: string
}

interface Props {
  activeTab?: string
  /** จำนวน badge สำหรับเมนู history (ออเดอร์ที่ยังไม่ได้ให้คะแนน) */
  historyBadge?: number
  /** จำนวน badge สำหรับเมนู profile (notifications) */
  profileBadge?: number
}

const props = withDefaults(defineProps<Props>(), {
  activeTab: 'home',
  historyBadge: 0,
  profileBadge: 0
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

/** Get badge count for specific nav item */
const getBadgeCount = (itemId: string): number => {
  if (itemId === 'history') return props.historyBadge
  if (itemId === 'profile') return props.profileBadge
  return 0
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
      <div v-else-if="item.id === 'history'" class="icon-wrapper">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12,6 12,12 16,14"/>
        </svg>
        <span v-if="getBadgeCount(item.id) > 0" class="badge">
          {{ getBadgeCount(item.id) > 9 ? '9+' : getBadgeCount(item.id) }}
        </span>
      </div>
      
      <!-- Profile -->
      <div v-else-if="item.id === 'profile'" class="icon-wrapper">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="8" r="4"/>
          <path d="M20 21a8 8 0 10-16 0"/>
        </svg>
        <span v-if="getBadgeCount(item.id) > 0" class="badge">
          {{ getBadgeCount(item.id) > 9 ? '9+' : getBadgeCount(item.id) }}
        </span>
      </div>
      
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
  min-width: 64px;
  min-height: 52px; /* Touch target min 44px + padding */
  background: transparent;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  /* Touch optimizations */
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
}

.nav-item:active {
  transform: scale(0.95);
  background: rgba(0, 168, 107, 0.1);
}

/* Touch-specific styles */
@media (hover: none) {
  .nav-item:active {
    background: rgba(0, 168, 107, 0.15);
  }
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

/* Icon wrapper for badge positioning */
.icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-wrapper svg {
  width: 24px;
  height: 24px;
}

/* Notification Badge */
.badge {
  position: absolute;
  top: -6px;
  right: -10px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: #E53935;
  color: #FFFFFF;
  font-size: 10px;
  font-weight: 700;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(229, 57, 53, 0.3);
  animation: badge-pop 0.3s ease;
}

@keyframes badge-pop {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}
</style>

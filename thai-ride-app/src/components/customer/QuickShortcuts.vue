<script setup lang="ts">
/**
 * QuickShortcuts - ทางลัดด่วนแบบน่ารัก
 * MUNEEF Style: สีเขียว #00A86B, icons น่ารัก
 */
import { useHapticFeedback } from '../../composables/useHapticFeedback'

interface Shortcut {
  id: string
  name: string
  route: string
  color?: string
}

interface Props {
  shortcuts?: Shortcut[]
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'ทางลัด',
  shortcuts: () => [
    { id: 'scheduled', name: 'นัดล่วงหน้า', route: '/customer/scheduled-rides', color: '#00A86B' },
    { id: 'saved', name: 'บันทึกไว้', route: '/customer/saved-places', color: '#E53935' },
    { id: 'history', name: 'ประวัติ', route: '/customer/history', color: '#2196F3' },
    { id: 'referral', name: 'ชวนเพื่อน', route: '/customer/referral', color: '#9C27B0' }
  ]
})

const emit = defineEmits<{
  'shortcut-click': [shortcut: Shortcut]
}>()

const { vibrate } = useHapticFeedback()

const handleClick = (shortcut: Shortcut) => {
  vibrate('light')
  emit('shortcut-click', shortcut)
}
</script>

<template>
  <section class="shortcuts-section">
    <h3 v-if="title" class="section-title">{{ title }}</h3>
    
    <div class="shortcuts-grid">
      <button
        v-for="shortcut in shortcuts"
        :key="shortcut.id"
        class="shortcut-item"
        :style="{ '--accent': shortcut.color || '#00A86B' }"
        @click="handleClick(shortcut)"
      >
        <div class="shortcut-icon">
          <!-- Scheduled -->
          <svg v-if="shortcut.id === 'scheduled'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <path d="M16 2v4M8 2v4M3 10h18"/>
            <circle cx="12" cy="16" r="2" fill="currentColor"/>
          </svg>
          
          <!-- Saved Places -->
          <svg v-else-if="shortcut.id === 'saved'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 21s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 7.2c0 7.3-8 11.8-8 11.8z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          
          <!-- History -->
          <svg v-else-if="shortcut.id === 'history'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
          
          <!-- Referral -->
          <svg v-else-if="shortcut.id === 'referral'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
          </svg>
          
          <!-- Promotions -->
          <svg v-else-if="shortcut.id === 'promotions'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
            <circle cx="7" cy="7" r="1" fill="currentColor"/>
          </svg>
          
          <!-- Wallet -->
          <svg v-else-if="shortcut.id === 'wallet'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="5" width="20" height="14" rx="2"/>
            <path d="M2 10h20"/>
            <circle cx="17" cy="14" r="2" fill="currentColor"/>
          </svg>
          
          <!-- Help -->
          <svg v-else-if="shortcut.id === 'help'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
            <circle cx="12" cy="17" r="1" fill="currentColor"/>
          </svg>
          
          <!-- Safety -->
          <svg v-else-if="shortcut.id === 'safety'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="M9 12l2 2 4-4"/>
          </svg>
          
          <!-- Settings -->
          <svg v-else-if="shortcut.id === 'settings'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
          
          <!-- Default -->
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v8M8 12h8"/>
          </svg>
        </div>
        <span class="shortcut-name">{{ shortcut.name }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.shortcuts-section {
  padding: 0 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 14px;
}

.shortcuts-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.shortcut-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 8px;
  min-height: 88px; /* Ensure touch target is large enough */
  background: #FFFFFF;
  border: 2px solid #F5F5F5;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  /* Touch optimizations */
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
}

.shortcut-item:hover {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 5%, white);
  transform: translateY(-2px);
}

.shortcut-item:active {
  transform: scale(0.95);
}

/* Touch-specific styles for mobile */
@media (hover: none) {
  .shortcut-item:hover {
    transform: none;
  }
  
  .shortcut-item:active {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 10%, white);
    transform: scale(0.95);
  }
}

.shortcut-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--accent) 12%, white);
  border-radius: 12px;
  transition: all 0.2s ease;
}

.shortcut-item:hover .shortcut-icon {
  transform: scale(1.1);
}

.shortcut-icon svg {
  width: 22px;
  height: 22px;
  color: var(--accent);
}

.shortcut-name {
  font-size: 12px;
  font-weight: 500;
  color: #666666;
  text-align: center;
}

/* Responsive */
@media (max-width: 360px) {
  .shortcuts-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>

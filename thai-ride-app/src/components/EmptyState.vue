<!--
  Feature: F66 - Empty State Component
  
  แสดงสถานะว่างเปล่า
  - ไม่มีข้อมูล
  - ไม่พบผลลัพธ์
  - Error state
-->
<template>
  <div class="empty-state" :class="variant">
    <!-- Icon -->
    <div class="empty-icon">
      <!-- No Data -->
      <svg v-if="icon === 'no-data'" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14,2 14,8 20,8"/>
        <line x1="12" y1="18" x2="12" y2="12"/>
        <line x1="9" y1="15" x2="15" y2="15"/>
      </svg>

      <!-- No Results -->
      <svg v-else-if="icon === 'no-results'" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        <line x1="8" y1="11" x2="14" y2="11"/>
      </svg>

      <!-- No Rides -->
      <svg v-else-if="icon === 'no-rides'" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M5 17h14v-5l-2-4H7l-2 4v5z"/>
        <circle cx="7.5" cy="17" r="1.5"/>
        <circle cx="16.5" cy="17" r="1.5"/>
        <line x1="2" y1="2" x2="22" y2="22"/>
      </svg>

      <!-- No Notifications -->
      <svg v-else-if="icon === 'no-notifications'" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>

      <!-- No Messages -->
      <svg v-else-if="icon === 'no-messages'" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>

      <!-- Error -->
      <svg v-else-if="icon === 'error'" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>

      <!-- Offline -->
      <svg v-else-if="icon === 'offline'" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <line x1="1" y1="1" x2="23" y2="23"/>
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
        <path d="M10.71 5.05A16 16 0 0 1 22.58 9"/>
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
        <line x1="12" y1="20" x2="12.01" y2="20"/>
      </svg>

      <!-- Default -->
      <svg v-else width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
      </svg>
    </div>

    <!-- Title -->
    <h3 class="empty-title">{{ title }}</h3>

    <!-- Description -->
    <p class="empty-description" v-if="description">{{ description }}</p>

    <!-- Action Button -->
    <button 
      v-if="actionText" 
      class="action-btn"
      @click="$emit('action')"
    >
      {{ actionText }}
    </button>

    <!-- Secondary Action -->
    <button 
      v-if="secondaryText" 
      class="secondary-btn"
      @click="$emit('secondary')"
    >
      {{ secondaryText }}
    </button>
  </div>
</template>

<script setup lang="ts">
interface Props {
  icon?: 'no-data' | 'no-results' | 'no-rides' | 'no-notifications' | 'no-messages' | 'error' | 'offline' | 'default'
  title: string
  description?: string
  actionText?: string
  secondaryText?: string
  variant?: 'default' | 'compact' | 'fullpage'
}

withDefaults(defineProps<Props>(), {
  icon: 'default',
  variant: 'default'
})

defineEmits<{
  (e: 'action'): void
  (e: 'secondary'): void
}>()
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.empty-state.compact {
  padding: 24px 16px;
}

.empty-state.compact .empty-icon svg {
  width: 48px;
  height: 48px;
}

.empty-state.fullpage {
  min-height: 60vh;
}

.empty-icon {
  margin-bottom: 16px;
  color: #cccccc;
}

.empty-title {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: #000000;
}

.empty-state.compact .empty-title {
  font-size: 16px;
}

.empty-description {
  margin: 0 0 24px;
  font-size: 14px;
  color: #6b6b6b;
  max-width: 280px;
}

.empty-state.compact .empty-description {
  font-size: 13px;
  margin-bottom: 16px;
}

.action-btn {
  padding: 12px 24px;
  background: #00A86B;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  cursor: pointer;
  transition: background 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.action-btn:hover {
  background: #008F5B;
}

.secondary-btn {
  margin-top: 12px;
  padding: 8px 16px;
  background: none;
  border: none;
  font-size: 14px;
  color: #6b6b6b;
  cursor: pointer;
}

.secondary-btn:hover {
  color: #000000;
}

/* Error variant */
.empty-state.error .empty-icon {
  color: #e11900;
}

/* Offline variant */
.empty-state.offline .empty-icon {
  color: #f59e0b;
}
</style>

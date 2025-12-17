<script setup lang="ts">
/**
 * Feature: F199 - Activity Log
 * Display activity log list
 */

interface Activity {
  id: string
  type: 'create' | 'update' | 'delete' | 'login' | 'action'
  description: string
  user?: string
  timestamp: string
  details?: string
}

interface Props {
  activities: Activity[]
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  loading: false
})

const typeIcons = {
  create: 'M12 5v14M5 12h14',
  update: 'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z',
  delete: 'M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2',
  login: 'M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3',
  action: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z'
}

const typeColors = {
  create: '#2e7d32',
  update: '#276ef1',
  delete: '#e11900',
  login: '#6b6b6b',
  action: '#ef6c00'
}
</script>

<template>
  <div class="activity-log">
    <div v-if="loading" class="loading-state">
      <div v-for="i in 5" :key="i" class="skeleton-item">
        <div class="skeleton-icon"></div>
        <div class="skeleton-content">
          <div class="skeleton-line"></div>
          <div class="skeleton-line short"></div>
        </div>
      </div>
    </div>
    
    <div v-else-if="activities.length === 0" class="empty-state">
      <p>ไม่มีกิจกรรม</p>
    </div>
    
    <div v-else class="activity-list">
      <div v-for="activity in activities" :key="activity.id" class="activity-item">
        <div class="activity-icon" :style="{ color: typeColors[activity.type] }">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path :d="typeIcons[activity.type]"/>
          </svg>
        </div>
        <div class="activity-content">
          <p class="activity-desc">{{ activity.description }}</p>
          <div class="activity-meta">
            <span v-if="activity.user" class="activity-user">{{ activity.user }}</span>
            <span class="activity-time">{{ activity.timestamp }}</span>
          </div>
          <p v-if="activity.details" class="activity-details">{{ activity.details }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.activity-log {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e5e5;
}

.loading-state {
  padding: 16px;
}

.skeleton-item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
}

.skeleton-item + .skeleton-item {
  border-top: 1px solid #f6f6f6;
}

.skeleton-icon {
  width: 32px;
  height: 32px;
  background: #f0f0f0;
  border-radius: 8px;
  animation: pulse 1.5s infinite;
}

.skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-line {
  height: 12px;
  background: #f0f0f0;
  border-radius: 4px;
  animation: pulse 1.5s infinite;
}

.skeleton-line.short {
  width: 40%;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.empty-state {
  padding: 48px 16px;
  text-align: center;
  color: #6b6b6b;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

.activity-list {
  max-height: 400px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #f6f6f6;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border-radius: 8px;
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-desc {
  font-size: 13px;
  color: #000;
  margin: 0 0 4px;
}

.activity-meta {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: #999;
}

.activity-user {
  font-weight: 500;
  color: #6b6b6b;
}

.activity-details {
  font-size: 12px;
  color: #6b6b6b;
  margin: 6px 0 0;
  padding: 8px;
  background: #f6f6f6;
  border-radius: 6px;
}
</style>
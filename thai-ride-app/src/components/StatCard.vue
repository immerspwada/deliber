<script setup lang="ts">
/**
 * Feature: F106 - Stat Card
 * Statistics display card
 */
import { computed } from 'vue'

interface Props {
  title: string
  value: string | number
  subtitle?: string
  change?: number
  changeLabel?: string
  icon?: string
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  subtitle: '',
  change: 0,
  changeLabel: '',
  icon: '',
  loading: false
})

const changeType = computed(() => {
  if (props.change > 0) return 'positive'
  if (props.change < 0) return 'negative'
  return 'neutral'
})

const formattedChange = computed(() => {
  const prefix = props.change > 0 ? '+' : ''
  return `${prefix}${props.change}%`
})
</script>

<template>
  <div class="stat-card" :class="{ loading }">
    <div class="stat-header">
      <span class="stat-title">{{ title }}</span>
      
      <div v-if="icon" class="stat-icon">
        <!-- Money icon -->
        <svg v-if="icon === 'money'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
        </svg>
        <!-- Users icon -->
        <svg v-else-if="icon === 'users'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
        </svg>
        <!-- Orders icon -->
        <svg v-else-if="icon === 'orders'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h6"/>
        </svg>
        <!-- Chart icon -->
        <svg v-else-if="icon === 'chart'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 20V10M12 20V4M6 20v-6"/>
        </svg>
        <!-- Car icon -->
        <svg v-else-if="icon === 'car'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 17h14v-5H5v5zM19 12l-2-6H7L5 12"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>
        </svg>
        <!-- Star icon -->
        <svg v-else-if="icon === 'star'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      </div>
    </div>
    
    <div v-if="loading" class="stat-loading">
      <span class="skeleton" />
    </div>
    
    <template v-else>
      <div class="stat-value">{{ value }}</div>
      
      <div class="stat-footer">
        <span v-if="subtitle" class="stat-subtitle">{{ subtitle }}</span>
        
        <span v-if="change !== 0" class="stat-change" :class="changeType">
          <svg v-if="changeType === 'positive'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
          <svg v-else-if="changeType === 'negative'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
          {{ formattedChange }}
          <span v-if="changeLabel" class="change-label">{{ changeLabel }}</span>
        </span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.stat-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
}

.stat-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}

.stat-title {
  font-size: 14px;
  font-weight: 500;
  color: #6b6b6b;
}

.stat-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border-radius: 12px;
  color: #6b6b6b;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #000;
  line-height: 1.2;
}

.stat-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.stat-subtitle {
  font-size: 13px;
  color: #6b6b6b;
}

.stat-change {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 13px;
  font-weight: 500;
}

.stat-change.positive {
  color: #00c853;
}

.stat-change.negative {
  color: #e11900;
}

.stat-change.neutral {
  color: #6b6b6b;
}

.change-label {
  font-weight: 400;
  color: #6b6b6b;
  margin-left: 4px;
}

.stat-loading {
  padding: 16px 0;
}

.skeleton {
  display: block;
  width: 60%;
  height: 32px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>

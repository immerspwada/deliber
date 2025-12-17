<script setup lang="ts">
/**
 * Feature: F107 - Timeline
 * Vertical timeline for events/history
 */
interface TimelineItem {
  id: string
  title: string
  description?: string
  time?: string
  status?: 'completed' | 'current' | 'pending'
  icon?: string
}

interface Props {
  items: TimelineItem[]
}

defineProps<Props>()
</script>

<template>
  <div class="timeline">
    <div
      v-for="(item, index) in items"
      :key="item.id"
      class="timeline-item"
      :class="item.status || 'pending'"
    >
      <div class="timeline-marker">
        <div class="marker-dot">
          <!-- Check icon for completed -->
          <svg v-if="item.status === 'completed'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <!-- Location icon -->
          <svg v-else-if="item.icon === 'location'" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="4"/>
          </svg>
        </div>
        <div v-if="index < items.length - 1" class="marker-line" />
      </div>
      
      <div class="timeline-content">
        <div class="timeline-header">
          <span class="timeline-title">{{ item.title }}</span>
          <span v-if="item.time" class="timeline-time">{{ item.time }}</span>
        </div>
        <p v-if="item.description" class="timeline-description">{{ item.description }}</p>
        <slot :name="item.id" :item="item" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline {
  display: flex;
  flex-direction: column;
}

.timeline-item {
  display: flex;
  gap: 16px;
}

.timeline-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.marker-dot {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #e5e5e5;
  color: #6b6b6b;
  transition: all 0.2s;
}

.completed .marker-dot {
  background: #000;
  color: #fff;
}

.current .marker-dot {
  background: #000;
  color: #fff;
  box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.1);
}

.marker-line {
  width: 2px;
  flex: 1;
  min-height: 24px;
  background: #e5e5e5;
  margin: 4px 0;
}

.completed .marker-line {
  background: #000;
}

.timeline-content {
  flex: 1;
  padding-bottom: 24px;
}

.timeline-item:last-child .timeline-content {
  padding-bottom: 0;
}

.timeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 4px;
}

.timeline-title {
  font-size: 15px;
  font-weight: 500;
  color: #6b6b6b;
}

.completed .timeline-title,
.current .timeline-title {
  color: #000;
}

.timeline-time {
  font-size: 13px;
  color: #999;
  flex-shrink: 0;
}

.timeline-description {
  font-size: 14px;
  color: #6b6b6b;
  margin: 0;
  line-height: 1.5;
}
</style>

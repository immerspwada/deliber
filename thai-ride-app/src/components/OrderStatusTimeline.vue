<script setup lang="ts">
/**
 * Feature: F332 - Order Status Timeline
 * Timeline showing order status history
 */
interface StatusEvent {
  id: string
  status: string
  label: string
  time: string
  description?: string
  completed: boolean
  current: boolean
}

const props = withDefaults(defineProps<{
  events: StatusEvent[]
}>(), {
  events: () => []
})
</script>

<template>
  <div class="status-timeline">
    <div 
      v-for="(event, index) in events" 
      :key="event.id"
      class="timeline-item"
      :class="{ completed: event.completed, current: event.current }"
    >
      <div class="timeline-indicator">
        <div class="indicator-dot">
          <svg v-if="event.completed" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
          <div v-else-if="event.current" class="pulse" />
        </div>
        <div v-if="index < events.length - 1" class="indicator-line" />
      </div>
      
      <div class="timeline-content">
        <div class="content-header">
          <span class="event-label">{{ event.label }}</span>
          <span class="event-time">{{ event.time }}</span>
        </div>
        <p v-if="event.description" class="event-desc">{{ event.description }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.status-timeline {
  display: flex;
  flex-direction: column;
}

.timeline-item {
  display: flex;
  gap: 12px;
}

.timeline-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 24px;
}

.indicator-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #e5e5e5;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.timeline-item.completed .indicator-dot {
  background: #000;
}

.timeline-item.current .indicator-dot {
  background: #276ef1;
}

.pulse {
  width: 8px;
  height: 8px;
  background: #fff;
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.7; }
}

.indicator-line {
  width: 2px;
  flex: 1;
  min-height: 20px;
  background: #e5e5e5;
  margin: 4px 0;
}

.timeline-item.completed .indicator-line {
  background: #000;
}

.timeline-content {
  flex: 1;
  padding-bottom: 20px;
}

.timeline-item:last-child .timeline-content {
  padding-bottom: 0;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.event-label {
  font-size: 14px;
  color: #6b6b6b;
}

.timeline-item.completed .event-label,
.timeline-item.current .event-label {
  color: #000;
  font-weight: 500;
}

.event-time {
  font-size: 12px;
  color: #6b6b6b;
}

.event-desc {
  font-size: 13px;
  color: #6b6b6b;
  margin: 4px 0 0;
}
</style>

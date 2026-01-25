<script setup lang="ts">
/**
 * Feature: F171 - Place Suggestion List
 * Display search suggestions for places
 */

interface Place {
  id: string
  name: string
  address: string
  type: 'recent' | 'saved' | 'search'
  distance?: string
}

interface Props {
  places: Place[]
  loading?: boolean
  emptyMessage?: string
}

withDefaults(defineProps<Props>(), {
  loading: false,
  emptyMessage: 'ไม่พบสถานที่'
})

const emit = defineEmits<{
  select: [place: Place]
}>()

// Icon paths for future use
// const typeIcons = {
//   recent: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
//   saved: 'M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z',
//   search: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 10a1 1 0 100-2 1 1 0 000 2z'
// }
</script>

<template>
  <div class="place-suggestion-list">
    <div v-if="loading" class="loading-state">
      <div v-for="i in 3" :key="i" class="skeleton-item">
        <div class="skeleton-icon"></div>
        <div class="skeleton-content">
          <div class="skeleton-line short"></div>
          <div class="skeleton-line"></div>
        </div>
      </div>
    </div>
    
    <div v-else-if="places.length === 0" class="empty-state">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg>
      <p>{{ emptyMessage }}</p>
    </div>
  </div>
</template>

    <div v-else class="suggestions">
      <button
        v-for="place in places"
        :key="place.id"
        type="button"
        class="suggestion-item"
        @click="emit('select', place)"
      >
        <div class="suggestion-icon" :class="place.type">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path :d="typeIcons[place.type]"/>
          </svg>
        </div>
        <div class="suggestion-content">
          <span class="suggestion-name">{{ place.name }}</span>
          <span class="suggestion-address">{{ place.address }}</span>
        </div>
        <span v-if="place.distance" class="suggestion-distance">{{ place.distance }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.place-suggestion-list {
  background: #fff;
}

.loading-state {
  padding: 8px 0;
}

.skeleton-item {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
}

.skeleton-icon {
  width: 40px;
  height: 40px;
  background: #f0f0f0;
  border-radius: 10px;
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
  width: 60%;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 16px;
  color: #6b6b6b;
}

.empty-state p {
  margin: 12px 0 0;
  font-size: 14px;
}

.suggestions {
  display: flex;
  flex-direction: column;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: transparent;
  border: none;
  border-bottom: 1px solid #f6f6f6;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s;
}

.suggestion-item:hover {
  background: #f6f6f6;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border-radius: 10px;
  color: #6b6b6b;
  flex-shrink: 0;
}

.suggestion-icon.recent {
  background: #e3f2fd;
  color: #276ef1;
}

.suggestion-icon.saved {
  background: #fff3e0;
  color: #ef6c00;
}

.suggestion-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.suggestion-name {
  font-size: 14px;
  font-weight: 500;
  color: #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.suggestion-address {
  font-size: 12px;
  color: #6b6b6b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.suggestion-distance {
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
}
</style>
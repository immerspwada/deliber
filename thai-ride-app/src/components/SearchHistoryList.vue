<!--
  Feature: F63 - Search History List Component
  
  แสดงประวัติการค้นหา
  - รายการสถานที่ล่าสุด
  - ลบรายการ
  - เลือกสถานที่
-->
<template>
  <div class="search-history">
    <!-- Header -->
    <div class="history-header" v-if="showHeader">
      <h3>ค้นหาล่าสุด</h3>
      <button v-if="history.length > 0" class="clear-btn" @click="handleClear">
        ล้างทั้งหมด
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="skeleton" v-for="i in 3" :key="i"></div>
    </div>

    <!-- History List -->
    <div v-else-if="history.length > 0" class="history-list">
      <div 
        v-for="item in history" 
        :key="item.id"
        class="history-item"
        @click="$emit('select', item)"
      >
        <div class="item-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
        </div>
        <div class="item-content">
          <div class="item-name">{{ item.name || item.address }}</div>
          <div class="item-address" v-if="item.name">{{ item.address }}</div>
          <div class="item-time">{{ formatTimeAgo(item.searchedAt) }}</div>
        </div>
        <button 
          class="remove-btn" 
          @click.stop="handleRemove(item.id)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12,6 12,12 16,14"/>
      </svg>
      <p>ยังไม่มีประวัติการค้นหา</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useSearchHistory, type SearchHistoryItem } from '../composables/useSearchHistory'

interface Props {
  showHeader?: boolean
  maxItems?: number
}

const props = withDefaults(defineProps<Props>(), {
  showHeader: true,
  maxItems: 10
})

defineEmits<{
  (e: 'select', item: SearchHistoryItem): void
}>()

const { 
  loading, 
  history, 
  fetchHistory, 
  removeFromHistory, 
  clearHistory,
  formatTimeAgo 
} = useSearchHistory()

const handleRemove = async (id: string) => {
  await removeFromHistory(id)
}

const handleClear = async () => {
  if (confirm('ล้างประวัติการค้นหาทั้งหมด?')) {
    await clearHistory()
  }
}

onMounted(() => {
  fetchHistory()
})
</script>

<style scoped>
.search-history {
  padding: 16px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.history-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #6b6b6b;
}

.clear-btn {
  background: none;
  border: none;
  font-size: 13px;
  color: #e11900;
  cursor: pointer;
}

.loading-state {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton {
  height: 56px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f6f6f6;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.history-item:hover {
  background: #e5e5e5;
}

.item-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border-radius: 8px;
  color: #6b6b6b;
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 14px;
  font-weight: 500;
  color: #000000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-address {
  font-size: 12px;
  color: #6b6b6b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.item-time {
  font-size: 11px;
  color: #999999;
  margin-top: 2px;
}

.remove-btn {
  padding: 6px;
  background: none;
  border: none;
  color: #cccccc;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.remove-btn:hover {
  background: #ffffff;
  color: #e11900;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px;
  color: #cccccc;
  text-align: center;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}
</style>

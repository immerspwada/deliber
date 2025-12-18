<script setup lang="ts">
/**
 * RecentDestinations - จุดหมายล่าสุดแบบน่ารัก
 * MUNEEF Style: สีเขียว #00A86B, สีแดง #E53935 สำหรับ marker
 */
import { useHapticFeedback } from '../../composables/useHapticFeedback'

interface Destination {
  id: string | number
  name: string
  address?: string
  lat?: number
  lng?: number
}

interface Props {
  destinations: Destination[]
  title?: string
  maxItems?: number
}

const props = withDefaults(defineProps<Props>(), {
  title: 'จุดหมายล่าสุด',
  maxItems: 3
})

const emit = defineEmits<{
  'destination-click': [destination: Destination]
  'see-all-click': []
}>()

const haptic = useHapticFeedback()

const handleClick = (dest: Destination) => {
  haptic.light()
  emit('destination-click', dest)
}

const handleSeeAll = () => {
  haptic.light()
  emit('see-all-click')
}
</script>

<template>
  <section class="recent-section">
    <div class="section-header">
      <h3 class="section-title">{{ title }}</h3>
      <button v-if="destinations.length > 0" class="see-all-btn" @click="handleSeeAll">
        ดูทั้งหมด
      </button>
    </div>
    
    <!-- Empty State -->
    <div v-if="destinations.length === 0" class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="28" r="20" stroke="#E8E8E8" stroke-width="3"/>
          <circle cx="32" cy="28" r="8" fill="#E8E8E8"/>
          <path d="M32 48v10" stroke="#E8E8E8" stroke-width="3" stroke-linecap="round"/>
          <path d="M24 58h16" stroke="#E8E8E8" stroke-width="3" stroke-linecap="round"/>
        </svg>
      </div>
      <p class="empty-text">ยังไม่มีจุดหมายล่าสุด</p>
      <p class="empty-subtext">เริ่มเรียกรถเพื่อบันทึกจุดหมาย</p>
    </div>
    
    <!-- Destinations List -->
    <div v-else class="destinations-list">
      <button
        v-for="dest in destinations.slice(0, maxItems)"
        :key="dest.id"
        class="destination-item"
        @click="handleClick(dest)"
      >
        <div class="dest-icon">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="8" stroke="#E53935" stroke-width="2"/>
            <circle cx="12" cy="12" r="3" fill="#E53935"/>
          </svg>
        </div>
        <div class="dest-info">
          <span class="dest-name">{{ dest.name }}</span>
          <span v-if="dest.address" class="dest-address">{{ dest.address }}</span>
        </div>
        <div class="dest-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      </button>
    </div>
  </section>
</template>

<style scoped>
.recent-section {
  padding: 0 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
}

.see-all-btn {
  padding: 6px 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #00A86B;
  cursor: pointer;
  transition: all 0.2s ease;
}

.see-all-btn:hover {
  background: #E8F5EF;
}

.see-all-btn:active {
  transform: scale(0.95);
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 20px;
  background: #FAFAFA;
  border-radius: 16px;
}

.empty-icon {
  width: 64px;
  height: 64px;
  margin-bottom: 12px;
}

.empty-icon svg {
  width: 100%;
  height: 100%;
}

.empty-text {
  font-size: 15px;
  font-weight: 600;
  color: #666666;
  margin-bottom: 4px;
}

.empty-subtext {
  font-size: 13px;
  color: #999999;
}

/* Destinations List */
.destinations-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.destination-item {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px 16px;
  background: #FFFFFF;
  border: 2px solid #F5F5F5;
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.destination-item:hover {
  border-color: #E53935;
  background: #FFF5F5;
}

.destination-item:active {
  transform: scale(0.98);
}

.dest-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFF5F5;
  border-radius: 12px;
  flex-shrink: 0;
}

.dest-icon svg {
  width: 22px;
  height: 22px;
}

.dest-info {
  flex: 1;
  min-width: 0;
}

.dest-name {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dest-address {
  display: block;
  font-size: 12px;
  color: #999999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.dest-arrow {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #CCCCCC;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.destination-item:hover .dest-arrow {
  transform: translateX(4px);
  color: #E53935;
}

.dest-arrow svg {
  width: 18px;
  height: 18px;
}
</style>

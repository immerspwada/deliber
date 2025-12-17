<!--
  Feature: F64 - Favorite Places Component
  
  แสดงสถานที่โปรด
  - บ้าน/ที่ทำงาน
  - สถานที่บันทึกไว้
  - เพิ่ม/แก้ไข/ลบ
-->
<template>
  <div class="favorite-places">
    <!-- Quick Access -->
    <div class="quick-access">
      <!-- Home -->
      <button 
        class="quick-btn"
        :class="{ 'has-place': homePlace }"
        @click="homePlace ? $emit('select', homePlace) : $emit('setHome')"
      >
        <div class="quick-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9,22 9,12 15,12 15,22"/>
          </svg>
        </div>
        <div class="quick-content">
          <div class="quick-label">บ้าน</div>
          <div class="quick-address" v-if="homePlace">{{ homePlace.address }}</div>
          <div class="quick-hint" v-else>ตั้งค่าที่อยู่บ้าน</div>
        </div>
        <button 
          v-if="homePlace" 
          class="edit-btn"
          @click.stop="$emit('editHome')"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      </button>

      <!-- Work -->
      <button 
        class="quick-btn"
        :class="{ 'has-place': workPlace }"
        @click="workPlace ? $emit('select', workPlace) : $emit('setWork')"
      >
        <div class="quick-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
          </svg>
        </div>
        <div class="quick-content">
          <div class="quick-label">ที่ทำงาน</div>
          <div class="quick-address" v-if="workPlace">{{ workPlace.address }}</div>
          <div class="quick-hint" v-else>ตั้งค่าที่ทำงาน</div>
        </div>
        <button 
          v-if="workPlace" 
          class="edit-btn"
          @click.stop="$emit('editWork')"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      </button>
    </div>

    <!-- Saved Places -->
    <div class="saved-places" v-if="savedPlaces.length > 0">
      <div class="section-header">
        <h3>สถานที่บันทึกไว้</h3>
        <button class="add-btn" @click="$emit('addPlace')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          เพิ่ม
        </button>
      </div>
      <div class="places-list">
        <button 
          v-for="place in savedPlaces" 
          :key="place.id"
          class="place-item"
          @click="$emit('select', place)"
        >
          <div class="place-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <div class="place-content">
            <div class="place-name">{{ place.name }}</div>
            <div class="place-address">{{ place.address }}</div>
          </div>
          <button 
            class="remove-btn"
            @click.stop="$emit('removePlace', place.id)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-saved">
      <button class="add-place-btn" @click="$emit('addPlace')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        <span>เพิ่มสถานที่โปรด</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface Place {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  type?: 'home' | 'work' | 'saved'
}

interface Props {
  homePlace?: Place | null
  workPlace?: Place | null
  savedPlaces?: Place[]
}

withDefaults(defineProps<Props>(), {
  savedPlaces: () => []
})

defineEmits<{
  (e: 'select', place: Place): void
  (e: 'setHome'): void
  (e: 'setWork'): void
  (e: 'editHome'): void
  (e: 'editWork'): void
  (e: 'addPlace'): void
  (e: 'removePlace', id: string): void
}>()
</script>

<style scoped>
.favorite-places {
  padding: 16px;
}

/* Quick Access */
.quick-access {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.quick-btn {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #f6f6f6;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s ease;
  position: relative;
}

.quick-btn:hover {
  background: #e5e5e5;
}

.quick-btn.has-place {
  background: #ffffff;
  border: 1px solid #e5e5e5;
}

.quick-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border-radius: 10px;
  color: #6b6b6b;
}

.quick-btn.has-place .quick-icon {
  background: #000000;
  color: #ffffff;
}

.quick-content {
  flex: 1;
  min-width: 0;
}

.quick-label {
  font-size: 14px;
  font-weight: 600;
  color: #000000;
}

.quick-address {
  font-size: 12px;
  color: #6b6b6b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.quick-hint {
  font-size: 12px;
  color: #999999;
  margin-top: 2px;
}

.edit-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px;
  background: #f6f6f6;
  border: none;
  border-radius: 4px;
  color: #6b6b6b;
  cursor: pointer;
}

.edit-btn:hover {
  background: #e5e5e5;
  color: #000000;
}

/* Saved Places */
.saved-places {
  margin-top: 8px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #6b6b6b;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: none;
  border: none;
  font-size: 13px;
  color: #000000;
  cursor: pointer;
}

.places-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.place-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f6f6f6;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s ease;
}

.place-item:hover {
  background: #e5e5e5;
}

.place-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border-radius: 8px;
  color: #6b6b6b;
}

.place-content {
  flex: 1;
  min-width: 0;
}

.place-name {
  font-size: 14px;
  font-weight: 500;
  color: #000000;
}

.place-address {
  font-size: 12px;
  color: #6b6b6b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.remove-btn {
  padding: 6px;
  background: none;
  border: none;
  color: #cccccc;
  cursor: pointer;
  border-radius: 4px;
}

.remove-btn:hover {
  background: #ffffff;
  color: #e11900;
}

/* Empty State */
.empty-saved {
  margin-top: 8px;
}

.add-place-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 16px;
  background: none;
  border: 1px dashed #e5e5e5;
  border-radius: 8px;
  font-size: 14px;
  color: #6b6b6b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-place-btn:hover {
  border-color: #000000;
  color: #000000;
}
</style>

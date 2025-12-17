<script setup lang="ts">
/**
 * Feature: F157 - Shopping Item Card
 * Display shopping list item
 */

interface Props {
  name: string
  quantity: number
  unit?: string
  notes?: string
  estimatedPrice?: number
  actualPrice?: number
  status?: 'pending' | 'found' | 'not_found' | 'substituted'
  photo?: string
}

withDefaults(defineProps<Props>(), {
  unit: 'ชิ้น',
  status: 'pending'
})

const emit = defineEmits<{
  edit: []
  remove: []
}>()

const statusConfig = {
  pending: { label: 'รอซื้อ', class: 'pending' },
  found: { label: 'พบแล้ว', class: 'found' },
  not_found: { label: 'ไม่พบ', class: 'not-found' },
  substituted: { label: 'ทดแทน', class: 'substituted' }
}
</script>

<template>
  <div class="shopping-item-card" :class="status">
    <div v-if="photo" class="item-photo">
      <img :src="photo" :alt="name" />
    </div>
    <div v-else class="item-icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 01-8 0"/>
      </svg>
    </div>
    
    <div class="item-info">
      <div class="item-header">
        <h4 class="item-name">{{ name }}</h4>
        <span class="status-badge" :class="statusConfig[status].class">
          {{ statusConfig[status].label }}
        </span>
      </div>
      <p class="item-quantity">{{ quantity }} {{ unit }}</p>
      <p v-if="notes" class="item-notes">{{ notes }}</p>
      <div class="item-price">
        <span v-if="estimatedPrice" class="estimated">~฿{{ estimatedPrice }}</span>
        <span v-if="actualPrice" class="actual">฿{{ actualPrice }}</span>
      </div>
    </div>
    
    <div class="item-actions">
      <button type="button" class="action-btn" @click="emit('edit')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      <button type="button" class="action-btn delete" @click="emit('remove')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.shopping-item-card {
  display: flex;
  gap: 12px;
  padding: 14px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e5e5;
  align-items: flex-start;
}

.shopping-item-card.found {
  border-color: #276ef1;
  background: #f8faff;
}

.shopping-item-card.not-found {
  border-color: #e11900;
  background: #fff8f7;
}

.shopping-item-card.substituted {
  border-color: #ff9800;
  background: #fffaf5;
}

.item-photo {
  width: 56px;
  height: 56px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
}

.item-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border-radius: 10px;
  color: #6b6b6b;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.item-name {
  font-size: 15px;
  font-weight: 600;
  color: #000;
  margin: 0;
}

.status-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 10px;
  text-transform: uppercase;
}

.status-badge.pending {
  background: #f6f6f6;
  color: #6b6b6b;
}

.status-badge.found {
  background: #e3f2fd;
  color: #276ef1;
}

.status-badge.not-found {
  background: #ffebee;
  color: #e11900;
}

.status-badge.substituted {
  background: #fff3e0;
  color: #ef6c00;
}

.item-quantity {
  font-size: 13px;
  color: #6b6b6b;
  margin: 0 0 4px;
}

.item-notes {
  font-size: 12px;
  color: #999;
  margin: 0 0 6px;
  font-style: italic;
}

.item-price {
  display: flex;
  gap: 8px;
  align-items: center;
}

.item-price .estimated {
  font-size: 12px;
  color: #999;
  text-decoration: line-through;
}

.item-price .actual {
  font-size: 14px;
  font-weight: 600;
  color: #000;
}

.item-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border: none;
  border-radius: 8px;
  color: #6b6b6b;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #e5e5e5;
  color: #000;
}

.action-btn.delete:hover {
  background: #ffebee;
  color: #e11900;
}
</style>

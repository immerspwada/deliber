<script setup lang="ts">
/**
 * Feature: F329 - Shopper Card
 * Card showing assigned shopper info
 */
interface Shopper {
  id: string
  name: string
  photo?: string
  rating: number
  totalOrders: number
  phone: string
}

const props = defineProps<{
  shopper: Shopper
}>()

const emit = defineEmits<{
  'call': []
  'chat': []
}>()
</script>

<template>
  <div class="shopper-card">
    <div class="shopper-info">
      <div class="shopper-avatar">
        <img v-if="shopper.photo" :src="shopper.photo" :alt="shopper.name" />
        <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      
      <div class="shopper-details">
        <h3 class="shopper-name">{{ shopper.name }}</h3>
        <div class="shopper-meta">
          <span class="shopper-rating">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            {{ shopper.rating.toFixed(1) }}
          </span>
          <span class="shopper-orders">{{ shopper.totalOrders }} ออเดอร์</span>
        </div>
      </div>
    </div>
    
    <div class="shopper-actions">
      <button type="button" class="action-btn" @click="emit('chat')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
      </button>
      <button type="button" class="action-btn call" @click="emit('call')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.shopper-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
}

.shopper-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.shopper-avatar {
  width: 48px;
  height: 48px;
  background: #f6f6f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: #6b6b6b;
}

.shopper-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.shopper-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.shopper-name {
  font-size: 16px;
  font-weight: 600;
  color: #000;
  margin: 0;
}

.shopper-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: #6b6b6b;
}

.shopper-rating {
  display: flex;
  align-items: center;
  gap: 2px;
  color: #000;
}

.shopper-rating svg {
  color: #ffc107;
}

.shopper-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 44px;
  height: 44px;
  background: #f6f6f6;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #000;
  transition: background 0.2s;
}

.action-btn:hover {
  background: #e5e5e5;
}

.action-btn.call {
  background: #000;
  color: #fff;
}

.action-btn.call:hover {
  background: #333;
}
</style>

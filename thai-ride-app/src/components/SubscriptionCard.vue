<script setup lang="ts">
/**
 * Feature: F139 - Subscription Card
 * Display subscription plan info
 */

interface Props {
  planName: string
  price: number
  period: 'monthly' | 'yearly'
  features: string[]
  isActive?: boolean
  expiresAt?: string
  ridesRemaining?: number
  totalRides?: number
}

const props = withDefaults(defineProps<Props>(), {
  isActive: false
})

const emit = defineEmits<{
  subscribe: []
  manage: []
  cancel: []
}>()

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

const periodLabel = { monthly: '/เดือน', yearly: '/ปี' }
</script>

<template>
  <div class="subscription-card" :class="{ active: isActive }">
    <div v-if="isActive" class="active-badge">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
      </svg>
      <span>แพ็กเกจปัจจุบัน</span>
    </div>
    
    <div class="card-header">
      <h3 class="plan-name">{{ planName }}</h3>
      <div class="plan-price">
        <span class="price-amount">฿{{ price.toLocaleString() }}</span>
        <span class="price-period">{{ periodLabel[period] }}</span>
      </div>
    </div>

    <div v-if="isActive && ridesRemaining !== undefined" class="usage-info">
      <div class="usage-bar">
        <div class="usage-fill" :style="{ width: `${(ridesRemaining / (totalRides || 1)) * 100}%` }" />
      </div>
      <span class="usage-text">เหลือ {{ ridesRemaining }} เที่ยว จาก {{ totalRides }} เที่ยว</span>
    </div>
    
    <ul class="features-list">
      <li v-for="(feature, i) in features" :key="i" class="feature-item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
        </svg>
        <span>{{ feature }}</span>
      </li>
    </ul>
    
    <div class="card-footer">
      <span v-if="isActive && expiresAt" class="expires-text">
        หมดอายุ {{ formatDate(expiresAt) }}
      </span>
      <div class="footer-actions">
        <button v-if="!isActive" type="button" class="action-btn primary" @click="emit('subscribe')">
          สมัครแพ็กเกจ
        </button>
        <template v-else>
          <button type="button" class="action-btn" @click="emit('manage')">จัดการ</button>
          <button type="button" class="action-btn danger" @click="emit('cancel')">ยกเลิก</button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.subscription-card {
  background: #fff;
  border-radius: 20px;
  padding: 20px;
  border: 2px solid transparent;
  position: relative;
}

.subscription-card.active {
  border-color: #000;
}

.active-badge {
  position: absolute;
  top: -12px;
  left: 20px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  background: #000;
  color: #fff;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.plan-name {
  font-size: 20px;
  font-weight: 700;
  color: #000;
  margin: 0;
}

.plan-price {
  text-align: right;
}

.price-amount {
  font-size: 24px;
  font-weight: 700;
  color: #000;
}

.price-period {
  font-size: 14px;
  color: #6b6b6b;
}

.usage-info {
  margin-bottom: 16px;
}

.usage-bar {
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 6px;
}

.usage-fill {
  height: 100%;
  background: #000;
  border-radius: 4px;
  transition: width 0.3s;
}

.usage-text {
  font-size: 12px;
  color: #6b6b6b;
}

.features-list {
  list-style: none;
  padding: 0;
  margin: 0 0 16px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  font-size: 14px;
  color: #000;
}

.feature-item svg {
  color: #2e7d32;
  flex-shrink: 0;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.expires-text {
  font-size: 13px;
  color: #6b6b6b;
}

.footer-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 10px 20px;
  background: #f6f6f6;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #000;
  cursor: pointer;
}

.action-btn:hover { background: #e5e5e5; }
.action-btn.primary { background: #000; color: #fff; }
.action-btn.primary:hover { background: #333; }
.action-btn.danger { color: #c62828; }
.action-btn.danger:hover { background: #ffebee; }
</style>

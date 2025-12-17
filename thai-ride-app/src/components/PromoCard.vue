<script setup lang="ts">
/**
 * Feature: F128 - Promo Card
 * Display promotional offer card
 */

interface Props {
  code: string
  title: string
  description?: string
  discount: string
  expiresAt?: string
  minOrder?: number
  maxDiscount?: number
  isApplied?: boolean
  isExpired?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isApplied: false,
  isExpired: false
})

const emit = defineEmits<{
  apply: []
  copy: []
}>()

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

const handleApply = () => {
  if (!props.isExpired && !props.isApplied) {
    emit('apply')
  }
}
</script>

<template>
  <div class="promo-card" :class="{ expired: isExpired, applied: isApplied }">
    <div class="promo-left">
      <div class="promo-badge">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><circle cx="7" cy="7" r="1"/>
        </svg>
      </div>
    </div>
    
    <div class="promo-divider">
      <div class="circle top" />
      <div class="dashed-line" />
      <div class="circle bottom" />
    </div>
    
    <div class="promo-content">
      <div class="promo-header">
        <span class="promo-discount">{{ discount }}</span>
        <span v-if="isApplied" class="applied-badge">ใช้แล้ว</span>
        <span v-else-if="isExpired" class="expired-badge">หมดอายุ</span>
      </div>
      
      <h3 class="promo-title">{{ title }}</h3>
      <p v-if="description" class="promo-description">{{ description }}</p>
      
      <div class="promo-meta">
        <span v-if="minOrder" class="meta-item">ขั้นต่ำ ฿{{ minOrder.toLocaleString() }}</span>
        <span v-if="maxDiscount" class="meta-item">สูงสุด ฿{{ maxDiscount.toLocaleString() }}</span>
      </div>
      
      <div class="promo-footer">
        <div class="promo-code">
          <span>{{ code }}</span>
          <button type="button" class="copy-btn" @click="emit('copy')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
          </button>
        </div>
        
        <div class="promo-actions">
          <span v-if="expiresAt" class="expires">หมดอายุ {{ formatDate(expiresAt) }}</span>
          <button 
            type="button" 
            class="apply-btn"
            :disabled="isExpired || isApplied"
            @click="handleApply"
          >
            {{ isApplied ? 'ใช้แล้ว' : 'ใช้โค้ด' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.promo-card {
  display: flex;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.promo-card.expired {
  opacity: 0.6;
}

.promo-left {
  width: 80px;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.promo-badge {
  transform: rotate(-45deg);
}

.promo-divider {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  width: 0;
}

.circle {
  width: 20px;
  height: 20px;
  background: #f6f6f6;
  border-radius: 50%;
  position: absolute;
}

.circle.top {
  top: -10px;
}

.circle.bottom {
  bottom: -10px;
}

.dashed-line {
  width: 0;
  height: calc(100% - 40px);
  border-left: 2px dashed #e5e5e5;
  margin: 20px 0;
}

.promo-content {
  flex: 1;
  padding: 16px;
}

.promo-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.promo-discount {
  font-size: 20px;
  font-weight: 700;
  color: #000;
}

.applied-badge,
.expired-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
}

.applied-badge {
  background: #276ef1;
  color: #fff;
}

.expired-badge {
  background: #e5e5e5;
  color: #6b6b6b;
}

.promo-title {
  font-size: 16px;
  font-weight: 600;
  color: #000;
  margin: 0 0 4px;
}

.promo-description {
  font-size: 13px;
  color: #6b6b6b;
  margin: 0 0 8px;
  line-height: 1.4;
}

.promo-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.meta-item {
  font-size: 12px;
  color: #6b6b6b;
}

.promo-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.promo-code {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #f6f6f6;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #000;
  font-family: monospace;
}

.copy-btn {
  background: none;
  border: none;
  padding: 2px;
  cursor: pointer;
  color: #6b6b6b;
}

.copy-btn:hover {
  color: #000;
}

.promo-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.expires {
  font-size: 12px;
  color: #6b6b6b;
}

.apply-btn {
  padding: 8px 16px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.apply-btn:hover:not(:disabled) {
  opacity: 0.8;
}

.apply-btn:disabled {
  background: #e5e5e5;
  color: #6b6b6b;
  cursor: not-allowed;
}
</style>

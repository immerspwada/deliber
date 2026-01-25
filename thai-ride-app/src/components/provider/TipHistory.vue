<!--
  TipHistory Component - Provider views received tips
  
  Features:
  - Total tips summary
  - Tip list with customer info
  - Thank you messages
-->
<script setup lang="ts">
import { onMounted } from 'vue'
import { useTip } from '../../composables/useTip'

const {
  loading,
  error,
  providerTips,
  totalTips,
  tipCount,
  loadProviderTips,
  formatTipAmount
} = useTip()

// Format date
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Lifecycle
onMounted(() => {
  loadProviderTips()
})
</script>

<template>
  <div class="tip-history">
    <!-- Summary Card -->
    <div class="summary-card">
      <div class="summary-icon">💰</div>
      <div class="summary-content">
        <h3>ทิปที่ได้รับ</h3>
        <p class="total-amount">{{ formatTipAmount(totalTips) }}</p>
        <p class="tip-count">จาก {{ tipCount }} ครั้ง</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลด...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button type="button" class="btn-retry" @click="() => loadProviderTips()">
        ลองใหม่
      </button>
    </div>

    <!-- Empty State -->
    <div v-else-if="providerTips.length === 0" class="empty-state">
      <div class="empty-icon">🎁</div>
      <p>ยังไม่มีทิป</p>
      <p class="empty-hint">ให้บริการดีๆ แล้วลูกค้าจะให้ทิปคุณ!</p>
    </div>

    <!-- Tip List -->
    <div v-else class="tip-list">
      <h4>ประวัติทิป</h4>
      
      <div 
        v-for="tip in providerTips" 
        :key="tip.id" 
        class="tip-item"
      >
        <div class="tip-header">
          <div class="customer-info">
            <div class="customer-avatar">
              <img 
                v-if="tip.customer?.avatar_url" 
                :src="tip.customer.avatar_url" 
                :alt="tip.customer?.name"
              />
              <span v-else>{{ tip.customer?.name?.charAt(0) || '?' }}</span>
            </div>
            <div class="customer-details">
              <span class="customer-name">{{ tip.customer?.name || 'ลูกค้า' }}</span>
              <span class="tip-date">{{ formatDate(tip.created_at) }}</span>
            </div>
          </div>
          <div class="tip-amount">+{{ formatTipAmount(tip.amount) }}</div>
        </div>

        <!-- Message -->
        <div v-if="tip.message" class="tip-message">
          <span class="message-icon">💬</span>
          <span>"{{ tip.message }}"</span>
        </div>

        <!-- Route -->
        <div v-if="tip.pickup_address" class="tip-route">
          <span class="route-icon">📍</span>
          <span>{{ tip.pickup_address?.split(',')[0] }}</span>
          <span class="route-arrow">→</span>
          <span>{{ tip.destination_address?.split(',')[0] }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tip-history {
  padding: 16px;
}

/* Summary Card */
.summary-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%);
  color: #fff;
  border-radius: 16px;
  margin-bottom: 20px;
}

.summary-icon {
  font-size: 40px;
}

.summary-content h3 {
  font-size: 14px;
  font-weight: 500;
  opacity: 0.9;
  margin: 0 0 4px 0;
}

.total-amount {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 2px 0;
}

.tip-count {
  font-size: 13px;
  opacity: 0.8;
  margin: 0;
}

/* Loading & States */
.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  text-align: center;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E5E7EB;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-state p {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin: 0;
}

.empty-hint {
  font-size: 14px !important;
  color: #6B7280 !important;
  font-weight: 400 !important;
  margin-top: 4px !important;
}

.btn-retry {
  padding: 10px 20px;
  background: #00A86B;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 12px;
}

/* Tip List */
.tip-list h4 {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 12px 0;
}

.tip-item {
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 10px;
}

.tip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.customer-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.customer-avatar {
  width: 40px;
  height: 40px;
  background: #E5E7EB;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-size: 16px;
  font-weight: 600;
  color: #6B7280;
}

.customer-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.customer-details {
  display: flex;
  flex-direction: column;
}

.customer-name {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.tip-date {
  font-size: 12px;
  color: #6B7280;
}

.tip-amount {
  font-size: 18px;
  font-weight: 700;
  color: #00A86B;
}

/* Message */
.tip-message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 10px;
  padding: 10px;
  background: #FEF3C7;
  border-radius: 8px;
  font-size: 13px;
  color: #92400E;
  font-style: italic;
}

.message-icon {
  flex-shrink: 0;
}

/* Route */
.tip-route {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  font-size: 12px;
  color: #6B7280;
}

.route-icon {
  flex-shrink: 0;
}

.route-arrow {
  color: #9CA3AF;
}
</style>

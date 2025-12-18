<script setup lang="ts">
/**
 * Feature: F152 - Provider Earnings Card
 * Display provider earnings summary
 */

interface Props {
  todayEarnings: number
  weekEarnings: number
  monthEarnings: number
  pendingPayout: number
  currency?: string
}

withDefaults(defineProps<Props>(), {
  currency: '฿'
})

const emit = defineEmits<{
  viewDetails: []
  withdraw: []
}>()
</script>

<template>
  <div class="earnings-card">
    <div class="card-header">
      <h3 class="card-title">รายได้ของคุณ</h3>
      <button type="button" class="details-btn" @click="emit('viewDetails')">
        ดูรายละเอียด
      </button>
    </div>
    
    <div class="today-earnings">
      <span class="earnings-label">วันนี้</span>
      <span class="earnings-amount">{{ currency }}{{ todayEarnings.toLocaleString() }}</span>
    </div>
    
    <div class="earnings-grid">
      <div class="earnings-item">
        <span class="item-label">สัปดาห์นี้</span>
        <span class="item-value">{{ currency }}{{ weekEarnings.toLocaleString() }}</span>
      </div>
      <div class="earnings-item">
        <span class="item-label">เดือนนี้</span>
        <span class="item-value">{{ currency }}{{ monthEarnings.toLocaleString() }}</span>
      </div>
    </div>
    
    <div class="payout-section">
      <div class="payout-info">
        <span class="payout-label">รอถอนเงิน</span>
        <span class="payout-amount">{{ currency }}{{ pendingPayout.toLocaleString() }}</span>
      </div>

      <button type="button" class="withdraw-btn" @click="emit('withdraw')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 19V5M5 12l7-7 7 7"/>
        </svg>
        ถอนเงิน
      </button>
    </div>
  </div>
</template>

<style scoped>
.earnings-card {
  background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%);
  border-radius: 20px;
  padding: 20px;
  color: #fff;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-title {
  font-size: 16px;
  font-weight: 500;
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
}

.details-btn {
  background: none;
  border: none;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  text-decoration: underline;
}

.today-earnings {
  margin-bottom: 20px;
}

.earnings-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  display: block;
  margin-bottom: 4px;
}

.earnings-amount {
  font-size: 36px;
  font-weight: 700;
  letter-spacing: -1px;
}

.earnings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

.earnings-item {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 14px;
}

.item-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  display: block;
  margin-bottom: 4px;
}

.item-value {
  font-size: 18px;
  font-weight: 600;
}

.payout-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.payout-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  display: block;
}

.payout-amount {
  font-size: 18px;
  font-weight: 600;
  color: #81c784;
}

.withdraw-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  background: #fff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #000;
  cursor: pointer;
}

.withdraw-btn:hover {
  background: #f0f0f0;
}
</style>

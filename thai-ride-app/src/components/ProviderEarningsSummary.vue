<script setup lang="ts">
/**
 * Feature: F344 - Provider Earnings Summary
 * Summary card for provider earnings
 */
interface EarningsSummary {
  today: number
  week: number
  month: number
  pending: number
  tripsToday: number
  tripsWeek: number
}

const props = withDefaults(defineProps<{
  earnings: EarningsSummary
  loading?: boolean
}>(), {
  earnings: () => ({
    today: 0,
    week: 0,
    month: 0,
    pending: 0,
    tripsToday: 0,
    tripsWeek: 0
  }),
  loading: false
})

const emit = defineEmits<{
  'withdraw': []
  'viewHistory': []
}>()
</script>

<template>
  <div class="earnings-summary">
    <div class="summary-header">
      <h3 class="summary-title">รายได้</h3>
      <button type="button" class="history-btn" @click="emit('viewHistory')">
        ดูประวัติ
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>
    </div>
    
    <div class="today-earnings">
      <span class="today-label">วันนี้</span>
      <span class="today-amount">฿{{ earnings.today.toLocaleString() }}</span>
      <span class="today-trips">{{ earnings.tripsToday }} เที่ยว</span>
    </div>
    
    <div class="earnings-grid">
      <div class="earnings-item">
        <span class="item-label">สัปดาห์นี้</span>
        <span class="item-value">฿{{ earnings.week.toLocaleString() }}</span>
        <span class="item-sub">{{ earnings.tripsWeek }} เที่ยว</span>
      </div>
      <div class="earnings-item">
        <span class="item-label">เดือนนี้</span>
        <span class="item-value">฿{{ earnings.month.toLocaleString() }}</span>
      </div>
      <div class="earnings-item pending">
        <span class="item-label">รอถอน</span>
        <span class="item-value">฿{{ earnings.pending.toLocaleString() }}</span>
      </div>
    </div>
    
    <button 
      type="button" 
      class="withdraw-btn"
      :disabled="earnings.pending <= 0 || loading"
      @click="emit('withdraw')"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
        <path d="M7 10l5 5 5-5"/>
        <path d="M12 15V3"/>
      </svg>
      ถอนเงิน
    </button>
  </div>
</template>

<style scoped>
.earnings-summary {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.summary-title {
  font-size: 16px;
  font-weight: 600;
  color: #000;
  margin: 0;
}

.history-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #6b6b6b;
  background: none;
  border: none;
  cursor: pointer;
}

.today-earnings {
  text-align: center;
  padding: 20px;
  background: #f6f6f6;
  border-radius: 12px;
  margin-bottom: 16px;
}

.today-label {
  font-size: 14px;
  color: #6b6b6b;
  display: block;
}

.today-amount {
  font-size: 36px;
  font-weight: 700;
  color: #000;
  display: block;
  margin: 4px 0;
}

.today-trips {
  font-size: 14px;
  color: #6b6b6b;
}

.earnings-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.earnings-item {
  text-align: center;
  padding: 12px;
  background: #f6f6f6;
  border-radius: 8px;
}

.earnings-item.pending {
  background: #e8f5e9;
}

.item-label {
  font-size: 12px;
  color: #6b6b6b;
  display: block;
}

.item-value {
  font-size: 16px;
  font-weight: 600;
  color: #000;
  display: block;
  margin-top: 2px;
}

.item-sub {
  font-size: 11px;
  color: #6b6b6b;
}

.withdraw-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.withdraw-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>

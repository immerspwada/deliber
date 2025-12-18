<script setup lang="ts">
/**
 * Feature: F129 - Wallet Card
 * Display wallet balance and quick actions
 */

interface Props {
  balance: number
  currency?: string
  pendingAmount?: number
  showTopUp?: boolean
  showWithdraw?: boolean
}

withDefaults(defineProps<Props>(), {
  currency: '฿',
  pendingAmount: 0,
  showTopUp: true,
  showWithdraw: false
})

const emit = defineEmits<{
  topUp: []
  withdraw: []
  history: []
}>()
</script>

<template>
  <div class="wallet-card">
    <div class="wallet-header">
      <div class="wallet-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-5z"/><path d="M16 12h5v4h-5a2 2 0 010-4z"/>
        </svg>
      </div>
      <span class="wallet-label">ยอดเงินคงเหลือ</span>
    </div>
    
    <div class="wallet-balance">
      <span class="currency">{{ currency }}</span>
      <span class="amount">{{ balance.toLocaleString('th-TH', { minimumFractionDigits: 2 }) }}</span>
    </div>
    
    <div v-if="pendingAmount > 0" class="pending-amount">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
      </svg>
      <span>รอดำเนินการ {{ currency }}{{ pendingAmount.toLocaleString() }}</span>
    </div>
    
    <div class="wallet-actions">
      <button v-if="showTopUp" type="button" class="action-btn primary" @click="emit('topUp')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>
        </svg>
        <span>เติมเงิน</span>
      </button>
      
      <button v-if="showWithdraw" type="button" class="action-btn" @click="emit('withdraw')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 19V5M5 12l7-7 7 7"/>
        </svg>
        <span>ถอนเงิน</span>
      </button>
      
      <button type="button" class="action-btn" @click="emit('history')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
        </svg>
        <span>ประวัติ</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.wallet-card {
  background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%);
  border-radius: 20px;
  padding: 24px;
  color: #fff;
}

.wallet-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.wallet-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}

.wallet-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

.wallet-balance {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 8px;
}

.currency {
  font-size: 24px;
  font-weight: 500;
}

.amount {
  font-size: 36px;
  font-weight: 700;
  letter-spacing: -1px;
}

.pending-amount {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 20px;
}

.wallet-actions {
  display: flex;
  gap: 10px;
}

.action-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.action-btn.primary {
  background: #fff;
  color: #000;
}

.action-btn.primary:hover {
  background: #f0f0f0;
}
</style>

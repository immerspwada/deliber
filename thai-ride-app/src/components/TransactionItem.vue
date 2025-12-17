<script setup lang="ts">
/**
 * Feature: F130 - Transaction Item
 * Display wallet transaction history item
 */

interface Props {
  type: 'topup' | 'payment' | 'refund' | 'withdraw' | 'bonus'
  title: string
  description?: string
  amount: number
  date: string
  status?: 'completed' | 'pending' | 'failed'
}

const props = withDefaults(defineProps<Props>(), {
  status: 'completed'
})

const isPositive = ['topup', 'refund', 'bonus'].includes(props.type)

const formatAmount = (amount: number) => {
  const prefix = isPositive ? '+' : '-'
  return `${prefix}฿${Math.abs(amount).toLocaleString()}`
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="transaction-item" :class="status">
    <div class="transaction-icon" :class="type">
      <svg v-if="type === 'topup'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>
      </svg>
      <svg v-else-if="type === 'payment'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M5 17h14v-5H5v5zM19 12l-2-6H7L5 12"/>
      </svg>
      <svg v-else-if="type === 'refund'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
      </svg>

      <svg v-else-if="type === 'withdraw'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 19V5M5 12l7-7 7 7"/>
      </svg>
      <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    </div>
    
    <div class="transaction-info">
      <span class="transaction-title">{{ title }}</span>
      <span v-if="description" class="transaction-desc">{{ description }}</span>
      <span class="transaction-date">{{ formatDate(date) }}</span>
    </div>
    
    <div class="transaction-amount" :class="{ positive: isPositive, negative: !isPositive }">
      <span class="amount">{{ formatAmount(amount) }}</span>
      <span v-if="status === 'pending'" class="status-badge pending">รอดำเนินการ</span>
      <span v-else-if="status === 'failed'" class="status-badge failed">ล้มเหลว</span>
    </div>
  </div>
</template>

<style scoped>
.transaction-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
}

.transaction-item.pending {
  opacity: 0.7;
}

.transaction-item.failed {
  opacity: 0.5;
}

.transaction-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  flex-shrink: 0;
}

.transaction-icon.topup { background: #e8f5e9; color: #2e7d32; }
.transaction-icon.payment { background: #f6f6f6; color: #000; }
.transaction-icon.refund { background: #e3f2fd; color: #1565c0; }
.transaction-icon.withdraw { background: #fff3e0; color: #ef6c00; }
.transaction-icon.bonus { background: #fce4ec; color: #c2185b; }

.transaction-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.transaction-title {
  font-size: 15px;
  font-weight: 500;
  color: #000;
}

.transaction-desc {
  font-size: 13px;
  color: #6b6b6b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.transaction-date {
  font-size: 12px;
  color: #999;
}

.transaction-amount {
  text-align: right;
  flex-shrink: 0;
}

.amount {
  font-size: 16px;
  font-weight: 600;
  display: block;
}

.transaction-amount.positive .amount { color: #2e7d32; }
.transaction-amount.negative .amount { color: #000; }

.status-badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  margin-top: 4px;
  display: inline-block;
}

.status-badge.pending { background: #fff3e0; color: #ef6c00; }
.status-badge.failed { background: #ffebee; color: #c62828; }
</style>

<template>
  <div class="list">
    <div v-if="transactions.length === 0" class="empty-state">
      <p>ยังไม่มีรายการ</p>
    </div>
    <div
      v-for="txn in transactions"
      :key="txn.id"
      v-memo="[txn.amount, txn.status, txn.type]"
      class="txn-item"
    >
      <div class="txn-info">
        <span class="txn-type">{{ formatTransactionType(txn.type) }}</span>
        <span class="txn-date">{{ formatDate(txn.created_at) }}</span>
      </div>
      <div :class="['txn-amount', { positive: isPositive(txn.type) }]">
        {{ isPositive(txn.type) ? '+' : '-' }}฿{{ formatNumber(Math.abs(txn.amount)) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WalletTransaction } from '@/stores/wallet'

interface Props {
  transactions: WalletTransaction[]
}

defineProps<Props>()

// Memoized formatters
const numberFormatter = new Intl.NumberFormat('th-TH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

const dateFormatter = new Intl.DateTimeFormat('th-TH', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit'
})

const formatNumber = (num: number): string => numberFormatter.format(num)
const formatDate = (dateStr: string): string => dateFormatter.format(new Date(dateStr))

const formatTransactionType = (type: string): string => {
  const types: Record<string, string> = {
    topup: 'เติมเงิน',
    payment: 'ชำระเงิน',
    refund: 'คืนเงิน',
    cashback: 'เงินคืน',
    referral: 'โบนัสแนะนำ',
    promo: 'โปรโมชั่น',
    withdrawal: 'ถอนเงิน'
  }
  return types[type] || type
}

const isPositive = (type: string): boolean => {
  return ['topup', 'refund', 'cashback', 'referral', 'promo'].includes(type)
}
</script>

<style scoped>
.list {
  padding: 0 16px 16px;
}

.empty-state {
  text-align: center;
  padding: 48px 16px;
  color: #9ca3af;
}

.txn-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  margin-bottom: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  contain: layout style paint;
  content-visibility: auto;
}

.txn-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.txn-type {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.txn-date {
  font-size: 12px;
  color: #9ca3af;
}

.txn-amount {
  font-size: 16px;
  font-weight: 700;
  color: #dc2626;
}

.txn-amount.positive {
  color: #16a34a;
}
</style>

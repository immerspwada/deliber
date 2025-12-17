<script setup lang="ts">
/**
 * Feature: F234 - Refund Status Card
 * Display refund request status
 */
defineProps<{
  refundId: string
  amount: number
  status: 'pending' | 'processing' | 'completed' | 'rejected'
  reason?: string
  requestedAt: string
  completedAt?: string
}>()

const statusConfig = {
  pending: { label: 'รอดำเนินการ', color: '#f59e0b', bg: '#fef3c7' },
  processing: { label: 'กำลังดำเนินการ', color: '#276ef1', bg: '#e8f0fe' },
  completed: { label: 'คืนเงินแล้ว', color: '#10b981', bg: '#d1fae5' },
  rejected: { label: 'ปฏิเสธ', color: '#ef4444', bg: '#fee2e2' }
}

const formatDate = (d: string) => new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
const formatMoney = (n: number) => `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
</script>

<template>
  <div class="refund-status-card">
    <div class="refund-header">
      <span class="refund-id">#{{ refundId }}</span>
      <span class="refund-status" :style="{ color: statusConfig[status].color, background: statusConfig[status].bg }">
        {{ statusConfig[status].label }}
      </span>
    </div>
    <div class="refund-amount">{{ formatMoney(amount) }}</div>
    <p v-if="reason" class="refund-reason">{{ reason }}</p>
    <div class="refund-dates">
      <span>ขอคืนเงิน: {{ formatDate(requestedAt) }}</span>
      <span v-if="completedAt">คืนเงินเมื่อ: {{ formatDate(completedAt) }}</span>
    </div>
  </div>
</template>

<style scoped>
.refund-status-card { padding: 16px; background: #fff; border-radius: 12px; border: 1px solid #e5e5e5; }
.refund-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.refund-id { font-size: 12px; color: #6b6b6b; }
.refund-status { font-size: 11px; font-weight: 500; padding: 4px 10px; border-radius: 10px; }
.refund-amount { font-size: 24px; font-weight: 700; color: #000; margin-bottom: 8px; }
.refund-reason { font-size: 13px; color: #6b6b6b; margin: 0 0 12px; }
.refund-dates { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #6b6b6b; }
</style>

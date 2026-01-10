<template>
  <div class="list">
    <div v-if="requests.length === 0" class="empty-state">
      <p>ยังไม่มีคำขอเติมเงิน</p>
    </div>
    <div
      v-for="req in requests"
      :key="req.id"
      v-memo="[req.status, req.amount]"
      class="req-item"
    >
      <div class="req-info">
        <span class="req-amount">฿{{ formatNumber(req.amount) }}</span>
        <span class="req-date">{{ formatDate(req.created_at) }}</span>
      </div>
      <span :class="['badge', formatStatus(req.status).color]">
        {{ formatStatus(req.status).label }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TopupRequest } from '@/stores/wallet'

interface Props {
  requests: TopupRequest[]
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

const formatStatus = (status: string) => {
  const statuses: Record<string, { label: string; color: string }> = {
    pending: { label: 'รอดำเนินการ', color: 'warning' },
    approved: { label: 'อนุมัติแล้ว', color: 'success' },
    rejected: { label: 'ปฏิเสธ', color: 'error' },
    cancelled: { label: 'ยกเลิกแล้ว', color: 'gray' },
    expired: { label: 'หมดอายุ', color: 'gray' }
  }
  return statuses[status] || { label: status, color: 'gray' }
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

.req-item {
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

.req-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.req-amount {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
}

.req-date {
  font-size: 12px;
  color: #9ca3af;
}

.badge {
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
}

.badge.warning {
  background: #fef3c7;
  color: #92400e;
}

.badge.success {
  background: #d1fae5;
  color: #065f46;
}

.badge.error {
  background: #fee2e2;
  color: #991b1b;
}

.badge.gray {
  background: #f3f4f6;
  color: #6b7280;
}
</style>

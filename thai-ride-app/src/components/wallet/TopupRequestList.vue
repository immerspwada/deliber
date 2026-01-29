<template>
  <div class="list">
    <div v-if="requests.length === 0" class="empty-state">
      <p>ยังไม่มีคำขอเติมเงิน</p>
    </div>
    <div
      v-for="req in requests"
      :key="req.id"
      v-memo="[req.status, req.amount, req.tracking_id]"
      class="req-item"
    >
      <div class="req-info">
        <div class="req-header">
          <span class="req-amount">฿{{ formatNumber(req.amount) }}</span>
          <span :class="['badge', formatStatus(req.status).color]">
            {{ formatStatus(req.status).label }}
          </span>
        </div>
        <div class="req-details">
          <span 
            v-if="req.tracking_id" 
            class="tracking-id"
            :title="'คลิกเพื่อคัดลอก: ' + req.tracking_id"
            @click="copyTrackingId(req.tracking_id)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            {{ req.tracking_id }}
          </span>
          <span class="req-date">{{ formatDate(req.created_at) }}</span>
        </div>
      </div>
    </div>

    <!-- Toast notification -->
    <div v-if="toast.show" class="toast">{{ toast.message }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { TopupRequest } from '@/stores/wallet'

interface Props {
  requests: TopupRequest[]
}

defineProps<Props>()

// Toast notification
const toast = ref({ show: false, message: '' })

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

const copyTrackingId = async (trackingId: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(trackingId)
    showToast('คัดลอกเลขคำสั่งซื้อแล้ว')
  } catch (err) {
    console.error('[TopupRequestList] Copy error:', err)
    showToast('ไม่สามารถคัดลอกได้')
  }
}

const showToast = (message: string): void => {
  toast.value = { show: true, message }
  setTimeout(() => { toast.value.show = false }, 2000)
}
</script>

<style scoped>
.list {
  padding: 0 16px 16px;
  position: relative;
}

.empty-state {
  text-align: center;
  padding: 48px 16px;
  color: #9ca3af;
}

.req-item {
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
  gap: 8px;
}

.req-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.req-amount {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
}

.req-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tracking-id {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #00A86B;
  font-family: 'Courier New', monospace;
  cursor: pointer;
  padding: 4px 8px;
  background: #f0fdf4;
  border-radius: 6px;
  width: fit-content;
  transition: all 0.2s;
}

.tracking-id:hover {
  background: #dcfce7;
  transform: translateY(-1px);
}

.tracking-id:active {
  transform: translateY(0);
}

.tracking-id svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
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
  white-space: nowrap;
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

.toast {
  position: fixed;
  bottom: 120px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: #00A86B;
  color: #fff;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translate(-50%, 10px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}
</style>

<template>
  <div class="list">
    <div v-if="withdrawals.length === 0" class="empty-state">
      <p>ยังไม่มีคำขอถอนเงิน</p>
    </div>
    <div
      v-for="wd in withdrawals"
      :key="wd.id"
      v-memo="[wd.status, wd.amount, cancellingId]"
      class="req-item"
    >
      <div class="req-info">
        <div class="req-header">
          <span class="req-amount">฿{{ formatNumber(wd.amount) }}</span>
          <span :class="['badge', formatStatus(wd.status).color]">
            {{ formatStatus(wd.status).label }}
          </span>
        </div>
        <span class="req-date">{{ formatDate(wd.created_at) }}</span>
        <div v-if="wd.bank_name" class="req-bank">
          {{ wd.bank_name }} {{ maskAccountNumber(wd.account_number) }}
        </div>
      </div>
      <button
        v-if="wd.status === 'pending'"
        type="button"
        class="btn-cancel"
        :disabled="cancellingId === wd.id"
        aria-label="ยกเลิกคำขอถอนเงิน"
        @click="handleCancel(wd.id)"
      >
        {{ cancellingId === wd.id ? 'กำลังยกเลิก...' : 'ยกเลิก' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useWalletWithdrawal } from '@/composables/wallet/useWalletWithdrawal'
import type { CustomerWithdrawal } from '@/stores/wallet'

interface Props {
  withdrawals: CustomerWithdrawal[]
}

defineProps<Props>()

const { cancelWithdrawal } = useWalletWithdrawal()
const cancellingId = ref<string | null>(null)

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
    processing: { label: 'กำลังดำเนินการ', color: 'info' },
    completed: { label: 'สำเร็จ', color: 'success' },
    failed: { label: 'ล้มเหลว', color: 'error' },
    cancelled: { label: 'ยกเลิกแล้ว', color: 'gray' }
  }
  return statuses[status] || { label: status, color: 'gray' }
}

const maskAccountNumber = (accountNumber: string | null): string => {
  if (!accountNumber) return ''
  const len = accountNumber.length
  if (len <= 4) return accountNumber
  return 'xxx-' + accountNumber.slice(-4)
}

const handleCancel = async (withdrawalId: string): Promise<void> => {
  if (cancellingId.value) return
  
  if (!confirm('คุณต้องการยกเลิกคำขอถอนเงินนี้ใช่หรือไม่?')) {
    return
  }
  
  cancellingId.value = withdrawalId
  
  try {
    const result = await cancelWithdrawal(withdrawalId)
    
    if (result.success) {
      alert(result.message || 'ยกเลิกคำขอถอนเงินเรียบร้อยแล้ว')
    } else {
      alert(result.message || 'ไม่สามารถยกเลิกได้')
    }
  } catch (error) {
    console.error('Error cancelling withdrawal:', error)
    alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
  } finally {
    cancellingId.value = null
  }
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
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  margin-bottom: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  contain: layout style paint;
  content-visibility: auto;
}

.req-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.req-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.req-amount {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
}

.req-date {
  font-size: 12px;
  color: #9ca3af;
}

.req-bank {
  font-size: 13px;
  color: #6b7280;
}

.btn-cancel {
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #ef4444;
  color: #ef4444;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-cancel:hover:not(:disabled) {
  background: #fef2f2;
  border-color: #dc2626;
  color: #dc2626;
}

.btn-cancel:active:not(:disabled) {
  transform: scale(0.98);
}

.btn-cancel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.badge.info {
  background: #dbeafe;
  color: #1e40af;
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

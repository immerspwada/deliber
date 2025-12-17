<script setup lang="ts">
/**
 * Feature: F335 - Order Receipt Card
 * Receipt card for completed orders
 */
interface ReceiptItem {
  label: string
  value: string
  type?: 'normal' | 'discount' | 'total'
}

interface Receipt {
  orderId: string
  orderType: 'delivery' | 'shopping'
  date: string
  items: ReceiptItem[]
  paymentMethod: string
}

const props = defineProps<{
  receipt: Receipt
}>()

const emit = defineEmits<{
  'download': []
  'share': []
}>()
</script>

<template>
  <div class="receipt-card">
    <div class="receipt-header">
      <div class="receipt-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
        </svg>
      </div>
      <div class="receipt-info">
        <h3 class="receipt-title">ใบเสร็จ</h3>
        <span class="receipt-id">#{{ receipt.orderId }}</span>
      </div>
      <span class="receipt-date">{{ receipt.date }}</span>
    </div>
    
    <div class="receipt-body">
      <div 
        v-for="(item, index) in receipt.items" 
        :key="index"
        class="receipt-row"
        :class="item.type"
      >
        <span class="row-label">{{ item.label }}</span>
        <span class="row-value">{{ item.value }}</span>
      </div>
    </div>
    
    <div class="receipt-payment">
      <span class="payment-label">ชำระด้วย</span>
      <span class="payment-method">{{ receipt.paymentMethod }}</span>
    </div>
    
    <div class="receipt-actions">
      <button type="button" class="action-btn" @click="emit('download')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <path d="M7 10l5 5 5-5"/>
          <path d="M12 15V3"/>
        </svg>
        ดาวน์โหลด
      </button>
      <button type="button" class="action-btn" @click="emit('share')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="18" cy="5" r="3"/>
          <circle cx="6" cy="12" r="3"/>
          <circle cx="18" cy="19" r="3"/>
          <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>
        </svg>
        แชร์
      </button>
    </div>
  </div>
</template>

<style scoped>
.receipt-card {
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  overflow: hidden;
}

.receipt-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px dashed #e5e5e5;
}

.receipt-icon {
  width: 44px;
  height: 44px;
  background: #f6f6f6;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000;
}

.receipt-info {
  flex: 1;
}

.receipt-title {
  font-size: 16px;
  font-weight: 600;
  color: #000;
  margin: 0;
}

.receipt-id {
  font-size: 13px;
  color: #6b6b6b;
}

.receipt-date {
  font-size: 13px;
  color: #6b6b6b;
}

.receipt-body {
  padding: 16px;
}

.receipt-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
}

.receipt-row.total {
  border-top: 1px solid #e5e5e5;
  margin-top: 8px;
  padding-top: 12px;
}

.row-label {
  font-size: 14px;
  color: #6b6b6b;
}

.receipt-row.total .row-label {
  font-weight: 600;
  color: #000;
}

.receipt-row.discount .row-label {
  color: #2e7d32;
}

.row-value {
  font-size: 14px;
  font-weight: 500;
  color: #000;
}

.receipt-row.total .row-value {
  font-size: 18px;
  font-weight: 700;
}

.receipt-row.discount .row-value {
  color: #2e7d32;
}

.receipt-payment {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f6f6f6;
}

.payment-label {
  font-size: 13px;
  color: #6b6b6b;
}

.payment-method {
  font-size: 13px;
  font-weight: 500;
  color: #000;
}

.receipt-actions {
  display: flex;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid #e5e5e5;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  background: #f6f6f6;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #000;
  cursor: pointer;
}

.action-btn:hover {
  background: #e5e5e5;
}
</style>

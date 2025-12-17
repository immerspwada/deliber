<script setup lang="ts">
/**
 * Feature: F325 - Delivery Fee Breakdown
 * Component showing delivery fee breakdown
 */
interface FeeItem {
  label: string
  amount: number
  type?: 'base' | 'distance' | 'weight' | 'surcharge' | 'discount' | 'total'
}

const props = withDefaults(defineProps<{
  fees: FeeItem[]
  currency?: string
}>(), {
  fees: () => [],
  currency: '฿'
})

const formatAmount = (amount: number, type?: string) => {
  const prefix = type === 'discount' ? '-' : ''
  return `${prefix}${props.currency}${Math.abs(amount).toFixed(0)}`
}
</script>

<template>
  <div class="fee-breakdown">
    <h3 class="breakdown-title">รายละเอียดค่าบริการ</h3>
    
    <div class="fee-list">
      <div 
        v-for="(fee, index) in fees" 
        :key="index"
        class="fee-row"
        :class="{ 
          total: fee.type === 'total',
          discount: fee.type === 'discount'
        }"
      >
        <span class="fee-label">{{ fee.label }}</span>
        <span class="fee-amount">{{ formatAmount(fee.amount, fee.type) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fee-breakdown {
  background: #f6f6f6;
  border-radius: 12px;
  padding: 16px;
}

.breakdown-title {
  font-size: 14px;
  font-weight: 600;
  color: #000;
  margin: 0 0 12px;
}

.fee-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fee-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.fee-row.total {
  border-top: 1px solid #e5e5e5;
  margin-top: 8px;
  padding-top: 12px;
}

.fee-label {
  font-size: 14px;
  color: #6b6b6b;
}

.fee-row.total .fee-label {
  font-weight: 600;
  color: #000;
}

.fee-row.discount .fee-label {
  color: #2e7d32;
}

.fee-amount {
  font-size: 14px;
  font-weight: 500;
  color: #000;
}

.fee-row.total .fee-amount {
  font-size: 18px;
  font-weight: 700;
}

.fee-row.discount .fee-amount {
  color: #2e7d32;
}
</style>

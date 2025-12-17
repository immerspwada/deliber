<script setup lang="ts">
/**
 * Feature: F209 - Income Breakdown
 * Provider income breakdown display
 */
interface IncomeItem {
  label: string
  amount: number
  type: 'earning' | 'deduction' | 'bonus'
}

defineProps<{
  items: IncomeItem[]
  totalEarnings: number
  totalDeductions: number
  netIncome: number
  period?: string
}>()

const formatMoney = (amount: number) => `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
</script>

<template>
  <div class="income-breakdown">
    <div class="breakdown-header">
      <h3 class="breakdown-title">รายละเอียดรายได้</h3>
      <span v-if="period" class="breakdown-period">{{ period }}</span>
    </div>

    <div class="breakdown-list">
      <div v-for="(item, i) in items" :key="i" class="breakdown-item" :class="item.type">
        <span class="item-label">{{ item.label }}</span>
        <span class="item-amount" :class="{ negative: item.type === 'deduction' }">
          {{ item.type === 'deduction' ? '-' : '' }}{{ formatMoney(Math.abs(item.amount)) }}
        </span>
      </div>
    </div>

    <div class="breakdown-summary">
      <div class="summary-row">
        <span>รายได้รวม</span>
        <span class="amount positive">{{ formatMoney(totalEarnings) }}</span>
      </div>
      <div class="summary-row">
        <span>หักค่าใช้จ่าย</span>
        <span class="amount negative">-{{ formatMoney(totalDeductions) }}</span>
      </div>
      <div class="summary-row total">
        <span>รายได้สุทธิ</span>
        <span class="amount">{{ formatMoney(netIncome) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.income-breakdown { background: #fff; border-radius: 16px; overflow: hidden; }
.breakdown-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #e5e5e5; }
.breakdown-title { font-size: 16px; font-weight: 700; color: #000; margin: 0; }
.breakdown-period { font-size: 13px; color: #6b6b6b; }
.breakdown-list { padding: 16px 20px; }
.breakdown-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f6f6f6; }
.breakdown-item:last-child { border-bottom: none; }
.item-label { font-size: 14px; color: #000; }
.item-amount { font-size: 14px; font-weight: 600; color: #000; }
.item-amount.negative { color: #ef4444; }
.breakdown-item.bonus .item-label::before { content: ''; display: inline-block; width: 8px; height: 8px; background: #10b981; border-radius: 50%; margin-right: 8px; }
.breakdown-summary { background: #f6f6f6; padding: 16px 20px; }
.summary-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; font-size: 14px; color: #6b6b6b; }
.summary-row .amount { font-weight: 600; }
.summary-row .amount.positive { color: #10b981; }
.summary-row .amount.negative { color: #ef4444; }
.summary-row.total { padding-top: 12px; margin-top: 8px; border-top: 1px solid #e5e5e5; font-size: 16px; font-weight: 700; color: #000; }
.summary-row.total .amount { font-size: 18px; }
</style>

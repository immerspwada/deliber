<script setup lang="ts">
/**
 * Feature: F240 - Price Breakdown
 * Display price breakdown with items
 */
interface PriceItem {
  label: string
  amount: number
  type?: 'add' | 'subtract' | 'total'
}

defineProps<{
  items: PriceItem[]
  currency?: string
}>()

const formatMoney = (n: number, currency = '฿') => `${currency}${Math.abs(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
</script>

<template>
  <div class="price-breakdown">
    <div v-for="(item, i) in items" :key="i" class="price-row" :class="item.type || 'add'">
      <span class="price-label">{{ item.label }}</span>
      <span class="price-amount">
        <template v-if="item.type === 'subtract'">-</template>
        {{ formatMoney(item.amount, currency) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.price-breakdown { display: flex; flex-direction: column; gap: 8px; }
.price-row { display: flex; justify-content: space-between; align-items: center; font-size: 14px; }
.price-label { color: #6b6b6b; }
.price-amount { font-weight: 500; color: #000; }
.price-row.subtract .price-amount { color: #10b981; }
.price-row.total { padding-top: 12px; margin-top: 4px; border-top: 1px solid #e5e5e5; }
.price-row.total .price-label { font-weight: 600; color: #000; }
.price-row.total .price-amount { font-size: 18px; font-weight: 700; }
</style>

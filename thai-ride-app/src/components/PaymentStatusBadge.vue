<script setup lang="ts">
/**
 * Feature: F237 - Payment Status Badge
 * Display payment status
 */
defineProps<{
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
}>()

const config = {
  pending: { label: 'รอชำระ', color: '#f59e0b', bg: '#fef3c7' },
  processing: { label: 'กำลังดำเนินการ', color: '#276ef1', bg: '#e8f0fe' },
  completed: { label: 'ชำระแล้ว', color: '#10b981', bg: '#d1fae5' },
  failed: { label: 'ล้มเหลว', color: '#ef4444', bg: '#fee2e2' },
  refunded: { label: 'คืนเงินแล้ว', color: '#6b6b6b', bg: '#f6f6f6' }
}
</script>

<template>
  <span class="payment-status-badge" :style="{ color: config[status].color, background: config[status].bg }">
    {{ config[status].label }}
  </span>
</template>

<style scoped>
.payment-status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500; }
</style>

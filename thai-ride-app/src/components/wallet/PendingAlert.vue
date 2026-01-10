<template>
  <div v-if="show" class="pending-alert">
    <div class="pending-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    </div>
    <div class="pending-info">
      <span class="pending-title">รอดำเนินการ</span>
      <span class="pending-detail">
        <template v-if="pendingTopupCount > 0">เติมเงิน {{ pendingTopupCount }} รายการ</template>
        <template v-if="pendingTopupCount > 0 && pendingWithdrawCount > 0"> • </template>
        <template v-if="pendingWithdrawCount > 0">ถอนเงิน {{ pendingWithdrawCount }} รายการ</template>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  pendingTopupCount: number
  pendingWithdrawCount: number
}

const props = defineProps<Props>()

const show = computed(() => props.pendingTopupCount > 0 || props.pendingWithdrawCount > 0)
</script>

<style scoped>
.pending-alert {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 14px;
  padding: 14px 16px;
  margin-top: 12px;
}

.pending-icon {
  width: 40px;
  height: 40px;
  background: #ffedd5;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pending-icon svg {
  width: 22px;
  height: 22px;
  color: #ea580c;
}

.pending-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pending-title {
  font-size: 14px;
  font-weight: 600;
  color: #c2410c;
}

.pending-detail {
  font-size: 12px;
  color: #ea580c;
}
</style>
